import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import ChiHoi from "@/models/ChiHoi";
import HoatDong from "@/models/HoatDong";
import User from "@/models/User";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TrangThaiHoatDong =
  | "CHO_DUYET"
  | "DA_DUYET"
  | "SAP_DIEN_RA"
  | "DANG_DIEN_RA"
  | "DA_KET_THUC"
  | "DA_HUY";

type UpdateStatusBody = {
  trangThai?: TrangThaiHoatDong;
  lyDoHuy?: string;
};

const TRANG_THAI_HOP_LE: TrangThaiHoatDong[] = [
  "CHO_DUYET",
  "DA_DUYET",
  "SAP_DIEN_RA",
  "DANG_DIEN_RA",
  "DA_KET_THUC",
  "DA_HUY",
];

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền cập nhật trạng thái hoạt động",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    let body: UpdateStatusBody;

    try {
      body =
        (await request.json()) as UpdateStatusBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Dữ liệu gửi lên không hợp lệ",
        },
        { status: 400 }
      );
    }

    const trangThai =
      typeof body.trangThai === "string"
        ? body.trangThai
            .trim()
            .toUpperCase()
        : "";

    const lyDoHuy =
      typeof body.lyDoHuy === "string"
        ? body.lyDoHuy.trim()
        : "";

    if (
      !TRANG_THAI_HOP_LE.includes(
        trangThai as TrangThaiHoatDong
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trạng thái hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (
      trangThai === "DA_HUY" &&
      !lyDoHuy
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng nhập lý do hủy hoạt động",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const hoatDong =
      await HoatDong.findById(id);

    if (!hoatDong) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy hoạt động",
        },
        { status: 404 }
      );
    }

    if (
      hoatDong.trangThai ===
      trangThai
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hoạt động hiện đã ở trạng thái này",
        },
        { status: 409 }
      );
    }

    /*
     * Cho phép quản trị viên chuyển từ
     * bất kỳ trạng thái nào sang trạng thái khác.
     */
    hoatDong.trangThai =
      trangThai as TrangThaiHoatDong;

    if (trangThai === "DA_HUY") {
      hoatDong.lyDoHuy = lyDoHuy;
    } else {
      hoatDong.lyDoHuy = "";
    }

    /*
     * Chuyển về chờ duyệt thì xóa thông tin duyệt.
     */
    if (trangThai === "CHO_DUYET") {
      hoatDong.nguoiDuyetId = null;
      hoatDong.ngayDuyet = null;
    }

    /*
     * Chuyển sang đã duyệt thì lưu lại
     * quản trị viên thực hiện và ngày duyệt.
     */
    if (trangThai === "DA_DUYET") {
      hoatDong.nguoiDuyetId =
        new mongoose.Types.ObjectId(
          session.userId
        );

      hoatDong.ngayDuyet =
        new Date();
    }

    await hoatDong.save();

    const ketQua =
      await HoatDong.findById(id)
        .populate({
          path: "chiHoiId",
          model: ChiHoi,
          select:
            "maChiHoi tenChiHoi",
        })
        .populate({
          path: "nguoiTaoId",
          model: User,
          select:
            "username fullName role",
        })
        .populate({
          path: "nguoiDuyetId",
          model: User,
          select:
            "username fullName role",
        })
        .lean();

    return NextResponse.json({
      success: true,
      message:
        "Cập nhật trạng thái hoạt động thành công",
      data: ketQua,
    });
  } catch (error) {
    console.error(
      "Lỗi cập nhật trạng thái hoạt động:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error &&
          process.env.NODE_ENV ===
            "development"
            ? `Không thể cập nhật trạng thái: ${error.message}`
            : "Đã xảy ra lỗi khi cập nhật trạng thái hoạt động",
      },
      { status: 500 }
    );
  }
}