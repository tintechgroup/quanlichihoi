import { createHash } from "crypto";

import mongoose, { Types } from "mongoose";
import {
  BSON,
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

type BackupCollection = {
  tenCollection: string;
  soBanGhi: number;
  dungLuong?: number;
  duLieu: unknown[];
};

type BackupFileData = {
  dinhDang: string;
  phienBan: string;
  thoiGianTao: string;
  tenCoSoDuLieu: string;
  tongSoCollection: number;
  tongSoBanGhi: number;
  danhSachCollection: BackupCollection[];
};

/* =========================================================
 * CONSTANTS
 * ======================================================= */

const ALLOWED_ROLES = ["ADMIN"];

const GRID_FS_BUCKET_NAME = "sao_luu_files";

const EXPECTED_FORMAT =
  "MONGODB_EXTENDED_JSON_BACKUP";

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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Lỗi không xác định";
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

    downloadStream.on("error", reject);

    downloadStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

function validateBackupStructure(
  value: unknown,
): {
  valid: boolean;
  errors: string[];
  data?: BackupFileData;
} {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      valid: false,
      errors: [
        "Nội dung file sao lưu không phải là một object",
      ],
    };
  }

  if (value.dinhDang !== EXPECTED_FORMAT) {
    errors.push(
      `Định dạng file không hợp lệ. Mong đợi: ${EXPECTED_FORMAT}`,
    );
  }

  if (
    typeof value.phienBan !== "string" ||
    !value.phienBan.trim()
  ) {
    errors.push(
      "File sao lưu không có thông tin phiên bản",
    );
  }

  if (
    typeof value.thoiGianTao !== "string" ||
    Number.isNaN(
      new Date(value.thoiGianTao).getTime(),
    )
  ) {
    errors.push(
      "Thời gian tạo bản sao lưu không hợp lệ",
    );
  }

  if (
    typeof value.tenCoSoDuLieu !== "string" ||
    !value.tenCoSoDuLieu.trim()
  ) {
    errors.push(
      "Tên cơ sở dữ liệu không hợp lệ",
    );
  }

  if (
    typeof value.tongSoCollection !== "number" ||
    value.tongSoCollection < 0
  ) {
    errors.push(
      "Tổng số collection không hợp lệ",
    );
  }

  if (
    typeof value.tongSoBanGhi !== "number" ||
    value.tongSoBanGhi < 0
  ) {
    errors.push(
      "Tổng số bản ghi không hợp lệ",
    );
  }

  if (!Array.isArray(value.danhSachCollection)) {
    errors.push(
      "Danh sách collection không hợp lệ",
    );

    return {
      valid: false,
      errors,
    };
  }

  const collectionNames = new Set<string>();
  let calculatedRecordCount = 0;

  value.danhSachCollection.forEach(
    (collection, index) => {
      if (!isRecord(collection)) {
        errors.push(
          `Collection tại vị trí ${index + 1} không hợp lệ`,
        );

        return;
      }

      const collectionName =
        collection.tenCollection;

      if (
        typeof collectionName !== "string" ||
        !collectionName.trim()
      ) {
        errors.push(
          `Collection tại vị trí ${index + 1} không có tên hợp lệ`,
        );
      } else {
        if (collectionNames.has(collectionName)) {
          errors.push(
            `Collection "${collectionName}" xuất hiện nhiều lần`,
          );
        }

        collectionNames.add(collectionName);
      }

      if (!Array.isArray(collection.duLieu)) {
        errors.push(
          `Dữ liệu collection "${
            typeof collectionName === "string"
              ? collectionName
              : index + 1
          }" không phải là mảng`,
        );

        return;
      }

      calculatedRecordCount +=
        collection.duLieu.length;

      if (
        typeof collection.soBanGhi !== "number" ||
        collection.soBanGhi < 0
      ) {
        errors.push(
          `Số bản ghi của collection "${
            typeof collectionName === "string"
              ? collectionName
              : index + 1
          }" không hợp lệ`,
        );
      } else if (
        collection.soBanGhi !==
        collection.duLieu.length
      ) {
        errors.push(
          `Số bản ghi khai báo của collection "${collectionName}" không khớp dữ liệu thực tế`,
        );
      }
    },
  );

  if (
    typeof value.tongSoCollection === "number" &&
    value.tongSoCollection !==
      value.danhSachCollection.length
  ) {
    errors.push(
      "Tổng số collection khai báo không khớp dữ liệu thực tế",
    );
  }

  if (
    typeof value.tongSoBanGhi === "number" &&
    value.tongSoBanGhi !==
      calculatedRecordCount
  ) {
    errors.push(
      "Tổng số bản ghi khai báo không khớp dữ liệu thực tế",
    );
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    errors: [],
    data: value as unknown as BackupFileData,
  };
}

