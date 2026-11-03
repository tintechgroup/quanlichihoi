import mongoose, {
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

type HoiVienLean = {
  _id:
    Types.ObjectId;

  maHoiVien?:
    string;

  hoTen?:
    string;

  lop?:
    string;

  chiHoiId?:
    Types.ObjectId | null;

  trangThai?:
    string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const MANAGER_ROLES:
  UserRole[] = [
    "ADMIN",
    "BAN_CHAP_HANH",
    "CHI_HOI_TRUONG",
  ];

const ACTIVE_REGISTRATION_STATUSES =
  [
    "DA_DANG_KY",
    "DA_THAM_GIA",
  ];

/* =========================================================
   HELPERS
========================================================= */

function errorResponse(
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

async function getLeaderChiHoiId(
  userId:
    string,
) {
  if (
    !Types.ObjectId.isValid(
      userId,
    )
  ) {
    return "";
  }

  const user =
    await User.findById(
      userId,
    )
      .select(
        "chiHoiId",
      )
      .lean();

  return user
    ?.chiHoiId
    ? String(
        user.chiHoiId,
      )
    : "";
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

    const role =
      session.role as
        UserRole;

    if (
      !MANAGER_ROLES.includes(
        role,
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem chi tiết điểm danh QR",
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
      return errorResponse(
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
      return errorResponse(
        "Không tìm thấy phiên điểm danh QR",
        404,
      );
    }

    const activityObject =
      typeof qrSession.hoatDongId ===
        "object" &&
      qrSession.hoatDongId !==
        null
        ? qrSession.hoatDongId as
            unknown as {
              _id:
                Types.ObjectId;
            }
        : null;

    if (!activityObject) {
      return errorResponse(
        "Phiên QR không còn liên kết với hoạt động",
        409,
      );
    }

    const activityId =
      new Types.ObjectId(
        String(
          activityObject._id,
        ),
      );

    /* =====================================================
       PHẠM VI CHI HỘI
    ===================================================== */

    let scopeChiHoiId:
      Types.ObjectId | null =
      null;

    const populatedChiHoi =
      qrSession.chiHoiId &&
      typeof qrSession.chiHoiId ===
        "object"
        ? qrSession.chiHoiId as
            unknown as {
              _id:
                Types.ObjectId;
            }
        : null;

    if (
      populatedChiHoi?._id
    ) {
      scopeChiHoiId =
        new Types.ObjectId(
          String(
            populatedChiHoi._id,
          ),
        );
    }

    if (
      role ===
      "CHI_HOI_TRUONG"
    ) {
      const leaderChiHoiId =
        await getLeaderChiHoiId(
          session.userId,
        );

      if (!leaderChiHoiId) {
        return errorResponse(
          "Tài khoản Chi hội trưởng chưa được gán Chi hội",
          403,
        );
      }

      /*
       * CHT chỉ được xem phiên QR
       * của chính Chi hội mình.
       */
      if (
        !scopeChiHoiId ||
        String(
          scopeChiHoiId,
        ) !==
          leaderChiHoiId
      ) {
        return errorResponse(
          "Bạn không có quyền xem phiên QR này",
          403,
        );
      }
    }

    /* =====================================================
       HỘI VIÊN THUỘC PHẠM VI
    ===================================================== */

    const memberScopeFilter:
      Record<
        string,
        unknown
      > = {
      trangThai: {
        $ne:
          "TAM_NGUNG",
      },
    };

    if (
      scopeChiHoiId
    ) {
      memberScopeFilter.chiHoiId =
        scopeChiHoiId;
    }

    const scopedMembers =
      await HoiVien.find(
        memberScopeFilter,
      )
        .select(
          "_id maHoiVien hoTen lop chiHoiId trangThai",
        )
        .lean();

    const scopedMemberIds =
      scopedMembers.map(
        (
          item,
        ) =>
          new Types.ObjectId(
            String(
              item._id,
            ),
          ),
      );

    const scopedMemberIdSet =
      new Set(
        scopedMemberIds.map(
          (
            value,
          ) =>
            String(
              value,
            ),
        ),
      );

    /* =====================================================
       ĐĂNG KÝ CÁ NHÂN
    ===================================================== */

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
        activityId,

      [statusField]: {
        $in:
          ACTIVE_REGISTRATION_STATUSES,
      },
    };

    if (
      scopeChiHoiId
    ) {
      individualFilter[
        hoiVienField
      ] = {
        $in:
          scopedMemberIds,
      };
    }

    const individualRegistrations =
      await DangKyHoatDong.find(
        individualFilter,
      )
        .select(
          `${hoiVienField} ${statusField}`,
        )
        .lean();

    const registeredMemberIds =
      new Set<string>();

    for (
      const registration of
      individualRegistrations
    ) {
      /*
       * Mongoose document lean không có
       * index signature Record<string, unknown>,
       * nên chuyển qua unknown trước để TypeScript hợp lệ.
       */
      const raw =
        registration as
          unknown as
          Record<
            string,
            unknown
          >;

      const memberId =
        raw[
          hoiVienField
        ];

      if (!memberId) {
        continue;
      }

      const stringId =
        String(
          memberId,
        );

      if (
        !scopeChiHoiId ||
        scopedMemberIdSet.has(
          stringId,
        )
      ) {
        registeredMemberIds.add(
          stringId,
        );
      }
    }

    /* =====================================================
       ĐĂNG KÝ TẬP THỂ
    ===================================================== */

    const collectiveFilter:
      Record<
        string,
        unknown
      > = {
      hoatDongId:
        activityId,

      trangThai:
        "DA_TIEP_NHAN",
    };

    if (
      scopeChiHoiId
    ) {
      collectiveFilter.chiHoiId =
        scopeChiHoiId;
    }

    const collectiveRegistrations =
      await DangKyTapTheHoatDong.find(
        collectiveFilter,
      )
        .select(
          "hoiVienIds chiHoiId",
        )
        .lean();

    for (
      const registration of
      collectiveRegistrations
    ) {
      const ids =
        Array.isArray(
          registration.hoiVienIds,
        )
          ? registration.hoiVienIds
          : [];

      for (
        const memberId of
        ids
      ) {
        const stringId =
          String(
            memberId,
          );

        if (
          !scopeChiHoiId ||
          scopedMemberIdSet.has(
            stringId,
          )
        ) {
          registeredMemberIds.add(
            stringId,
          );
        }
      }
    }

    /* =====================================================
       THÔNG TIN HỘI VIÊN ĐĂNG KÝ
    ===================================================== */

    const registeredObjectIds =
      Array.from(
        registeredMemberIds,
      )
        .filter(
          (
            value,
          ) =>
            Types.ObjectId.isValid(
              value,
            ),
        )
        .map(
          (
            value,
          ) =>
            new Types.ObjectId(
              value,
            ),
        );

    const registeredMembers =
      registeredObjectIds.length >
      0
        ? await HoiVien.find({
            _id: {
              $in:
                registeredObjectIds,
            },
          })
            .select(
              "_id maHoiVien hoTen lop chiHoiId trangThai",
            )
            .populate(
              "chiHoiId",
              "maChiHoi tenChiHoi",
            )
            .lean()
        : [];

    /* =====================================================
       LƯỢT QUÉT
    ===================================================== */

    const scans =
      await LuotDiemDanhQR.find({
        phienId:
          new Types.ObjectId(
            id,
          ),
      })
        .sort({
          thoiGianDiemDanh:
            -1,
        })
        .lean();

    const scanMap =
      new Map(
        scans.map(
          (
            scan,
          ) => [
            String(
              scan.hoiVienId,
            ),

            scan,
          ],
        ),
      );

    /* =====================================================
       DANH SÁCH
    ===================================================== */

    const members =
      (
        registeredMembers as
          unknown as
          Array<
            HoiVienLean & {
              chiHoiId?:
                | {
                    _id?:
                      Types.ObjectId;

                    maChiHoi?:
                      string;

                    tenChiHoi?:
                      string;
                  }
                | Types.ObjectId
                | null;
            }
          >
      ).map(
        (
          member,
        ) => {
          const scan =
            scanMap.get(
              String(
                member._id,
              ),
            );

          const chiHoi =
            member.chiHoiId &&
            typeof member.chiHoiId ===
              "object" &&
            "tenChiHoi" in
              member.chiHoiId
              ? member.chiHoiId
              : null;

          return {
            hoiVienId:
              String(
                member._id,
              ),

            maHoiVien:
              member.maHoiVien ||
              "",

            hoTen:
              member.hoTen ||
              "",

            lop:
              member.lop ||
              "",

            chiHoi: chiHoi
              ? {
                  id:
                    String(
                      chiHoi._id ||
                        "",
                    ),

                  maChiHoi:
                    chiHoi.maChiHoi ||
                    "",

                  tenChiHoi:
                    chiHoi.tenChiHoi ||
                    "",
                }
              : null,

            daDiemDanh:
              Boolean(
                scan,
              ),

            thoiGianDiemDanh:
              scan
                ?.thoiGianDiemDanh ||
              null,
          };
        },
      )
        .sort(
          (
            a,
            b,
          ) => {
            if (
              a.daDiemDanh !==
              b.daDiemDanh
            ) {
              return a.daDiemDanh
                ? -1
                : 1;
            }

            if (
              a.daDiemDanh &&
              b.daDiemDanh
            ) {
              return (
                new Date(
                  b.thoiGianDiemDanh ||
                    0,
                ).getTime() -
                new Date(
                  a.thoiGianDiemDanh ||
                    0,
                ).getTime()
              );
            }

            return a.hoTen.localeCompare(
              b.hoTen,
              "vi",
            );
          },
        );

    /* =====================================================
       THỐNG KÊ
    ===================================================== */

    const totalRegistered =
      members.length;

    const totalCheckedIn =
      members.filter(
        (
          item,
        ) =>
          item.daDiemDanh,
      ).length;

    const totalPending =
      Math.max(
        0,
        totalRegistered -
          totalCheckedIn,
      );

    const percentage =
      totalRegistered >
      0
        ? Number(
            (
              (
                totalCheckedIn /
                totalRegistered
              ) *
              100
            ).toFixed(
              1,
            ),
          )
        : 0;

    const expired =
      new Date(
        qrSession.thoiGianHetHan,
      ).getTime() <=
      Date.now();

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success:
        true,

      data: {
        phien: {
          ...qrSession,

          daHetHan:
            expired,

          dangMo:
            qrSession.trangThai ===
              "DANG_MO" &&
            !expired,
        },

        thongKe: {
          tongDangKy:
            totalRegistered,

          daDiemDanh:
            totalCheckedIn,

          chuaDiemDanh:
            totalPending,

          tyLeDiemDanh:
            percentage,
        },

        danhSach:
          members,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/diem-danh-qr/[id]/chi-tiet:",
      error,
    );

    if (
      error instanceof
      mongoose.Error
        .CastError
    ) {
      return errorResponse(
        "Dữ liệu liên kết không hợp lệ",
      );
    }

    return errorResponse(
      process.env.NODE_ENV ===
        "development" &&
      error instanceof
        Error
        ? error.message
        : "Không thể tải chi tiết điểm danh QR",
      500,
    );
  }
}