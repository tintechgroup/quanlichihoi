import {
  Types,
} from "mongoose";

import {
  NextResponse,
} from "next/server";

import {
  connectDB,
} from "@/lib/mongodb";

import {
  getCurrentSession,
} from "@/lib/session";

import DangKyHoatDong
  from "@/models/DangKyHoatDong";

import DangKyTapTheHoatDong
  from "@/models/DangKyTapTheHoatDong";

import HoiVien
  from "@/models/HoiVien";

import LuotDiemDanhQR
  from "@/models/LuotDiemDanhQR";

import PhienDiemDanhQR
  from "@/models/PhienDiemDanhQR";

import User
  from "@/models/User";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params:
    Promise<{
      id:
        string;
    }>;
};

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

/* =========================================================
   CONSTANTS
========================================================= */

const MANAGER_ROLES:
  UserRole[] = [
    "ADMIN",
    "BAN_CHAP_HANH",
    "CHI_HOI_TRUONG",
  ];

/* =========================================================
   HELPERS
========================================================= */

function responseError(
  message:
    string,

  status =
    400,
) {
  return NextResponse.json(
    {
      success:
        false,

      message,
    },
    {
      status,
    },
  );
}

function getDangKyFields() {
  const hoiVienField =
    DangKyHoatDong.schema.path(
      "hoiVienId",
    )
      ? "hoiVienId"
      : "hoiVien";

  const hoatDongField =
    DangKyHoatDong.schema.path(
      "hoatDongId",
    )
      ? "hoatDongId"
      : "hoatDong";

  const statusField =
    DangKyHoatDong.schema.path(
      "trangThai",
    )
      ? "trangThai"
      : "trangThaiDangKy";

  return {
    hoiVienField,

    hoatDongField,

    statusField,
  };
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  _request:
    Request,

  context:
    RouteContext,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return responseError(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    const role =
      session.role as
        UserRole;

    if (
      !MANAGER_ROLES.includes(
        role,
      )
    ) {
      return responseError(
        "Bạn không có quyền xem phiên điểm danh QR",
        403,
      );
    }

    const {
      id,
    } =
      await context.params;

    if (
      !Types.ObjectId.isValid(
        id,
      )
    ) {
      return responseError(
        "Mã phiên QR không hợp lệ",
      );
    }

    await connectDB();

    /* =====================================================
       PHIÊN QR
    ===================================================== */

    const qrSession =
      await PhienDiemDanhQR.findById(
        id,
      )
        .populate(
          "hoatDongId",
          [
            "maHoatDong",
            "tenHoatDong",
            "diaDiem",
            "thoiGianBatDau",
            "thoiGianKetThuc",
            "trangThai",
          ].join(
            " ",
          ),
        )
        .populate(
          "chiHoiId",
          "maChiHoi tenChiHoi",
        )
        .lean();

    if (!qrSession) {
      return responseError(
        "Không tìm thấy phiên QR",
        404,
      );
    }

    /* =====================================================
       PHÂN QUYỀN CHI HỘI TRƯỞNG
    ===================================================== */

    if (
      role ===
      "CHI_HOI_TRUONG"
    ) {
      const currentUser =
        await User.findById(
          session.userId,
        )
          .select(
            "chiHoiId",
          )
          .lean();

      const qrChiHoi =
        qrSession.chiHoiId &&
        typeof qrSession.chiHoiId ===
          "object"
          ? String(
              qrSession
                .chiHoiId
                ._id,
            )
          : qrSession.chiHoiId
            ? String(
                qrSession.chiHoiId,
              )
            : "";

      if (
        !currentUser
          ?.chiHoiId ||
        !qrChiHoi ||
        String(
          currentUser
            .chiHoiId,
        ) !==
          qrChiHoi
      ) {
        return responseError(
          "Bạn không có quyền xem phiên QR này",
          403,
        );
      }
    }

    const hoatDongId =
      typeof qrSession
        .hoatDongId ===
        "object" &&
      qrSession.hoatDongId &&
      "_id" in
        qrSession.hoatDongId
        ? new Types.ObjectId(
            String(
              qrSession
                .hoatDongId
                ._id,
            ),
          )
        : new Types.ObjectId(
            String(
              qrSession
                .hoatDongId,
            ),
          );

    const qrChiHoiId =
      qrSession.chiHoiId
        ? new Types.ObjectId(
            typeof qrSession
              .chiHoiId ===
              "object" &&
            "_id" in
              qrSession.chiHoiId
              ? String(
                  qrSession
                    .chiHoiId
                    ._id,
                )
              : String(
                  qrSession
                    .chiHoiId,
                ),
          )
        : null;

    /* =====================================================
       DANH SÁCH ĐÃ QUÉT
    ===================================================== */

    const scans =
      await LuotDiemDanhQR.find({
        phienId:
          new Types.ObjectId(
            id,
          ),
      })
        .populate(
          "chiHoiId",
          "maChiHoi tenChiHoi",
        )
        .sort({
          thoiGianDiemDanh:
            -1,
        })
        .lean();

    /* =====================================================
       TÍNH TỔNG HỘI VIÊN ĐỦ ĐIỀU KIỆN
    ===================================================== */

    const eligibleIds =
      new Set<
        string
      >();

    let scopedMemberIds:
      Types.ObjectId[] |
      null =
      null;

    if (
      qrChiHoiId
    ) {
      const members =
        await HoiVien.find({
          chiHoiId:
            qrChiHoiId,

          trangThai: {
            $ne:
              "TAM_NGUNG",
          },
        })
          .select(
            "_id",
          )
          .lean();

      scopedMemberIds =
        members.map(
          (
            item,
          ) =>
            new Types.ObjectId(
              String(
                item._id,
              ),
            ),
        );
    }

    const {
      hoiVienField,
      hoatDongField,
      statusField,
    } =
      getDangKyFields();

    const individualFilter:
      Record<
        string,
        unknown
      > = {
      [hoatDongField]:
        hoatDongId,

      [statusField]: {
        $in: [
          "DA_DANG_KY",
          "DA_THAM_GIA",
        ],
      },
    };

    if (
      scopedMemberIds
    ) {
      individualFilter[
        hoiVienField
      ] = {
        $in:
          scopedMemberIds,
      };
    }

    const individuals =
      await DangKyHoatDong.find(
        individualFilter,
      )
        .select(
          `${hoiVienField}`,
        )
        .lean();

    for (
      const registration of
      individuals
    ) {
      const object =
        registration as unknown as
          Record<
            string,
            unknown
          >;

      const memberId =
        object[
          hoiVienField
        ];

      if (memberId) {
        eligibleIds.add(
          String(
            memberId,
          ),
        );
      }
    }

    const collectiveFilter:
      Record<
        string,
        unknown
      > = {
      hoatDongId,

      trangThai:
        "DA_TIEP_NHAN",
    };

    if (
      qrChiHoiId
    ) {
      collectiveFilter.chiHoiId =
        qrChiHoiId;
    }

    const collectives =
      await DangKyTapTheHoatDong.find(
        collectiveFilter,
      )
        .select(
          "hoiVienIds",
        )
        .lean();

    for (
      const registration of
      collectives
    ) {
      const memberIds =
        Array.isArray(
          registration
            .hoiVienIds,
        )
          ? registration
              .hoiVienIds
          : [];

      for (
        const memberId of
        memberIds
      ) {
        eligibleIds.add(
          String(
            memberId,
          ),
        );
      }
    }

    /* =====================================================
       DANH SÁCH CHƯA QUÉT
    ===================================================== */

    const scannedIds =
      new Set(
        scans.map(
          (
            item,
          ) =>
            String(
              item.hoiVienId,
            ),
        ),
      );

    const notScannedIds =
      Array.from(
        eligibleIds,
      ).filter(
        (
          memberId,
        ) =>
          !scannedIds.has(
            memberId,
          ),
      );

    const notScanned =
      notScannedIds.length >
      0
        ? await HoiVien.find({
            _id: {
              $in:
                notScannedIds.map(
                  (
                    memberId,
                  ) =>
                    new Types.ObjectId(
                      memberId,
                    ),
                ),
            },
          })
            .select(
              [
                "maHoiVien",
                "hoTen",
                "lop",
                "chiHoiId",
              ].join(
                " ",
              ),
            )
            .populate(
              "chiHoiId",
              "maChiHoi tenChiHoi",
            )
            .sort({
              hoTen:
                1,
            })
            .lean()
        : [];

    const now =
      Date.now();

    const expired =
      new Date(
        qrSession
          .thoiGianHetHan,
      ).getTime() <=
      now;

    const totalEligible =
      eligibleIds.size;

    const totalCheckedIn =
      scans.length;

    const totalRemaining =
      Math.max(
        0,
        totalEligible -
          totalCheckedIn,
      );

    const rate =
      totalEligible >
      0
        ? Number(
            (
              (
                totalCheckedIn /
                totalEligible
              ) *
              100
            ).toFixed(
              1,
            ),
          )
        : 0;

    return NextResponse.json({
      success:
        true,

      data: {
        phien: {
          ...qrSession,

          daHetHan:
            expired,

          dangMo:
            qrSession
              .trangThai ===
              "DANG_MO" &&
            !expired,
        },

        luotDiemDanh:
          scans,

        chuaDiemDanh:
          notScanned,

        thongKe: {
          tongDuDieuKien:
            totalEligible,

          daDiemDanh:
            totalCheckedIn,

          chuaDiemDanh:
            totalRemaining,

          tyLeDiemDanh:
            rate,
        },
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/diem-danh-qr/phien/[id]:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể tải chi tiết phiên QR",
      500,
    );
  }
}