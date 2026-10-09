import {
  del,
} from "@vercel/blob";

import {
  NextResponse,
} from "next/server";

import {
  connectDB,
} from "@/lib/mongodb";

import {
  getCurrentSession,
} from "@/lib/session";

import VanKien from "@/models/VanKien";
import VanKienUploadTam from "@/models/VanKienUploadTam";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

/* =========================================================
   CONSTANTS
========================================================= */

/*
 * File TAM quá 24 giờ mới được coi là orphan.
 *
 * Như vậy không ảnh hưởng trường hợp user upload
 * rồi để form mở lâu.
 */
const ORPHAN_AGE_MS =
  24 *
  60 *
  60 *
  1000;

const MAX_PER_RUN =
  100;

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

/* =========================================================
   AUTHORIZE
========================================================= */

async function isAuthorized(
  request: Request,
) {
  /*
   * 1. Cho phép Vercel Cron dùng CRON_SECRET.
   */
  const cronSecret =
    process.env
      .CRON_SECRET;

  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    cronSecret &&
    authorization ===
      `Bearer ${cronSecret}`
  ) {
    return true;
  }

  /*
   * 2. Cho phép ADMIN chạy thủ công.
   */
  const session =
    await getCurrentSession();

  return (
    session?.role ===
    "ADMIN"
  );
}

/* =========================================================
   CLEANUP
========================================================= */

async function cleanup() {
  await connectDB();

  const threshold =
    new Date(
      Date.now() -
        ORPHAN_AGE_MS,
    );

  const uploads =
    await VanKienUploadTam.find({
      trangThai:
        "TAM",

      createdAt: {
        $lte:
          threshold,
      },
    })
      .sort({
        createdAt:
          1,
      })
      .limit(
        MAX_PER_RUN,
      );

  let checked =
    0;

  let attached =
    0;

  let deleted =
    0;

  let failed =
    0;

  const errors:
    Array<{
      pathname:
        string;

      message:
        string;
    }> = [];

  for (
    const upload
    of uploads
  ) {
    checked +=
      1;

    try {
      /*
       * Kiểm tra cả active và inactive.
       *
       * Nếu record văn kiện vẫn còn tham chiếu,
       * chưa xóa Blob để tránh phá dữ liệu lịch sử.
       */
      const reference =
        await VanKien.exists({
          fileUrl:
            upload.fileUrl,
        });

      if (
        reference
      ) {
        upload.trangThai =
          "DA_GAN";

        await upload.save();

        attached +=
          1;

        continue;
      }

      /*
       * Không có VanKien nào sử dụng
       * => Blob thật sự là orphan.
       */
      await del(
        upload.pathname,
      );

      await VanKienUploadTam.deleteOne({
        _id:
          upload._id,
      });

      deleted +=
        1;
    } catch (
      error
    ) {
      failed +=
        1;

      errors.push({
        pathname:
          upload.pathname,

        message:
          error instanceof
            Error
            ? error.message
            : "Không xác định",
      });
    }
  }

  return {
    checked,

    attached,

    deleted,

    failed,

    errors,
  };
}

/* =========================================================
   GET
   Dành cho Cron hoặc Admin
========================================================= */

export async function GET(
  request: Request,
) {
  try {
    if (
      !(await isAuthorized(
        request,
      ))
    ) {
      return responseError(
        "Bạn không có quyền thực hiện thao tác này",
        403,
      );
    }

    const result =
      await cleanup();

    return NextResponse.json({
      success: true,

      message:
        "Hoàn tất kiểm tra file văn kiện tạm",

      data:
        result,
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/van-kien/don-file-rac:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể dọn file rác",
      500,
    );
  }
}

/* =========================================================
   POST
   Cho ADMIN chạy thủ công từ giao diện sau này
========================================================= */

export async function POST(
  request: Request,
) {
  return GET(
    request,
  );
}