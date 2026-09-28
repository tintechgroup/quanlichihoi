import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session?.userId) {
      const response = NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không tồn tại hoặc đã hết hạn",
        },
        {
          status: 401,
        },
      );

      response.cookies.set({
        name: "session",
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });

      return response;
    }

    await connectDB();

    const user = await User.findById(session.userId)
      .select("_id username fullName role isActive")
      .lean();

    if (!user) {
      const response = NextResponse.json(
        {
          success: false,
          message: "Tài khoản không còn tồn tại",
        },
        {
          status: 401,
        },
      );

      response.cookies.set({
        name: "session",
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });

      return response;
    }

    if (!user.isActive) {
      const response = NextResponse.json(
        {
          success: false,
          message: "Tài khoản đã bị vô hiệu hóa",
        },
        {
          status: 403,
        },
      );

      response.cookies.set({
        name: "session",
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });

      return response;
    }

    const currentUser = {
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Lấy thông tin tài khoản thành công",

        // DashboardShell có thể đọc result.user
        user: currentUser,

        // Đồng thời hỗ trợ result.data.user
        data: {
          user: currentUser,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Lỗi lấy thông tin tài khoản:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể kiểm tra phiên đăng nhập",
      },
      {
        status: 500,
      },
    );
  }
}