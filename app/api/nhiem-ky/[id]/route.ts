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

type UpdateBody = {
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
  _request:
    Request,

  context:
    RouteContext,
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
        "Mã nhiệm kỳ không hợp lệ",
      );
    }

    await connectDB();

    const item =
      await NhiemKy.findById(
        id,
      ).lean();

    if (!item) {
      return errorResponse(
        "Không tìm thấy nhiệm kỳ",
        404,
      );
    }

    return NextResponse.json({
      success:
        true,

      data:
        item,
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/nhiem-ky/[id]:",
      error,
    );

    return errorResponse(
      "Không thể tải nhiệm kỳ",
      500,
    );
  }
}

/* =========================================================
   PUT
========================================================= */

export async function PUT(
  request:
    Request,

  context:
    RouteContext,
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
        "Bạn không có quyền cập nhật nhiệm kỳ",
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
        "Mã nhiệm kỳ không hợp lệ",
      );
    }

    let body:
      UpdateBody;

    try {
      body =
        await request.json() as
          UpdateBody;
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
      !maNhiemKy ||
      !tenNhiemKy ||
      !tuNgay ||
      !denNgay
    ) {
      return errorResponse(
        "Vui lòng nhập đầy đủ thông tin nhiệm kỳ",
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
        "Trạng thái không hợp lệ",
      );
    }

    await connectDB();

    const item =
      await NhiemKy.findById(
        id,
      );

    if (!item) {
      return errorResponse(
        "Không tìm thấy nhiệm kỳ",
        404,
      );
    }

    const oldStatus =
      item.trangThai;

    if (
      trangThai ===
      "DANG_HOAT_DONG"
    ) {
      await NhiemKy.updateMany(
        {
          _id: {
            $ne:
              item._id,
          },

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

    item.maNhiemKy =
      maNhiemKy;

    item.tenNhiemKy =
      tenNhiemKy;

    item.tuNgay =
      tuNgay;

    item.denNgay =
      denNgay;

    item.trangThai =
      trangThai;

    item.moTa =
      moTa;

    await item.save();

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
        "HE_THONG",

      description:
        `Cập nhật nhiệm kỳ ${maNhiemKy} - ${tenNhiemKy}`,

      targetId:
        item._id.toString(),

      targetName:
        item.tenNhiemKy,

      metadata: {
        loai:
          "NHIEM_KY",

        oldStatus,

        newStatus:
          trangThai,
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
        "Cập nhật nhiệm kỳ thành công",

      data:
        item,
    });
  } catch (
    error
  ) {
    console.error(
      "PUT /api/nhiem-ky/[id]:",
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
        : "Không thể cập nhật nhiệm kỳ",
      500,
    );
  }
}

/* =========================================================
   DELETE
========================================================= */

export async function DELETE(
  request:
    Request,

  context:
    RouteContext,
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
        "Chỉ Quản trị viên được xóa nhiệm kỳ",
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
        "Mã nhiệm kỳ không hợp lệ",
      );
    }

    await connectDB();

    const item =
      await NhiemKy.findById(
        id,
      );

    if (!item) {
      return errorResponse(
        "Không tìm thấy nhiệm kỳ",
        404,
      );
    }

    if (
      item.trangThai ===
      "DANG_HOAT_DONG"
    ) {
      return errorResponse(
        "Không thể xóa nhiệm kỳ đang hoạt động",
        409,
      );
    }

    const targetId =
      item._id.toString();

    const targetName =
      item.tenNhiemKy;

    const maNhiemKy =
      item.maNhiemKy;

    await item.deleteOne();

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
        "DELETE",

      module:
        "HE_THONG",

      description:
        `Xóa nhiệm kỳ ${maNhiemKy} - ${targetName}`,

      targetId,

      targetName,

      metadata: {
        loai:
          "NHIEM_KY",

        maNhiemKy,
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
        "Xóa nhiệm kỳ thành công",
    });
  } catch (
    error
  ) {
    console.error(
      "DELETE /api/nhiem-ky/[id]:",
      error,
    );

    return errorResponse(
      error instanceof
        Error
        ? error.message
        : "Không thể xóa nhiệm kỳ",
      500,
    );
  }
}