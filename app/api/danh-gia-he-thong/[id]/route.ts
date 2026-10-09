import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import User from "@/models/User";
import DanhGiaHeThong from "@/models/DanhGiaHeThong";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    if (
      session.role !== "ADMIN" &&
      session.role !==
        "BAN_CHAP_HANH"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền xử lý đánh giá",
        },
        {
          status: 403,
        },
      );
    }

    const { id } =
      await context.params;

    if (
      !mongoose.isValidObjectId(
        id,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã đánh giá không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    const validStatuses = [
      "MOI",
      "DA_XEM",
      "DA_GHI_NHAN",
    ];

    if (
      !validStatuses.includes(
        body.trangThai,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trạng thái không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const phanHoi =
      typeof body.phanHoi ===
      "string"
        ? body.phanHoi.trim()
        : "";

    await connectDB();

    const currentUser =
      await User.findById(
        session.userId,
      );

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy tài khoản",
        },
        {
          status: 404,
        },
      );
    }

    const record =
      await DanhGiaHeThong.findById(
        id,
      );

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy đánh giá",
        },
        {
          status: 404,
        },
      );
    }

    record.trangThai =
      body.trangThai;

    record.phanHoiQuanTri =
      phanHoi;

    record.nguoiPhanHoiId =
      currentUser._id;

    record.nguoiPhanHoiTen =
      currentUser.fullName;

    record.ngayPhanHoi =
      new Date();

    await record.save();

    return NextResponse.json({
      success: true,

      message:
        "Cập nhật đánh giá thành công",

      data: record,
    });
  } catch (error) {
    console.error(
      "PATCH /api/danh-gia-he-thong/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể cập nhật đánh giá",
      },
      {
        status: 500,
      },
    );
  }
}