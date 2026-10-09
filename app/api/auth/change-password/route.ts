import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   TYPES
========================================================= */

type ChangePasswordBody = {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
};

/* =========================================================
   HELPERS
========================================================= */

function errorResponse(
  message: string,
  status = 400,
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
    },
  );
}

function getString(
  value: unknown,
) {
  return typeof value === "string"
    ? value
    : "";
}

function validateNewPassword(
  password: string,
) {
  if (
    password.length < 8
  ) {
    return "Mật khẩu mới phải có ít nhất 8 ký tự";
  }

  if (
    !/[a-z]/.test(
      password,
    )
  ) {
    return "Mật khẩu mới phải có ít nhất 1 chữ thường";
  }

  if (
    !/[A-Z]/.test(
      password,
    )
  ) {
    return "Mật khẩu mới phải có ít nhất 1 chữ hoa";
  }

  if (
    !/[0-9]/.test(
      password,
    )
  ) {
    return "Mật khẩu mới phải có ít nhất 1 chữ số";
  }

  return "";
}

/* =========================================================
   POST /api/auth/change-password
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       SESSION
    ===================================================== */

    const session =
      await getCurrentSession();

    if (!session) {
      return errorResponse(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    if (
      !Types.ObjectId.isValid(
        session.userId,
      )
    ) {
      return errorResponse(
        "Phiên đăng nhập không hợp lệ",
        401,
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body:
      ChangePasswordBody;

    try {
      body =
        await request.json();
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    const currentPassword =
      getString(
        body.currentPassword,
      );

    const newPassword =
      getString(
        body.newPassword,
      );

    const confirmPassword =
      getString(
        body.confirmPassword,
      );

    /* =====================================================
       VALIDATE INPUT
    ===================================================== */

    if (
      !currentPassword
    ) {
      return errorResponse(
        "Vui lòng nhập mật khẩu hiện tại",
      );
    }

    if (
      !newPassword
    ) {
      return errorResponse(
        "Vui lòng nhập mật khẩu mới",
      );
    }

    if (
      !confirmPassword
    ) {
      return errorResponse(
        "Vui lòng xác nhận mật khẩu mới",
      );
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      return errorResponse(
        "Mật khẩu xác nhận không trùng khớp",
      );
    }

    const passwordError =
      validateNewPassword(
        newPassword,
      );

    if (
      passwordError
    ) {
      return errorResponse(
        passwordError,
      );
    }

    /* =====================================================
       DATABASE
    ===================================================== */

    await connectDB();

    const user =
      await User.findById(
        session.userId,
      ).select(
        "+password",
      );

    if (!user) {
      return errorResponse(
        "Không tìm thấy tài khoản",
        404,
      );
    }

    if (
      user.isActive ===
      false
    ) {
      return errorResponse(
        "Tài khoản đã bị khóa hoặc ngừng hoạt động",
        403,
      );
    }

    /* =====================================================
       CHECK CURRENT PASSWORD
    ===================================================== */

    const currentMatched =
      await bcrypt.compare(
        currentPassword,
        user.password,
      );

    if (
      !currentMatched
    ) {
      return errorResponse(
        "Mật khẩu hiện tại không chính xác",
        400,
      );
    }

    /* =====================================================
       PREVENT REUSE CURRENT PASSWORD
    ===================================================== */

    const sameAsCurrent =
      await bcrypt.compare(
        newPassword,
        user.password,
      );

    if (
      sameAsCurrent
    ) {
      return errorResponse(
        "Mật khẩu mới không được trùng với mật khẩu hiện tại",
        400,
      );
    }

    /* =====================================================
       HASH NEW PASSWORD
    ===================================================== */

    const saltRounds =
      12;

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        saltRounds,
      );

    /* =====================================================
       UPDATE
    ===================================================== */

    user.password =
      hashedPassword;

    await user.save();

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
        "CHANGE_PASSWORD",

      module:
        "AUTH",

      description:
        `${user.fullName} đã thay đổi mật khẩu tài khoản`,

      targetId:
        user._id.toString(),

      targetName:
        user.fullName,

      metadata: {
        username:
          user.username,

        role:
          user.role,
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

    return NextResponse.json({
      success: true,

      message:
        "Đổi mật khẩu thành công",
    });
  } catch (
    error
  ) {
    console.error(
      "POST /api/auth/change-password:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          process.env.NODE_ENV ===
          "development"
            ? error instanceof Error
              ? error.message
              : "Không thể đổi mật khẩu"
            : "Không thể đổi mật khẩu. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}