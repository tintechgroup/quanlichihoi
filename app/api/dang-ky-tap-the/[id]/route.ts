import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import DangKyTapTheHoatDong from "@/models/DangKyTapTheHoatDong";
import User from "@/models/User";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   PATCH /api/dang-ky-tap-the/:id
========================================================= */

export async function PATCH(
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
      session.role !==
        "ADMIN" &&
      session.role !==
        "BAN_CHAP_HANH"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền tiếp nhận danh sách đăng ký",
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
            "ID đăng ký không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    const action =
      typeof body.action ===
      "string"
        ? body.action
        : "";

    if (
      action !==
      "RECEIVE"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Thao tác không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const record =
      await DangKyTapTheHoatDong.findById(
        id,
      )
        .populate(
          "hoatDongId",
          "maHoatDong tenHoatDong",
        )
        .populate(
          "chiHoiId",
          "maChiHoi tenChiHoi",
        );

    if (!record) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy danh sách đăng ký",
        },
        {
          status: 404,
        },
      );
    }

    if (
      record.trangThai ===
      "DA_TIEP_NHAN"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Danh sách đã được tiếp nhận trước đó",
        },
        {
          status: 409,
        },
      );
    }

    const currentUser =
      await User.findById(
        session.userId,
      )
        .select(
          "fullName",
        );

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy người xử lý",
        },
        {
          status: 404,
        },
      );
    }

    record.trangThai =
      "DA_TIEP_NHAN";

    record.nguoiTiepNhanId =
      currentUser._id;

    record.nguoiTiepNhanTen =
      currentUser.fullName;

    record.ngayTiepNhan =
      new Date();

    await record.save();

    const activity =
      record.hoatDongId as unknown as {
        maHoatDong?: string;
        tenHoatDong?: string;
      };

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
        "APPROVE",

      module:
        "HOAT_DONG",

      description:
        `${session.fullName} đã tiếp nhận danh sách đăng ký tập thể cho hoạt động ${activity?.maHoatDong || ""} - ${activity?.tenHoatDong || ""}`,

      targetId:
        record._id.toString(),

      targetName:
        activity?.tenHoatDong ||
        "Đăng ký tập thể",

      metadata: {
        loai:
          "DANG_KY_TAP_THE",

        soLuongHoiVien:
          record.hoiVienIds.length,
      },

      ipAddress:
        getRequestIp(request),

      userAgent:
        getUserAgent(request),
    });

    return NextResponse.json({
      success: true,

      message:
        "Tiếp nhận danh sách đăng ký thành công",

      data: record,
    });
  } catch (error) {
    console.error(
      "PATCH /api/dang-ky-tap-the/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể tiếp nhận danh sách đăng ký",
      },
      {
        status: 500,
      },
    );
  }
}