import {
  get,
} from "@vercel/blob";

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

import User from "@/models/User";
import HoiVien from "@/models/HoiVien";
import VanKien from "@/models/VanKien";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

interface SessionInfo {
  userId: string;

  role: UserRole;
}

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

function objectIdToString(
  value: unknown,
) {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    value instanceof
    Types.ObjectId
  ) {
    return value.toString();
  }

  if (
    typeof value ===
    "object"
  ) {
    const object =
      value as Record<
        string,
        unknown
      >;

    if (
      object._id
    ) {
      return objectIdToString(
        object._id,
      );
    }

    if (
      object.id
    ) {
      return objectIdToString(
        object.id,
      );
    }
  }

  return String(
    value,
  );
}

async function getUserChiHoiId(
  session:
    SessionInfo,
) {
  /*
   * Chi hội trưởng:
   * lấy từ User trước.
   */
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

    if (
      user?.chiHoiId
    ) {
      return String(
        user.chiHoiId,
      );
    }
  }

  /*
   * Hội viên:
   * lấy từ HoiVien.
   */
  const hoiVien =
    await HoiVien.findOne({
      taiKhoanId:
        new Types.ObjectId(
          session.userId,
        ),
    })
      .select(
        "chiHoiId",
      )
      .lean();

  if (
    hoiVien?.chiHoiId
  ) {
    return String(
      hoiVien.chiHoiId,
    );
  }

  /*
   * Fallback User.
   */
  const user =
    await User.findById(
      session.userId,
    )
      .select(
        "chiHoiId",
      )
      .lean();

  if (
    user?.chiHoiId
  ) {
    return String(
      user.chiHoiId,
    );
  }

  return "";
}

async function canViewVanKien(
  document:
    Record<
      string,
      unknown
    >,

  session:
    SessionInfo,
) {
  /*
   * Admin xem tất cả.
   */
  if (
    session.role ===
    "ADMIN"
  ) {
    return true;
  }

  const creatorId =
    objectIdToString(
      document.nguoiTaoId,
    );

  /*
   * BCH được xem tài liệu mình tạo
   * kể cả NHAP / CHO_DUYET / TU_CHOI.
   */
  if (
    session.role ===
      "BAN_CHAP_HANH" &&
    creatorId ===
      session.userId
  ) {
    return true;
  }

  /*
   * Người nhận chỉ đọc DA_DUYET.
   */
  if (
    document.trangThai !==
    "DA_DUYET"
  ) {
    return false;
  }

  const phamVi =
    String(
      document.phamVi ??
        "",
    );

  if (
    phamVi ===
    "TOAN_HE_THONG"
  ) {
    return true;
  }

  if (
    phamVi ===
    "VAI_TRO"
  ) {
    const roles =
      Array.isArray(
        document.vaiTroNhan,
      )
        ? document.vaiTroNhan.map(
            (
              item,
            ) =>
              String(
                item,
              ),
          )
        : [];

    return roles.includes(
      session.role,
    );
  }

  if (
    phamVi ===
    "CHI_HOI"
  ) {
    const userChiHoiId =
      await getUserChiHoiId(
        session,
      );

    if (!userChiHoiId) {
      return false;
    }

    const ids =
      Array.isArray(
        document.chiHoiIds,
      )
        ? document.chiHoiIds.map(
            objectIdToString,
          )
        : [];

    return ids.includes(
      userChiHoiId,
    );
  }

  return false;
}

/* =========================================================
   GET /api/van-kien/file
========================================================= */

export async function GET(
  request: Request,
) {
  try {
    const rawSession =
      await getCurrentSession();

    if (!rawSession) {
      return responseError(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    const session:
      SessionInfo = {
      userId:
        String(
          rawSession.userId,
        ),

      role:
        rawSession.role as
          UserRole,
    };

    if (
      !Types.ObjectId.isValid(
        session.userId,
      )
    ) {
      return responseError(
        "Phiên đăng nhập không hợp lệ",
        401,
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const pathname =
      searchParams
        .get(
          "pathname",
        )
        ?.trim() ||
      "";

    if (!pathname) {
      return responseError(
        "Thiếu đường dẫn tệp",
      );
    }

    /*
     * Chỉ chấp nhận file thuộc folder Văn kiện.
     */
    if (
      !pathname.startsWith(
        "van-kien/",
      )
    ) {
      return responseError(
        "Đường dẫn tệp không hợp lệ",
        400,
      );
    }

    await connectDB();

    void User;
    void HoiVien;

    /*
     * URL được lưu trong VanKien.fileUrl dưới dạng:
     *
     * /api/van-kien/file?pathname=<encoded pathname>
     */
    const expectedFileUrl =
      `/api/van-kien/file?pathname=${encodeURIComponent(
        pathname,
      )}`;

    const document =
      await VanKien.findOne({
        fileUrl:
          expectedFileUrl,

        isActive:
          true,
      }).lean();

    if (!document) {
      return responseError(
        "Không tìm thấy văn kiện tương ứng với tệp này",
        404,
      );
    }

    const allowed =
      await canViewVanKien(
        document as unknown as
          Record<
            string,
            unknown
          >,

        session,
      );

    if (!allowed) {
      return responseError(
        "Bạn không có quyền tải tài liệu này",
        403,
      );
    }

    const result =
      await get(
        pathname,
        {
          access:
            "private",
        },
      );

    if (!result) {
      return responseError(
        "Không tìm thấy tệp trên kho lưu trữ",
        404,
      );
    }

    const {
      stream,
      blob,
    } =
      result;

    const filename =
      document.tenFile?.trim() ||
      pathname
        .split("/")
        .at(-1) ||
      "tai-lieu";

    const safeDownloadName =
      filename.replace(
        /["\r\n]/g,
        "",
      );

    return new Response(
      stream,
      {
        status:
          200,

        headers: {
          "Content-Type":
            blob.contentType ||
            "application/octet-stream",

          "Content-Disposition":
            `inline; filename*=UTF-8''${encodeURIComponent(
              safeDownloadName,
            )}`,

          "Cache-Control":
            "private, no-store",
        },
      },
    );
  } catch (
    error
  ) {
    console.error(
      "GET /api/van-kien/file:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể tải tài liệu",
      500,
    );
  }
}