import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB as connectMongoDB } from "@/lib/mongodb";
import { getCurrentSession as getSession } from "@/lib/session";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TrangThaiHoiVien =
  | "DANG_HOAT_DONG"
  | "TAM_NGUNG";

function isValidTrangThai(
  value: string,
): value is TrangThaiHoiVien {
  return ["DANG_HOAT_DONG", "TAM_NGUNG"].includes(value);
}

/**
 * PATCH /api/hoi-vien/[id]/trang-thai
 *
 * Ngừng hoạt động hoặc mở lại hoạt động Hội viên.
 * Đồng bộ trạng thái với tài khoản đăng nhập.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        { status: 401 },
      );
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền thay đổi trạng thái Hội viên",
        },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã định danh Hội viên không hợp lệ",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const trangThai =
      typeof body.trangThai === "string"
        ? body.trangThai.trim()
        : "";

    if (!isValidTrangThai(trangThai)) {
      return NextResponse.json(
        {
          success: false,
          message: "Trạng thái Hội viên không hợp lệ",
        },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const hoiVien = await HoiVien.findById(id);

    if (!hoiVien) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Hội viên",
        },
        { status: 404 },
      );
    }

    hoiVien.trangThai = trangThai;
    await hoiVien.save();

    /*
     * Nếu Hội viên đã có tài khoản:
     * - DANG_HOAT_DONG => isActive = true
     * - TAM_NGUNG => isActive = false
     */
    if (hoiVien.taiKhoanId) {
      await User.findByIdAndUpdate(
        hoiVien.taiKhoanId,
        {
          $set: {
            isActive: trangThai === "DANG_HOAT_DONG",
          },
        },
        {
          runValidators: true,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          trangThai === "DANG_HOAT_DONG"
            ? "Mở lại hoạt động Hội viên thành công"
            : "Ngừng hoạt động Hội viên thành công",
        data: {
          _id: hoiVien._id,
          trangThai: hoiVien.trangThai,
          taiKhoanBiKhoa:
            trangThai === "TAM_NGUNG" &&
            Boolean(hoiVien.taiKhoanId),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Lỗi cập nhật trạng thái Hội viên:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể cập nhật trạng thái Hội viên",
      },
      { status: 500 },
    );
  }
}