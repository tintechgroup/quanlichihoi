import { get } from "@vercel/blob";

import mongoose from "mongoose";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import { getCurrentSession } from "@/lib/session";

import HoatDong from "@/models/HoatDong";

import HoiVien from "@/models/HoiVien";

import User from "@/models/User";

export const dynamic =
  "force-dynamic";

/* =========================================================
   HELPERS
========================================================= */

async function getUserChiHoiId({
  userId,
  role,
}: {
  userId: string;
  role: string;
}) {
  if (
    !mongoose.Types.ObjectId.isValid(
      userId,
    )
  ) {
    return null;
  }

  if (
    role ===
    "CHI_HOI_TRUONG"
  ) {
    const user =
      await User.findById(
        userId,
      )
        .select(
          "chiHoiId",
        )
        .lean();

    if (
      user?.chiHoiId
    ) {
      return String(
        user.chiHoiId,
      );
    }

    const member =
      await HoiVien.findOne({
        taiKhoanId:
          userId,
      })
        .select(
          "chiHoiId",
        )
        .lean();

    return member?.chiHoiId
      ? String(
          member.chiHoiId,
        )
      : null;
  }

  if (
    role ===
    "HOI_VIEN"
  ) {
    const member =
      await HoiVien.findOne({
        taiKhoanId:
          userId,
      })
        .select(
          "chiHoiId",
        )
        .lean();

    if (
      member?.chiHoiId
    ) {
      return String(
        member.chiHoiId,
      );
    }

    const user =
      await User.findById(
        userId,
      )
        .select(
          "chiHoiId",
        )
        .lean();

    return user?.chiHoiId
      ? String(
          user.chiHoiId,
        )
      : null;
  }

  return null;
}

/* =========================================================
   GET
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

    const { searchParams } =
      new URL(
        request.url,
      );

    const id =
      searchParams
        .get("id")
        ?.trim() ||
      "";

    if (
      !mongoose.Types.ObjectId.isValid(
        id,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã hoạt động không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const activity =
      await HoatDong.findById(
        id,
      )
        .select(
          [
            "phamVi",
            "chiHoiId",
            "nguoiTaoId",
            "trangThai",
            "fileKeHoach",
          ].join(" "),
        )
        .lean();

    if (!activity) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy hoạt động",
        },
        {
          status: 404,
        },
      );
    }

    if (
      !activity.fileKeHoach
        ?.duongDan
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hoạt động chưa có file kế hoạch",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       PERMISSION
    ===================================================== */

    let allowed =
      session.role ===
        "ADMIN" ||
      session.role ===
        "BAN_CHAP_HANH";

    if (
      session.role ===
        "CHI_HOI_TRUONG"
    ) {
      const ownChiHoiId =
        await getUserChiHoiId({
          userId:
            session.userId,

          role:
            session.role,
        });

      allowed =
        Boolean(
          ownChiHoiId &&
            activity.chiHoiId &&
            ownChiHoiId ===
              String(
                activity.chiHoiId,
              ),
        );
    }

    /*
     * Hội viên không cần được xem
     * file kế hoạch nội bộ/đề xuất.
     */
    if (
      session.role ===
      "HOI_VIEN"
    ) {
      allowed =
        false;
    }

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền xem file kế hoạch này",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       PUBLIC / LEGACY URL
    ===================================================== */

    const pathname =
      activity.fileKeHoach
        .pathname ||
      "";

    if (!pathname) {
      return NextResponse.redirect(
        activity.fileKeHoach
          .duongDan,
      );
    }

    /* =====================================================
       PRIVATE BLOB
    ===================================================== */

    const result =
      await get(
        pathname,
        {
          access:
            "private",
        },
      );

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy file kế hoạch trên hệ thống lưu trữ",
        },
        {
          status: 404,
        },
      );
    }

    const headers =
      new Headers();

    headers.set(
      "Content-Type",
      result.blob
        .contentType ||
        activity.fileKeHoach
          .mimeType ||
        "application/octet-stream",
    );

    headers.set(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(
        activity.fileKeHoach
          .tenTep ||
          "ke-hoach",
      )}`,
    );

    headers.set(
      "Cache-Control",
      "private, no-store",
    );

    return new Response(
      result.stream,
      {
        headers,
      },
    );
  } catch (error) {
    console.error(
      "GET /api/hoat-dong/file:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          process.env
            .NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? error.message
              : "Không thể mở file kế hoạch"
            : "Không thể mở file kế hoạch",
      },
      {
        status: 500,
      },
    );
  }
}