import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession as getSession } from "@/lib/session";
import BanChapHanh from "@/models/BanChapHanh";
import DanhGiaBanChapHanh from "@/models/DanhGiaBanChapHanh";
import User from "@/models/User";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const ALLOWED_RATINGS = [
  "XUAT_SAC",
  "TOT",
  "KHA",
  "TRUNG_BINH",
  "YEU",
] as const;

type AllowedRating = (typeof ALLOWED_RATINGS)[number];

async function checkAdmin() {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      ),
    };
  }

  if (session.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền đánh giá Ban Chấp hành",
        },
        {
          status: 403,
        },
      ),
    };
  }

  return {
    session,
  };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const authorization = await checkAdmin();

    if (authorization.error) {
      return authorization.error;
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Ban Chấp hành không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const member = await BanChapHanh.findById(id)
      .select("_id maBanChapHanh chucVu nhiemKy")
      .lean();

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy thành viên Ban Chấp hành",
        },
        {
          status: 404,
        },
      );
    }

    const rating = await DanhGiaBanChapHanh.findOne({
      banChapHanhId: id,
    })
      .populate({
        path: "nguoiDanhGiaId",
        model: User,
        select: "username fullName role",
      })
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: rating
          ? "Lấy đánh giá Ban Chấp hành thành công"
          : "Thành viên Ban Chấp hành chưa được đánh giá",
        data: rating || null,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Lỗi lấy đánh giá Ban Chấp hành:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi lấy đánh giá Ban Chấp hành",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const authorization = await checkAdmin();

    if (authorization.error) {
      return authorization.error;
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Ban Chấp hành không hợp lệ",
        },
        {
          status: 400,
        },
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

    if (
      !ALLOWED_RATINGS.includes(
        xepLoai as AllowedRating,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Xếp loại Ban Chấp hành không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (nhanXet.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nội dung nhận xét không được vượt quá 1000 ký tự",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        authorization.session.userId,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Thông tin người đánh giá không hợp lệ",
        },
        {
          status: 401,
        },
      );
    }

    await connectDB();

    const member = await BanChapHanh.findById(id)
      .select("_id maBanChapHanh chucVu nhiemKy")
      .lean();

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy thành viên Ban Chấp hành",
        },
        {
          status: 404,
        },
      );
    }

    const rating = await DanhGiaBanChapHanh.findOneAndUpdate(
      {
        banChapHanhId: id,
      },
      {
        $set: {
          xepLoai,
          nhanXet,
          nguoiDanhGiaId: authorization.session.userId,
        },
        $setOnInsert: {
          banChapHanhId: id,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).populate({
      path: "nguoiDanhGiaId",
      model: User,
      select: "username fullName role",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Đánh giá Ban Chấp hành thành công",
        data: rating,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Lỗi đánh giá Ban Chấp hành:",
      error,
    );

    if (
      error instanceof Error &&
      error.name === "ValidationError"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: 400,
        },
      );
    }

    if (
      error instanceof Error &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Đánh giá đang được cập nhật. Vui lòng thử lại.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi đánh giá Ban Chấp hành",
      },
      {
        status: 500,
      },
    );
  }
}