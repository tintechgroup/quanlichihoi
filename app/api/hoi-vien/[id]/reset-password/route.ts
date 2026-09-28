import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectDB as connectMongoDB } from "@/lib/mongodb";
import { getCurrentSession as getSession } from "@/lib/session";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
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
        {
          status: 401,
        },
      );
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền đặt lại mật khẩu Hội viên",
        },
        {
          status: 403,
        },
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Hội viên không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();

    const password =
      typeof body.password === "string" ? body.password : "";

    const confirmPassword =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: "Mật khẩu mới không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Mật khẩu mới phải có ít nhất 6 ký tự",
        },
        {
          status: 400,
        },
      );
    }

    if (password.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Mật khẩu mới không được vượt quá 100 ký tự",
        },
        {
          status: 400,
        },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Mật khẩu xác nhận không khớp",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    const hoiVien = await HoiVien.findById(id)
      .select("maHoiVien hoTen taiKhoanId")
      .lean();

    if (!hoiVien) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Hội viên",
        },
        {
          status: 404,
        },
      );
    }

    if (!hoiVien.taiKhoanId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hội viên chưa được cấp tài khoản nên không thể đặt lại mật khẩu",
        },
        {
          status: 400,
        },
      );
    }

    const taiKhoan = await User.findById(hoiVien.taiKhoanId)
      .select("_id username")
      .lean();

    if (!taiKhoan) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy tài khoản liên kết của Hội viên",
        },
        {
          status: 404,
        },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const updateResult = await User.updateOne(
      {
        _id: taiKhoan._id,
      },
      {
        $set: {
          password: hashedPassword,
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Không thể cập nhật tài khoản Hội viên",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Đặt lại mật khẩu Hội viên thành công",
        data: {
          username: taiKhoan.username,
          maHoiVien: hoiVien.maHoiVien,
          hoTen: hoiVien.hoTen,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Lỗi đặt lại mật khẩu Hội viên:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Đã xảy ra lỗi khi đặt lại mật khẩu Hội viên",
      },
      {
        status: 500,
      },
    );
  }
}