/* =========================================================
 * GET: KIỂM TRA BẢN SAO LƯU
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
            "Chỉ Quản trị viên được kiểm tra bản sao lưu",
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
        "_id maSaoLuu tenTep trangThai gridFsFileId dungLuong tongSoBanGhi checksum phienBan createdAt",
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
              : "Không thể kiểm tra bản sao lưu thất bại",
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
            "Bản sao lưu không có file GridFS",
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

    const files = await bucket
      .find({
        _id: gridFsFileId,
      })
      .limit(1)
      .toArray();

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "File sao lưu không còn tồn tại trong GridFS",
        },
        {
          status: 404,
        },
      );
    }

    const gridFsFile = files[0];

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
          status: 422,
        },
      );
    }

    /*
     * Tính lại checksum của file hiện tại.
     */
    const currentChecksum = createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    const checksumMatches = backup.checksum
      ? currentChecksum === backup.checksum
      : false;

    let parsedData: unknown;

    try {
      parsedData = BSON.EJSON.parse(
        fileBuffer.toString("utf8"),
        {
          relaxed: false,
        },
      );
    } catch (parseError) {
      await ghiNhatKyThatBai({
        nguoiDung: currentUser,
        request,
        hanhDong: "KHAC",
        module: "SAO_LUU",
        moTa: `Kiểm tra bản sao lưu ${backup.maSaoLuu} thất bại do file không đọc được`,
        doiTuongId: backup._id,
        doiTuongLoai: "SaoLuu",
        mucDo: "NGUY_HIEM",
        loi: parseError,
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "File sao lưu bị lỗi hoặc không đúng định dạng EJSON",

          data: {
            hopLe: false,
            checksumKhop: checksumMatches,
            checksumDaLuu:
              backup.checksum ?? null,
            checksumHienTai:
              currentChecksum,
            loi: [
              "Không thể phân tích nội dung file EJSON",
            ],
          },
        },
        {
          status: 422,
        },
      );
    }

    const validation =
      validateBackupStructure(parsedData);

    const metadataMatches =
      validation.data !== undefined &&
      validation.data.tongSoBanGhi ===
        backup.tongSoBanGhi &&
      validation.data.phienBan ===
        backup.phienBan;

    const sizeMatches =
      backup.dungLuong === fileBuffer.length;

    const isValid =
      validation.valid &&
      checksumMatches &&
      metadataMatches &&
      sizeMatches;

    const warnings: string[] = [
      ...validation.errors,
    ];

    if (!backup.checksum) {
      warnings.push(
        "Metadata không có checksum để đối chiếu",
      );
    } else if (!checksumMatches) {
      warnings.push(
        "Checksum SHA-256 không khớp. File có thể đã bị thay đổi hoặc hỏng",
      );
    }

    if (!sizeMatches) {
      warnings.push(
        "Dung lượng file hiện tại không khớp metadata",
      );
    }

    if (!metadataMatches) {
      warnings.push(
        "Thông tin phiên bản hoặc số bản ghi không khớp metadata",
      );
    }

    if (isValid) {
      await ghiNhatKyThanhCong({
        nguoiDung: currentUser,
        request,
        hanhDong: "KHAC",
        module: "SAO_LUU",
        moTa: `Kiểm tra tính toàn vẹn bản sao lưu ${backup.maSaoLuu}: hợp lệ`,
        doiTuongId: backup._id,
        doiTuongLoai: "SaoLuu",
        duLieuMoi: {
          checksumKhop: true,
          dungLuongKhop: true,
          metadataKhop: true,
          tongSoCollection:
            validation.data
              ?.tongSoCollection ?? 0,
          tongSoBanGhi:
            validation.data?.tongSoBanGhi ??
            0,
        },
        mucDo: "THONG_TIN",
      });
    } else {
      await ghiNhatKyThatBai({
        nguoiDung: currentUser,
        request,
        hanhDong: "KHAC",
        module: "SAO_LUU",
        moTa: `Kiểm tra tính toàn vẹn bản sao lưu ${backup.maSaoLuu}: không hợp lệ`,
        doiTuongId: backup._id,
        doiTuongLoai: "SaoLuu",
        duLieuMoi: {
          checksumKhop: checksumMatches,
          dungLuongKhop: sizeMatches,
          metadataKhop: metadataMatches,
          loi: warnings,
        },
        mucDo: "NGUY_HIEM",
        loi: warnings.join("; "),
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: isValid
          ? "Bản sao lưu hợp lệ và có thể sử dụng"
          : "Bản sao lưu không vượt qua kiểm tra toàn vẹn",

        data: {
          hopLe: isValid,

          checksum: {
            hopLe: checksumMatches,
            daLuu: backup.checksum ?? null,
            hienTai: currentChecksum,
          },

          dungLuong: {
            hopLe: sizeMatches,
            metadata: backup.dungLuong,
            thucTe: fileBuffer.length,
          },

          metadata: {
            hopLe: metadataMatches,
            phienBanMetadata:
              backup.phienBan,
            phienBanFile:
              validation.data?.phienBan ??
              null,
            tongBanGhiMetadata:
              backup.tongSoBanGhi,
            tongBanGhiFile:
              validation.data
                ?.tongSoBanGhi ?? null,
          },

          file: {
            tenTep: backup.tenTep,
            gridFsFileId,
            uploadDate:
              gridFsFile.uploadDate,
            dungLuong:
              gridFsFile.length,
          },

          noiDung: {
            dinhDang:
              validation.data?.dinhDang ??
              null,
            tenCoSoDuLieu:
              validation.data
                ?.tenCoSoDuLieu ?? null,
            thoiGianTao:
              validation.data
                ?.thoiGianTao ?? null,
            tongSoCollection:
              validation.data
                ?.tongSoCollection ?? null,
            tongSoBanGhi:
              validation.data
                ?.tongSoBanGhi ?? null,

            danhSachCollection:
              validation.data
                ?.danhSachCollection.map(
                  (collection) => ({
                    tenCollection:
                      collection.tenCollection,
                    soBanGhi:
                      collection.soBanGhi,
                    dungLuong:
                      collection.dungLuong ??
                      0,
                  }),
                ) ?? [],
          },

          canhBao: warnings,
          thoiGianKiemTra:
            new Date().toISOString(),
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
      "Lỗi kiểm tra bản sao lưu:",
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
            "Kiểm tra tính toàn vẹn bản sao lưu thất bại",
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
        "Không thể ghi nhật ký lỗi kiểm tra:",
        logError,
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      {
        status: 500,
      },
    );
  }
}