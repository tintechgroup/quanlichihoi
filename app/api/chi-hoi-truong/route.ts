import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import ChiHoi from "@/models/ChiHoi";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const PHONE_REGEX = /^0\d{9}$/;

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* =========================================================
   GET /api/chi-hoi-truong
========================================================= */

export async function GET(
  request: Request,
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
            "Bạn không có quyền xem danh sách Chi hội trưởng",
        },
        {
          status: 403,
        },
      );
    }

    await connectDB();

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const chiHoiId =
      searchParams
        .get("chiHoiId")
        ?.trim() || "";

    const status =
      searchParams
        .get("status")
        ?.trim() || "";

    const filter: Record<
      string,
      unknown
    > = {
      role: "CHI_HOI_TRUONG",
    };

    if (search) {
      filter.$or = [
        {
          username: {
            $regex: search,
            $options: "i",
          },
        },
        {
          fullName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (chiHoiId) {
      filter.chiHoiId =
        chiHoiId;
    }

    if (
      status === "ACTIVE"
    ) {
      filter.isActive = true;
    }

    if (
      status === "INACTIVE"
    ) {
      filter.isActive = false;
    }

    const data =
      await User.find(filter)
        .select("-password")
        .populate(
          "chiHoiId",
          "maChiHoi tenChiHoi",
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET /api/chi-hoi-truong:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tải danh sách Chi hội trưởng",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST /api/chi-hoi-truong
   Tạo tài khoản Chi hội trưởng
========================================================= */

export async function POST(
  request: Request,
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
            "Bạn không có quyền tạo tài khoản Chi hội trưởng",
        },
        {
          status: 403,
        },
      );
    }

    const body =
      await request.json();

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

    const fullName =
      typeof body.fullName ===
      "string"
        ? body.fullName.trim()
        : "";

    const email =
      typeof body.email ===
      "string"
        ? body.email
            .trim()
            .toLowerCase()
        : "";

    const phone =
      typeof body.phone ===
      "string"
        ? body.phone.trim()
        : "";

    const chiHoiId =
      typeof body.chiHoiId ===
      "string"
        ? body.chiHoiId.trim()
        : "";

    if (
      !username ||
      !password ||
      !fullName ||
      !chiHoiId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu, họ tên và Chi hội",
        },
        {
          status: 400,
        },
      );
    }

    if (
      username.length < 4
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tên đăng nhập phải có ít nhất 4 ký tự",
        },
        {
          status: 400,
        },
      );
    }

    if (
      password.length < 6
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mật khẩu phải có ít nhất 6 ký tự",
        },
        {
          status: 400,
        },
      );
    }

    if (
      email &&
      !EMAIL_REGEX.test(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email không đúng định dạng",
        },
        {
          status: 400,
        },
      );
    }

    if (
      phone &&
      !PHONE_REGEX.test(phone)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const chiHoi =
      await ChiHoi.findById(
        chiHoiId,
      ).lean();

    if (!chiHoi) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chi hội không tồn tại",
        },
        {
          status: 404,
        },
      );
    }

    const existingUser =
      await User.findOne({
        username,
      }).lean();

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tên đăng nhập đã tồn tại",
        },
        {
          status: 409,
        },
      );
    }

    if (email) {
      const duplicateEmail =
        await User.findOne({
          email,
        }).lean();

      if (duplicateEmail) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Email đã được sử dụng",
          },
          {
            status: 409,
          },
        );
      }
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10,
      );

    const user =
      await User.create({
        username,
        password:
          hashedPassword,
        fullName,
        email:
          email || undefined,
        phone:
          phone || undefined,
        role:
          "CHI_HOI_TRUONG",
        chiHoiId,
        isActive: true,
      });

    await writeSystemLog({
      userId:
        session.userId,

      username:
        session.username,

      fullName:
        session.fullName,

      role:
        session.role,

      action: "CREATE",

      module:
        "HE_THONG",

      description:
        `${session.fullName} đã tạo tài khoản Chi hội trưởng ${fullName}`,

      targetId:
        user._id.toString(),

      targetName:
        fullName,

      metadata: {
        username,
        email,
        phone,
        chiHoiId,
        role:
          "CHI_HOI_TRUONG",
      },

      ipAddress:
        getRequestIp(request),

      userAgent:
        getUserAgent(request),
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Tạo Chi hội trưởng thành công",

        data: {
          id:
            user._id.toString(),
          username:
            user.username,
          fullName:
            user.fullName,
          email:
            user.email || "",
          phone:
            user.phone || "",
          role:
            user.role,
          chiHoiId:
            user.chiHoiId,
          isActive:
            user.isActive,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/chi-hoi-truong:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tạo Chi hội trưởng",
      },
      {
        status: 500,
      },
    );
  }
}