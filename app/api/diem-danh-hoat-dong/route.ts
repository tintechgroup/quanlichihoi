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
import DiemDanhHoatDong from "@/models/DiemDanhHoatDong";
import HoatDong from "@/models/HoatDong";
import User from "@/models/User";

export const dynamic =
  "force-dynamic";

const VALID_ATTENDANCE_STATUS =
  [
    "CO_MAT",
    "VANG_MAT",
    "CO_PHEP",
  ] as const;

/* =========================================================
   GET
========================================================= */

export async function GET() {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Báº¡n chÆ°a Ä‘Äƒng nháº­p",
        },
        {
          status: 401,
        },
      );
    }

    if (
      session.role !==
        "CHI_HOI_TRUONG" &&
      session.role !==
        "ADMIN" &&
      session.role !==
        "BAN_CHAP_HANH"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Báº¡n khÃ´ng cÃ³ quyá»n xem dá»¯ liá»‡u Ä‘iá»ƒm danh",
        },
        {
          status: 403,
        },
      );
    }

    await connectDB();

    let chiHoiId:
      | mongoose.Types.ObjectId
      | null = null;

    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      const user =
        await User.findById(
          session.userId,
        )
          .select(
            "chiHoiId",
          )
          .lean();

      if (!user?.chiHoiId) {
        return NextResponse.json({
          success: true,

          data: {
            dangKy: [],
            lichSu: [],
          },
        });
      }

      chiHoiId =
        new mongoose.Types.ObjectId(
          String(
            user.chiHoiId,
          ),
        );
    }

    const registrationFilter: Record<
      string,
      unknown
    > = {
      /*
       * Chá»‰ Ä‘iá»ƒm danh danh sÃ¡ch
       * BCH Ä‘Ã£ tiáº¿p nháº­n.
       */
      trangThai:
        "DA_TIEP_NHAN",
    };

    if (chiHoiId) {
      registrationFilter.chiHoiId =
        chiHoiId;
    }

    const registrationList =
      await DangKyTapTheHoatDong.find(
        registrationFilter,
      )
        .populate({
          path: "hoatDongId",

          select: [
            "maHoatDong",
            "tenHoatDong",
            "phamVi",
            "diaDiem",
            "thoiGianBatDau",
            "thoiGianKetThuc",
            "trangThai",
          ].join(" "),
        })
        .populate(
          "chiHoiId",
          "maChiHoi tenChiHoi",
        )
        .populate(
          "hoiVienIds",
          [
            "maHoiVien",
            "hoTen",
            "lop",
            "email",
            "soDienThoai",
            "trangThai",
          ].join(" "),
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    /*
     * Danh sÃ¡ch nÃ o Ä‘Ã£ Ä‘iá»ƒm danh rá»“i
     * thÃ¬ Ä‘Ã¡nh dáº¥u Ä‘á»ƒ UI khÃ´ng gá»­i láº¡i.
     */
    const registrationIds =
      registrationList.map(
        (item) =>
          item._id,
      );

    const existingAttendance =
      await DiemDanhHoatDong.find(
        {
          dangKyTapTheId: {
            $in:
              registrationIds,
          },
        },
      )
        .select(
          "dangKyTapTheId",
        )
        .lean();

    const attendedIds =
      new Set(
        existingAttendance.map(
          (item) =>
            String(
              item.dangKyTapTheId,
            ),
        ),
      );

    const registrationData =
      registrationList.map(
        (item) => ({
          ...item,

          daDiemDanh:
            attendedIds.has(
              String(
                item._id,
              ),
            ),
        }),
      );

    const historyFilter: Record<
      string,
      unknown
    > = {};

    if (chiHoiId) {
      historyFilter.chiHoiId =
        chiHoiId;
    }

    const history =
      await DiemDanhHoatDong.find(
        historyFilter,
      )
        .populate(
          "hoatDongId",
          [
            "maHoatDong",
            "tenHoatDong",
            "diaDiem",
            "thoiGianBatDau",
            "thoiGianKetThuc",
          ].join(" "),
        )
        .populate(
          "chiHoiId",
          "maChiHoi tenChiHoi",
        )
        .populate(
          "chiTiet.hoiVienId",
          [
            "maHoiVien",
            "hoTen",
            "lop",
          ].join(" "),
        )
        .sort({
          ngayDiemDanh: -1,
        })
        .lean();

    return NextResponse.json({
      success: true,

      data: {
        dangKy:
          registrationData,

        lichSu:
          history,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/diem-danh-hoat-dong:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u Ä‘iá»ƒm danh",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST
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
            "Báº¡n chÆ°a Ä‘Äƒng nháº­p",
        },
        {
          status: 401,
        },
      );
    }

    if (
      session.role !==
      "CHI_HOI_TRUONG"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Chá»‰ Chi há»™i trÆ°á»Ÿng Ä‘Æ°á»£c thá»±c hiá»‡n Ä‘iá»ƒm danh Chi há»™i",
        },
        {
          status: 403,
        },
      );
    }

    const body =
      await request.json();

    const dangKyTapTheId =
      typeof body.dangKyTapTheId ===
      "string"
        ? body.dangKyTapTheId.trim()
        : "";

    const ghiChu =
      typeof body.ghiChu ===
      "string"
        ? body.ghiChu.trim()
        : "";

    const chiTiet =
      Array.isArray(
        body.chiTiet,
      )
        ? body.chiTiet
        : [];

    if (
      !mongoose.isValidObjectId(
        dangKyTapTheId,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Danh sÃ¡ch Ä‘Äƒng kÃ½ khÃ´ng há»£p lá»‡",
        },
        {
          status: 400,
        },
      );
    }

    if (
      chiTiet.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Vui lÃ²ng Ä‘iá»ƒm danh Há»™i viÃªn",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const currentUser =
      await User.findById(
        session.userId,
      )
        .select(
          "fullName chiHoiId",
        );

    if (
      !currentUser ||
      !currentUser.chiHoiId
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "TÃ i khoáº£n Chi há»™i trÆ°á»Ÿng chÆ°a Ä‘Æ°á»£c gÃ¡n Chi há»™i",
        },
        {
          status: 400,
        },
      );
    }

    const registration =
      await DangKyTapTheHoatDong.findById(
        dangKyTapTheId,
      ).lean();

    if (!registration) {
      return NextResponse.json(
        {
          success: false,

          message:
            "KhÃ´ng tÃ¬m tháº¥y danh sÃ¡ch Ä‘Äƒng kÃ½",
        },
        {
          status: 404,
        },
      );
    }

    if (
      String(
        registration.chiHoiId,
      ) !==
      String(
        currentUser.chiHoiId,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Báº¡n khÃ´ng Ä‘Æ°á»£c Ä‘iá»ƒm danh Há»™i viÃªn cá»§a Chi há»™i khÃ¡c",
        },
        {
          status: 403,
        },
      );
    }

    if (
      registration.trangThai !==
      "DA_TIEP_NHAN"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Danh sÃ¡ch Ä‘Äƒng kÃ½ chÆ°a Ä‘Æ°á»£c BCH tiáº¿p nháº­n",
        },
        {
          status: 409,
        },
      );
    }

    const activity =
      await HoatDong.findById(
        registration.hoatDongId,
      ).lean();

    if (!activity) {
      return NextResponse.json(
        {
          success: false,

          message:
            "KhÃ´ng tÃ¬m tháº¥y hoáº¡t Ä‘á»™ng",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * YÃªu cáº§u gá»‘c nÃªu Ä‘iá»ƒm danh
     * trong thá»i gian hoáº¡t Ä‘á»™ng.
     *
     * Hiá»‡n model chÆ°a cÃ³ trÆ°á»ng
     * hanDiemDanh riÃªng nÃªn dÃ¹ng
     * tráº¡ng thÃ¡i DANG_TRIEN_KHAI.
     */
    if (
      activity.trangThai !==
      "DANG_DIEN_RA"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Hoáº¡t Ä‘á»™ng hiá»‡n chÆ°a trong thá»i gian Ä‘iá»ƒm danh",
        },
        {
          status: 409,
        },
      );
    }

    const existed =
      await DiemDanhHoatDong.findOne({
        dangKyTapTheId,
      }).lean();

    if (existed) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Danh sÃ¡ch nÃ y Ä‘Ã£ Ä‘Æ°á»£c Ä‘iá»ƒm danh",
        },
        {
          status: 409,
        },
      );
    }

    const registeredMemberIds =
      registration.hoiVienIds.map(
        (id) =>
          String(id),
      );

    /*
     * Chuáº©n hÃ³a káº¿t quáº£.
     */
    const resultMap =
      new Map<
        string,
        {
          hoiVienId: string;
          trangThai:
            | "CO_MAT"
            | "VANG_MAT"
            | "CO_PHEP";
          ghiChu: string;
        }
      >();

    for (
      const raw of chiTiet
    ) {
      const hoiVienId =
        typeof raw?.hoiVienId ===
        "string"
          ? raw.hoiVienId.trim()
          : "";

      const trangThai =
        typeof raw?.trangThai ===
        "string"
          ? raw.trangThai
          : "";

      const memberNote =
        typeof raw?.ghiChu ===
        "string"
          ? raw.ghiChu.trim()
          : "";

      if (
        !mongoose.isValidObjectId(
          hoiVienId,
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "CÃ³ Há»™i viÃªn khÃ´ng há»£p lá»‡ trong káº¿t quáº£ Ä‘iá»ƒm danh",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !VALID_ATTENDANCE_STATUS.includes(
          trangThai as
            (typeof VALID_ATTENDANCE_STATUS)[number],
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "CÃ³ tráº¡ng thÃ¡i Ä‘iá»ƒm danh khÃ´ng há»£p lá»‡",
          },
          {
            status: 400,
          },
        );
      }

      resultMap.set(
        hoiVienId,
        {
          hoiVienId,

          trangThai:
            trangThai as
              | "CO_MAT"
              | "VANG_MAT"
              | "CO_PHEP",

          ghiChu:
            memberNote,
        },
      );
    }

    /*
     * KhÃ´ng Ä‘Æ°á»£c thiáº¿u Há»™i viÃªn.
     */
    if (
      resultMap.size !==
      registeredMemberIds.length
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Vui lÃ²ng hoÃ n thÃ nh Ä‘iá»ƒm danh cho táº¥t cáº£ Há»™i viÃªn trÆ°á»›c khi lÆ°u",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * KhÃ´ng Ä‘Æ°á»£c gá»­i thÃªm ngÆ°á»i
     * ngoÃ i danh sÃ¡ch Ä‘Äƒng kÃ½.
     */
    const invalidMember =
      Array.from(
        resultMap.keys(),
      ).find(
        (id) =>
          !registeredMemberIds.includes(
            id,
          ),
      );

    if (invalidMember) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Káº¿t quáº£ Ä‘iá»ƒm danh chá»©a Há»™i viÃªn khÃ´ng thuá»™c danh sÃ¡ch Ä‘Äƒng kÃ½",
        },
        {
          status: 400,
        },
      );
    }

    const attendance =
      await DiemDanhHoatDong.create({
        dangKyTapTheId:
          registration._id,

        hoatDongId:
          registration.hoatDongId,

        chiHoiId:
          registration.chiHoiId,

        chiTiet:
          Array.from(
            resultMap.values(),
          ),

        nguoiDiemDanhId:
          currentUser._id,

        nguoiDiemDanhTen:
          currentUser.fullName,

        ngayDiemDanh:
          new Date(),

        ghiChu,
      });

    const stats = {
      coMat:
        Array.from(
          resultMap.values(),
        ).filter(
          (item) =>
            item.trangThai ===
            "CO_MAT",
        ).length,

      vangMat:
        Array.from(
          resultMap.values(),
        ).filter(
          (item) =>
            item.trangThai ===
            "VANG_MAT",
        ).length,

      coPhep:
        Array.from(
          resultMap.values(),
        ).filter(
          (item) =>
            item.trangThai ===
            "CO_PHEP",
        ).length,
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
        "CREATE",

      module:
        "HOAT_DONG",

      description:
        `${session.fullName} Ä‘Ã£ lÆ°u Ä‘iá»ƒm danh hoáº¡t Ä‘á»™ng ${activity.maHoatDong} - ${activity.tenHoatDong}`,

      targetId:
        attendance._id.toString(),

      targetName:
        `${activity.maHoatDong} - ${activity.tenHoatDong}`,

      metadata: {
        loai:
          "DIEM_DANH_HOAT_DONG",

        dangKyTapTheId,

        hoatDongId:
          String(
            registration.hoatDongId,
          ),

        chiHoiId:
          String(
            registration.chiHoiId,
          ),

        tongSo:
          registeredMemberIds.length,

        ...stats,
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
          "Äiá»ƒm danh thÃ nh cÃ´ng",

        data: {
          attendance,

          thongKe:
            stats,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/diem-danh-hoat-dong:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "KhÃ´ng thá»ƒ lÆ°u káº¿t quáº£ Ä‘iá»ƒm danh",
      },
      {
        status: 500,
      },
    );
  }
}
