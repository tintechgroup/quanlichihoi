import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import SystemLog, {
  type LogAction,
  type LogModule,
} from "@/models/SystemLog";

export const dynamic = "force-dynamic";

const LOG_ACTIONS: LogAction[] = [
  "LOGIN",
  "LOGOUT",
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "RESET_PASSWORD",
  "CHANGE_PASSWORD",
  "BACKUP",
  "RESTORE",
  "OTHER",
];

const LOG_MODULES: LogModule[] = [
  "AUTH",
  "CHI_HOI",
  "HOI_VIEN",
  "BAN_CHAP_HANH",
  "HOAT_DONG",
  "TAI_CHINH",
  "HOI_PHI",
  "THONG_BAO",
  "VAN_KIEN",
  "HO_TRO",
  "MINH_CHUNG",
  "DANH_GIA",
  "SAO_LUU",
  "HE_THONG",
];

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

function getText(
  value: string | null,
) {
  return (
    value ||
    ""
  ).trim();
}

function getPositiveInteger(
  value: string | null,
  fallback: number,
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return fallback;
  }

  return Math.floor(number);
}

function parseStartDate(
  value: string,
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      `${value}T00:00:00.000`,
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function parseEndDate(
  value: string,
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      `${value}T23:59:59.999`,
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

export async function GET(
  request: Request,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return errorResponse(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    if (
      session.role !==
      "ADMIN"
    ) {
      return errorResponse(
        "Bạn không có quyền xem nhật ký hệ thống",
        403,
      );
    }

    await connectDB();

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const page =
      getPositiveInteger(
        searchParams.get("page"),
        1,
      );

    const limit =
      Math.min(
        getPositiveInteger(
          searchParams.get("limit"),
          20,
        ),
        100,
      );

    const search =
      getText(
        searchParams.get("search"),
      );

    const username =
      getText(
        searchParams.get("username"),
      );

    const role =
      getText(
        searchParams.get("role"),
      );

    const action =
      getText(
        searchParams.get("action"),
      );

    const logModule =
      getText(
        searchParams.get("module"),
      );

    const tuNgayRaw =
      getText(
        searchParams.get("tuNgay"),
      );

    const denNgayRaw =
      getText(
        searchParams.get("denNgay"),
      );

    if (
      action &&
      !LOG_ACTIONS.includes(
        action as LogAction,
      )
    ) {
      return errorResponse(
        "Hành động nhật ký không hợp lệ",
      );
    }

    if (
      logModule &&
      !LOG_MODULES.includes(
        logModule as LogModule,
      )
    ) {
      return errorResponse(
        "Phân hệ nhật ký không hợp lệ",
      );
    }

    const tuNgay =
      tuNgayRaw
        ? parseStartDate(
            tuNgayRaw,
          )
        : null;

    const denNgay =
      denNgayRaw
        ? parseEndDate(
            denNgayRaw,
          )
        : null;

    if (
      tuNgayRaw &&
      !tuNgay
    ) {
      return errorResponse(
        "Ngày bắt đầu không hợp lệ",
      );
    }

    if (
      denNgayRaw &&
      !denNgay
    ) {
      return errorResponse(
        "Ngày kết thúc không hợp lệ",
      );
    }

    if (
      tuNgay &&
      denNgay &&
      tuNgay > denNgay
    ) {
      return errorResponse(
        "Khoảng thời gian không hợp lệ",
      );
    }

    const filter: Record<
      string,
      unknown
    > = {};

    if (action) {
      filter.action = action;
    }

    if (logModule) {
      filter.module = logModule;
    }

    if (role) {
      filter.role = role;
    }

    if (username) {
      filter.username = {
        $regex: username,
        $options: "i",
      };
    }

    if (
      tuNgay ||
      denNgay
    ) {
      const dateFilter: Record<
        string,
        Date
      > = {};

      if (tuNgay) {
        dateFilter.$gte =
          tuNgay;
      }

      if (denNgay) {
        dateFilter.$lte =
          denNgay;
      }

      filter.createdAt =
        dateFilter;
    }

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
          description: {
            $regex: search,
            $options: "i",
          },
        },
        {
          targetId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          targetName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          ipAddress: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const skip =
      (page - 1) *
      limit;

    const [
      logs,
      total,
    ] =
      await Promise.all([
        SystemLog.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        SystemLog.countDocuments(
          filter,
        ),
      ]);

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          total /
            limit,
        ),
      );

    const [
      dangNhap,
      dangXuat,
      taoMoi,
      capNhat,
      xoa,
      pheDuyet,
      tuChoi,
      resetPassword,
      changePassword,
      saoLuu,
      phucHoi,
      other,
    ] =
      await Promise.all([
        SystemLog.countDocuments({
          ...filter,
          action: "LOGIN",
        }),

        SystemLog.countDocuments({
          ...filter,
          action: "LOGOUT",
        }),

        SystemLog.countDocuments({
          ...filter,
          action: "CREATE",
        }),

        SystemLog.countDocuments({
          ...filter,
          action: "UPDATE",
        }),

        SystemLog.countDocuments({
          ...filter,
          action: "DELETE",
        }),

        SystemLog.countDocuments({
          ...filter,
          action: "APPROVE",
        }),

        SystemLog.countDocuments({
          ...filter,
          action: "REJECT",
        }),

        SystemLog.countDocuments({
          ...filter,
          action: "RESET_PASSWORD",
        }),

        SystemLog.countDocuments({
          ...filter,
          action: "CHANGE_PASSWORD",
        }),

        SystemLog.countDocuments({
          ...filter,
          action: "BACKUP",
        }),

        SystemLog.countDocuments({
          ...filter,
          action: "RESTORE",
        }),

        SystemLog.countDocuments({
          ...filter,
          action: "OTHER",
        }),
      ]);

    const actionDistributionRaw =
      await SystemLog.aggregate([
        {
          $match:
            filter,
        },
        {
          $group: {
            _id:
              "$action",
            total: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            total: -1,
          },
        },
      ]);

    const moduleDistributionRaw =
      await SystemLog.aggregate([
        {
          $match:
            filter,
        },
        {
          $group: {
            _id:
              "$module",
            total: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            total: -1,
          },
        },
      ]);

    const phanBoHanhDong =
      actionDistributionRaw.map(
        (
          item,
        ) => ({
          action:
            String(
              item._id ||
                "",
            ),
          total:
            Number(
              item.total ||
                0,
            ),
        }),
      );

    const phanBoPhanHe =
      moduleDistributionRaw.map(
        (
          item,
        ) => ({
          module:
            String(
              item._id ||
                "",
            ),
          total:
            Number(
              item.total ||
                0,
            ),
        }),
      );

    const danhSach =
      logs.map(
        (
          item,
        ) => ({
          id:
            String(
              item._id,
            ),

          _id:
            String(
              item._id,
            ),

          userId:
            item.userId
              ? String(
                  item.userId,
                )
              : null,

          username:
            item.username ||
            "",

          fullName:
            item.fullName ||
            "",

          role:
            item.role ||
            "",

          action:
            item.action,

          module:
            item.module,

          description:
            item.description,

          targetId:
            item.targetId ||
            "",

          targetName:
            item.targetName ||
            "",

          metadata:
            item.metadata &&
            typeof item.metadata ===
              "object"
              ? item.metadata
              : {},

          ipAddress:
            item.ipAddress ||
            "",

          userAgent:
            item.userAgent ||
            "",

          createdAt:
            item.createdAt ||
            null,
        }),
      );

    return NextResponse.json({
      success: true,

      message:
        "Lấy nhật ký hệ thống thành công",

      data: {
        danhSach,

        thongKe: {
          tongSo:
            total,

          dangNhap,

          dangXuat,

          taoMoi,

          capNhat,

          xoa,

          pheDuyet,

          tuChoi,

          resetPassword,

          changePassword,

          saoLuu,

          phucHoi,

          other,
        },

        phanBoHanhDong,

        phanBoPhanHe,

        phanTrang: {
          page,
          limit,
          total,
          totalPages,

          hasPrevious:
            page > 1,

          hasNext:
            page <
            totalPages,
        },

        boLoc: {
          search:
            search ||
            null,

          username:
            username ||
            null,

          role:
            role ||
            null,

          action:
            action ||
            null,

          module:
            logModule ||
            null,

          tuNgay:
            tuNgayRaw ||
            null,

          denNgay:
            denNgayRaw ||
            null,
        },
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/system-log:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          process.env.NODE_ENV ===
          "development"
            ? error instanceof Error
              ? error.message
              : "Không thể tải nhật ký hệ thống"
            : "Đã xảy ra lỗi khi tải nhật ký hệ thống",
      },
      {
        status: 500,
      },
    );
  }
}