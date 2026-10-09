import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import {
  getCurrentSession,
} from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

export async function POST(
  request: Request,
) {
  try {
    /*
     * Lấy session trước khi
     * xóa cookie.
     */
    const session =
      await getCurrentSession();

    /*
     * Chỉ cần DB khi có session
     * và cần ghi nhật ký.
     */
    if (session) {
      await connectDB();

      await writeSystemLog({
        userId:
          session.userId,

        username:
          session.username,

        fullName:
          session.fullName,

        role:
          session.role,

        action:
          "LOGOUT",

        module:
          "AUTH",

        description:
          `${session.fullName} đăng xuất khỏi hệ thống`,

        targetId:
          session.userId,

        targetName:
          session.fullName,

        metadata: {
          username:
            session.username,
        },

        ipAddress:
          getRequestIp(
            request,
          ),

        userAgent:
          getUserAgent(
            request,
          ),
      });
    }

    const response =
      NextResponse.json({
        success: true,

        message:
          "Đăng xuất thành công",
      });

    response.cookies.set(
      "session",
      "",
      {
        httpOnly: true,

        secure:
          process.env
            .NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path: "/",

        expires:
          new Date(0),

        maxAge: 0,
      },
    );

    return response;
  } catch (error) {
    console.error(
      "POST /api/auth/logout:",
      error,
    );

    /*
     * Ngay cả khi ghi log hoặc DB lỗi,
     * vẫn ưu tiên xóa cookie để user
     * đăng xuất được.
     */
    const response =
      NextResponse.json({
        success: true,

        message:
          "Đăng xuất thành công",
      });

    response.cookies.set(
      "session",
      "",
      {
        httpOnly: true,

        secure:
          process.env
            .NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path: "/",

        expires:
          new Date(0),

        maxAge: 0,
      },
    );

    return response;
  }
}