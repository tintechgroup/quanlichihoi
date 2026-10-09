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

import YeuCauHoTro from "@/models/YeuCauHoTro";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

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

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const ticketId =
      searchParams
        .get(
          "ticketId",
        )
        ?.trim() ||
      "";

    const pathname =
      searchParams
        .get(
          "pathname",
        )
        ?.trim() ||
      "";

    if (
      !ticketId ||
      !mongoose.isValidObjectId(
        ticketId,
      )
    ) {
      return errorResponse(
        "Mã yêu cầu không hợp lệ",
      );
    }

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

    await connectDB();

    const ticket =
      await YeuCauHoTro.findById(
        ticketId,
      ).lean();

    if (!ticket) {
      return errorResponse(
        "Không tìm thấy yêu cầu hỗ trợ",
        404,
      );
    }

    const isManager =
      session.role ===
        "ADMIN" ||
      session.role ===
        "BAN_CHAP_HANH";

    const isOwner =
      ticket.nguoiGuiId.toString() ===
      session.userId;

    if (
      !isManager &&
      !isOwner
    ) {
      return errorResponse(
        "Bạn không có quyền xem tệp này",
        403,
      );
    }

    /*
     * Không cho client truyền pathname bất kỳ
     * để đọc file khác trong Blob Store.
     */
    const attachment =
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

    if (!attachment) {
      return errorResponse(
        "Tệp không thuộc yêu cầu hỗ trợ này",
        404,
      );
    }

    /*
     * Vercel Private Blob:
     * đọc qua get() trên server.
     */
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
        "Không tìm thấy tệp",
        404,
      );
    }

    const contentType =
      result.blob
        .contentType ||
      attachment.mimeType ||
      "application/octet-stream";

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
              attachment.tenTep,
            )}`,

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-Content-Type-Options":
            "nosniff",
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