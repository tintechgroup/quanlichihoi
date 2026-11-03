import {
  randomBytes,
} from "crypto";

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

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import DangKyTapTheHoatDong
  from "@/models/DangKyTapTheHoatDong";

import HoatDong
  from "@/models/HoatDong";

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

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type CreateBody = {
  hoatDongId?:
    unknown;

  soPhut?:
    unknown;
};

type PatchBody = {
  id?:
    unknown;

  action?:
    unknown;
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

const DEFAULT_MINUTES =
  15;

const MIN_MINUTES =
  1;

const MAX_MINUTES =
  180;

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

function stringValue(
  value:
    unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizeMinutes(
  value:
    unknown,
) {
  const number =
    Number(
      value,
    );

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return DEFAULT_MINUTES;
  }

  return Math.min(
    MAX_MINUTES,

    Math.max(
      MIN_MINUTES,

      Math.round(
        number,
      ),
    ),
  );
}

function createToken() {
  return randomBytes(
    32,
  ).toString(
    "hex",
  );
}

function isManagerRole(
  role:
    string,
): role is
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG" {
  return MANAGER_ROLES.includes(
    role as UserRole,
  );
}

/* =========================================================
   CHI HỘI CỦA CHI HỘI TRƯỞNG
========================================================= */

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

  if (
    !user?.chiHoiId
  ) {
    return "";
  }

  return String(
    user.chiHoiId,
  );
}

/* =========================================================
   GET
   DANH SÁCH PHIÊN QR
========================================================= */

