import {
  NextResponse,
} from "next/server";

import {
  Types,
} from "mongoose";

import {
  connectDB,
} from "@/lib/mongodb";

import {
  getCurrentSession,
} from "@/lib/session";

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

async function requireAdmin() {
  const session =
    await getCurrentSession();

  if (!session) {
    return {
      error:
        errorResponse(
          "Bạn chưa đăng nhập",
          401,
        ),

      session:
        null,
    };
  }

  if (
    session.role !==
    "ADMIN"
  ) {
    return {
      error:
        errorResponse(
          "Bạn không có quyền thực hiện thao tác này",
          403,
        ),

      session:
        null,
    };
  }

  return {
    error:
      null,

    session,
  };
}

/* =========================================================
   GET
   DANH SÁCH TÀI KHOẢN CÓ LỖI ĐĂNG NHẬP
========================================================= */

export async function GET() {
  try {
    const auth =
      await requireAdmin();

    if (
      auth.error
    ) {
      return auth.error;
    }

    await connectDB();

    const now =
      new Date();

    /*
     * Lấy cả:
     *
     * - tài khoản đang bị khóa
     * - tài khoản đã đăng nhập sai nhưng chưa đủ 5 lần
     *
     * Admin có thể theo dõi trạng thái bảo mật.
     */
    const users =
      await User.find({
        $or: [
          {
            failedLoginAttempts: {
              $gt: 0,
            },
          },
          {
            lockUntil: {
              $gt: now,
            },
          },
        ],
      })
        .select(
          "username fullName email phone role isActive failedLoginAttempts lockUntil lastFailedLoginAt lastLoginAt",
        )
        .sort({
          lockUntil:
            -1,

          lastFailedLoginAt:
            -1,
        })
        .lean();

    const danhSach =
      users.map(
        (
          user,
        ) => {
          const locked =
            Boolean(
              user.lockUntil &&
                new Date(
                  user.lockUntil,
                ) >
                  now,
            );

          const remainingSeconds =
            locked &&
            user.lockUntil
              ? Math.max(
                  0,

                  Math.ceil(
                    (
                      new Date(
                        user.lockUntil,
                      ).getTime() -
                      now.getTime()
                    ) /
                      1000,
                  ),
                )
              : 0;

          return {
            id:
              user._id.toString(),

            username:
              user.username,

            fullName:
              user.fullName,

            email:
              user.email ||
              "",

            phone:
              user.phone ||
              "",

            role:
              user.role,

            isActive:
              user.isActive,

            failedLoginAttempts:
              user.failedLoginAttempts ||
              0,

            locked,

            lockUntil:
              user.lockUntil ||
              null,

            remainingSeconds,

            lastFailedLoginAt:
              user.lastFailedLoginAt ||
              null,

            lastLoginAt:
              user.lastLoginAt ||
              null,
          };
        },
      );

    const dangBiKhoa =
      danhSach.filter(
        (
          item,
        ) =>
          item.locked,
      ).length;

    const coCanhBao =
      danhSach.filter(
        (
          item,
        ) =>
          !item.locked &&
          item.failedLoginAttempts >
            0,
      ).length;

    return NextResponse.json({
      success:
        true,

      message:
        "Lấy trạng thái bảo mật tài khoản thành công",

      data: {
        summary: {
          total:
            danhSach.length,

          locked:
            dangBiKhoa,

          warning:
            coCanhBao,
        },

        danhSach,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/auth/locked-accounts:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          process.env.NODE_ENV ===
          "development"
            ? error instanceof Error
              ? error.message
              : "Không thể tải trạng thái tài khoản"
            : "Không thể tải trạng thái tài khoản",
      },
      {
        status:
          500,
      },
    );
  }
}

/* =========================================================
   PATCH
   ADMIN MỞ KHÓA / RESET SỐ LẦN ĐĂNG NHẬP SAI
========================================================= */

export async function PATCH(
  request: Request,
) {
  try {
    const auth =
      await requireAdmin();

    if (
      auth.error ||
      !auth.session
    ) {
      return auth.error;
    }

    let body: {
      userId?: unknown;
    };

    try {
      body =
        await request.json();
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    const userId =
      typeof body.userId ===
      "string"
        ? body.userId.trim()
        : "";

    if (
      !userId ||
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      return errorResponse(
        "Tài khoản cần mở khóa không hợp lệ",
      );
    }

    await connectDB();

    const user =
      await User.findById(
        userId,
      );

    if (!user) {
      return errorResponse(
        "Không tìm thấy tài khoản",
        404,
      );
    }

    /*
     * Không thay đổi isActive.
     *
     * isActive là trạng thái khóa/ngừng hoạt động
     * do quản trị nghiệp vụ.
     *
     * Chúng ta chỉ xử lý khóa tạm do login sai.
     */
    const oldAttempts =
      user.failedLoginAttempts ||
      0;

    const oldLockUntil =
      user.lockUntil ||
      null;

    user.failedLoginAttempts =
      0;

    user.lockUntil =
      null;

    user.lastFailedLoginAt =
      null;

    await user.save();

    await writeSystemLog({
      userId:
        auth.session.userId,

      username:
        auth.session.username,

      fullName:
        auth.session.fullName,

      role:
        auth.session.role,

      action:
        "UPDATE",

      module:
        "AUTH",

      description:
        `${auth.session.fullName} đã mở khóa đăng nhập cho tài khoản ${user.username}`,

      targetId:
        user._id.toString(),

      targetName:
        user.fullName,

      metadata: {
        targetUsername:
          user.username,

        oldFailedLoginAttempts:
          oldAttempts,

        oldLockUntil,

        action:
          "UNLOCK_LOGIN",
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

    return NextResponse.json({
      success:
        true,

      message:
        `Đã mở khóa đăng nhập cho tài khoản ${user.username}`,

      data: {
        id:
          user._id.toString(),

        username:
          user.username,

        fullName:
          user.fullName,

        failedLoginAttempts:
          0,

        lockUntil:
          null,

        locked:
          false,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "PATCH /api/auth/locked-accounts:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          process.env.NODE_ENV ===
          "development"
            ? error instanceof Error
              ? error.message
              : "Không thể mở khóa tài khoản"
            : "Không thể mở khóa tài khoản",
      },
      {
        status:
          500,
      },
    );
  }
}