import { createHash } from "crypto";
import { Readable } from "stream";

import mongoose, {
  QueryFilter,
  Types,
} from "mongoose";

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

import SaoLuu, {
  type ISaoLuu,
  type LoaiSaoLuu,
  type TrangThaiSaoLuu,
} from "@/models/SaoLuu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
 * TYPES
 * ======================================================= */

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

type CreateBackupBody = {
  ghiChu?: string;
  loaiSaoLuu?: LoaiSaoLuu;
};

type CollectionBackup = {
  tenCollection: string;
  soBanGhi: number;
  dungLuong: number;
  duLieu: unknown[];
};

type BackupFileData = {
  dinhDang: string;
  phienBan: string;
  thoiGianTao: string;
  tenCoSoDuLieu: string;
  tongSoCollection: number;
  tongSoBanGhi: number;
  danhSachCollection: CollectionBackup[];
};

/* =========================================================
 * CONSTANTS
 * ======================================================= */

const ALLOWED_ROLES = ["ADMIN"];

const GRID_FS_BUCKET_NAME = "sao_luu_files";

/*
 * Không sao lưu các collection dùng để chứa chính
 * file sao lưu và metadata sao lưu.
 */
const EXCLUDED_COLLECTIONS = new Set([
  "sao_luu",
  `${GRID_FS_BUCKET_NAME}.files`,
  `${GRID_FS_BUCKET_NAME}.chunks`,
]);

/* =========================================================
 * HELPERS
 * ======================================================= */

function getCurrentUser(
  session: SessionData | null,
) {
  if (!session) return null;
  return session.user ?? session;
}

function getUserId(user: SessionUser | null) {
  return user?._id ?? user?.id;
}

function getUsername(user: SessionUser | null) {
  return user?.tenDangNhap ?? user?.username;
}

function getFullName(user: SessionUser | null) {
  return user?.hoTen ?? user?.name;
}

function getRole(user: SessionUser | null) {
  return user?.vaiTro ?? user?.role;
}

function toObjectId(value?: string) {
  if (!value || !Types.ObjectId.isValid(value)) {
    return undefined;
  }

  return new Types.ObjectId(value);
}

function parsePositiveInteger(
  value: string | null,
  defaultValue: number,
) {
  if (!value) return defaultValue;

  const parsed = Number.parseInt(value, 10);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return defaultValue;
  }

  return parsed;
}

function escapeRegex(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function createBackupCode() {
  const now = new Date();

  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const timePart = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase();

  return `BK${datePart}${timePart}${randomPart}`;
}

function createBackupFilename(code: string) {
  return `${code.toLowerCase()}.json`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 3000);
  }

  if (typeof error === "string") {
    return error.slice(0, 3000);
  }

  try {
    return JSON.stringify(error).slice(0, 3000);
  } catch {
    return "Lỗi không xác định";
  }
}

async function uploadToGridFS(
  bucket: GridFSBucket,
  filename: string,
  buffer: Buffer,
  metadata: Record<string, unknown>,
): Promise<ObjectId> {
  return new Promise((resolve, reject) => {
    const uploadStream =
      bucket.openUploadStream(filename, {
        metadata: { ...metadata, contentType: "application/json" },
      });

    const readable = Readable.from(buffer);

    readable
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => {
        resolve(uploadStream.id);
      });
  });
}

/* =========================================================
 * GET: DANH SÁCH BẢN SAO LƯU
 * ======================================================= */

