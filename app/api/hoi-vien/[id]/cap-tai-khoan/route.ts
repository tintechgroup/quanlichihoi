import bcrypt from "bcryptjs";
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

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

/**
 * POST /api/hoi-vien/[id]/cap-tai-khoan
 *
 * Cấp tài khoản đăng nhập cho Hội viên.
 * Chỉ Quản trị viên được thực hiện.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  let createdUserId: mongoose.Types.ObjectId | null = null;

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
          message: "Bạn không có quyền cấp tài khoản Hội viên",
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

    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên đăng nhập không được để trống",
        },
        { status: 400 },
      );
    }

    if (username.length < 4 || username.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên đăng nhập phải có từ 4 đến 50 ký tự",
        },
        { status: 400 },
      );
    }

    if (!/^[a-z0-9._]+$/.test(username)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tên đăng nhập chỉ được chứa chữ thường không dấu, số, dấu chấm và dấu gạch dưới",
        },
        { status: 400 },
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: "Mật khẩu không được để trống",
        },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Mật khẩu phải có ít nhất 6 ký tự",
        },
        { status: 400 },
      );
    }

    if (password.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Mật khẩu không được vượt quá 100 ký tự",
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

    if (hoiVien.taiKhoanId) {
      return NextResponse.json(
        {
          success: false,
          message: "Hội viên này đã được cấp tài khoản",
        },
        { status: 409 },
      );
    }

    const usernameTonTai = await User.exists({
      username,
    });

    if (usernameTonTai) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên đăng nhập đã tồn tại",
        },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      password: hashedPassword,
      fullName: hoiVien.hoTen,
      email: hoiVien.email || undefined,
      phone: hoiVien.soDienThoai || undefined,
      role: "HOI_VIEN",
      chiHoiId: hoiVien.chiHoiId,
      isActive: true,
    });

    createdUserId = user._id;

    hoiVien.taiKhoanId = user._id;
    await hoiVien.save();

    return NextResponse.json(
      {
        success: true,
        message: "Cấp tài khoản Hội viên thành công",
        data: {
          _id: user._id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    /*
     * Nếu đã tạo User nhưng cập nhật Hội viên thất bại,
     * xóa User vừa tạo để tránh tài khoản rác.
     */
    if (createdUserId) {
      try {
        await User.findByIdAndDelete(createdUserId);
      } catch (rollbackError) {
        console.error(
          "Không thể hoàn tác tài khoản vừa tạo:",
          rollbackError,
        );
      }
    }

    console.error("Lỗi cấp tài khoản Hội viên:", error);

    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên đăng nhập đã tồn tại",
        },
        { status: 409 },
      );
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const firstError = Object.values(error.errors)[0];

      return NextResponse.json(
        {
          success: false,
          message:
            firstError?.message ||
            "Thông tin tài khoản không hợp lệ",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Không thể cấp tài khoản Hội viên",
      },
      { status: 500 },
    );
  }
}