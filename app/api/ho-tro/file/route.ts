import mongoose from "mongoose";

import {
  get,
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

import YeuCauHoTro, {
  type ITepDinhKemHoTro,
} from "@/models/YeuCauHoTro";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

/* =========================================================
   HELPERS
========================================================= */

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

function normalizeString(
  value:
    string | null,
) {
  return value?.trim() ||
    "";
}

function isManagerRole(
  role:
    string,
) {
  return (
    role ===
      "ADMIN" ||
    role ===
      "BAN_CHAP_HANH"
  );
}

function findAttachment(
  ticket: {
    tepDinhKem?:
      ITepDinhKemHoTro[];

    phanHoi?:
      Array<{
        tepDinhKem?:
          ITepDinhKemHoTro[];
      }>;
  },

  pathname:
    string,
):
  ITepDinhKemHoTro | null {
  /* =======================================================
     FILE GẮN TRỰC TIẾP VÀO YÊU CẦU
  ======================================================= */

  const ticketAttachment =
    (
      ticket.tepDinhKem ||
      []
    ).find(
      (
        file,
      ) =>
        file.pathname ===
        pathname,
    );

  if (
    ticketAttachment
  ) {
    return ticketAttachment;
  }

  /* =======================================================
     FILE GẮN TRONG PHẢN HỒI
  ======================================================= */

  for (
    const reply of
    ticket.phanHoi ||
    []
  ) {
    const attachment =
      (
        reply.tepDinhKem ||
        []
      ).find(
        (
          file,
        ) =>
          file.pathname ===
          pathname,
      );

    if (
      attachment
    ) {
      return attachment;
    }
  }

  return null;
}

/* =========================================================
   GET /api/ho-tro/file
========================================================= */

export async function GET(
  request:
    Request,
) {
  try {
    /* =====================================================
       SESSION
    ===================================================== */

    const session =
      await getCurrentSession();

    if (!session) {
      return errorResponse(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const ticketId =
      normalizeString(
        searchParams.get(
          "ticketId",
        ),
      );

    const pathname =
      normalizeString(
        searchParams.get(
          "pathname",
        ),
      );

    /* =====================================================
       PATH VALIDATION
    ===================================================== */

    if (
      !pathname ||
      !pathname.startsWith(
        "ho-tro/",
      )
    ) {
      return errorResponse(
        "Đường dẫn tệp không hợp lệ",
      );
    }

    /*
     * Chặn một số pathname bất thường.
     */
    if (
      pathname.includes(
        "..",
      ) ||
      pathname.includes(
        "\\",
      )
    ) {
      return errorResponse(
        "Đường dẫn tệp không hợp lệ",
      );
    }

    if (
      ticketId &&
      !mongoose.isValidObjectId(
        ticketId,
      )
    ) {
      return errorResponse(
        "Mã yêu cầu không hợp lệ",
      );
    }

    await connectDB();

    /* =====================================================
       FIND TICKET

       Hỗ trợ 2 kiểu URL:

       1)
       /api/ho-tro/file
       ?ticketId=...
       &pathname=...

       2)
       /api/ho-tro/file
       ?pathname=...

       Kiểu 2 được frontend hiện tại sử dụng.
    ===================================================== */

    const attachmentConditions = {
      $or: [
        {
          "tepDinhKem.pathname":
            pathname,
        },

        {
          "phanHoi.tepDinhKem.pathname":
            pathname,
        },
      ],
    };

    const ticket =
      ticketId
        ? await YeuCauHoTro.findOne({
            _id:
              ticketId,

            ...attachmentConditions,
          }).lean()
        : await YeuCauHoTro.findOne(
            attachmentConditions,
          ).lean();

    if (!ticket) {
      return errorResponse(
        "Không tìm thấy tệp thuộc yêu cầu hỗ trợ",
        404,
      );
    }

    /* =====================================================
       PERMISSION
    ===================================================== */

    const isManager =
      isManagerRole(
        session.role,
      );

    const isOwner =
      ticket.nguoiGuiId
        .toString() ===
      String(
        session.userId,
      );

    if (
      !isManager &&
      !isOwner
    ) {
      return errorResponse(
        "Bạn không có quyền xem tệp này",
        403,
      );
    }

    /* =====================================================
       VERIFY FILE BELONGS TO TICKET
    ===================================================== */

    const attachment =
      findAttachment(
        ticket,
        pathname,
      );

    if (!attachment) {
      return errorResponse(
        "Tệp không thuộc yêu cầu hỗ trợ này",
        404,
      );
    }

    /*
     * Không cho đọc Blob nằm ngoài namespace
     * của module Hỗ trợ.
     */
    if (
      !attachment.pathname ||
      attachment.pathname !==
        pathname ||
      !attachment.pathname.startsWith(
        "ho-tro/",
      )
    ) {
      return errorResponse(
        "Thông tin tệp không hợp lệ",
        400,
      );
    }

    /* =====================================================
       PRIVATE BLOB
    ===================================================== */

    const result =
      await get(
        pathname,
        {
          access:
            "private",
        },
      );

    if (!result) {
      return errorResponse(
        "Không tìm thấy tệp trên kho lưu trữ",
        404,
      );
    }

    /* =====================================================
       RESPONSE HEADERS
    ===================================================== */

    const contentType =
      result.blob
        .contentType ||
      attachment.mimeType ||
      "application/octet-stream";

    const originalName =
      attachment.tenTep?.trim() ||
      "tep-dinh-kem";

    /*
     * Loại ký tự có thể gây lỗi header.
     */
    const safeName =
      originalName.replace(
        /["\r\n]/g,
        "",
      );

    return new Response(
      result.stream,
      {
        status:
          200,

        headers: {
          "Content-Type":
            contentType,

          "Content-Disposition":
            `inline; filename*=UTF-8''${encodeURIComponent(
              safeName,
            )}`,

          "Cache-Control":
            "private, no-store, no-cache, must-revalidate, max-age=0",

          Pragma:
            "no-cache",

          Expires:
            "0",

          "X-Content-Type-Options":
            "nosniff",

          "Referrer-Policy":
            "no-referrer",
        },
      },
    );
  } catch (
    error
  ) {
    console.error(
      "GET /api/ho-tro/file:",
      error,
    );

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