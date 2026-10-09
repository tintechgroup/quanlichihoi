import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";

import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/session";

export const dynamic =
  "force-dynamic";

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_ROLES = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const ALLOWED_CONTENT_TYPES = [
  /* PDF */
  "application/pdf",

  /* Word */
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  /* Excel */
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  /* PowerPoint */
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  /* Images */
  "image/png",
  "image/jpeg",
];

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       SESSION
    ===================================================== */

    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    if (
      !ALLOWED_ROLES.includes(
        session.role,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền tải file kế hoạch hoạt động",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body:
      HandleUploadBody;

    try {
      body =
        (await request.json()) as
          HandleUploadBody;
    } catch {
      return NextResponse.json(
        {
          success: false,

          message:
            "Dữ liệu upload không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       VERCEL BLOB
    ===================================================== */

    const jsonResponse =
      await handleUpload({
        request,

        body,

        /* =================================================
           BEFORE TOKEN
        ================================================= */

        onBeforeGenerateToken:
          async (
            pathname,
          ) => {
            /*
             * Upload phải nằm đúng
             * thư mục hoạt động của
             * người dùng hiện tại.
             *
             * Ví dụ:
             *
             * hoat-dong/
             *   userId/
             *   2026-10-03/
             *   ke-hoach/
             *   file.pdf
             */
            const expectedPrefix =
              `hoat-dong/${session.userId}/`;

            if (
              !pathname.startsWith(
                expectedPrefix,
              )
            ) {
              throw new Error(
                "Đường dẫn upload không hợp lệ",
              );
            }

            return {
              allowedContentTypes:
                ALLOWED_CONTENT_TYPES,

              maximumSizeInBytes:
                MAX_FILE_SIZE,

              /*
               * Payload này được ký
               * cùng token upload.
               */
              tokenPayload:
                JSON.stringify({
                  userId:
                    session.userId,

                  username:
                    session.username,

                  role:
                    session.role,

                  purpose:
                    "HOAT_DONG_KE_HOACH",
                }),
            };
          },

        /* =================================================
           UPLOAD COMPLETED
        ================================================= */

        onUploadCompleted:
          async ({
            blob,
            tokenPayload,
          }) => {
            /*
             * Không lưu DB tại đây.
             *
             * Metadata blob sẽ được
             * frontend gửi tiếp tới:
             *
             * POST /api/hoat-dong
             *
             * hoặc:
             *
             * PUT /api/hoat-dong/[id]
             */

            if (
              process.env
                .NODE_ENV ===
              "development"
            ) {
              console.log(
                "[HOAT-DONG UPLOAD COMPLETED]",
                {
                  pathname:
                    blob.pathname,

                  tokenPayload,
                },
              );
            }
          },
      });

    return NextResponse.json(
      jsonResponse,
    );
  } catch (error) {
    console.error(
      "POST /api/hoat-dong/upload:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          process.env
            .NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? error.message
              : "Không thể cấp quyền tải file"
            : "Không thể tải file kế hoạch",
      },
      {
        status: 500,
      },
    );
  }
}