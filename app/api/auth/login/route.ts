import bcrypt from "bcryptjs";

import {
  NextResponse,
} from "next/server";

import {
  connectDB,
} from "@/lib/mongodb";

import {
  createSessionToken,
} from "@/lib/auth";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import User from "@/models/User";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

/* =========================================================
   POST /api/auth/login
========================================================= */

export async function POST(
  request:
    Request,
) {
  try {
    let body: {
      username?: unknown;
      password?: unknown;
    };

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Dữ liệu đăng nhập không hợp lệ",
        },
        {
          status:
            400,
        },
      );
    }

    const username =
      typeof body.username ===
      "string"
        ? body.username
            .trim()
            .toLowerCase()
        : "";

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    if (!username) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Vui lòng nhập tên đăng nhập",
        },
        {
          status:
            400,
        },
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Vui lòng nhập mật khẩu",
        },
        {
          status:
            400,
        },
      );
    }

    await connectDB();

    const user =
      await User.findOne({
        username,
      }).select(
        "+password",
      );

    /*
     * Không phân biệt:
     * - username không tồn tại
     * - mật khẩu sai
     *
     * Tránh lộ tài khoản nào tồn tại.
     */
    if (!user) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Tên đăng nhập hoặc mật khẩu không đúng",
        },
        {
          status:
            401,
        },
      );
    }

    if (
      user.isActive ===
      false
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Tài khoản đã bị ngừng hoạt động",
        },
        {
          status:
            403,
        },
      );
    }

    const passwordMatched =
      await bcrypt.compare(
        password,
        user.password,
      );

    if (!passwordMatched) {
      /*
       * KHÔNG:
       * - tăng số lần sai
       * - khóa tài khoản
       * - tạo lockUntil
       * - bắt chờ 15 phút
       */
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Tên đăng nhập hoặc mật khẩu không đúng",
        },
        {
          status:
            401,
        },
      );
    }

    /* =====================================================
       CREATE SESSION
    ===================================================== */

    const token =
      await createSessionToken({
        userId:
          user._id.toString(),

        username:
          user.username,

        fullName:
          user.fullName,

        role:
          user.role,
      });

    /* =====================================================
       SYSTEM LOG
    ===================================================== */

    await writeSystemLog({
      userId:
        user._id.toString(),

      username:
        user.username,

      fullName:
        user.fullName,

      role:
        user.role,

      action:
        "LOGIN",

      module:
        "AUTH",

      description:
        `${user.fullName} đăng nhập hệ thống`,

      targetId:
        user._id.toString(),

      targetName:
        user.fullName,

      metadata: {
        username:
          user.username,
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

    /* =====================================================
       RESPONSE
    ===================================================== */

    const response =
      NextResponse.json({
        success:
          true,

        message:
          "Đăng nhập thành công",

        user: {
          id:
            user._id.toString(),

          username:
            user.username,

          fullName:
            user.fullName,

          role:
            user.role,

          email:
            user.email ||
            "",

          phone:
            user.phone ||
            "",

          chiHoiId:
            user.chiHoiId
              ? user.chiHoiId.toString()
              : null,
        },

        data: {
          id:
            user._id.toString(),

          username:
            user.username,

          fullName:
            user.fullName,

          role:
            user.role,

          email:
            user.email ||
            "",

          phone:
            user.phone ||
            "",

          chiHoiId:
            user.chiHoiId
              ? user.chiHoiId.toString()
              : null,
        },
      });

    response.cookies.set(
      "session",
      token,
      {
        httpOnly:
          true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          60 *
          60 *
          8,
      },
    );

    return response;
  } catch (
    error
  ) {
    console.error(
      "POST /api/auth/login:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          process.env.NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? error.message
              : "Không thể đăng nhập"
            : "Không thể đăng nhập",
      },
      {
        status:
          500,
      },
    );
  }
}