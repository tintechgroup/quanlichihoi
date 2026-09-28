import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import ChiHoi from "@/models/ChiHoi";
import DangKyHoatDong from "@/models/DangKyHoatDong";
import HoatDong from "@/models/HoatDong";
import HoiVien from "@/models/HoiVien";

export const dynamic = "force-dynamic";

type AllowedRole = "ADMIN" | "BAN_CHAP_HANH";

interface ChiHoiLean {
  _id: Types.ObjectId;
  maChiHoi?: string;
  tenChiHoi?: string;
  trangThai?: string;
}

interface HoiVienLean {
  _id: Types.ObjectId;
  maHoiVien?: string;
  hoTen?: string;
  chiHoiId?: Types.ObjectId;
  trangThai?: string;
  createdAt?: Date;
}

interface HoatDongLean {
  _id: Types.ObjectId;
  maHoatDong?: string;
  tenHoatDong?: string;
  chiHoiId?: Types.ObjectId;
  phamVi?: string;
  diaDiem?: string;
  thoiGianBatDau?: Date;
  thoiGianKetThuc?: Date;
  trangThai?: string;
  createdAt?: Date;
}

interface RegistrationStatistic {
  hoatDongId: string;
  tongDangKy: number;
  daThamGia: number;
  vangMat: number;
  daHuy: number;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getSessionRole(session: unknown) {
  if (!isRecord(session)) {
    return "";
  }

  if (typeof session.role === "string") {
    return session.role;
  }

  if (
    isRecord(session.user) &&
    typeof session.user.role === "string"
  ) {
    return session.user.role;
  }

  return "";
}

function objectIdToString(value: unknown) {
  if (!value) {
    return "";
  }

  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  return String(value);
}

function parseDate(
  value: string | null,
  endOfDay = false,
) {
  if (!value) {
    return null;
  }

  const time = endOfDay
    ? "23:59:59.999"
    : "00:00:00.000";

  const date = new Date(
    `${value}T${time}Z`,
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function escapeRegex(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function getMonthKey(
  value?: Date | string,
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

function getLastSixMonths() {
  const currentDate = new Date();

  const result: Array<{
    key: string;
    label: string;
    month: number;
    year: number;
  }> = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth() - offset,
        1,
      ),
    );

    result.push({
      key: `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1,
      ).padStart(2, "0")}`,

      label: `T${date.getUTCMonth() + 1}`,

      month: date.getUTCMonth() + 1,

      year: date.getUTCFullYear(),
    });
  }

  return result;
}

export async function GET(
  request: NextRequest,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn",
        },
        {
          status: 401,
        },
      );
    }

    const role = getSessionRole(session);

    const allowedRoles: AllowedRole[] = [
      "ADMIN",
      "BAN_CHAP_HANH",
    ];

    if (
      !allowedRoles.includes(
        role as AllowedRole,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền xem thống kê và báo cáo",
        },
        {
          status: 403,
        },
      );
    }

    await connectDB();

    const searchParams =
      request.nextUrl.searchParams;

    const chiHoiId =
      searchParams
        .get("chiHoiId")
        ?.trim() || "";

    const keyword =
      searchParams
        .get("search")
        ?.trim() || "";

    const trangThai =
      searchParams
        .get("trangThai")
        ?.trim() || "";

    const tuNgayText =
      searchParams.get("tuNgay");

    const denNgayText =
      searchParams.get("denNgay");

    if (
      chiHoiId &&
      !Types.ObjectId.isValid(chiHoiId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Chi hội không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const tuNgay = parseDate(
      tuNgayText,
      false,
    );

    const denNgay = parseDate(
      denNgayText,
      true,
    );

    if (tuNgayText && !tuNgay) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thời gian bắt đầu không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (denNgayText && !denNgay) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thời gian kết thúc không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      tuNgay &&
      denNgay &&
      tuNgay > denNgay
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Từ ngày phải nhỏ hơn hoặc bằng đến ngày",
        },
        {
          status: 400,
        },
      );
    }

    const chiHoiObjectId = chiHoiId
      ? new Types.ObjectId(chiHoiId)
      : null;

    const hoiVienFilter: Record<
      string,
      unknown
    > = {};

    const hoatDongFilter: Record<
      string,
      unknown
    > = {};

    if (chiHoiObjectId) {
      hoiVienFilter.chiHoiId =
        chiHoiObjectId;

      hoatDongFilter.chiHoiId =
        chiHoiObjectId;
    }

    if (trangThai) {
      hoatDongFilter.trangThai =
        trangThai;
    }

    if (keyword) {
      const safeKeyword =
        escapeRegex(keyword);

      hoatDongFilter.$or = [
        {
          maHoatDong: {
            $regex: safeKeyword,
            $options: "i",
          },
        },
        {
          tenHoatDong: {
            $regex: safeKeyword,
            $options: "i",
          },
        },
        {
          diaDiem: {
            $regex: safeKeyword,
            $options: "i",
          },
        },
      ];
    }

    if (tuNgay || denNgay) {
      const dateFilter: Record<
        string,
        Date
      > = {};

      if (tuNgay) {
        dateFilter.$gte = tuNgay;
      }

      if (denNgay) {
        dateFilter.$lte = denNgay;
      }

      hoatDongFilter.thoiGianBatDau =
        dateFilter;
    }

    const [
      rawChiHoiList,
      rawHoiVienList,
      rawHoatDongList,
    ] = await Promise.all([
      ChiHoi.find({})
        .select(
          "_id maChiHoi tenChiHoi trangThai",
        )
        .sort({
          maChiHoi: 1,
        })
        .lean<ChiHoiLean[]>(),

      HoiVien.find(hoiVienFilter)
        .select(
          [
            "_id",
            "maHoiVien",
            "hoTen",
            "chiHoiId",
            "trangThai",
            "createdAt",
          ].join(" "),
        )
        .lean<HoiVienLean[]>(),

      HoatDong.find(hoatDongFilter)
        .select(
          [
            "_id",
            "maHoatDong",
            "tenHoatDong",
            "chiHoiId",
            "phamVi",
            "diaDiem",
            "thoiGianBatDau",
            "thoiGianKetThuc",
            "trangThai",
            "createdAt",
          ].join(" "),
        )
        .sort({
          thoiGianBatDau: -1,
          createdAt: -1,
        })
        .lean<HoatDongLean[]>(),
    ]);

    const chiHoiMap = new Map(
      rawChiHoiList.map((chiHoi) => [
        chiHoi._id.toString(),
        chiHoi,
      ]),
    );

    const hoatDongIds =
      rawHoatDongList.map(
        (hoatDong) => hoatDong._id,
      );

    let registrationStatistics:
      RegistrationStatistic[] = [];

    if (hoatDongIds.length > 0) {
      const aggregateResult =
        await DangKyHoatDong.aggregate<{
          _id: Types.ObjectId;
          tongDangKy: number;
          daThamGia: number;
          vangMat: number;
          daHuy: number;
        }>([
          {
            $match: {
              hoatDongId: {
                $in: hoatDongIds,
              },
            },
          },
          {
            $group: {
              _id: "$hoatDongId",

              tongDangKy: {
                $sum: {
                  $cond: [
                    {
                      $ne: [
                        "$trangThaiDangKy",
                        "DA_HUY",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              daThamGia: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$trangThaiDangKy",
                        "DA_THAM_GIA",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              vangMat: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$trangThaiDangKy",
                        "VANG_MAT",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              daHuy: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$trangThaiDangKy",
                        "DA_HUY",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]);

      registrationStatistics =
        aggregateResult.map(
          (item) => ({
            hoatDongId:
              item._id.toString(),

            tongDangKy:
              item.tongDangKy || 0,

            daThamGia:
              item.daThamGia || 0,

            vangMat:
              item.vangMat || 0,

            daHuy:
              item.daHuy || 0,
          }),
        );
    }

    const registrationMap = new Map(
      registrationStatistics.map(
        (registration) => [
          registration.hoatDongId,
          registration,
        ],
      ),
    );

    const danhSachChiHoi =
      rawChiHoiList.map((chiHoi) => ({
        id: chiHoi._id.toString(),
        _id: chiHoi._id.toString(),

        maChiHoi:
          chiHoi.maChiHoi ?? "",

        tenChiHoi:
          chiHoi.tenChiHoi ?? "",

        trangThai:
          chiHoi.trangThai ?? "",
      }));

    const danhSachHoiVien =
      rawHoiVienList.map((member) => {
        const memberChiHoiId =
          objectIdToString(
            member.chiHoiId,
          );

        const chiHoi =
          chiHoiMap.get(
            memberChiHoiId,
          );

        return {
          id: member._id.toString(),
          _id: member._id.toString(),

          maHoiVien:
            member.maHoiVien ?? "",

          hoTen:
            member.hoTen ?? "",

          chiHoiId:
            memberChiHoiId,

          chiHoi: chiHoi
            ? {
                id:
                  chiHoi._id.toString(),

                _id:
                  chiHoi._id.toString(),

                maChiHoi:
                  chiHoi.maChiHoi ?? "",

                tenChiHoi:
                  chiHoi.tenChiHoi ?? "",
              }
            : null,

          trangThai:
            member.trangThai ??
            "DANG_HOAT_DONG",

          createdAt:
            member.createdAt,
        };
      });

    const chiTietHoatDong =
      rawHoatDongList.map(
        (activity) => {
          const activityId =
            activity._id.toString();

          const activityChiHoiId =
            objectIdToString(
              activity.chiHoiId,
            );

          const chiHoi =
            chiHoiMap.get(
              activityChiHoiId,
            );

          const registration =
            registrationMap.get(
              activityId,
            );

          const tongDangKy =
            registration?.tongDangKy ??
            0;

          const daThamGia =
            registration?.daThamGia ??
            0;

          const tyLeThamGia =
            tongDangKy > 0
              ? Math.round(
                  (daThamGia /
                    tongDangKy) *
                    100,
                )
              : 0;

          return {
            id: activityId,
            _id: activityId,

            maHoatDong:
              activity.maHoatDong ?? "",

            tenHoatDong:
              activity.tenHoatDong ?? "",

            phamVi:
              activity.phamVi ?? "",

            diaDiem:
              activity.diaDiem ?? "",

            thoiGianBatDau:
              activity.thoiGianBatDau,

            thoiGianKetThuc:
              activity.thoiGianKetThuc,

            trangThai:
              activity.trangThai ??
              "CHO_PHE_DUYET",

            chiHoiId:
              activityChiHoiId,

            chiHoi: chiHoi
              ? {
                  id:
                    chiHoi._id.toString(),

                  _id:
                    chiHoi._id.toString(),

                  maChiHoi:
                    chiHoi.maChiHoi ??
                    "",

                  tenChiHoi:
                    chiHoi.tenChiHoi ??
                    "",
                }
              : null,

            soNguoiDangKy:
              tongDangKy,

            tongDangKy,

            soNguoiThamGia:
              daThamGia,

            daThamGia,

            vangMat:
              registration?.vangMat ??
              0,

            daHuy:
              registration?.daHuy ??
              0,

            tyLeThamGia,

            createdAt:
              activity.createdAt,
          };
        },
      );

    const activeMembers =
      rawHoiVienList.filter(
        (member) =>
          member.trangThai ===
          "DANG_HOAT_DONG",
      ).length;

    const pausedMembers =
      rawHoiVienList.filter(
        (member) =>
          member.trangThai ===
          "TAM_NGUNG",
      ).length;

    const pendingActivities =
      rawHoatDongList.filter(
        (activity) =>
          activity.trangThai ===
          "CHO_PHE_DUYET",
      ).length;

    const approvedActivities =
      rawHoatDongList.filter(
        (activity) =>
          activity.trangThai ===
          "DA_DUYET",
      ).length;

    const upcomingActivities =
      rawHoatDongList.filter(
        (activity) =>
          activity.trangThai ===
          "SAP_DIEN_RA",
      ).length;

    const runningActivities =
      rawHoatDongList.filter(
        (activity) =>
          activity.trangThai ===
          "DANG_TRIEN_KHAI",
      ).length;

    const completedActivities =
      rawHoatDongList.filter(
        (activity) =>
          activity.trangThai ===
          "DA_KET_THUC",
      ).length;

    const postponedActivities =
      rawHoatDongList.filter(
        (activity) =>
          activity.trangThai ===
          "TAM_HOAN",
      ).length;

    const cancelledActivities =
      rawHoatDongList.filter(
        (activity) =>
          activity.trangThai ===
          "DA_HUY",
      ).length;

    const totalRegistrations =
      registrationStatistics.reduce(
        (total, registration) =>
          total +
          registration.tongDangKy,
        0,
      );

    const totalParticipants =
      registrationStatistics.reduce(
        (total, registration) =>
          total +
          registration.daThamGia,
        0,
      );

    const totalAbsent =
      registrationStatistics.reduce(
        (total, registration) =>
          total +
          registration.vangMat,
        0,
      );

    const totalCancelled =
      registrationStatistics.reduce(
        (total, registration) =>
          total +
          registration.daHuy,
        0,
      );

    const participationRate =
      totalRegistrations > 0
        ? Math.round(
            (totalParticipants /
              totalRegistrations) *
              100,
          )
        : 0;

    const activityStatusStatistics = [
      {
        key: "CHO_PHE_DUYET",
        label: "Chờ phê duyệt",
        value: pendingActivities,
      },
      {
        key: "DA_DUYET",
        label: "Đã duyệt",
        value: approvedActivities,
      },
      {
        key: "SAP_DIEN_RA",
        label: "Sắp diễn ra",
        value: upcomingActivities,
      },
      {
        key: "DANG_TRIEN_KHAI",
        label: "Đang triển khai",
        value: runningActivities,
      },
      {
        key: "DA_KET_THUC",
        label: "Đã kết thúc",
        value: completedActivities,
      },
      {
        key: "TAM_HOAN",
        label: "Tạm hoãn",
        value: postponedActivities,
      },
      {
        key: "DA_HUY",
        label: "Đã hủy",
        value: cancelledActivities,
      },
    ].map((item) => ({
      ...item,

      percent:
        rawHoatDongList.length > 0
          ? Math.round(
              (item.value /
                rawHoatDongList.length) *
                100,
            )
          : 0,
    }));

    const monthlyStatistics =
      getLastSixMonths().map(
        (month) => {
          const activitiesInMonth =
            rawHoatDongList.filter(
              (activity) =>
                getMonthKey(
                  activity.thoiGianBatDau ??
                    activity.createdAt,
                ) === month.key,
            );

          const activityIdsInMonth =
            activitiesInMonth.map(
              (activity) =>
                activity._id.toString(),
            );

          const soHoiVien =
            rawHoiVienList.filter(
              (member) =>
                getMonthKey(
                  member.createdAt,
                ) === month.key,
            ).length;

          const soDangKy =
            registrationStatistics
              .filter((registration) =>
                activityIdsInMonth.includes(
                  registration.hoatDongId,
                ),
              )
              .reduce(
                (total, registration) =>
                  total +
                  registration.tongDangKy,
                0,
              );

          const soThamGia =
            registrationStatistics
              .filter((registration) =>
                activityIdsInMonth.includes(
                  registration.hoatDongId,
                ),
              )
              .reduce(
                (total, registration) =>
                  total +
                  registration.daThamGia,
                0,
              );

          return {
            ...month,

            soHoatDong:
              activitiesInMonth.length,

            soHoiVien,

            soDangKy,

            soThamGia,
          };
        },
      );

    const chiHoiStatistics =
      rawChiHoiList.map(
        (chiHoi) => {
          const id =
            chiHoi._id.toString();

          const memberList =
            rawHoiVienList.filter(
              (member) =>
                objectIdToString(
                  member.chiHoiId,
                ) === id,
            );

          const activityList =
            chiTietHoatDong.filter(
              (activity) =>
                activity.chiHoiId === id,
            );

          const tongDangKy =
            activityList.reduce(
              (total, activity) =>
                total +
                activity.tongDangKy,
              0,
            );

          const tongThamGia =
            activityList.reduce(
              (total, activity) =>
                total +
                activity.daThamGia,
              0,
            );

          return {
            id,
            _id: id,

            maChiHoi:
              chiHoi.maChiHoi ?? "",

            tenChiHoi:
              chiHoi.tenChiHoi ?? "",

            trangThai:
              chiHoi.trangThai ?? "",

            tongHoiVien:
              memberList.length,

            hoiVienHoatDong:
              memberList.filter(
                (member) =>
                  member.trangThai ===
                  "DANG_HOAT_DONG",
              ).length,

            hoiVienTamNgung:
              memberList.filter(
                (member) =>
                  member.trangThai ===
                  "TAM_NGUNG",
              ).length,

            tongHoatDong:
              activityList.length,

            tongDangKy,

            tongThamGia,

            tyLeThamGia:
              tongDangKy > 0
                ? Math.round(
                    (tongThamGia /
                      tongDangKy) *
                      100,
                  )
                : 0,
          };
        },
      );

    const totalChiHoi =
      chiHoiObjectId
        ? rawChiHoiList.filter(
            (chiHoi) =>
              chiHoi._id.toString() ===
              chiHoiId,
          ).length
        : rawChiHoiList.length;

    return NextResponse.json(
      {
        success: true,

        message:
          "Lấy dữ liệu thống kê thành công",

        data: {
          boLoc: {
            chiHoiId:
              chiHoiId || null,

            search:
              keyword || null,

            trangThai:
              trangThai || null,

            tuNgay:
              tuNgay?.toISOString() ??
              null,

            denNgay:
              denNgay?.toISOString() ??
              null,
          },

          tongQuan: {
            tongChiHoi:
              totalChiHoi,

            tongHoiVien:
              rawHoiVienList.length,

            hoiVienDangHoatDong:
              activeMembers,

            hoiVienTamNgung:
              pausedMembers,

            tongHoatDong:
              rawHoatDongList.length,

            hoatDongChoPheDuyet:
              pendingActivities,

            hoatDongDaDuyet:
              approvedActivities,

            hoatDongSapDienRa:
              upcomingActivities,

            hoatDongDangTrienKhai:
              runningActivities,

            hoatDongDaKetThuc:
              completedActivities,

            hoatDongTamHoan:
              postponedActivities,

            hoatDongDaHuy:
              cancelledActivities,

            tongDangKy:
              totalRegistrations,

            tongThamGia:
              totalParticipants,

            tongVangMat:
              totalAbsent,

            tongHuyDangKy:
              totalCancelled,

            tyLeThamGia:
              participationRate,
          },

          thongKe: {
            tongChiHoi:
              totalChiHoi,

            tongHoiVien:
              rawHoiVienList.length,

            hoiVienDangHoatDong:
              activeMembers,

            hoiVienTamNgung:
              pausedMembers,

            tongHoatDong:
              rawHoatDongList.length,

            choPheDuyet:
              pendingActivities,

            dangTrienKhai:
              runningActivities,

            daKetThuc:
              completedActivities,

            tongDangKy:
              totalRegistrations,

            tongThamGia:
              totalParticipants,

            tyLeThamGia:
              participationRate,
          },

          trangThaiHoatDong:
            activityStatusStatistics,

          theoThang:
            monthlyStatistics,

          thongKeChiHoi:
            chiHoiStatistics,

          chiTietHoatDong,

          danhSachHoatDong:
            chiTietHoatDong,

          danhSachHoiVien,

          danhSachChiHoi,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Lỗi lấy dữ liệu thống kê:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi lấy dữ liệu thống kê",
      },
      {
        status: 500,
      },
    );
  }
}