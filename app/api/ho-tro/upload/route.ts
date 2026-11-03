import {
  NextResponse,
} from "next/server";

import {
  del,
  put,
} from "@vercel/blob";

import {
  getCurrentSession,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const MAX_FILES =
  5;

const MAX_FILE_SIZE =
  10 *
  1024 *
  1024;

const ALLOWED_TYPES =
  new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
  ]);

const ALLOWED_EXTENSIONS =
  new Set([
    "png",
    "jpg",
    "jpeg",
    "webp",
    "pdf",
  ]);

function errorResponse(
  message: string,
  status = 400,
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

function getExtension(
  filename: string,
) {
  return (
    filename
      .split(".")
      .pop()
      ?.toLowerCase() ||
    ""
  );
}

function sanitizeFileName(
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

export async function POST(
  request:
    Request,
) {
  const uploadedPathnames:
    string[] = [];

  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return errorResponse(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    const formData =
      await request.formData();

    const files =
      formData
        .getAll(
          "files",
        )
        .filter(
          (
            item,
          ): item is File =>
            item instanceof
            File,
        );

    if (
      files.length ===
      0
    ) {
      return errorResponse(
        "Vui lòng chọn ít nhất một tệp",
      );
    }

    if (
      files.length >
      MAX_FILES
    ) {
      return errorResponse(
        `Chỉ được tải tối đa ${MAX_FILES} tệp`,
      );
    }

    for (
      const file of
      files
    ) {
      if (
        file.size <=
        0
      ) {
        return errorResponse(
          `Tệp "${file.name}" không có dữ liệu`,
        );
      }

      const extension =
        getExtension(
          file.name,
        );

      if (
        !ALLOWED_EXTENSIONS.has(
          extension,
        )
      ) {
        return errorResponse(
          `Tệp "${file.name}" không đúng định dạng cho phép`,
        );
      }

      if (
        file.type &&
        !ALLOWED_TYPES.has(
          file.type,
        )
      ) {
        return errorResponse(
          `Loại tệp "${file.name}" không được hỗ trợ`,
        );
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        return errorResponse(
          `Tệp "${file.name}" vượt quá 10MB`,
        );
      }
    }

    const uploaded: {
      tenTep:
        string;

      duongDan:
        string;

      pathname:
        string;

      mimeType:
        string;

      kichThuoc:
        number;
    }[] = [];

    for (
      const file of
      files
    ) {
      const extension =
        getExtension(
          file.name,
        );

      const safeName =
        sanitizeFileName(
          file.name,
        ) ||
        `tep-ho-tro.${extension}`;

      const pathname =
        [
          "ho-tro",
          session.userId,
          Date.now(),
          safeName,
        ].join(
          "/",
        );

      const blob =
        await put(
          pathname,
          file,
          {
            access:
              "private",

            addRandomSuffix:
              true,

            contentType:
              file.type ||
              undefined,
          },
        );

      uploadedPathnames.push(
        blob.pathname,
      );

      uploaded.push({
        tenTep:
          file.name,

        duongDan:
          blob.url,

        pathname:
          blob.pathname,

        mimeType:
          file.type ||
          "application/octet-stream",

        kichThuoc:
          file.size,
      });
    }

    return NextResponse.json({
      success:
        true,

      message:
        "Tải tệp lên thành công",

      data:
        uploaded,
    });
  } catch (
    error
  ) {
    console.error(
      "POST /api/ho-tro/upload:",
      error,
    );

    /*
     * Nếu lỗi giữa quá trình upload nhiều file,
     * dọn các Blob đã tải thành công trước đó.
     */
    if (
      uploadedPathnames.length >
      0
    ) {
      await Promise.allSettled(
        uploadedPathnames.map(
          (
            pathname,
          ) =>
            del(
              pathname,
            ),
        ),
      );
    }

    return errorResponse(
      process.env.NODE_ENV ===
        "development" &&
      error instanceof
        Error
        ? error.message
        : "Không thể tải tệp",
      500,
    );
  }
}