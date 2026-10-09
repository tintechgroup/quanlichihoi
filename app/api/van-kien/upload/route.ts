import {
  del,
  put,
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

import VanKienUploadTam from "@/models/VanKienUploadTam";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_EXTENSIONS =
  new Set([
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "zip",
    "rar",
    "jpg",
    "jpeg",
    "png",
    "webp",
  ]);

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

function sanitizeFilename(
  filename: string,
) {
  return filename
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-",
    )
    .replace(
      /-+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "");
}

function getExtension(
  filename: string,
) {
  const parts =
    filename
      .toLowerCase()
      .split(".");

  if (
    parts.length <
    2
  ) {
    return "";
  }

  return (
    parts.at(-1) ||
    ""
  );
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
) {
  let uploadedPathname =
    "";

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
        "ADMIN" &&
      session.role !==
        "BAN_CHAP_HANH"
    ) {
      return responseError(
        "Bạn không có quyền tải lên văn kiện",
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

    let formData:
      FormData;

    try {
      formData =
        await request.formData();
    } catch {
      return responseError(
        "Dữ liệu tải lên không hợp lệ",
      );
    }

    const value =
      formData.get(
        "file",
      );

    if (
      !(value instanceof File)
    ) {
      return responseError(
        "Vui lòng chọn một tệp",
      );
    }

    const file =
      value;

    if (
      file.size <=
      0
    ) {
      return responseError(
        "Tệp tải lên không có dữ liệu",
      );
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return responseError(
        "Dung lượng tệp không được vượt quá 10 MB",
      );
    }

    const extension =
      getExtension(
        file.name,
      );

    if (
      !extension ||
      !ALLOWED_EXTENSIONS.has(
        extension,
      )
    ) {
      return responseError(
        "Định dạng tệp không được hỗ trợ",
      );
    }

    const safeFilename =
      sanitizeFilename(
        file.name,
      ) ||
      `van-kien.${extension}`;

    const pathname =
      `van-kien/${userId}/${Date.now()}-${safeFilename}`;

    const blob =
      await put(
        pathname,
        file,
        {
          access:
            "private",

          addRandomSuffix:
            true,
        },
      );

    uploadedPathname =
      blob.pathname;

    const internalUrl =
      `/api/van-kien/file?pathname=${encodeURIComponent(
        blob.pathname,
      )}`;

    /*
     * Ghi nhận file đang ở trạng thái tạm.
     *
     * Nếu sau này có VanKien sử dụng fileUrl này
     * thì cleanup sẽ tự chuyển thành DA_GAN.
     */
    await connectDB();

    await VanKienUploadTam.create({
      pathname:
        blob.pathname,

      fileUrl:
        internalUrl,

      tenFile:
        file.name,

      mimeType:
        file.type ||
        "application/octet-stream",

      kichThuoc:
        file.size,

      nguoiTaiLenId:
        new Types.ObjectId(
          userId,
        ),

      trangThai:
        "TAM",
    });

    return NextResponse.json({
      success: true,

      message:
        "Tải tài liệu lên thành công",

      data: {
        tenFile:
          file.name,

        fileUrl:
          internalUrl,

        pathname:
          blob.pathname,

        kichThuoc:
          file.size,

        mimeType:
          file.type ||
          "application/octet-stream",
      },
    });
  } catch (
    error
  ) {
    console.error(
      "POST /api/van-kien/upload:",
      error,
    );

    /*
     * Blob upload thành công nhưng Mongo lỗi:
     * xóa Blob ngay để không sinh orphan.
     */
    if (
      uploadedPathname
    ) {
      try {
        await del(
          uploadedPathname,
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "Không thể rollback Blob:",
          cleanupError,
        );
      }
    }

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể tải tệp lên",
      500,
    );
  }
}