import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { createSessionToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng nhập tên đăng nhập và mật khẩu",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const user = await User.findOne({
      username,
    }).select("+password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên đăng nhập hoặc mật khẩu không chính xác",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Chỉ chặn khi isActive thực sự bằng false.
     * Những tài khoản cũ chưa có trường isActive vẫn đăng nhập bình thường.
     */
    if (user.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tài khoản đã bị tạm ngừng. Vui lòng liên hệ Quản trị viên.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      typeof user.password !== "string" ||
      user.password.length === 0
    ) {
      console.error(
        `Tài khoản ${user.username} không có mật khẩu hợp lệ`,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Tên đăng nhập hoặc mật khẩu không chính xác",
        },
        {
          status: 401,
        },
      );
    }

    const passwordIsCorrect = await bcrypt.compare(
      password,
      user.password,
    );

    if (!passwordIsCorrect) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên đăng nhập hoặc mật khẩu không chính xác",
        },
        {
          status: 401,
        },
      );
    }

    const token = await createSessionToken({
      userId: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Đăng nhập thành công",
        user: {
          id: user._id.toString(),
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        },
      },
      {
        status: 200,
      },
    );

    response.cookies.set({
      name: "session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Đã xảy ra lỗi trong quá trình đăng nhập",
      },
      {
        status: 500,
      },
    );
  }
}