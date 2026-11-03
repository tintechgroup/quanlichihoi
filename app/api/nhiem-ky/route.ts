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

import NhiemKy, {
  type TrangThaiNhiemKy,
} from "@/models/NhiemKy";

import User
  from "@/models/User";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

/* =========================================================
   TYPES
========================================================= */

type CreateBody = {
  maNhiemKy?:
    unknown;

  tenNhiemKy?:
    unknown;

  tuNgay?:
    unknown;

  denNgay?:
    unknown;

  trangThai?:
    unknown;

  moTa?:
    unknown;
};

/* =========================================================
   CONSTANTS
========================================================= */

const MANAGER_ROLES = [
  "ADMIN",
  "BAN_CHAP_HANH",
];

const VIEW_ROLES = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const VALID_STATUS:
  TrangThaiNhiemKy[] = [
    "SAP_DIEN_RA",
    "DANG_HOAT_DONG",
    "DA_KET_THUC",
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

function stringValue(
  value:
    unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function parseDate(
  value:
    unknown,
) {
  const text =
    stringValue(
      value,
    );

  if (!text) {
    return null;
  }

  const date =
    new Date(
      text,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function isDuplicateError(
  error:
    unknown,
) {
  return (
    error &&
    typeof error ===
      "object" &&
    "code" in error &&
    (
      error as {
        code?:
          number;
      }
    ).code ===
      11000
  );
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  request:
    Request,
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
      !VIEW_ROLES.includes(
        session.role,
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem nhiệm kỳ",
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

    const search =
      stringValue(
        searchParams.get(
          "search",
        ),
      );

    const trangThai =
      stringValue(
        searchParams.get(
          "trangThai",
        ),
      );

    const filter:
      Record<
        string,
        unknown
      > = {};

    if (search) {
      const safeSearch =
        search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );

      filter.$or = [
        {
          maNhiemKy: {
            $regex:
              safeSearch,

            $options:
              "i",
          },
        },

        {
          tenNhiemKy: {
            $regex:
              safeSearch,

            $options:
              "i",
          },
        },
      ];
    }

    if (
      VALID_STATUS.includes(
        trangThai as
          TrangThaiNhiemKy,
      )
    ) {
      filter.trangThai =
        trangThai;
    }

    const items =
      await NhiemKy.find(
        filter,
      )
        .sort({
          tuNgay:
            -1,
        })
        .lean();

    const current =
      items.find(
        (
          item,
        ) =>
          item.trangThai ===
          "DANG_HOAT_DONG",
      ) ||
      null;

    return NextResponse.json({
      success:
        true,

      data:
        items,

      current,

      permissions: {
        canManage:
          MANAGER_ROLES.includes(
            session.role,
          ),
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/nhiem-ky:",
      error,
    );

    return errorResponse(
      error instanceof
        Error
        ? error.message
        : "Không thể tải danh sách nhiệm kỳ",
      500,
    );
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request:
    Request,
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
      !MANAGER_ROLES.includes(
        session.role,
      )
    ) {
      return errorResponse(
        "Bạn không có quyền tạo nhiệm kỳ",
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
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    const maNhiemKy =
      stringValue(
        body.maNhiemKy,
      ).toUpperCase();

    const tenNhiemKy =
      stringValue(
        body.tenNhiemKy,
      );

    const moTa =
      stringValue(
        body.moTa,
      );

    const tuNgay =
      parseDate(
        body.tuNgay,
      );

    const denNgay =
      parseDate(
        body.denNgay,
      );

    const trangThai =
      stringValue(
        body.trangThai,
      ) as
        TrangThaiNhiemKy;

    if (
      !maNhiemKy
    ) {
      return errorResponse(
        "Vui lòng nhập mã nhiệm kỳ",
      );
    }

    if (
      !tenNhiemKy
    ) {
      return errorResponse(
        "Vui lòng nhập tên nhiệm kỳ",
      );
    }

    if (
      !tuNgay ||
      !denNgay
    ) {
      return errorResponse(
        "Thời gian nhiệm kỳ không hợp lệ",
      );
    }

    if (
      tuNgay.getTime() >=
      denNgay.getTime()
    ) {
      return errorResponse(
        "Ngày bắt đầu phải nhỏ hơn ngày kết thúc",
      );
    }

    if (
      !VALID_STATUS.includes(
        trangThai,
      )
    ) {
      return errorResponse(
        "Trạng thái nhiệm kỳ không hợp lệ",
      );
    }

    await connectDB();

    const currentUser =
      await User.findById(
        session.userId,
      )
        .select(
          "_id username fullName role isActive",
        )
        .lean();

    if (!currentUser) {
      return errorResponse(
        "Không tìm thấy tài khoản",
        404,
      );
    }

    if (
      currentUser.isActive ===
      false
    ) {
      return errorResponse(
        "Tài khoản đã ngừng hoạt động",
        403,
      );
    }

    /*
     * Khi tạo nhiệm kỳ đang hoạt động,
     * tự kết thúc nhiệm kỳ đang hoạt động cũ.
     */
    if (
      trangThai ===
      "DANG_HOAT_DONG"
    ) {
      await NhiemKy.updateMany(
        {
          trangThai:
            "DANG_HOAT_DONG",
        },
        {
          $set: {
            trangThai:
              "DA_KET_THUC",
          },
        },
      );
    }

    const created =
      await NhiemKy.create({
        maNhiemKy,

        tenNhiemKy,

        tuNgay,

        denNgay,

        trangThai,

        moTa,

        nguoiTaoId:
          new Types.ObjectId(
            session.userId,
          ),

        nguoiTaoTen:
          currentUser.fullName,
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
        "HE_THONG",

      description:
        `Tạo nhiệm kỳ ${maNhiemKy} - ${tenNhiemKy}`,

      targetId:
        created._id.toString(),

      targetName:
        tenNhiemKy,

      metadata: {
        loai:
          "NHIEM_KY",

        maNhiemKy,

        trangThai,

        tuNgay:
          tuNgay.toISOString(),

        denNgay:
          denNgay.toISOString(),
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
          "Tạo nhiệm kỳ thành công",

        data:
          created,
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
      "POST /api/nhiem-ky:",
      error,
    );

    if (
      isDuplicateError(
        error,
      )
    ) {
      return errorResponse(
        "Mã nhiệm kỳ đã tồn tại",
        409,
      );
    }

    return errorResponse(
      error instanceof
        Error
        ? error.message
        : "Không thể tạo nhiệm kỳ",
      500,
    );
  }
}