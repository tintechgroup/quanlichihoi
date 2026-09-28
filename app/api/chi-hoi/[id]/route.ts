import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";
import ChiHoi from "@/models/ChiHoi";
import User from "@/models/User";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/*
 * GET /api/chi-hoi/:id
 * Xem chi tiết một Chi hội
 */
export async function GET(
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

    if (
      session.role !== "ADMIN" &&
      session.role !== "BAN_CHAP_HANH"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền xem Chi hội",
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

    return NextResponse.json({
      success: true,
      data: chiHoi,
    });
  } catch (error) {
    console.error("Lỗi xem Chi hội:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể xem thông tin Chi hội",
      },
      { status: 500 }
    );
  }
}

/*
 * PUT /api/chi-hoi/:id
 * Cập nhật Chi hội
 */
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
          message: "Chỉ Quản trị viên được cập nhật Chi hội",
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

    const maChiHoi =
      typeof body.maChiHoi === "string"
        ? body.maChiHoi.trim().toUpperCase()
        : "";

    const tenChiHoi =
      typeof body.tenChiHoi === "string"
        ? body.tenChiHoi.trim()
        : "";

    const moTa =
      typeof body.moTa === "string"
        ? body.moTa.trim()
        : "";

    if (!maChiHoi || !tenChiHoi) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng nhập mã Chi hội và tên Chi hội",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const currentChiHoi = await ChiHoi.findById(id);

    if (!currentChiHoi) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Chi hội",
        },
        { status: 404 }
      );
    }

    const duplicateCode = await ChiHoi.findOne({
      maChiHoi,
      _id: {
        $ne: id,
      },
    }).lean();

    if (duplicateCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Chi hội đã được sử dụng",
        },
        { status: 409 }
      );
    }

    currentChiHoi.maChiHoi = maChiHoi;
    currentChiHoi.tenChiHoi = tenChiHoi;
    currentChiHoi.moTa = moTa;

    await currentChiHoi.save();

    return NextResponse.json({
      success: true,
      message: "Cập nhật Chi hội thành công",
      data: currentChiHoi,
    });
  } catch (error) {
    console.error("Lỗi cập nhật Chi hội:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể cập nhật Chi hội",
      },
      { status: 500 }
    );
  }
}

/*
 * DELETE /api/chi-hoi/:id
 * Xóa Chi hội
 */
export async function DELETE(
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
          message: "Chỉ Quản trị viên được xóa Chi hội",
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

    const chiHoi = await ChiHoi.findById(id);

    if (!chiHoi) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Chi hội",
        },
        { status: 404 }
      );
    }

    const hasMembers = await User.exists({
      chiHoiId: id,
    });

    if (hasMembers) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể xóa Chi hội đang có Hội viên hoặc tài khoản liên kết",
        },
        { status: 409 }
      );
    }

    await ChiHoi.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Xóa Chi hội thành công",
    });
  } catch (error) {
    console.error("Lỗi xóa Chi hội:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể xóa Chi hội",
      },
      { status: 500 }
    );
  }
}