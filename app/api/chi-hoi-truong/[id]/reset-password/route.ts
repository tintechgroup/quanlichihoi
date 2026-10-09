import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import User from "@/models/User";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
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
            "Bạn không có quyền đặt lại mật khẩu",
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
            "ID không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    const newPassword =
      typeof body.newPassword ===
      "string"
        ? body.newPassword
        : "";

    if (
      newPassword.length < 6
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mật khẩu mới phải có ít nhất 6 ký tự",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const user =
      await User.findOne({
        _id: id,
        role:
          "CHI_HOI_TRUONG",
      }).select("+password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy Chi hội trưởng",
        },
        {
          status: 404,
        },
      );
    }

    user.password =
      await bcrypt.hash(
        newPassword,
        10,
      );

    await user.save();

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
        "RESET_PASSWORD",

      module: "AUTH",

      description:
        `${session.fullName} đã đặt lại mật khẩu cho Chi hội trưởng ${user.fullName}`,

      targetId:
        user._id.toString(),

      targetName:
        user.fullName,

      metadata: {
        username:
          user.username,
      },

      ipAddress:
        getRequestIp(request),

      userAgent:
        getUserAgent(request),
    });

    return NextResponse.json({
      success: true,

      message:
        "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    console.error(
      "POST reset password CHT:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể đặt lại mật khẩu",
      },
      {
        status: 500,
      },
    );
  }
}