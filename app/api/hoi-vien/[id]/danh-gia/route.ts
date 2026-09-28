import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB as connectMongoDB } from "@/lib/mongodb";
import { getCurrentSession as getSession } from "@/lib/session";
import DanhGiaHoiVien from "@/models/DanhGiaHoiVien";
import HoiVien from "@/models/HoiVien";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const DANH_SACH_XEP_LOAI = [
  "XUAT_SAC",
  "TOT",
  "KHA",
  "TRUNG_BINH",
  "YEU",
] as const;

type XepLoai = (typeof DANH_SACH_XEP_LOAI)[number];

function isValidXepLoai(value: string): value is XepLoai {
  return DANH_SACH_XEP_LOAI.includes(value as XepLoai);
}

function getErrorMessage(error: unknown) {
  if (error instanceof mongoose.Error.ValidationError) {
    const firstError = Object.values(error.errors)[0];

    return (
      firstError?.message || "Thông tin đánh giá Hội viên không hợp lệ"
    );
  }

  return "Đã xảy ra lỗi trong quá trình xử lý đánh giá";
}

/**
 * GET /api/hoi-vien/[id]/danh-gia
 *
 * Lấy kết quả đánh giá hiện tại của một Hội viên.
 */
export async function GET(
  _request: NextRequest,
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

    await connectMongoDB();

    const hoiVienTonTai = await HoiVien.exists({
      _id: id,
    });

    if (!hoiVienTonTai) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Hội viên",
        },
        { status: 404 },
      );
    }

    const danhGia = await DanhGiaHoiVien.findOne({
      hoiVienId: id,
    }).lean();

    return NextResponse.json(
      {
        success: true,
        message: danhGia
          ? "Lấy đánh giá Hội viên thành công"
          : "Hội viên chưa được đánh giá",
        data: danhGia,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Lỗi lấy đánh giá Hội viên:", error);

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/hoi-vien/[id]/danh-gia
 *
 * Tạo hoặc cập nhật đánh giá Hội viên.
 * Chỉ Quản trị viên được thực hiện.
 */
export async function PUT(
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
          message: "Bạn không có quyền đánh giá Hội viên",
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

    const xepLoai =
      typeof body.xepLoai === "string" ? body.xepLoai.trim() : "";

    const nhanXet =
      typeof body.nhanXet === "string" ? body.nhanXet.trim() : "";

    if (!xepLoai) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng chọn xếp loại Hội viên",
        },
        { status: 400 },
      );
    }

    if (!isValidXepLoai(xepLoai)) {
      return NextResponse.json(
        {
          success: false,
          message: "Xếp loại Hội viên không hợp lệ",
        },
        { status: 400 },
      );
    }

    if (nhanXet.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message: "Nội dung nhận xét không được vượt quá 1000 ký tự",
        },
        { status: 400 },
      );
    }

    if (
      !session.userId ||
      !mongoose.Types.ObjectId.isValid(session.userId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Thông tin người đánh giá không hợp lệ",
        },
        { status: 401 },
      );
    }

    await connectMongoDB();

    const hoiVienTonTai = await HoiVien.exists({
      _id: id,
    });

    if (!hoiVienTonTai) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Hội viên",
        },
        { status: 404 },
      );
    }

    const danhGia = await DanhGiaHoiVien.findOneAndUpdate(
      {
        hoiVienId: id,
      },
      {
        $set: {
          xepLoai,
          nhanXet,
          nguoiDanhGiaId: session.userId,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    return NextResponse.json(
      {
        success: true,
        message: "Đánh giá Hội viên thành công",
        data: danhGia,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Lỗi đánh giá Hội viên:", error);

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}