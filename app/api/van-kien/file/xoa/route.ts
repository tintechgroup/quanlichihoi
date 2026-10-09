import {
  del,
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

interface DeleteBody {
  pathname?: unknown;

  fileUrl?: unknown;
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

function normalizeString(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

/* =========================================================
   GET PATHNAME FROM INTERNAL URL
========================================================= */

function pathnameFromFileUrl(
  fileUrl: string,
) {
  if (!fileUrl) {
    return "";
  }

  try {
    /*
     * fileUrl lưu dạng:
     *
     * /api/van-kien/file?pathname=van-kien%2F...
     */
    const url =
      new URL(
        fileUrl,
        "http://localhost",
      );

    return (
      url.searchParams
        .get(
          "pathname",
        )
        ?.trim() ||
      ""
    );
  } catch {
    return "";
  }
}

/* =========================================================
   INTERNAL FILE URL
========================================================= */

function buildInternalFileUrl(
  pathname: string,
) {
  return `/api/van-kien/file?pathname=${encodeURIComponent(
    pathname,
  )}`;
}

/* =========================================================
   DELETE /api/van-kien/file/xoa
========================================================= */

export async function DELETE(
  request: Request,
) {
  try {
    /* =====================================================
       SESSION
    ===================================================== */

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
      role !==
        "ADMIN" &&
      role !==
        "BAN_CHAP_HANH"
    ) {
      return responseError(
        "Bạn không có quyền xóa tệp văn kiện",
        403,
      );
    }

    const userId =
      String(
        session.userId,
      );

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      return responseError(
        "Phiên đăng nhập không hợp lệ",
        401,
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body:
      DeleteBody;

    try {
      body =
        await request.json() as
          DeleteBody;
    } catch {
      return responseError(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    const directPathname =
      normalizeString(
        body.pathname,
      );

    const fileUrl =
      normalizeString(
        body.fileUrl,
      );

    const pathname =
      directPathname ||
      pathnameFromFileUrl(
        fileUrl,
      );

    if (!pathname) {
      return responseError(
        "Không xác định được tệp cần xóa",
      );
    }

    /* =====================================================
       PATH SAFETY
    ===================================================== */

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

    /*
     * BCH chỉ được đụng tới thư mục
     * upload của chính tài khoản đó.
     *
     * Upload route đang lưu:
     *
     * van-kien/<userId>/...
     */
    if (
      role !==
        "ADMIN" &&
      !pathname.startsWith(
        `van-kien/${userId}/`,
      )
    ) {
      return responseError(
        "Bạn không có quyền xóa tệp này",
        403,
      );
    }

    await connectDB();

    /* =====================================================
       CHECK REFERENCES
    ===================================================== */

    const internalFileUrl =
      buildInternalFileUrl(
        pathname,
      );

    /*
     * Nếu file vẫn đang được một văn kiện active sử dụng,
     * tuyệt đối chưa xóa Blob.
     */
    const referenced =
      await VanKien.exists({
        isActive: true,

        fileUrl:
          internalFileUrl,
      });

    if (referenced) {
      return responseError(
        "Tệp này vẫn đang được một văn kiện sử dụng nên chưa thể xóa",
        409,
      );
    }

    /* =====================================================
       DELETE BLOB
    ===================================================== */

    await del(
      pathname,
    );

    return NextResponse.json({
      success: true,

      message:
        "Đã xóa tệp khỏi kho lưu trữ",

      data: {
        pathname,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "DELETE /api/van-kien/file/xoa:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể xóa tệp",
      500,
    );
  }
}