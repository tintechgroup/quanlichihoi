import {
  NextResponse,
} from "next/server";

import {
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
    );
}

export async function POST(
  request:
    Request,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Bạn chưa đăng nhập",
        },
        {
          status:
            401,
        },
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
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Vui lòng chọn ít nhất một tệp",
        },
        {
          status:
            400,
        },
      );
    }

    if (
      files.length >
      MAX_FILES
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            `Chỉ được tải tối đa ${MAX_FILES} tệp`,
        },
        {
          status:
            400,
        },
      );
    }

    for (
      const file of
      files
    ) {
      const extension =
        getExtension(
          file.name,
        );

      if (
        !ALLOWED_EXTENSIONS.has(
          extension,
        )
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              `Tệp "${file.name}" không đúng định dạng cho phép`,
          },
          {
            status:
              400,
          },
        );
      }

      if (
        file.type &&
        !ALLOWED_TYPES.has(
          file.type,
        )
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              `Loại tệp "${file.name}" không được hỗ trợ`,
          },
          {
            status:
              400,
          },
        );
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              `Tệp "${file.name}" vượt quá 10MB`,
          },
          {
            status:
              400,
          },
        );
      }
    }

    const uploaded: {
      tenTep: string;
      duongDan: string;
      pathname: string;
      mimeType: string;
      kichThuoc: number;
    }[] = [];

    for (
      const file of
      files
    ) {
      const safeName =
        sanitizeFileName(
          file.name,
        );

      const pathname =
        [
          "ho-tro",
          session.userId,
          Date.now(),
          safeName,
        ].join(
          "/",
        );

      /*
       * Store của project là PRIVATE.
       */
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

      uploaded.push({
        tenTep:
          file.name,

        /*
         * Vẫn lưu URL để có metadata,
         * nhưng frontend KHÔNG truy cập
         * URL private này trực tiếp.
         */
        duongDan:
          blob.url,

        pathname:
          blob.pathname,

        mimeType:
          file.type,

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

    return NextResponse.json(
      {
        success:
          false,

        message:
          process.env.NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? error.message
              : "Không thể tải tệp"
            : "Không thể tải tệp",
      },
      {
        status:
          500,
      },
    );
  }
}