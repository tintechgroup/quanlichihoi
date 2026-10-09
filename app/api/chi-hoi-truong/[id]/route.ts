import mongoose from "mongoose";
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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const PHONE_REGEX =
  /^0\d{9}$/;

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function checkPermission() {
  const session =
    await getCurrentSession();

  if (!session) {
    return {
      error:
        NextResponse.json(
          {
            success: false,
            message:
              "Bạn chưa đăng nhập",
          },
          {
            status: 401,
          },
        ),
      session: null,
    };
  }

  if (
    session.role !== "ADMIN" &&
    session.role !==
      "BAN_CHAP_HANH"
  ) {
    return {
      error:
        NextResponse.json(
          {
            success: false,
            message:
              "Bạn không có quyền quản lý Chi hội trưởng",
          },
          {
            status: 403,
          },
        ),
      session: null,
    };
  }

  return {
    error: null,
    session,
  };
}

/* =========================================================
   GET DETAIL
========================================================= */

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const permission =
      await checkPermission();

    if (
      permission.error ||
      !permission.session
    ) {
      return permission.error!;
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

    await connectDB();

    const user =
      await User.findOne({
        _id: id,
        role:
          "CHI_HOI_TRUONG",
      })
        .select("-password")
        .populate(
          "chiHoiId",
          "maChiHoi tenChiHoi",
        )
        .lean();

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

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(
      "GET /api/chi-hoi-truong/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tải thông tin Chi hội trưởng",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PUT
========================================================= */

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    const permission =
      await checkPermission();

    if (
      permission.error ||
      !permission.session
    ) {
      return permission.error!;
    }

    const session =
      permission.session;

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
      !fullName ||
      !chiHoiId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng nhập họ tên và Chi hội",
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

    const currentUser =
      await User.findOne({
        _id: id,
        role:
          "CHI_HOI_TRUONG",
      });

    if (!currentUser) {
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

    if (email) {
      const duplicate =
        await User.findOne({
          email,
          _id: {
            $ne: id,
          },
        }).lean();

      if (duplicate) {
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

    const oldData = {
      fullName:
        currentUser.fullName,

      email:
        currentUser.email || "",

      phone:
        currentUser.phone || "",

      chiHoiId:
        currentUser.chiHoiId?.toString() ||
        "",

      isActive:
        currentUser.isActive,
    };

    currentUser.fullName =
      fullName;

    currentUser.email =
      email || undefined;

    currentUser.phone =
      phone || undefined;

    currentUser.chiHoiId =
      new mongoose.Types.ObjectId(
        chiHoiId,
      );

    await currentUser.save();

    await writeSystemLog({
      userId:
        session.userId,

      username:
        session.username,

      fullName:
        session.fullName,

      role:
        session.role,

      action: "UPDATE",

      module:
        "HE_THONG",

      description:
        `${session.fullName} đã cập nhật Chi hội trưởng ${fullName}`,

      targetId:
        currentUser._id.toString(),

      targetName:
        fullName,

      metadata: {
        before: oldData,

        after: {
          fullName,
          email,
          phone,
          chiHoiId,
          isActive:
            currentUser.isActive,
        },
      },

      ipAddress:
        getRequestIp(request),

      userAgent:
        getUserAgent(request),
    });

    return NextResponse.json({
      success: true,
      message:
        "Cập nhật Chi hội trưởng thành công",
    });
  } catch (error) {
    console.error(
      "PUT /api/chi-hoi-truong/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể cập nhật Chi hội trưởng",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PATCH STATUS
========================================================= */

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const permission =
      await checkPermission();

    if (
      permission.error ||
      !permission.session
    ) {
      return permission.error!;
    }

    const session =
      permission.session;

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

    if (
      typeof body.isActive !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trạng thái không hợp lệ",
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
      });

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

    const oldStatus =
      user.isActive;

    user.isActive =
      body.isActive;

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

      action: "UPDATE",

      module:
        "HE_THONG",

      description:
        body.isActive
          ? `${session.fullName} đã mở khóa tài khoản Chi hội trưởng ${user.fullName}`
          : `${session.fullName} đã khóa tài khoản Chi hội trưởng ${user.fullName}`,

      targetId:
        user._id.toString(),

      targetName:
        user.fullName,

      metadata: {
        before: {
          isActive:
            oldStatus,
        },

        after: {
          isActive:
            user.isActive,
        },
      },

      ipAddress:
        getRequestIp(request),

      userAgent:
        getUserAgent(request),
    });

    return NextResponse.json({
      success: true,

      message:
        body.isActive
          ? "Mở khóa tài khoản thành công"
          : "Khóa tài khoản thành công",
    });
  } catch (error) {
    console.error(
      "PATCH /api/chi-hoi-truong/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể cập nhật trạng thái tài khoản",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   DELETE
========================================================= */

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    const permission =
      await checkPermission();

    if (
      permission.error ||
      !permission.session
    ) {
      return permission.error!;
    }

    const session =
      permission.session;

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

    await connectDB();

    const user =
      await User.findOne({
        _id: id,
        role:
          "CHI_HOI_TRUONG",
      });

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

    const deletedData = {
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

      chiHoiId:
        user.chiHoiId?.toString() ||
        "",
    };

    await User.findByIdAndDelete(
      id,
    );

    await writeSystemLog({
      userId:
        session.userId,

      username:
        session.username,

      fullName:
        session.fullName,

      role:
        session.role,

      action: "DELETE",

      module:
        "HE_THONG",

      description:
        `${session.fullName} đã xóa tài khoản Chi hội trưởng ${deletedData.fullName}`,

      targetId:
        deletedData.id,

      targetName:
        deletedData.fullName,

      metadata: {
        deletedData,
      },

      ipAddress:
        getRequestIp(request),

      userAgent:
        getUserAgent(request),
    });

    return NextResponse.json({
      success: true,

      message:
        "Xóa Chi hội trưởng thành công",
    });
  } catch (error) {
    console.error(
      "DELETE /api/chi-hoi-truong/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể xóa Chi hội trưởng",
      },
      {
        status: 500,
      },
    );
  }
}