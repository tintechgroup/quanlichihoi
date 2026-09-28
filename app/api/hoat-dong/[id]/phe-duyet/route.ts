import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";
import HoatDong from "@/models/HoatDong";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ApprovalBody = {
  hanhDong?: "PHE_DUYET" | "TU_CHOI";
  lyDo?: string;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getCurrentSession();

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
          message: "Bạn không có quyền phê duyệt hoạt động",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    const body = (await request.json()) as ApprovalBody;

    const hanhDong =
      typeof body.hanhDong === "string"
        ? body.hanhDong.trim().toUpperCase()
        : "";

    const lyDo =
      typeof body.lyDo === "string"
        ? body.lyDo.trim()
        : "";

    if (
      hanhDong !== "PHE_DUYET" &&
      hanhDong !== "TU_CHOI"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hành động phải là PHE_DUYET hoặc TU_CHOI",
        },
        { status: 400 }
      );
    }

    if (hanhDong === "TU_CHOI" && !lyDo) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng nhập lý do từ chối",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const hoatDong = await HoatDong.findById(id);

    if (!hoatDong) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy hoạt động",
        },
        { status: 404 }
      );
    }

    if (hoatDong.trangThai !== "CHO_DUYET") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chỉ có thể xử lý hoạt động đang chờ duyệt",
        },
        { status: 409 }
      );
    }

    if (hanhDong === "PHE_DUYET") {
      hoatDong.trangThai = "DA_DUYET";
      hoatDong.nguoiDuyetId = new mongoose.Types.ObjectId(session.userId);
      hoatDong.ngayDuyet = new Date();
      hoatDong.lyDoHuy = "";
    } else {
      hoatDong.trangThai = "DA_HUY";
      hoatDong.nguoiDuyetId = new mongoose.Types.ObjectId(session.userId);
      hoatDong.ngayDuyet = new Date();
      hoatDong.lyDoHuy = lyDo;
    }

    await hoatDong.save();

    const hoatDongDaCapNhat = await HoatDong.findById(id)
      .populate("chiHoiId", "maChiHoi tenChiHoi")
      .populate(
        "nguoiTaoId",
        "username fullName role"
      )
      .populate(
        "nguoiDuyetId",
        "username fullName role"
      )
      .lean();

    return NextResponse.json({
      success: true,
      message:
        hanhDong === "PHE_DUYET"
          ? "Phê duyệt hoạt động thành công"
          : "Từ chối hoạt động thành công",
      data: hoatDongDaCapNhat,
    });
  } catch (error) {
    console.error("Lỗi phê duyệt hoạt động:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi trong quá trình phê duyệt hoạt động",
      },
      { status: 500 }
    );
  }
}