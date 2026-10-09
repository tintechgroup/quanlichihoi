import { NextResponse } from "next/server";

import { createSessionToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getCurrentSession();

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

    await connectDB();

    const user = await User.findById(session.userId).lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy tài khoản",
        },
        {
          status: 404,
        },
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          message: "Tài khoản đã bị tạm ngừng",
        },
        {
          status: 403,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          fullName: user.fullName,
          email: user.email ?? "",
          phone: user.phone ?? "",
          role: user.role,
          chiHoiId: user.chiHoiId
            ? user.chiHoiId.toString()
            : null,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Lỗi lấy hồ sơ cá nhân:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể tải hồ sơ cá nhân",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentSession();

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

    const body = await request.json();

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          message: "Họ tên không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (
      fullName.length < 2 ||
      fullName.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Họ tên phải từ 2 đến 100 ký tự",
        },
        {
          status: 400,
        },
      );
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Email không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      phone &&
      !/^[0-9+\s.-]{8,20}$/.test(phone)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Số điện thoại không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const user = await User.findById(session.userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy tài khoản",
        },
        {
          status: 404,
        },
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          message: "Tài khoản đã bị tạm ngừng",
        },
        {
          status: 403,
        },
      );
    }

    user.fullName = fullName;
    user.email = email;
    user.phone = phone;

    await user.save();

    /*
     * Tạo lại session token vì fullName được lưu
     * trong JWT hiện tại.
     */
    const token = await createSessionToken({
      userId: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Cập nhật hồ sơ thành công",
        user: {
          id: user._id.toString(),
          username: user.username,
          fullName: user.fullName,
          email: user.email ?? "",
          phone: user.phone ?? "",
          role: user.role,
          chiHoiId: user.chiHoiId
            ? user.chiHoiId.toString()
            : null,
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
    console.error("Lỗi cập nhật hồ sơ:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể cập nhật hồ sơ",
      },
      {
        status: 500,
      },
    );
  }
}