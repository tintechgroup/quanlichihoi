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

import User from "@/models/User";
import VanKien from "@/models/VanKien";

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
      id: string;
    }>;
};

type Action =
  | "DUYET"
  | "TU_CHOI";

type Body = {
  action?: unknown;

  lyDoTuChoi?: unknown;
};

/* =========================================================
   HELPERS
========================================================= */

function responseError(
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

function normalizeString(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

/* =========================================================
   PATCH /api/van-kien/[id]/phe-duyet
========================================================= */

export async function PATCH(
  request:
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

    if (
      session.role !==
      "ADMIN"
    ) {
      return responseError(
        "Chỉ Quản trị viên được phê duyệt văn kiện",
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
        "Mã văn kiện không hợp lệ",
      );
    }

    let body:
      Body;

    try {
      body =
        await request.json();
    } catch {
      return responseError(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    const action =
      normalizeString(
        body.action,
      ) as Action;

    if (
      ![
        "DUYET",
        "TU_CHOI",
      ].includes(
        action,
      )
    ) {
      return responseError(
        "Hành động phê duyệt không hợp lệ",
      );
    }

    const lyDoTuChoi =
      normalizeString(
        body.lyDoTuChoi,
      );

    if (
      action ===
        "TU_CHOI" &&
      !lyDoTuChoi
    ) {
      return responseError(
        "Vui lòng nhập lý do từ chối",
      );
    }

    if (
      lyDoTuChoi.length >
      1000
    ) {
      return responseError(
        "Lý do từ chối không được vượt quá 1000 ký tự",
      );
    }

    await connectDB();

    const admin =
      await User.findById(
        session.userId,
      );

    if (!admin) {
      return responseError(
        "Không tìm thấy tài khoản Quản trị viên",
        404,
      );
    }

    const record =
      await VanKien.findOne({
        _id:
          id,

        isActive:
          true,
      });

    if (!record) {
      return responseError(
        "Không tìm thấy văn kiện",
        404,
      );
    }

    if (
      record.trangThai !==
      "CHO_DUYET"
    ) {
      return responseError(
        "Văn kiện này không ở trạng thái chờ duyệt",
        409,
      );
    }

    if (
      action ===
      "DUYET"
    ) {
      record.trangThai =
        "DA_DUYET";

      record.nguoiDuyetId =
        admin._id;

      record.nguoiDuyetTen =
        admin.fullName;

      record.ngayDuyet =
        new Date();

      record.lyDoTuChoi =
        "";
    } else {
      record.trangThai =
        "TU_CHOI";

      record.nguoiDuyetId =
        admin._id;

      record.nguoiDuyetTen =
        admin.fullName;

      record.ngayDuyet =
        new Date();

      record.lyDoTuChoi =
        lyDoTuChoi;
    }

    await record.save();

    const updated =
      await VanKien.findById(
        record._id,
      )
        .populate({
          path:
            "nguoiTaoId",

          model:
            User,

          select:
            "username fullName role",
        })
        .populate({
          path:
            "nguoiDuyetId",

          model:
            User,

          select:
            "username fullName role",
        })
        .lean();

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
        action ===
        "DUYET"
          ? "APPROVE"
          : "REJECT",

      module:
        "VAN_KIEN",

      description:
        action ===
        "DUYET"
          ? `Duyệt văn kiện: ${record.tieuDe}`
          : `Từ chối văn kiện: ${record.tieuDe}`,

      targetId:
        String(
          record._id,
        ),

      targetName:
        record.tieuDe,

      metadata: {
        action,

        trangThai:
          record.trangThai,

        loai:
          record.loai,

        soKyHieu:
          record.soKyHieu,

        lyDoTuChoi:
          action ===
          "TU_CHOI"
            ? lyDoTuChoi
            : "",
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
        action ===
        "DUYET"
          ? "Duyệt và công khai văn kiện thành công"
          : "Đã từ chối văn kiện",

      data:
        updated,
    });
  } catch (
    error
  ) {
    console.error(
      "PATCH /api/van-kien/[id]/phe-duyet:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể xử lý phê duyệt văn kiện",
      500,
    );
  }
}