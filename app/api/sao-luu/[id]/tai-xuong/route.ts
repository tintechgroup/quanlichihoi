import mongoose, { Types } from "mongoose";
import {
  GridFSBucket,
  ObjectId,
} from "mongodb";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";
import {
  ghiNhatKyThanhCong,
  ghiNhatKyThatBai,
} from "@/lib/ghiNhatKy";

import SaoLuu from "@/models/SaoLuu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
 * TYPES
 * ======================================================= */

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SessionUser = {
  _id?: string;
  id?: string;
  tenDangNhap?: string;
  username?: string;
  hoTen?: string;
  name?: string;
  vaiTro?: string;
  role?: string;
};

type SessionData = SessionUser & {
  user?: SessionUser;
};

/* =========================================================
 * CONSTANTS
 * ======================================================= */

const ALLOWED_ROLES = ["ADMIN"];

const GRID_FS_BUCKET_NAME = "sao_luu_files";

/* =========================================================
 * HELPERS
 * ======================================================= */

function getCurrentUser(
  session: SessionData | null,
) {
  if (!session) return null;
  return session.user ?? session;
}

function getRole(user: SessionUser | null) {
  return user?.vaiTro ?? user?.role;
}

function sanitizeFilename(filename: string) {
  return filename
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200);
}

function readGridFsFile(
  bucket: GridFSBucket,
  fileId: ObjectId,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const downloadStream =
      bucket.openDownloadStream(fileId);

    downloadStream.on(
      "data",
      (chunk: Buffer | Uint8Array) => {
        chunks.push(Buffer.from(chunk));
      },
    );

    downloadStream.on("error", (error) => {
      reject(error);
    });

    downloadStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

/* =========================================================
 * GET: TẢI FILE SAO LƯU
 * ======================================================= */

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    await connectDB();

    const session =
      (await getCurrentSession()) as SessionData | null;

    const currentUser = getCurrentUser(session);
    const role = getRole(currentUser);

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    if (
      !role ||
      !ALLOWED_ROLES.includes(role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chỉ Quản trị viên được tải bản sao lưu",
        },
        {
          status: 403,
        },
      );
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID bản sao lưu không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const backup = await SaoLuu.findById(id)
      .select(
        "_id maSaoLuu tenTep trangThai gridFsFileId mimeType dungLuong checksum tongSoBanGhi createdAt",
      )
      .lean();

    if (!backup) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy bản sao lưu",
        },
        {
          status: 404,
        },
      );
    }

    if (backup.trangThai !== "HOAN_THANH") {
      return NextResponse.json(
        {
          success: false,
          message:
            backup.trangThai === "DANG_XU_LY"
              ? "Bản sao lưu vẫn đang được xử lý"
              : "Bản sao lưu đã thất bại và không có file để tải",
        },
        {
          status: 409,
        },
      );
    }

    if (!backup.gridFsFileId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bản sao lưu không có file dữ liệu",
        },
        {
          status: 404,
        },
      );
    }

    if (!mongoose.connection.db) {
      throw new Error(
        "Chưa thiết lập kết nối MongoDB",
      );
    }

    const database = mongoose.connection.db;

    const bucket = new GridFSBucket(database, {
      bucketName: GRID_FS_BUCKET_NAME,
    });

    const gridFsFileId = new ObjectId(
      backup.gridFsFileId.toString(),
    );

    /*
     * Kiểm tra file còn tồn tại trong GridFS.
     */
    const fileList = await bucket
      .find({
        _id: gridFsFileId,
      })
      .limit(1)
      .toArray();

    if (fileList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "File sao lưu không còn tồn tại trong hệ thống",
        },
        {
          status: 404,
        },
      );
    }

    const fileBuffer = await readGridFsFile(
      bucket,
      gridFsFileId,
    );

    if (fileBuffer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "File sao lưu không có dữ liệu",
        },
        {
          status: 404,
        },
      );
    }

    const filename = sanitizeFilename(
      backup.tenTep ||
        `${backup.maSaoLuu.toLowerCase()}.json`,
    );

    /*
     * Ghi nhật ký nhưng không để lỗi ghi nhật ký
     * ảnh hưởng đến việc tải file.
     */
    await ghiNhatKyThanhCong({
      nguoiDung: currentUser,
      request,
      hanhDong: "KHAC",
      module: "SAO_LUU",
      moTa: `Tải xuống bản sao lưu ${backup.maSaoLuu}`,
      doiTuongId: backup._id,
      doiTuongLoai: "SaoLuu",
      duLieuMoi: {
        maSaoLuu: backup.maSaoLuu,
        tenTep: filename,
        dungLuong: fileBuffer.length,
        tongSoBanGhi:
          backup.tongSoBanGhi,
      },
      mucDo: "THONG_TIN",
    });

    return new NextResponse(
      new Uint8Array(fileBuffer),
      {
        status: 200,
        headers: {
          "Content-Type":
            backup.mimeType ||
            "application/json; charset=utf-8",

          "Content-Disposition":
            `attachment; filename="${filename}"`,

          "Content-Length":
            fileBuffer.length.toString(),

          "Cache-Control":
            "private, no-store, no-cache, must-revalidate",

          "X-Content-Type-Options":
            "nosniff",

          ...(backup.checksum
            ? {
                ETag: `"${backup.checksum}"`,
                "X-Backup-Checksum":
                  backup.checksum,
              }
            : {}),
        },
      },
    );
  } catch (error) {
    console.error(
      "Lỗi tải file sao lưu:",
      error,
    );

    try {
      const session =
        (await getCurrentSession()) as SessionData | null;

      const currentUser =
        getCurrentUser(session);

      if (currentUser) {
        const { id } = await context.params;

        await ghiNhatKyThatBai({
          nguoiDung: currentUser,
          request,
          hanhDong: "KHAC",
          module: "SAO_LUU",
          moTa:
            "Tải xuống bản sao lưu thất bại",
          doiTuongId: Types.ObjectId.isValid(id)
            ? new Types.ObjectId(id)
            : undefined,
          doiTuongLoai: "SaoLuu",
          mucDo: "CANH_BAO",
          loi: error,
        });
      }
    } catch (logError) {
      console.error(
        "Không thể ghi nhật ký lỗi tải sao lưu:",
        logError,
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể tải file sao lưu",
      },
      {
        status: 500,
      },
    );
  }
}