export async function GET(request: NextRequest) {
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
            "Chỉ Quản trị viên được quản lý bản sao lưu",
        },
        {
          status: 403,
        },
      );
    }

    const { searchParams } = new URL(
      request.url,
    );

    const page = parsePositiveInteger(
      searchParams.get("page"),
      1,
    );

    const requestedLimit = parsePositiveInteger(
      searchParams.get("limit"),
      10,
    );

    const limit = Math.min(requestedLimit, 50);
    const skip = (page - 1) * limit;

    const search =
      searchParams.get("search")?.trim() ?? "";

    const trangThai =
      searchParams.get("trangThai")?.trim() ?? "";

    const loaiSaoLuu =
      searchParams.get("loaiSaoLuu")?.trim() ?? "";

    const query: QueryFilter<ISaoLuu> = {};

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        "i",
      );

      query.$or = [
        {
          maSaoLuu: regex,
        },
        {
          tenTep: regex,
        },
        {
          tenDangNhap: regex,
        },
        {
          hoTenNguoiTao: regex,
        },
        {
          ghiChu: regex,
        },
      ];
    }

    if (trangThai) {
      const validStatuses: TrangThaiSaoLuu[] = [
        "DANG_XU_LY",
        "HOAN_THANH",
        "THAT_BAI",
      ];

      if (
        !validStatuses.includes(
          trangThai as TrangThaiSaoLuu,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Trạng thái sao lưu không hợp lệ",
          },
          {
            status: 400,
          },
        );
      }

      query.trangThai =
        trangThai as TrangThaiSaoLuu;
    }

    if (loaiSaoLuu) {
      const validTypes: LoaiSaoLuu[] = [
        "THU_CONG",
        "TU_DONG",
      ];

      if (
        !validTypes.includes(
          loaiSaoLuu as LoaiSaoLuu,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Loại sao lưu không hợp lệ",
          },
          {
            status: 400,
          },
        );
      }

      query.loaiSaoLuu =
        loaiSaoLuu as LoaiSaoLuu;
    }

    const [
      danhSach,
      tongBanGhi,
      tongSaoLuu,
      hoanThanh,
      thatBai,
      dangXuLy,
      storageResult,
      banSaoLuuGanNhat,
    ] = await Promise.all([
      SaoLuu.find(query)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean({
          virtuals: true,
        }),

      SaoLuu.countDocuments(query),

      SaoLuu.countDocuments({}),

      SaoLuu.countDocuments({
        trangThai: "HOAN_THANH",
      }),

      SaoLuu.countDocuments({
        trangThai: "THAT_BAI",
      }),

      SaoLuu.countDocuments({
        trangThai: "DANG_XU_LY",
      }),

      SaoLuu.aggregate<{
        _id: null;
        tongDungLuong: number;
        tongBanGhi: number;
      }>([
        {
          $match: {
            trangThai: "HOAN_THANH",
          },
        },
        {
          $group: {
            _id: null,
            tongDungLuong: {
              $sum: "$dungLuong",
            },
            tongBanGhi: {
              $sum: "$tongSoBanGhi",
            },
          },
        },
      ]),

      SaoLuu.findOne({
        trangThai: "HOAN_THANH",
      })
        .sort({
          createdAt: -1,
        })
        .select(
          "_id maSaoLuu tenTep dungLuong tongSoBanGhi thoiGianHoanThanh createdAt",
        )
        .lean(),
    ]);

    const tongTrang = Math.max(
      1,
      Math.ceil(tongBanGhi / limit),
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Lấy danh sách sao lưu thành công",

        data: {
          danhSach,

          thongKe: {
            tongSaoLuu,
            hoanThanh,
            thatBai,
            dangXuLy,
            tongDungLuong:
              storageResult[0]?.tongDungLuong ??
              0,
            tongBanGhiDaSaoLuu:
              storageResult[0]?.tongBanGhi ??
              0,
            banSaoLuuGanNhat,
          },

          phanTrang: {
            trangHienTai: page,
            gioiHan: limit,
            tongBanGhi,
            tongTrang,
            coTrangTruoc: page > 1,
            coTrangSau: page < tongTrang,
          },
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
      "Lỗi lấy lịch sử sao lưu:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể lấy lịch sử sao lưu",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
 * POST: TẠO BẢN SAO LƯU
 * ======================================================= */

export async function POST(
  request: NextRequest,
) {
  let backupId: Types.ObjectId | undefined;
  let uploadedFileId: ObjectId | undefined;

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
            "Chỉ Quản trị viên được tạo bản sao lưu",
        },
        {
          status: 403,
        },
      );
    }

    const body = (await request
      .json()
      .catch(() => ({}))) as CreateBackupBody;

    const ghiChu = body.ghiChu?.trim() ?? "";

    if (ghiChu.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ghi chú không được vượt quá 1000 ký tự",
        },
        {
          status: 400,
        },
      );
    }

    const loaiSaoLuu: LoaiSaoLuu =
      body.loaiSaoLuu === "TU_DONG"
        ? "TU_DONG"
        : "THU_CONG";

    /*
     * Không cho tạo đồng thời nhiều bản sao lưu.
     * Chỉ kiểm tra bản đang xử lý trong 30 phút gần đây
     * để tránh một bản ghi lỗi cũ chặn hệ thống mãi mãi.
     */
    const thirtyMinutesAgo = new Date(
      Date.now() - 30 * 60 * 1000,
    );

    const runningBackup = await SaoLuu.findOne({
      trangThai: "DANG_XU_LY",
      createdAt: {
        $gte: thirtyMinutesAgo,
      },
    })
      .select("_id maSaoLuu createdAt")
      .lean();

    if (runningBackup) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hệ thống đang tạo một bản sao lưu khác. Vui lòng chờ hoàn tất.",
        },
        {
          status: 409,
        },
      );
    }

    if (!mongoose.connection.db) {
      throw new Error(
        "Chưa thiết lập kết nối MongoDB",
      );
    }

    const database = mongoose.connection.db;

    const maSaoLuu = createBackupCode();
    const tenTep =
      createBackupFilename(maSaoLuu);

    const userId = getUserId(currentUser);

    const backup = await SaoLuu.create({
      maSaoLuu,
      tenTep,

      loaiSaoLuu,
      trangThai: "DANG_XU_LY",

      mimeType: "application/json",
      phienBan: "1.0",

      tongSoBanGhi: 0,
      dungLuong: 0,
      danhSachCollection: [],

      nguoiTaoId: toObjectId(userId),
      tenDangNhap: getUsername(currentUser),
      hoTenNguoiTao:
        getFullName(currentUser),

      thoiGianBatDau: new Date(),

      ghiChu: ghiChu || undefined,
    });

    backupId = backup._id as Types.ObjectId;

    /*
     * Lấy toàn bộ collection trong database.
     */
    const collectionInfos =
      await database
        .listCollections(
          {},
          {
            nameOnly: true,
          },
        )
        .toArray();

    const collectionNames = collectionInfos
      .map((item) => item.name)
      .filter((name) => {
        if (!name) return false;

        if (name.startsWith("system.")) {
          return false;
        }

        if (EXCLUDED_COLLECTIONS.has(name)) {
          return false;
        }

        return true;
      })
      .sort();

    const collectionBackups: CollectionBackup[] =
      [];

    let tongSoBanGhi = 0;

    /*
     * Sao lưu lần lượt từng collection để tránh tạo
     * quá nhiều truy vấn đồng thời lên MongoDB Atlas.
     */
    for (const collectionName of collectionNames) {
      const documents = await database
        .collection(collectionName)
        .find({})
        .toArray();

      const collectionJson = BSON.EJSON.stringify(
        documents,
        {
          relaxed: false,
        },
      );

      const collectionSize =
        Buffer.byteLength(
          collectionJson,
          "utf8",
        );

      collectionBackups.push({
        tenCollection: collectionName,
        soBanGhi: documents.length,
        dungLuong: collectionSize,
        duLieu: documents,
      });

      tongSoBanGhi += documents.length;
    }

    const backupFileData: BackupFileData = {
      dinhDang:
        "MONGODB_EXTENDED_JSON_BACKUP",
      phienBan: "1.0",
      thoiGianTao: new Date().toISOString(),
      tenCoSoDuLieu: database.databaseName,
      tongSoCollection:
        collectionBackups.length,
      tongSoBanGhi,
      danhSachCollection:
        collectionBackups,
    };

    /*
     * EJSON giúp giữ đúng kiểu ObjectId, Date,
     * Decimal128 và các kiểu dữ liệu MongoDB khác.
     */
    const serializedData = BSON.EJSON.stringify(
      backupFileData,
      {
        relaxed: false,
      },
      2,
    );

    const fileBuffer = Buffer.from(
      serializedData,
      "utf8",
    );

    const checksum = createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    const bucket = new GridFSBucket(database, {
      bucketName: GRID_FS_BUCKET_NAME,
    });

    uploadedFileId = await uploadToGridFS(
      bucket,
      tenTep,
      fileBuffer,
      {
        maSaoLuu,
        backupId: backup._id.toString(),
        nguoiTaoId: userId,
        checksum,
        phienBan: "1.0",
        thoiGianTao: new Date(),
      },
    );

    const chiTietCollection =
      collectionBackups.map((item) => ({
        tenCollection:
          item.tenCollection,
        soBanGhi: item.soBanGhi,
        dungLuong: item.dungLuong,
      }));

    backup.gridFsFileId =
      new Types.ObjectId(
        uploadedFileId.toString(),
      );

    backup.trangThai = "HOAN_THANH";
    backup.tongSoBanGhi = tongSoBanGhi;
    backup.dungLuong = fileBuffer.length;
    backup.danhSachCollection =
      chiTietCollection;
    backup.checksum = checksum;
    backup.thoiGianHoanThanh = new Date();
    backup.loi = undefined;

    await backup.save();

    await ghiNhatKyThanhCong({
      nguoiDung: currentUser,
      request,
      hanhDong: "SAO_LUU",
      module: "SAO_LUU",
      moTa: `Tạo bản sao lưu ${maSaoLuu} thành công`,
      doiTuongId: backup._id,
      doiTuongLoai: "SaoLuu",
      duLieuMoi: {
        maSaoLuu,
        tenTep,
        loaiSaoLuu,
        tongSoCollection:
          collectionBackups.length,
        tongSoBanGhi,
        dungLuong: fileBuffer.length,
        checksum,
      },
      mucDo: "THONG_TIN",
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Tạo bản sao lưu thành công",

        data: {
          saoLuu: {
            _id: backup._id,
            maSaoLuu: backup.maSaoLuu,
            tenTep: backup.tenTep,
            loaiSaoLuu:
              backup.loaiSaoLuu,
            trangThai: backup.trangThai,
            tongSoBanGhi:
              backup.tongSoBanGhi,
            dungLuong: backup.dungLuong,
            danhSachCollection:
              backup.danhSachCollection,
            checksum: backup.checksum,
            thoiGianBatDau:
              backup.thoiGianBatDau,
            thoiGianHoanThanh:
              backup.thoiGianHoanThanh,
            createdAt: backup.createdAt,
          },

          duongDanTaiXuong:
            `/api/sao-luu/${backup._id.toString()}/tai-xuong`,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Lỗi tạo bản sao lưu:",
      error,
    );

    const errorMessage =
      getErrorMessage(error);

    /*
     * Nếu file đã được tải lên GridFS nhưng quá trình
     * cập nhật metadata bị lỗi thì xóa file để tránh
     * tạo file rác.
     */
    if (
      uploadedFileId &&
      mongoose.connection.db
    ) {
      try {
        const bucket = new GridFSBucket(
          mongoose.connection.db,
          {
            bucketName:
              GRID_FS_BUCKET_NAME,
          },
        );

        await bucket.delete(uploadedFileId);
      } catch (deleteError) {
        console.error(
          "Không thể xóa file GridFS bị lỗi:",
          deleteError,
        );
      }
    }

    if (backupId) {
      try {
        await SaoLuu.findByIdAndUpdate(
          backupId,
          {
            $set: {
              trangThai: "THAT_BAI",
              thoiGianHoanThanh:
                new Date(),
              loi: errorMessage,
            },
            $unset: {
              gridFsFileId: 1,
            },
          },
        );
      } catch (updateError) {
        console.error(
          "Không thể cập nhật trạng thái sao lưu:",
          updateError,
        );
      }
    }

    try {
      const session =
        (await getCurrentSession()) as SessionData | null;

      const currentUser =
        getCurrentUser(session);

      if (currentUser) {
        await ghiNhatKyThatBai({
          nguoiDung: currentUser,
          request,
          hanhDong: "SAO_LUU",
          module: "SAO_LUU",
          moTa:
            "Tạo bản sao lưu dữ liệu thất bại",
          doiTuongId: backupId,
          doiTuongLoai: "SaoLuu",
          mucDo: "NGUY_HIEM",
          loi: error,
        });
      }
    } catch (logError) {
      console.error(
        "Không thể ghi nhật ký lỗi sao lưu:",
        logError,
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể tạo bản sao lưu",
      },
      {
        status: 500,
      },
    );
  }
}