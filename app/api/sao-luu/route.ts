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
  count: number;
  documents: unknown[];
};

type BackupFile = {
  format: "LCH_BACKUP";
  version: 1;

  createdAt: string;
  database: string;

  createdBy: {
    userId: string;
    username: string;
    fullName: string;
    role: string;
  };

  summary: {
    totalCollections: number;
    totalDocuments: number;
  };

  collections: BackupCollection[];
};

/* =========================================================
   CONSTANTS
========================================================= */

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

function sanitizeFilePart(
  value: string,
) {
  return value
    .replace(
      /[^a-zA-Z0-9_-]/g,
      "-",
    )
    .replace(
      /-+/g,
      "-",
    )
    .replace(
      /^-|-$/g,
      "",
    );
}

function createBackupFileName() {
  const now =
    new Date();

  const date =
    [
      now.getFullYear(),

      String(
        now.getMonth() + 1,
      ).padStart(
        2,
        "0",
      ),

      String(
        now.getDate(),
      ).padStart(
        2,
        "0",
      ),
    ].join(
      "-",
    );

  const time =
    [
      String(
        now.getHours(),
      ).padStart(
        2,
        "0",
      ),

      String(
        now.getMinutes(),
      ).padStart(
        2,
        "0",
      ),

      String(
        now.getSeconds(),
      ).padStart(
        2,
        "0",
      ),
    ].join(
      "-",
    );

  return sanitizeFilePart(
    `lch-backup-${date}-${time}`,
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

/* =========================================================
   GET /api/sao-luu
========================================================= */

export async function GET() {
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
        "Chỉ Quản trị viên mới có quyền xem thông tin sao lưu",
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

    const rawCollections =
      await db
        .listCollections(
          {},
          {
            nameOnly: true,
          },
        )
        .toArray();

    const collectionNames =
      rawCollections
        .map(
          (
            item,
          ) =>
            item.name,
        )
        .filter(
          (
            name,
          ) =>
            !isSystemCollection(
              name,
            ),
        )
        .sort();

    const collections =
      await Promise.all(
        collectionNames.map(
          async (
            name,
          ) => {
            const count =
              await db
                .collection(
                  name,
                )
                .countDocuments();

            return {
              name,
              count,
            };
          },
        ),
      );

    const totalDocuments =
      collections.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.count,
        0,
      );

    /*
     * GET dùng JSON bình thường.
     * Frontend sẽ nhận:
     *
     * totalCollections: 27
     * totalDocuments: 74
     *
     * thay vì {$numberInt:"27"}.
     */
    return NextResponse.json({
      success: true,

      message:
        "Lấy thông tin sao lưu thành công",

      data: {
        database:
          db.databaseName,

        totalCollections:
          collections.length,

        totalDocuments,

        collections,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/sao-luu:",
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
              : "Không thể lấy thông tin sao lưu"
            : "Không thể lấy thông tin sao lưu",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST /api/sao-luu
   CREATE BACKUP FILE
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
        "Chỉ Quản trị viên mới có quyền sao lưu dữ liệu",
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

    /* =====================================================
       COLLECTION LIST
    ===================================================== */

    const rawCollections =
      await db
        .listCollections(
          {},
          {
            nameOnly: true,
          },
        )
        .toArray();

    const collectionNames =
      rawCollections
        .map(
          (
            item,
          ) =>
            item.name,
        )
        .filter(
          (
            name,
          ) =>
            !isSystemCollection(
              name,
            ),
        )
        .sort();

    /* =====================================================
       EXPORT
    ===================================================== */

    const collections:
      BackupCollection[] = [];

    let totalDocuments =
      0;

    for (
      const name of
      collectionNames
    ) {
      const documents =
        await db
          .collection(
            name,
          )
          .find({})
          .toArray();

      totalDocuments +=
        documents.length;

      collections.push({
        name,

        count:
          documents.length,

        documents,
      });
    }

    /* =====================================================
       BACKUP OBJECT
    ===================================================== */

    const backup:
      BackupFile = {
      format:
        "LCH_BACKUP",

      version:
        1,

      createdAt:
        new Date()
          .toISOString(),

      database:
        db.databaseName,

      createdBy: {
        userId:
          session.userId,

        username:
          session.username,

        fullName:
          session.fullName,

        role:
          session.role,
      },

      summary: {
        totalCollections:
          collections.length,

        totalDocuments,
      },

      collections,
    };

    /*
     * File backup bắt buộc dùng EJSON canonical
     * để bảo toàn:
     *
     * ObjectId
     * Date
     * Decimal128
     * Long
     * Binary...
     */
    const json =
      EJSON.stringify(
        backup,
        {
          relaxed: false,
        },
        2,
      );

    const fileName =
      `${createBackupFileName()}.json`;

    /* =====================================================
       SYSTEM LOG
    ===================================================== */

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
        "BACKUP",

      module:
        "SAO_LUU",

      description:
        `Quản trị viên đã tạo bản sao lưu dữ liệu gồm ${collections.length} collection và ${totalDocuments} bản ghi.`,

      targetName:
        fileName,

      metadata: {
        fileName,

        database:
          db.databaseName,

        totalCollections:
          collections.length,

        totalDocuments,

        collections:
          collections.map(
            (
              item,
            ) => ({
              name:
                item.name,

              count:
                item.count,
            }),
          ),
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

    /* =====================================================
       FILE RESPONSE
    ===================================================== */

    return new Response(
      json,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/json; charset=utf-8",

          "Content-Disposition":
            `attachment; filename="${fileName}"`,

          "Cache-Control":
            "no-store",

          "X-Backup-File":
            fileName,

          "X-Backup-Collections":
            String(
              collections.length,
            ),

          "X-Backup-Documents":
            String(
              totalDocuments,
            ),
        },
      },
    );
  } catch (
    error
  ) {
    console.error(
      "POST /api/sao-luu:",
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
              : "Không thể tạo bản sao lưu"
            : "Đã xảy ra lỗi khi tạo bản sao lưu",
      },
      {
        status: 500,
      },
    );
  }
}