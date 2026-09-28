import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";
import ChiHoi from "@/models/ChiHoi";
import DanhGiaChiHoi, {
  XepLoaiChiHoi,
} from "@/models/DanhGiaChiHoi";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const validRatings: XepLoaiChiHoi[] = [
  "XUAT_SAC",
  "TOT",
  "KHA",
  "TRUNG_BINH",
  "YEU",
];

export async function GET(
  _request: Request,
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
          message: "Bạn không có quyền xem đánh giá Chi hội",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã định danh Chi hội không hợp lệ",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const chiHoi = await ChiHoi.findById(id).lean();

    if (!chiHoi) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Chi hội",
        },
        { status: 404 }
      );
    }

    const danhGia = await DanhGiaChiHoi.findOne({
      chiHoiId: id,
    })
      .populate("nguoiDanhGiaId", "fullName username")
      .lean();

    return NextResponse.json({
      success: true,
      data: danhGia,
    });
  } catch (error) {
    console.error("Lỗi xem đánh giá Chi hội:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể xem đánh giá Chi hội",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
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
          message: "Chỉ Quản trị viên được đánh giá Chi hội",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã định danh Chi hội không hợp lệ",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const xepLoai =
      typeof body.xepLoai === "string"
        ? body.xepLoai.trim()
        : "";

    const nhanXet =
      typeof body.nhanXet === "string"
        ? body.nhanXet.trim()
        : "";

    if (!validRatings.includes(xepLoai as XepLoaiChiHoi)) {
      return NextResponse.json(
        {
          success: false,
          message: "Xếp loại Chi hội không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (nhanXet.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message: "Nhận xét không được vượt quá 1000 ký tự",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const chiHoi = await ChiHoi.findById(id).lean();

    if (!chiHoi) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Chi hội",
        },
        { status: 404 }
      );
    }

    const danhGia = await DanhGiaChiHoi.findOneAndUpdate(
      {
        chiHoiId: id,
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
      }
    )
      .populate("nguoiDanhGiaId", "fullName username")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Đánh giá Chi hội thành công",
      data: danhGia,
    });
  } catch (error) {
    console.error("Lỗi lưu đánh giá Chi hội:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể lưu đánh giá Chi hội",
      },
      { status: 500 }
    );
  }
}