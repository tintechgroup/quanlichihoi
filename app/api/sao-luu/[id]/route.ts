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
  ghiNhatKyThatBai,
  ghiNhatKyXoa,
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

function getObjectId(value: string) {
  return new Types.ObjectId(value);
}

async function authenticateAdmin() {
  const session =
    (await getCurrentSession()) as SessionData | null;

  const currentUser = getCurrentUser(session);
  const role = getRole(currentUser);

  if (!currentUser) {
    return {
      success: false as const,
      response: NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      ),
    };
  }

  if (
    !role ||
    !ALLOWED_ROLES.includes(role)
  ) {
    return {
      success: false as const,
      response: NextResponse.json(
        {
          success: false,
          message:
            "Chỉ Quản trị viên được quản lý bản sao lưu",
        },
        {
          status: 403,
        },
      ),
    };
  }

  return {
    success: true as const,
    currentUser,
  };
}

/* =========================================================
 * GET: XEM CHI TIẾT BẢN SAO LƯU
 * ======================================================= */

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    await connectDB();

    const authentication =
      await authenticateAdmin();

    if (!authentication.success) {
      return authentication.response;
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
      .lean({
        virtuals: true,
      });

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

    let gridFsFile = null;

    if (
      backup.gridFsFileId &&
      mongoose.connection.db
    ) {
      const bucket = new GridFSBucket(
        mongoose.connection.db,
        {
          bucketName: GRID_FS_BUCKET_NAME,
        },
      );

      const files = await bucket
        .find({
          _id: new ObjectId(
            backup.gridFsFileId.toString(),
          ),
        })
        .limit(1)
        .toArray();

      if (files.length > 0) {
        const file = files[0];

        gridFsFile = {
          _id: file._id,
          filename: file.filename,
          length: file.length,
          chunkSize: file.chunkSize,
          uploadDate: file.uploadDate,
          contentType:
            (file as typeof file & { contentType?: string }).contentType ??
            file.metadata?.contentType ??
            backup.mimeType,
          metadata: file.metadata,
        };
      }
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Lấy chi tiết bản sao lưu thành công",

        data: {
          saoLuu: backup,

          tepGridFs: gridFsFile,

          coTheTaiXuong:
            backup.trangThai ===
              "HOAN_THANH" &&
            Boolean(backup.gridFsFileId) &&
            Boolean(gridFsFile),

          duongDanTaiXuong:
            backup.trangThai ===
              "HOAN_THANH" &&
            gridFsFile
              ? `/api/sao-luu/${id}/tai-xuong`
              : null,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error(
      "Lỗi lấy chi tiết sao lưu:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể lấy chi tiết bản sao lưu",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
 * DELETE: XÓA BẢN SAO LƯU VÀ FILE GRIDFS
 * ======================================================= */

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  let backupObjectId:
    | Types.ObjectId
    | undefined;

  try {
    await connectDB();

    const authentication =
      await authenticateAdmin();

    if (!authentication.success) {
      return authentication.response;
    }

    const currentUser =
      authentication.currentUser;

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

    backupObjectId = getObjectId(id);

    const backup = await SaoLuu.findById(id);

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

    /*
     * Không cho xóa khi bản sao lưu đang được tạo.
     */
    if (backup.trangThai === "DANG_XU_LY") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể xóa khi bản sao lưu đang được xử lý",
        },
        {
          status: 409,
        },
      );
    }

    const backupSnapshot = {
      _id: backup._id,
      maSaoLuu: backup.maSaoLuu,
      tenTep: backup.tenTep,
      loaiSaoLuu: backup.loaiSaoLuu,
      trangThai: backup.trangThai,
      tongSoBanGhi:
        backup.tongSoBanGhi,
      dungLuong: backup.dungLuong,
      checksum: backup.checksum,
      thoiGianBatDau:
        backup.thoiGianBatDau,
      thoiGianHoanThanh:
        backup.thoiGianHoanThanh,
      danhSachCollection:
        backup.danhSachCollection,
      nguoiTaoId: backup.nguoiTaoId,
      tenDangNhap:
        backup.tenDangNhap,
      hoTenNguoiTao:
        backup.hoTenNguoiTao,
      createdAt: backup.createdAt,
    };

    let fileDaXoa = false;

    /*
     * Xóa file trong GridFS trước.
     */
    if (backup.gridFsFileId) {
      if (!mongoose.connection.db) {
        throw new Error(
          "Chưa thiết lập kết nối MongoDB",
        );
      }

      const bucket = new GridFSBucket(
        mongoose.connection.db,
        {
          bucketName: GRID_FS_BUCKET_NAME,
        },
      );

      const gridFsFileId = new ObjectId(
        backup.gridFsFileId.toString(),
      );

      const fileExists = await bucket
        .find({
          _id: gridFsFileId,
        })
        .limit(1)
        .hasNext();

      if (fileExists) {
        await bucket.delete(gridFsFileId);
        fileDaXoa = true;
      }
    }

    /*
     * Xóa metadata sau khi đã xóa file GridFS.
     */
    await backup.deleteOne();

    await ghiNhatKyXoa({
      nguoiDung: currentUser,
      request,
      module: "SAO_LUU",
      moTa: `Xóa bản sao lưu ${backup.maSaoLuu}`,
      doiTuongId: backupObjectId,
      doiTuongLoai: "SaoLuu",
      duLieuCu: {
        ...backupSnapshot,
        fileDaXoa,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Xóa bản sao lưu thành công",

        data: {
          id,
          maSaoLuu: backup.maSaoLuu,
          tenTep: backup.tenTep,
          fileDaXoa,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Lỗi xóa bản sao lưu:",
      error,
    );

    try {
      const authentication =
        await authenticateAdmin();

      if (authentication.success) {
        await ghiNhatKyThatBai({
          nguoiDung:
            authentication.currentUser,
          request,
          hanhDong: "XOA",
          module: "SAO_LUU",
          moTa: "Xóa bản sao lưu thất bại",
          doiTuongId: backupObjectId,
          doiTuongLoai: "SaoLuu",
          mucDo: "NGUY_HIEM",
          loi: error,
        });
      }
    } catch (logError) {
      console.error(
        "Không thể ghi nhật ký lỗi xóa sao lưu:",
        logError,
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể xóa bản sao lưu",
      },
      {
        status: 500,
      },
    );
  }
}