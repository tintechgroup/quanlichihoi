import mongoose from "mongoose";
import { EJSON } from "bson";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   TYPES
========================================================= */

type BackupCollection = {
  name: string;
  count?: number;
  documents: unknown[];
};

type BackupFile = {
  format: "LCH_BACKUP";
  version: number;

  createdAt?: string;
  database?: string;

  createdBy?: {
    userId?: string;
    username?: string;
    fullName?: string;
    role?: string;
  };

  summary?: {
    totalCollections?: number;
    totalDocuments?: number;
  };

  collections: BackupCollection[];
};

type PreviewCollection = {
  name: string;
  count: number;
  currentCount: number;
};

/* =========================================================
   CONSTANTS
========================================================= */

const BACKUP_FORMAT =
  "LCH_BACKUP";

const BACKUP_VERSION =
  1;

const CONFIRM_TEXT =
  "PHUC_HOI";

/*
 * Không cho thao tác với collection hệ thống nội bộ.
 */
const SYSTEM_COLLECTION_PREFIXES = [
  "system.",
];

/* =========================================================
   HELPERS
========================================================= */

function errorResponse(
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

function isSystemCollection(
  name: string,
) {
  return SYSTEM_COLLECTION_PREFIXES.some(
    (
      prefix,
    ) =>
      name.startsWith(
        prefix,
      ),
  );
}

function isValidCollectionName(
  value: unknown,
): value is string {
  if (
    typeof value !==
    "string"
  ) {
    return false;
  }

  const name =
    value.trim();

  if (!name) {
    return false;
  }

  /*
   * MongoDB không cho collection name
   * bắt đầu bằng system.
   * Đồng thời chặn ký tự null.
   */
  if (
    name.includes(
      "\0",
    )
  ) {
    return false;
  }

  if (
    isSystemCollection(
      name,
    )
  ) {
    return false;
  }

  return true;
}

function parseBackupText(
  text: string,
) {
  if (
    !text.trim()
  ) {
    throw new Error(
      "File sao lưu đang trống",
    );
  }

  let parsed:
    unknown;

  try {
    parsed =
      EJSON.parse(
        text,
        {
          relaxed: false,
        },
      );
  } catch (
    error
  ) {
    console.error(
      "Không thể parse file backup:",
      error,
    );

    throw new Error(
      "File sao lưu không đúng định dạng EJSON",
    );
  }

  if (
    !parsed ||
    typeof parsed !==
      "object"
  ) {
    throw new Error(
      "File sao lưu không hợp lệ",
    );
  }

  const backup =
    parsed as BackupFile;

  if (
    backup.format !==
    BACKUP_FORMAT
  ) {
    throw new Error(
      "File không phải bản sao lưu của hệ thống Liên Chi hội",
    );
  }

  if (
    Number(
      backup.version,
    ) !==
    BACKUP_VERSION
  ) {
    throw new Error(
      `Phiên bản file sao lưu không được hỗ trợ. Hệ thống chỉ hỗ trợ version ${BACKUP_VERSION}.`,
    );
  }

  if (
    !Array.isArray(
      backup.collections,
    )
  ) {
    throw new Error(
      "File sao lưu thiếu danh sách collection",
    );
  }

  const names =
    new Set<string>();

  for (
    const item of
    backup.collections
  ) {
    if (
      !item ||
      typeof item !==
        "object"
    ) {
      throw new Error(
        "Dữ liệu collection trong file sao lưu không hợp lệ",
      );
    }

    if (
      !isValidCollectionName(
        item.name,
      )
    ) {
      throw new Error(
        `Tên collection không hợp lệ: ${String(
          item.name ??
            "",
        )}`,
      );
    }

    if (
      names.has(
        item.name,
      )
    ) {
      throw new Error(
        `File sao lưu có collection bị trùng: ${item.name}`,
      );
    }

    names.add(
      item.name,
    );

    if (
      !Array.isArray(
        item.documents,
      )
    ) {
      throw new Error(
        `Collection ${item.name} không có danh sách documents hợp lệ`,
      );
    }
  }

  return backup;
}

function getTextFromFormData(
  formData: FormData,
  key: string,
) {
  const value =
    formData.get(
      key,
    );

  if (
    typeof value ===
    "string"
  ) {
    return value.trim();
  }

  return "";
}

async function getBackupFromRequest(
  request: Request,
) {
  const contentType =
    request.headers.get(
      "content-type",
    ) ||
    "";

  /*
   * Hỗ trợ upload file multipart/form-data
   */
  if (
    contentType.includes(
      "multipart/form-data",
    )
  ) {
    const formData =
      await request.formData();

    const file =
      formData.get(
        "file",
      );

    if (
      !(file instanceof File)
    ) {
      throw new Error(
        "Vui lòng chọn file sao lưu",
      );
    }

    if (
      file.size <=
      0
    ) {
      throw new Error(
        "File sao lưu đang trống",
      );
    }

    /*
     * Giới hạn 100 MB để tránh upload quá lớn ngoài ý muốn.
     */
    const maxSize =
      100 *
      1024 *
      1024;

    if (
      file.size >
      maxSize
    ) {
      throw new Error(
        "File sao lưu vượt quá giới hạn 100 MB",
      );
    }

    const text =
      await file.text();

    return {
      backup:
        parseBackupText(
          text,
        ),

      fileName:
        file.name ||
        "backup.json",

      confirm:
        getTextFromFormData(
          formData,
          "confirm",
        ),
    };
  }

  /*
   * Hỗ trợ JSON body để dễ test API.
   *
   * {
   *   "backupText": "...",
   *   "fileName": "...",
   *   "confirm": "PHUC_HOI"
   * }
   */
  if (
    contentType.includes(
      "application/json",
    )
  ) {
    const body =
      await request.json() as {
        backupText?: unknown;
        fileName?: unknown;
        confirm?: unknown;
      };

    if (
      typeof body.backupText !==
      "string"
    ) {
      throw new Error(
        "Thiếu nội dung file sao lưu",
      );
    }

    return {
      backup:
        parseBackupText(
          body.backupText,
        ),

      fileName:
        typeof body.fileName ===
        "string" &&
        body.fileName.trim()
          ? body.fileName.trim()
          : "backup.json",

      confirm:
        typeof body.confirm ===
        "string"
          ? body.confirm.trim()
          : "",
    };
  }

  throw new Error(
    "Định dạng request không được hỗ trợ",
  );
}

/* =========================================================
   POST
   PREVIEW BACKUP FILE
   KHÔNG GHI DATABASE
========================================================= */

export async function POST(
  request: Request,
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

    if (
      session.role !==
      "ADMIN"
    ) {
      return errorResponse(
        "Chỉ Quản trị viên mới có quyền phục hồi dữ liệu",
        403,
      );
    }

    await connectDB();

    const db =
      mongoose.connection.db;

    if (!db) {
      return errorResponse(
        "Chưa kết nối được cơ sở dữ liệu",
        500,
      );
    }

    const {
      backup,
      fileName,
    } =
      await getBackupFromRequest(
        request,
      );

    const previewCollections:
      PreviewCollection[] =
      [];

    let totalDocuments =
      0;

    let currentTotalDocuments =
      0;

    for (
      const item of
      backup.collections
    ) {
      const currentCount =
        await db
          .collection(
            item.name,
          )
          .countDocuments();

      const count =
        item.documents.length;

      totalDocuments +=
        count;

      currentTotalDocuments +=
        currentCount;

      previewCollections.push({
        name:
          item.name,

        count,

        currentCount,
      });
    }

    return NextResponse.json({
      success: true,

      message:
        "Kiểm tra file sao lưu thành công",

      data: {
        fileName,

        format:
          backup.format,

        version:
          backup.version,

        createdAt:
          backup.createdAt ||
          null,

        sourceDatabase:
          backup.database ||
          null,

        targetDatabase:
          db.databaseName,

        createdBy:
          backup.createdBy ||
          null,

        summary: {
          totalCollections:
            backup.collections
              .length,

          totalDocuments,

          currentTotalDocuments,
        },

        collections:
          previewCollections,

        confirmText:
          CONFIRM_TEXT,

        warning:
          "Phục hồi sẽ thay thế toàn bộ dữ liệu của các collection có trong file sao lưu. Các collection không có trong file sẽ không bị thay đổi.",
      },
    });
  } catch (
    error
  ) {
    console.error(
      "POST /api/sao-luu/phuc-hoi:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof
          Error
            ? error.message
            : "Không thể kiểm tra file sao lưu",
      },
      {
        status: 400,
      },
    );
  }
}