export async function GET(
  request:
    Request,
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

    if (
      !isManagerRole(
        session.role,
      )
    ) {
      return responseError(
        "Bạn không có quyền quản lý điểm danh QR",
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

    const hoatDongId =
      searchParams
        .get(
          "hoatDongId",
        )
        ?.trim() ||
      "";

    const filter:
      Record<
        string,
        unknown
      > = {};

    if (
      hoatDongId
    ) {
      if (
        !Types.ObjectId.isValid(
          hoatDongId,
        )
      ) {
        return responseError(
          "Mã hoạt động không hợp lệ",
        );
      }

      filter.hoatDongId =
        new Types.ObjectId(
          hoatDongId,
        );
    }

    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      const chiHoiId =
        await getLeaderChiHoiId(
          session.userId,
        );

      if (!chiHoiId) {
        return NextResponse.json({
          success:
            true,

          data:
            [],
        });
      }

      filter.chiHoiId =
        new Types.ObjectId(
          chiHoiId,
        );
    }

    const sessions =
      await PhienDiemDanhQR.find(
        filter,
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
        .sort({
          createdAt:
            -1,
        })
        .limit(
          100,
        )
        .lean();

    const sessionIds =
      sessions.map(
        (
          item,
        ) =>
          item._id,
      );

    const countResult =
      sessionIds.length >
      0
        ? await LuotDiemDanhQR.aggregate<{
            _id:
              Types.ObjectId;

            total:
              number;
          }>([
            {
              $match: {
                phienId: {
                  $in:
                    sessionIds,
                },
              },
            },

            {
              $group: {
                _id:
                  "$phienId",

                total: {
                  $sum:
                    1,
                },
              },
            },
          ])
        : [];

    const countMap =
      new Map<
        string,
        number
      >();

    for (
      const item of
      countResult
    ) {
      countMap.set(
        String(
          item._id,
        ),

        Number(
          item.total ||
            0,
        ),
      );
    }

    const now =
      Date.now();

    const data =
      sessions.map(
        (
          item,
        ) => {
          const expired =
            new Date(
              item.thoiGianHetHan,
            ).getTime() <=
            now;

          return {
            ...item,

            daHetHan:
              expired,

            dangMo:
              item.trangThai ===
                "DANG_MO" &&
              !expired,

            soLuotDiemDanh:
              countMap.get(
                String(
                  item._id,
                ),
              ) ||
              0,
          };
        },
      );

    return NextResponse.json({
      success:
        true,

      data,
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/diem-danh-qr:",
      error,
    );

    return responseError(
      process.env.NODE_ENV ===
        "development" &&
      error instanceof
        Error
        ? error.message
        : "Không thể tải danh sách phiên QR",

      500,
    );
  }
}

/* =========================================================
   POST
   TẠO PHIÊN QR
========================================================= */

export async function POST(
  request:
    Request,
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

    if (
      !isManagerRole(
        session.role,
      )
    ) {
      return responseError(
        "Bạn không có quyền tạo mã điểm danh QR",
        403,
      );
    }

    let body:
      CreateBody;

    try {
      body =
        await request.json() as
          CreateBody;
    } catch {
      return responseError(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    const hoatDongId =
      stringValue(
        body.hoatDongId,
      );

    if (
      !Types.ObjectId.isValid(
        hoatDongId,
      )
    ) {
      return responseError(
        "Mã hoạt động không hợp lệ",
      );
    }

    const soPhut =
      normalizeMinutes(
        body.soPhut,
      );

    await connectDB();

    const currentUser =
      await User.findById(
        session.userId,
      )
        .select(
          "_id username fullName role chiHoiId isActive",
        );

    if (!currentUser) {
      return responseError(
        "Không tìm thấy tài khoản",
        404,
      );
    }

    if (
      currentUser.isActive ===
      false
    ) {
      return responseError(
        "Tài khoản đã ngừng hoạt động",
        403,
      );
    }

    const activity =
      await HoatDong.findById(
        hoatDongId,
      ).lean();

    if (!activity) {
      return responseError(
        "Không tìm thấy hoạt động",
        404,
      );
    }

    if (
      activity.trangThai !==
      "DANG_DIEN_RA"
    ) {
      return responseError(
        "Chỉ được mở điểm danh QR khi hoạt động đang diễn ra",
        409,
      );
    }

    let chiHoiId:
      Types.ObjectId | null =
      null;

    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      if (
        !currentUser.chiHoiId
      ) {
        return responseError(
          "Tài khoản Chi hội trưởng chưa được gán Chi hội",
          409,
        );
      }

      chiHoiId =
        new Types.ObjectId(
          String(
            currentUser.chiHoiId,
          ),
        );

      const acceptedRegistration =
        await DangKyTapTheHoatDong.exists({
          hoatDongId:
            new Types.ObjectId(
              hoatDongId,
            ),

          chiHoiId,

          trangThai:
            "DA_TIEP_NHAN",
        });

      if (
        !acceptedRegistration
      ) {
        return responseError(
          "Chi hội chưa có danh sách đăng ký được Ban Chấp hành tiếp nhận",
          409,
        );
      }
    }

    /*
     * Một phạm vi chỉ có một QR đang mở.
     */
    await PhienDiemDanhQR.updateMany(
      {
        hoatDongId:
          new Types.ObjectId(
            hoatDongId,
          ),

        chiHoiId,

        trangThai:
          "DANG_MO",
      },
      {
        $set: {
          trangThai:
            "DA_DONG",
        },
      },
    );

    const now =
      new Date();

    const expiresAt =
      new Date(
        now.getTime() +
          soPhut *
            60 *
            1000,
      );

    const created =
      await PhienDiemDanhQR.create({
        token:
          createToken(),

        hoatDongId:
          new Types.ObjectId(
            hoatDongId,
          ),

        chiHoiId,

        nguoiTaoId:
          currentUser._id,

        nguoiTaoTen:
          currentUser.fullName,

        thoiGianBatDau:
          now,

        thoiGianHetHan:
          expiresAt,

        trangThai:
          "DANG_MO",
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

      action:
        "CREATE",

      module:
        "HOAT_DONG",

      description:
        `Tạo phiên điểm danh QR cho hoạt động ${activity.maHoatDong} - ${activity.tenHoatDong}`,

      targetId:
        created._id.toString(),

      targetName:
        `${activity.maHoatDong} - ${activity.tenHoatDong}`,

      metadata: {
        loai:
          "TAO_QR_DIEM_DANH",

        hoatDongId,

        chiHoiId:
          chiHoiId
            ? String(
                chiHoiId,
              )
            : null,

        soPhut,

        thoiGianBatDau:
          now.toISOString(),

        thoiGianHetHan:
          expiresAt.toISOString(),
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

    return NextResponse.json(
      {
        success:
          true,

        message:
          `Đã mở điểm danh QR trong ${soPhut} phút`,

        data: {
          ...created.toObject(),

          checkInPath:
            `/dashboard/diem-danh-qr/${created.token}`,
        },
      },
      {
        status:
          201,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "POST /api/diem-danh-qr:",
      error,
    );

    return responseError(
      process.env.NODE_ENV ===
        "development" &&
      error instanceof
        Error
        ? error.message
        : "Không thể tạo phiên điểm danh QR",

      500,
    );
  }
}

/* =========================================================
   PATCH
   ĐÓNG PHIÊN QR
========================================================= */

export async function PATCH(
  request:
    Request,
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

    if (
      !isManagerRole(
        session.role,
      )
    ) {
      return responseError(
        "Bạn không có quyền đóng phiên QR",
        403,
      );
    }

    let body:
      PatchBody;

    try {
      body =
        await request.json() as
          PatchBody;
    } catch {
      return responseError(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    const id =
      stringValue(
        body.id,
      );

    const action =
      stringValue(
        body.action,
      );

    if (
      action !==
      "DONG"
    ) {
      return responseError(
        "Thao tác không hợp lệ",
      );
    }

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

    const record =
      await PhienDiemDanhQR.findById(
        id,
      );

    if (!record) {
      return responseError(
        "Không tìm thấy phiên QR",
        404,
      );
    }

    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      const chiHoiId =
        await getLeaderChiHoiId(
          session.userId,
        );

      if (
        !chiHoiId ||
        !record.chiHoiId ||
        String(
          record.chiHoiId,
        ) !==
          chiHoiId
      ) {
        return responseError(
          "Bạn không có quyền đóng phiên QR này",
          403,
        );
      }
    }

    if (
      record.trangThai ===
      "DA_DONG"
    ) {
      return NextResponse.json({
        success:
          true,

        message:
          "Phiên QR đã được đóng trước đó",

        data:
          record,
      });
    }

    record.trangThai =
      "DA_DONG";

    await record.save();

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
        "UPDATE",

      module:
        "HOAT_DONG",

      description:
        "Đóng phiên điểm danh QR",

      targetId:
        record._id.toString(),

      targetName:
        record.nguoiTaoTen,

      metadata: {
        loai:
          "DONG_QR_DIEM_DANH",

        hoatDongId:
          String(
            record.hoatDongId,
          ),

        chiHoiId:
          record.chiHoiId
            ? String(
                record.chiHoiId,
              )
            : null,
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
        "Đã đóng phiên điểm danh QR",

      data:
        record,
    });
  } catch (
    error
  ) {
    console.error(
      "PATCH /api/diem-danh-qr:",
      error,
    );

    return responseError(
      process.env.NODE_ENV ===
        "development" &&
      error instanceof
        Error
        ? error.message
        : "Không thể đóng phiên QR",

      500,
    );
  }
}