import { createHash } from "crypto";

import mongoose, { Types } from "mongoose";

import {
  type AnyBulkWriteOperation,
  type Document,
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
export const maxDuration = 300;

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

type RestoreMode =
  | "GHI_DE"
  | "BO_SUNG";

type RestoreBody = {
  xacNhan?: string;
  maSaoLuuXacNhan?: string;
  cheDo?: RestoreMode;
  danhSachCollection?: string[];
  daTaoSaoLuuHienTai?: boolean;
};

type BackupCollection = {
  tenCollection: string;
  soBanGhi: number;
  dungLuong?: number;
  duLieu: Document[];
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

type RestoredCollection = {
  tenCollection: string;
  cheDo: RestoreMode;
  soBanGhiTrongFile: number;
  soBanGhiDaKhoiPhuc: number;
  thanhCong: boolean;
  loi?: string;
};

/* =========================================================
 * CONSTANTS
 * ======================================================= */

const ALLOWED_ROLES = ["ADMIN"];

const CONFIRMATION_TEXT =
  "KHOI_PHUC_DU_LIEU";

const EXPECTED_FORMAT =
  "MONGODB_EXTENDED_JSON_BACKUP";

const GRID_FS_BUCKET_NAME = "sao_luu_files";

const LOCK_COLLECTION =
  "khoa_tac_vu_he_thong";

const RESTORE_LOCK_ID =
  "KHOI_PHUC_DU_LIEU";

/*
 * Các collection không được ghi đè trong quá trình
 * khôi phục để bảo vệ bản sao lưu, session và nhật ký.
 */
const PROTECTED_COLLECTIONS = new Set([
  "sao_luu",
  `${GRID_FS_BUCKET_NAME}.files`,
  `${GRID_FS_BUCKET_NAME}.chunks`,
  "nhat_ky_he_thong",
  "sessions",
  "session",
  LOCK_COLLECTION,
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

function getRole(user: SessionUser | null) {
  return user?.vaiTro ?? user?.role;
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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isSafeCollectionName(
  name: string,
) {
  if (!name.trim()) return false;
  if (name.startsWith("system.")) return false;
  if (name.includes("\0")) return false;
  if (name.includes("$")) return false;

  return !PROTECTED_COLLECTIONS.has(name);
}

function readGridFsFile(
  bucket: GridFSBucket,
  fileId: ObjectId,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const stream =
      bucket.openDownloadStream(fileId);

    stream.on(
      "data",
      (chunk: Buffer | Uint8Array) => {
        chunks.push(Buffer.from(chunk));
      },
    );

    stream.on("error", reject);

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

function parseBackupFile(
  fileBuffer: Buffer,
): BackupFileData {
  let parsed: unknown;

  try {
    parsed = BSON.EJSON.parse(
      fileBuffer.toString("utf8"),
      {
        relaxed: false,
      },
    );
  } catch {
    throw new Error(
      "File sao lưu không đúng định dạng EJSON",
    );
  }

  if (!isRecord(parsed)) {
    throw new Error(
      "Nội dung file sao lưu không hợp lệ",
    );
  }

  if (parsed.dinhDang !== EXPECTED_FORMAT) {
    throw new Error(
      "Định dạng bản sao lưu không được hỗ trợ",
    );
  }

  if (
    !Array.isArray(parsed.danhSachCollection)
  ) {
    throw new Error(
      "Danh sách collection trong file không hợp lệ",
    );
  }

  const collections: BackupCollection[] = [];

  for (
    let index = 0;
    index <
    parsed.danhSachCollection.length;
    index++
  ) {
    const collection =
      parsed.danhSachCollection[index];

    if (!isRecord(collection)) {
      throw new Error(
        `Collection tại vị trí ${
          index + 1
        } không hợp lệ`,
      );
    }

    if (
      typeof collection.tenCollection !==
        "string" ||
      !collection.tenCollection.trim()
    ) {
      throw new Error(
        `Collection tại vị trí ${
          index + 1
        } không có tên hợp lệ`,
      );
    }

    if (!Array.isArray(collection.duLieu)) {
      throw new Error(
        `Dữ liệu collection "${collection.tenCollection}" không hợp lệ`,
      );
    }

    const documents =
      collection.duLieu.filter(
        (document): document is Document =>
          isRecord(document),
      );

    if (
      documents.length !==
      collection.duLieu.length
    ) {
      throw new Error(
        `Collection "${collection.tenCollection}" chứa document không hợp lệ`,
      );
    }

    collections.push({
      tenCollection:
        collection.tenCollection,
      soBanGhi:
        typeof collection.soBanGhi ===
        "number"
          ? collection.soBanGhi
          : documents.length,
      dungLuong:
        typeof collection.dungLuong ===
        "number"
          ? collection.dungLuong
          : 0,
      duLieu: documents,
    });
  }

  const tongSoBanGhi =
    collections.reduce(
      (total, collection) =>
        total + collection.duLieu.length,
      0,
    );

  return {
    dinhDang: String(parsed.dinhDang),
    phienBan:
      typeof parsed.phienBan === "string"
        ? parsed.phienBan
        : "1.0",
    thoiGianTao:
      typeof parsed.thoiGianTao === "string"
        ? parsed.thoiGianTao
        : "",
    tenCoSoDuLieu:
      typeof parsed.tenCoSoDuLieu ===
      "string"
        ? parsed.tenCoSoDuLieu
        : "",
    tongSoCollection:
      typeof parsed.tongSoCollection ===
      "number"
        ? parsed.tongSoCollection
        : collections.length,
    tongSoBanGhi:
      typeof parsed.tongSoBanGhi ===
      "number"
        ? parsed.tongSoBanGhi
        : tongSoBanGhi,
    danhSachCollection: collections,
  };
}

async function overwriteCollection(
  collectionName: string,
  documents: Document[],
) {
  if (!mongoose.connection.db) {
    throw new Error(
      "Chưa thiết lập kết nối MongoDB",
    );
  }

  const collection =
    mongoose.connection.db.collection<Document>(
      collectionName,
    );

  /*
   * Chỉ xóa document, không drop collection để giữ lại
   * các index đã được tạo bởi Mongoose.
   */
  await collection.deleteMany({});

  if (documents.length === 0) {
    return 0;
  }

  const result = await collection.insertMany(
    documents,
    {
      ordered: true,
    },
  );

  return result.insertedCount;
}

async function mergeCollection(
  collectionName: string,
  documents: Document[],
) {
  if (!mongoose.connection.db) {
    throw new Error(
      "Chưa thiết lập kết nối MongoDB",
    );
  }

  if (documents.length === 0) {
    return 0;
  }

  const collection =
    mongoose.connection.db.collection<Document>(
      collectionName,
    );

  const operations: AnyBulkWriteOperation<Document>[] =
    documents.map((document) => {
      if (document._id !== undefined) {
        return {
          replaceOne: {
            filter: {
              _id: document._id,
            },
            replacement: document,
            upsert: true,
          },
        };
      }

      return {
        insertOne: {
          document,
        },
      };
    });

  const result = await collection.bulkWrite(
    operations,
    {
      ordered: true,
    },
  );

  return (
    result.insertedCount +
    result.upsertedCount +
    result.modifiedCount +
    result.matchedCount
  );
}

/* =========================================================
 * POST: KHÔI PHỤC DỮ LIỆU
 * ======================================================= */

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  let lockAcquired = false;
  let backupId:
    | Types.ObjectId
    | undefined;

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
            "Chỉ Quản trị viên được khôi phục dữ liệu",
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

    backupId = new Types.ObjectId(id);

    const body = (await request
      .json()
      .catch(() => ({}))) as RestoreBody;

    if (body.xacNhan !== CONFIRMATION_TEXT) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Vui lòng nhập chính xác "${CONFIRMATION_TEXT}" để xác nhận`,
        },
        {
          status: 400,
        },
      );
    }

    const restoreMode: RestoreMode =
      body.cheDo === "BO_SUNG"
        ? "BO_SUNG"
        : "GHI_DE";

    if (!body.daTaoSaoLuuHienTai) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn phải xác nhận đã tạo bản sao lưu dữ liệu hiện tại",
        },
        {
          status: 400,
        },
      );
    }

    const backup = await SaoLuu.findById(id)
      .select(
        "_id maSaoLuu tenTep trangThai gridFsFileId checksum dungLuong tongSoBanGhi phienBan",
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

    if (
      body.maSaoLuuXacNhan?.trim() !==
      backup.maSaoLuu
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã sao lưu xác nhận không chính xác",
        },
        {
          status: 400,
        },
      );
    }

    if (backup.trangThai !== "HOAN_THANH") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chỉ có thể khôi phục bản sao lưu đã hoàn thành",
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

    /*
     * Tạo khóa để không cho hai tiến trình khôi phục
     * chạy cùng lúc.
     */
    const lockCollection =
      database.collection<Document & { _id: string }>(
        LOCK_COLLECTION,
      );

    /*
     * Xóa khóa cũ quá 30 phút nếu tiến trình trước
     * bị dừng đột ngột.
     */
    await lockCollection.deleteMany({
      _id: RESTORE_LOCK_ID,
      createdAt: {
        $lt: new Date(
          Date.now() - 30 * 60 * 1000,
        ),
      },
    });

    try {
      await lockCollection.insertOne({
        _id: RESTORE_LOCK_ID,
        backupId,
        maSaoLuu: backup.maSaoLuu,
        nguoiThucHien:
          currentUser._id ??
          currentUser.id ??
          null,
        createdAt: new Date(),
      });

      lockAcquired = true;
    } catch (lockError) {
      if (
        isRecord(lockError) &&
        lockError.code === 11000
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Một tiến trình khôi phục khác đang chạy. Vui lòng chờ hoàn tất.",
          },
          {
            status: 409,
          },
        );
      }

      throw lockError;
    }

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

    const fileBuffer = await readGridFsFile(
      bucket,
      gridFsFileId,
    );

    if (fileBuffer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "File sao lưu không có dữ liệu",
        },
        {
          status: 422,
        },
      );
    }

    /*
     * Bắt buộc checksum phải khớp trước khi khôi phục.
     */
    const currentChecksum = createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    if (
      !backup.checksum ||
      currentChecksum !== backup.checksum
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Checksum không khớp. File sao lưu có thể đã bị hỏng hoặc thay đổi.",
        },
        {
          status: 422,
        },
      );
    }

    if (backup.dungLuong !== fileBuffer.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Dung lượng file không khớp metadata",
        },
        {
          status: 422,
        },
      );
    }

    const backupData =
      parseBackupFile(fileBuffer);

    if (
      backupData.tongSoBanGhi !==
      backup.tongSoBanGhi
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Số bản ghi trong file không khớp metadata",
        },
        {
          status: 422,
        },
      );
    }

    const selectedCollectionNames =
      Array.isArray(body.danhSachCollection) &&
      body.danhSachCollection.length > 0
        ? new Set(
            body.danhSachCollection.map((name) =>
              name.trim(),
            ),
          )
        : null;

    const collectionsToRestore =
      backupData.danhSachCollection.filter(
        (collection) => {
          if (
            !isSafeCollectionName(
              collection.tenCollection,
            )
          ) {
            return false;
          }

          if (
            selectedCollectionNames &&
            !selectedCollectionNames.has(
              collection.tenCollection,
            )
          ) {
            return false;
          }

          return true;
        },
      );

    if (collectionsToRestore.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không có collection hợp lệ để khôi phục",
        },
        {
          status: 400,
        },
      );
    }

    const results: RestoredCollection[] = [];

    /*
     * Khôi phục tuần tự để giảm tải cho MongoDB Atlas.
     */
    for (const collectionBackup of collectionsToRestore) {
      try {
        let restoredCount = 0;

        if (restoreMode === "GHI_DE") {
          restoredCount =
            await overwriteCollection(
              collectionBackup.tenCollection,
              collectionBackup.duLieu,
            );
        } else {
          restoredCount =
            await mergeCollection(
              collectionBackup.tenCollection,
              collectionBackup.duLieu,
            );
        }

        results.push({
          tenCollection:
            collectionBackup.tenCollection,
          cheDo: restoreMode,
          soBanGhiTrongFile:
            collectionBackup.duLieu.length,
          soBanGhiDaKhoiPhuc:
            restoredCount,
          thanhCong: true,
        });
      } catch (collectionError) {
        results.push({
          tenCollection:
            collectionBackup.tenCollection,
          cheDo: restoreMode,
          soBanGhiTrongFile:
            collectionBackup.duLieu.length,
          soBanGhiDaKhoiPhuc: 0,
          thanhCong: false,
          loi: getErrorMessage(
            collectionError,
          ),
        });

        /*
         * Dừng ngay khi một collection thất bại để
         * tránh tiếp tục thay đổi database.
         */
        break;
      }
    }

    const successfulResults = results.filter(
      (result) => result.thanhCong,
    );

    const failedResults = results.filter(
      (result) => !result.thanhCong,
    );

    const totalRestored =
      successfulResults.reduce(
        (total, result) =>
          total +
          result.soBanGhiDaKhoiPhuc,
        0,
      );

    if (failedResults.length > 0) {
      await ghiNhatKyThatBai({
        nguoiDung: currentUser,
        request,
        hanhDong: "KHOI_PHUC",
        module: "SAO_LUU",
        moTa: `Khôi phục bản sao lưu ${backup.maSaoLuu} không hoàn tất`,
        doiTuongId: backup._id,
        doiTuongLoai: "SaoLuu",
        duLieuMoi: {
          cheDo: restoreMode,
          ketQua: results,
        },
        mucDo: "NGUY_HIEM",
        loi:
          failedResults[0]?.loi ??
          "Khôi phục dữ liệu thất bại",
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "Quá trình khôi phục không hoàn tất. Hãy kiểm tra chi tiết từng collection.",

          data: {
            maSaoLuu:
              backup.maSaoLuu,
            cheDo: restoreMode,
            tongCollectionYeuCau:
              collectionsToRestore.length,
            collectionThanhCong:
              successfulResults.length,
            collectionThatBai:
              failedResults.length,
            tongBanGhiDaKhoiPhuc:
              totalRestored,
            ketQua: results,
          },
        },
        {
          status: 500,
        },
      );
    }

    await ghiNhatKyThanhCong({
      nguoiDung: currentUser,
      request,
      hanhDong: "KHOI_PHUC",
      module: "SAO_LUU",
      moTa: `Khôi phục bản sao lưu ${backup.maSaoLuu} thành công`,
      doiTuongId: backup._id,
      doiTuongLoai: "SaoLuu",
      duLieuMoi: {
        cheDo: restoreMode,
        tongCollection:
          successfulResults.length,
        tongBanGhiDaKhoiPhuc:
          totalRestored,
        danhSachCollection:
          successfulResults.map(
            (result) => ({
              tenCollection:
                result.tenCollection,
              soBanGhi:
                result.soBanGhiDaKhoiPhuc,
            }),
          ),
      },
      mucDo: "NGUY_HIEM",
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Khôi phục dữ liệu thành công",

        data: {
          maSaoLuu: backup.maSaoLuu,
          cheDo: restoreMode,
          tongCollectionDaKhoiPhuc:
            successfulResults.length,
          tongBanGhiDaKhoiPhuc:
            totalRestored,
          ketQua: results,
          thoiGianHoanThanh:
            new Date().toISOString(),
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Lỗi khôi phục dữ liệu:",
      error,
    );

    try {
      const session =
        (await getCurrentSession()) as SessionData | null;

      const currentUser =
        getCurrentUser(session);

      if (currentUser) {
        await ghiNhatKyThatBai({
          nguoiDung: currentUser,
          request,
          hanhDong: "KHOI_PHUC",
          module: "SAO_LUU",
          moTa:
            "Khôi phục dữ liệu từ bản sao lưu thất bại",
          doiTuongId: backupId,
          doiTuongLoai: "SaoLuu",
          mucDo: "NGUY_HIEM",
          loi: error,
        });
      }
    } catch (logError) {
      console.error(
        "Không thể ghi nhật ký lỗi khôi phục:",
        logError,
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể khôi phục dữ liệu",
      },
      {
        status: 500,
      },
    );
  } finally {
    /*
     * Luôn giải phóng khóa sau khi xử lý.
     */
    if (
      lockAcquired &&
      mongoose.connection.db
    ) {
      try {
        await mongoose.connection.db
          .collection<Document & { _id: string }>(LOCK_COLLECTION)
          .deleteOne({
            _id: RESTORE_LOCK_ID,
          });
      } catch (unlockError) {
        console.error(
          "Không thể giải phóng khóa khôi phục:",
          unlockError,
        );
      }
    }
  }
}