/* =========================================================
   PUT
   RESTORE DATA
========================================================= */

export async function PUT(
  request: Request,
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

    if (
      session.role !==
      "ADMIN"
    ) {
      return errorResponse(
        "Chỉ Quản trị viên mới có quyền phục hồi dữ liệu",
        403,
      );
    }

    await connectDB();

    const db =
      mongoose.connection.db;

    if (!db) {
      return errorResponse(
        "Chưa kết nối được cơ sở dữ liệu",
        500,
      );
    }

    const {
      backup,
      fileName,
      confirm,
    } =
      await getBackupFromRequest(
        request,
      );

    if (
      confirm !==
      CONFIRM_TEXT
    ) {
      return errorResponse(
        `Để phục hồi dữ liệu, vui lòng nhập chính xác "${CONFIRM_TEXT}"`,
        400,
      );
    }

    /* =====================================================
       CREATE SAFETY SNAPSHOT IN MEMORY
    ===================================================== */

    /*
     * Trước khi restore, lưu dữ liệu hiện tại của
     * các collection sắp bị thay đổi.
     *
     * Nếu restore lỗi giữa chừng,
     * hệ thống cố rollback về dữ liệu ban đầu.
     */
    const currentSnapshot =
      new Map<
        string,
        unknown[]
      >();

    for (
      const item of
      backup.collections
    ) {
      const currentDocuments =
        await db
          .collection(
            item.name,
          )
          .find({})
          .toArray();

      currentSnapshot.set(
        item.name,
        currentDocuments,
      );
    }

    const restored:
      Array<{
        name: string;
        count: number;
      }> = [];

    try {
      /* ===================================================
         RESTORE
      =================================================== */

      for (
        const item of
        backup.collections
      ) {
        const collection =
          db.collection(
            item.name,
          );

        /*
         * Chỉ xóa collection nằm trong file backup.
         * Collection khác giữ nguyên.
         */
        await collection.deleteMany(
          {},
        );

        if (
          item.documents.length >
          0
        ) {
          await collection.insertMany(
            item.documents as
              Record<
                string,
                unknown
              >[],
            {
              ordered:
                true,
            },
          );
        }

        restored.push({
          name:
            item.name,

          count:
            item.documents.length,
        });
      }
    } catch (
      restoreError
    ) {
      console.error(
        "Restore thất bại, bắt đầu rollback:",
        restoreError,
      );

      /* ===================================================
         ROLLBACK
      =================================================== */

      const rollbackErrors:
        string[] = [];

      for (
        const [
          name,
          documents,
        ] of
        currentSnapshot.entries()
      ) {
        try {
          const collection =
            db.collection(
              name,
            );

          await collection.deleteMany(
            {},
          );

          if (
            documents.length >
            0
          ) {
            await collection.insertMany(
              documents as
                Record<
                  string,
                  unknown
                >[],
              {
                ordered:
                  true,
              },
            );
          }
        } catch (
          rollbackError
        ) {
          console.error(
            `Rollback collection ${name} thất bại:`,
            rollbackError,
          );

          rollbackErrors.push(
            name,
          );
        }
      }

      if (
        rollbackErrors.length >
        0
      ) {
        throw new Error(
          `Phục hồi thất bại và rollback không hoàn tất ở các collection: ${rollbackErrors.join(
            ", ",
          )}`,
        );
      }

      throw new Error(
        restoreError instanceof
          Error
          ? `Phục hồi thất bại. Dữ liệu cũ đã được khôi phục lại. Chi tiết: ${restoreError.message}`
          : "Phục hồi thất bại. Dữ liệu cũ đã được khôi phục lại.",
      );
    }

    /* =====================================================
       SUMMARY
    ===================================================== */

    const totalDocuments =
      restored.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.count,
        0,
      );

    /*
     * Ghi log sau cùng.
     *
     * Lưu ý:
     * Nếu file backup có collection systemlogs thì
     * restore có thể đã thay đổi log cũ.
     * Log RESTORE này được ghi SAU restore,
     * nên luôn có bản ghi cho thao tác hiện tại.
     */
    await writeSystemLog({
      userId:
        session.userId,

      username:
        session.username,

      fullName:
        session.fullName,

      role:
        session.role,

      action:
        "RESTORE",

      module:
        "SAO_LUU",

      description:
        `Quản trị viên đã phục hồi dữ liệu từ file ${fileName}, gồm ${restored.length} collection và ${totalDocuments} bản ghi.`,

      targetName:
        fileName,

      metadata: {
        fileName,

        sourceDatabase:
          backup.database ||
          "",

        targetDatabase:
          db.databaseName,

        backupCreatedAt:
          backup.createdAt ||
          null,

        totalCollections:
          restored.length,

        totalDocuments,

        collections:
          restored,
      },

      ipAddress:
        getRequestIp(
          request,
        ),

      userAgent:
        getUserAgent(
          request,
        ),
    });

    return NextResponse.json({
      success: true,

      message:
        "Phục hồi dữ liệu thành công",

      data: {
        fileName,

        totalCollections:
          restored.length,

        totalDocuments,

        collections:
          restored,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "PUT /api/sao-luu/phuc-hoi:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          process.env.NODE_ENV ===
          "development"
            ? error instanceof Error
              ? error.message
              : "Không thể phục hồi dữ liệu"
            : "Đã xảy ra lỗi khi phục hồi dữ liệu",
      },
      {
        status: 500,
      },
    );
  }
}