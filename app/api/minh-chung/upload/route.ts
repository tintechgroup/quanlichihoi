import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";

import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/session";

/* =========================================================
   CONFIG
========================================================= */

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",

  "application/pdf",

  "application/msword",

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "application/vnd.ms-excel",

  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       AUTH
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
      session.role !==
        "CHI_HOI_TRUONG" &&
      session.role !==
        "HOI_VIEN"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền tải minh chứng lên",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       CHECK BLOB ENV
    ===================================================== */

    /*
     * Không log giá trị token.
     * Chỉ kiểm tra biến có tồn tại.
     */
    if (
      !process.env
        .BLOB_STORE_ID
    ) {
      console.error(
        "[BLOB] Thiếu BLOB_STORE_ID",
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Máy chủ chưa được cấu hình BLOB_STORE_ID",
        },
        {
          status: 500,
        },
      );
    }

    const hasOidc =
      Boolean(
        process.env
          .VERCEL_OIDC_TOKEN,
      );

    const hasReadWriteToken =
      Boolean(
        process.env
          .BLOB_READ_WRITE_TOKEN,
      );

    if (
      !hasOidc &&
      !hasReadWriteToken
    ) {
      console.error(
        "[BLOB] Không có VERCEL_OIDC_TOKEN hoặc BLOB_READ_WRITE_TOKEN",
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Máy chủ chưa có thông tin xác thực Vercel Blob",
        },
        {
          status: 500,
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
        (await request.json()) as HandleUploadBody;
    } catch (
      bodyError
    ) {
      console.error(
        "[BLOB] Request body lỗi:",
        bodyError,
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Dữ liệu yêu cầu upload không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       CLIENT UPLOAD TOKEN
    ===================================================== */

    const result =
      await handleUpload({
        body,

        request,

        onBeforeGenerateToken:
          async (
            pathname,
          ) => {
            console.log(
              "[BLOB] Cấp quyền upload:",
              {
                pathname,

                userId:
                  session.userId,

                role:
                  session.role,

                hasStoreId:
                  Boolean(
                    process.env
                      .BLOB_STORE_ID,
                  ),

                hasOidc,

                hasReadWriteToken,
              },
            );

            /*
             * Đây là policy upload.
             *
             * Không sửa pathname tại đây.
             */
            return {
              allowedContentTypes:
                ALLOWED_CONTENT_TYPES,

              maximumSizeInBytes:
                MAX_FILE_SIZE,

              /*
               * Thêm suffix để tránh trùng filename.
               */
              addRandomSuffix:
                true,

              tokenPayload:
                JSON.stringify(
                  {
                    userId:
                      session.userId,

                    role:
                      session.role,
                  },
                ),
            };
          },

        onUploadCompleted:
          async ({
            blob,
            tokenPayload,
          }) => {
            /*
             * Localhost có thể không nhận được callback
             * onUploadCompleted từ Vercel.
             *
             * Điều này không làm bước upload token thất bại.
             */
            console.log(
              "[BLOB] Upload hoàn tất:",
              {
                pathname:
                  blob.pathname,

                tokenPayload,
              },
            );
          },
      });

    return NextResponse.json(
      result,
    );
  } catch (error) {
    console.error(
      "[BLOB] handleUpload lỗi:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof
          Error
            ? `Vercel Blob: ${error.message}`
            : "Vercel Blob: Không thể cấp client token",
      },
      {
        status: 500,
      },
    );
  }
}