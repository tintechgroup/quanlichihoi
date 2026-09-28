import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import ThongBao from "@/models/ThongBao";
import User from "@/models/User";
import ChiHoi from "@/models/ChiHoi";
import HoiVien from "@/models/HoiVien";

export const dynamic = "force-dynamic";

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type LoaiThongBao =
  | "THONG_BAO_CHUNG"
  | "HOAT_DONG"
  | "TAI_LIEU"
  | "KHAC";

type MucDo = "THONG_THUONG" | "QUAN_TRONG" | "KHAN_CAP";

type PhamVi = "TAT_CA" | "CHI_HOI" | "VAI_TRO" | "CA_NHAN";

type TrangThai = "NHAP" | "DA_DANG" | "DA_AN";

interface SessionUser {
  userId: string;
  username?: string;
  fullName?: string;
  role: UserRole;
}

interface TepDinhKemInput {
  tenTep?: unknown;
  duongDan?: unknown;
  loaiTep?: unknown;
  kichThuoc?: unknown;
}

interface CreateThongBaoBody {
  tieuDe?: unknown;
  noiDung?: unknown;
  loaiThongBao?: unknown;
  mucDo?: unknown;
  phamVi?: unknown;
  chiHoiIds?: unknown;
  vaiTroNguoiNhan?: unknown;
  nguoiNhanIds?: unknown;
  tepDinhKem?: unknown;
  ngayBatDau?: unknown;
  ngayKetThuc?: unknown;
  trangThai?: unknown;
}

const ROLES: UserRole[] = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
  "HOI_VIEN",
];

const MANAGER_ROLES: UserRole[] = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const LOAI_THONG_BAO: LoaiThongBao[] = [
  "THONG_BAO_CHUNG",
  "HOAT_DONG",
  "TAI_LIEU",
  "KHAC",
];

const MUC_DO: MucDo[] = [
  "THONG_THUONG",
  "QUAN_TRONG",
  "KHAN_CAP",
];

const PHAM_VI: PhamVi[] = [
  "TAT_CA",
  "CHI_HOI",
  "VAI_TRO",
  "CA_NHAN",
];

const TRANG_THAI: TrangThai[] = [
  "NHAP",
  "DA_DANG",
  "DA_AN",
];

const MAX_FILE_COUNT = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function responseError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isManager(role: UserRole) {
  return MANAGER_ROLES.includes(role);
}

function normalizeSession(rawSession: unknown): SessionUser | null {
  if (!rawSession || typeof rawSession !== "object") {
    return null;
  }

  const session = rawSession as Record<string, unknown>;
  const nestedUser =
    session.user && typeof session.user === "object"
      ? session.user as Record<string, unknown>
      : {};

  const userId = String(
    session.userId ??
      session.id ??
      session._id ??
      nestedUser.userId ??
      nestedUser.id ??
      nestedUser._id ??
      "",
  );

  const role = String(
    session.role ??
      nestedUser.role ??
      "",
  ) as UserRole;

  if (!userId || !Types.ObjectId.isValid(userId)) {
    return null;
  }

  if (!ROLES.includes(role)) {
    return null;
  }

  return {
    userId,
    role,
    username: normalizeString(
      session.username ?? nestedUser.username,
    ),
    fullName: normalizeString(
      session.fullName ??
        session.hoTen ??
        nestedUser.fullName ??
        nestedUser.hoTen,
    ),
  };
}

function parsePositiveInteger(
  value: string | null,
  defaultValue: number,
  maximum: number,
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return Math.min(parsed, maximum);
}

function taoMaThongBao() {
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

  const randomPart = randomUUID()
    .replaceAll("-", "")
    .slice(0, 6)
    .toUpperCase();

  return `TB${datePart}${timePart}${randomPart}`;
}

function parseObjectIdArray(value: unknown): Types.ObjectId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueIds = new Set<string>();

  value.forEach((item) => {
    const id =
      typeof item === "string"
        ? item.trim()
        : item && typeof item === "object"
          ? String(
              (item as Record<string, unknown>).id ??
                (item as Record<string, unknown>)._id ??
                "",
            )
          : "";

    if (Types.ObjectId.isValid(id)) {
      uniqueIds.add(id);
    }
  });

  return Array.from(uniqueIds).map(
    (id) => new Types.ObjectId(id),
  );
}

function parseRoleArray(value: unknown): UserRole[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item).trim() as UserRole)
        .filter((role) => ROLES.includes(role)),
    ),
  );
}

function parseOptionalDate(
  value: unknown,
  fieldName: string,
): Date | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} không hợp lệ`);
  }

  return date;
}

function parseTepDinhKem(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.length > MAX_FILE_COUNT) {
    throw new Error(
      `Chỉ được đính kèm tối đa ${MAX_FILE_COUNT} tệp`,
    );
  }

  return value.map((rawItem, index) => {
    if (!rawItem || typeof rawItem !== "object") {
      throw new Error(
        `Tệp đính kèm thứ ${index + 1} không hợp lệ`,
      );
    }

    const item = rawItem as TepDinhKemInput;

    const tenTep = normalizeString(item.tenTep);
    const duongDan = normalizeString(item.duongDan);
    const loaiTep = normalizeString(item.loaiTep);

    const sizeValue = Number(item.kichThuoc ?? 0);
    const kichThuoc =
      Number.isFinite(sizeValue) && sizeValue >= 0
        ? sizeValue
        : 0;

    if (!tenTep) {
      throw new Error(
        `Tên tệp đính kèm thứ ${index + 1} không được để trống`,
      );
    }

    if (!duongDan) {
      throw new Error(
        `Đường dẫn tệp “${tenTep}” không hợp lệ`,
      );
    }

    if (kichThuoc > MAX_FILE_SIZE) {
      throw new Error(
        `Tệp “${tenTep}” vượt quá dung lượng 10 MB`,
      );
    }

    return {
      tenTep,
      duongDan,
      loaiTep: loaiTep || undefined,
      kichThuoc,
    };
  });
}

function objectIdToString(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;

    if (object._id) {
      return objectIdToString(object._id);
    }

    if (object.id) {
      return objectIdToString(object.id);
    }
  }

  return String(value);
}

function serializeThongBao(
  raw: Record<string, unknown>,
  currentUserId: string,
) {
  const nguoiTaoRaw =
    raw.nguoiTaoId &&
    typeof raw.nguoiTaoId === "object" &&
    !(raw.nguoiTaoId instanceof Types.ObjectId)
      ? raw.nguoiTaoId as Record<string, unknown>
      : null;

  const nguoiDaDocIds = Array.isArray(raw.nguoiDaDocIds)
    ? raw.nguoiDaDocIds
    : Array.isArray(raw.danhSachDaDoc)
      ? raw.danhSachDaDoc
      : [];

  const daDoc = nguoiDaDocIds.some(
    (id: unknown) =>
      objectIdToString(id) === currentUserId,
  );

  return {
    ...raw,

    id: objectIdToString(raw._id),
    _id: objectIdToString(raw._id),

    maThongBao: raw.maThongBao ?? "",

    chiHoiIds: Array.isArray(raw.chiHoiIds)
      ? raw.chiHoiIds.map(objectIdToString)
      : [],

    nguoiNhanIds: Array.isArray(raw.nguoiNhanIds)
      ? raw.nguoiNhanIds.map(objectIdToString)
      : [],

    vaiTroNguoiNhan: Array.isArray(
      raw.vaiTroNguoiNhan,
    )
      ? raw.vaiTroNguoiNhan
      : [],

    tepDinhKem: Array.isArray(raw.tepDinhKem)
      ? raw.tepDinhKem
      : [],

    daDoc,

    soLuotXem:
      typeof raw.soLuotXem === "number"
        ? raw.soLuotXem
        : nguoiDaDocIds.length,

    nguoiTao: nguoiTaoRaw
      ? {
          id: objectIdToString(nguoiTaoRaw._id),
          username: nguoiTaoRaw.username ?? "",
          fullName:
            nguoiTaoRaw.fullName ??
            nguoiTaoRaw.hoTen ??
            nguoiTaoRaw.username ??
            "",
          role: nguoiTaoRaw.role ?? "",
        }
      : undefined,

    nguoiTaoId: objectIdToString(
      nguoiTaoRaw?._id ?? raw.nguoiTaoId,
    ),
  };
}

function buildQuery(
  conditions: Record<string, unknown>[],
): Record<string, unknown> {
  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return {
    $and: conditions,
  };
}

function isDuplicateMaThongBaoError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const mongoError = error as { code?: number; keyPattern?: { maThongBao?: unknown }; message?: unknown };

  return (
    mongoError.code === 11000 &&
    (mongoError.keyPattern?.maThongBao ||
      String(mongoError.message || "").includes(
        "maThongBao",
      ))
  );
}

/**
 * GET /api/thong-bao
 *
 * Query:
 * - page
 * - limit
 * - search
 * - loaiThongBao
 * - mucDo
 * - trangThai
 * - mode=quan-ly
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Đăng ký các model được tham chiếu trước khi populate.
    void User;
    void ChiHoi;
    void HoiVien;

    const rawSession = await getCurrentSession();
    const session = normalizeSession(rawSession);

    if (!session) {
      return responseError(
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        401,
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const page = parsePositiveInteger(
      searchParams.get("page"),
      1,
      100000,
    );

    const limit = parsePositiveInteger(
      searchParams.get("limit"),
      10,
      100,
    );

    const skip = (page - 1) * limit;

    const search = normalizeString(
      searchParams.get("search"),
    );

    const loaiThongBao = normalizeString(
      searchParams.get("loaiThongBao"),
    ) as LoaiThongBao;

    const mucDo = normalizeString(
      searchParams.get("mucDo"),
    ) as MucDo;

    const trangThai = normalizeString(
      searchParams.get("trangThai"),
    ) as TrangThai;

    const mode = normalizeString(
      searchParams.get("mode"),
    );

    const managerMode =
      mode === "quan-ly" && isManager(session.role);

    const now = new Date();
    const baseConditions: Record<string, unknown>[] = [];

    if (!managerMode) {
      let chiHoiId: Types.ObjectId | null = null;

      const hoiVien = await HoiVien.findOne({
        taiKhoanId: new Types.ObjectId(session.userId),
      })
        .select("chiHoiId")
        .lean();

      if (hoiVien?.chiHoiId) {
        chiHoiId = new Types.ObjectId(
          String(hoiVien.chiHoiId),
        );
      }

      const visibilityConditions: Record<string, unknown>[] = [
        {
          phamVi: "TAT_CA",
        },
        {
          phamVi: "VAI_TRO",
          vaiTroNguoiNhan: session.role,
        },
        {
          phamVi: "CA_NHAN",
          nguoiNhanIds: new Types.ObjectId(
            session.userId,
          ),
        },
      ];

      if (chiHoiId) {
        visibilityConditions.push({
          phamVi: "CHI_HOI",
          chiHoiIds: chiHoiId,
        });
      }

      baseConditions.push(
        {
          trangThai: "DA_DANG",
        },
        {
          $or: [
            { ngayBatDau: { $exists: false } },
            { ngayBatDau: null },
            { ngayBatDau: { $lte: now } },
          ],
        },
        {
          $or: [
            { ngayKetThuc: { $exists: false } },
            { ngayKetThuc: null },
            { ngayKetThuc: { $gte: now } },
          ],
        },
        {
          $or: visibilityConditions,
        },
      );
    }

    const filterConditions = [...baseConditions];

    if (search) {
      const safeSearch = escapeRegex(search);

      filterConditions.push({
        $or: [
          {
            maThongBao: {
              $regex: safeSearch,
              $options: "i",
            },
          },
          {
            tieuDe: {
              $regex: safeSearch,
              $options: "i",
            },
          },
          {
            noiDung: {
              $regex: safeSearch,
              $options: "i",
            },
          },
        ],
      });
    }

    if (
      loaiThongBao &&
      LOAI_THONG_BAO.includes(loaiThongBao)
    ) {
      filterConditions.push({ loaiThongBao });
    }

    if (mucDo && MUC_DO.includes(mucDo)) {
      filterConditions.push({ mucDo });
    }

    if (
      managerMode &&
      trangThai &&
      TRANG_THAI.includes(trangThai)
    ) {
      filterConditions.push({ trangThai });
    }

    const query = buildQuery(filterConditions);
    const statisticsQuery = buildQuery(baseConditions);

    const [
      documents,
      total,
      totalStatistics,
      quanTrong,
      khanCap,
      chuaDoc,
    ] = await Promise.all([
      ThongBao.find(query)
        .populate({
          path: "nguoiTaoId",
          select: "username fullName hoTen role",
        })
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      ThongBao.countDocuments(query),

      ThongBao.countDocuments(statisticsQuery),

      ThongBao.countDocuments(
        buildQuery([
          ...baseConditions,
          { mucDo: "QUAN_TRONG" },
        ]),
      ),

      ThongBao.countDocuments(
        buildQuery([
          ...baseConditions,
          { mucDo: "KHAN_CAP" },
        ]),
      ),

      managerMode
        ? Promise.resolve(0)
        : ThongBao.countDocuments(
            buildQuery([
              ...baseConditions,
              {
                $and: [
                  {
                    nguoiDaDocIds: {
                      $ne: new Types.ObjectId(
                        session.userId,
                      ),
                    },
                  },
                  {
                    danhSachDaDoc: {
                      $ne: new Types.ObjectId(
                        session.userId,
                      ),
                    },
                  },
                ],
              },
            ]),
          ),
    ]);

    const danhSach = documents.map((document) =>
      serializeThongBao(
        { ...document },
        session.userId,
      ),
    );

    const totalPages = Math.max(
      1,
      Math.ceil(total / limit),
    );

    return NextResponse.json(
      {
        success: true,
        message: "Lấy danh sách thông báo thành công",
        data: {
          danhSach,

          phanTrang: {
            page,
            limit,
            total,
            totalPages,
            hasPreviousPage: page > 1,
            hasNextPage: page < totalPages,
          },

          thongKe: {
            tong: totalStatistics,
            chuaDoc,
            quanTrong,
            khanCap,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Lỗi lấy danh sách thông báo:", error);

    return responseError(
      error instanceof Error
        ? error.message
        : "Đã xảy ra lỗi khi lấy danh sách thông báo",
      500,
    );
  }
}

/**
 * POST /api/thong-bao
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    void User;
    void ChiHoi;
    void HoiVien;

    const rawSession = await getCurrentSession();
    const session = normalizeSession(rawSession);

    if (!session) {
      return responseError(
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        401,
      );
    }

    if (!isManager(session.role)) {
      return responseError(
        "Bạn không có quyền tạo thông báo",
        403,
      );
    }

    let body: CreateThongBaoBody;

    try {
      body =
        (await request.json()) as CreateThongBaoBody;
    } catch {
      return responseError(
        "Dữ liệu gửi lên không đúng định dạng JSON",
        400,
      );
    }

    const tieuDe = normalizeString(body.tieuDe);
    const noiDung = normalizeString(body.noiDung);

    const loaiThongBao = normalizeString(
      body.loaiThongBao,
    ) as LoaiThongBao;

    const mucDo = normalizeString(
      body.mucDo,
    ) as MucDo;

    const phamVi = normalizeString(
      body.phamVi,
    ) as PhamVi;

    const trangThai = normalizeString(
      body.trangThai,
    ) as TrangThai;

    if (!tieuDe) {
      return responseError(
        "Tiêu đề thông báo không được để trống",
      );
    }

    if (tieuDe.length > 250) {
      return responseError(
        "Tiêu đề thông báo không được vượt quá 250 ký tự",
      );
    }

    if (!noiDung) {
      return responseError(
        "Nội dung thông báo không được để trống",
      );
    }

    if (!LOAI_THONG_BAO.includes(loaiThongBao)) {
      return responseError(
        "Loại thông báo không hợp lệ",
      );
    }

    if (!MUC_DO.includes(mucDo)) {
      return responseError(
        "Mức độ thông báo không hợp lệ",
      );
    }

    if (!PHAM_VI.includes(phamVi)) {
      return responseError(
        "Phạm vi nhận thông báo không hợp lệ",
      );
    }

    if (!TRANG_THAI.includes(trangThai)) {
      return responseError(
        "Trạng thái thông báo không hợp lệ",
      );
    }

    const chiHoiIds =
      phamVi === "CHI_HOI"
        ? parseObjectIdArray(body.chiHoiIds)
        : [];

    const vaiTroNguoiNhan =
      phamVi === "VAI_TRO"
        ? parseRoleArray(body.vaiTroNguoiNhan)
        : [];

    const nguoiNhanIds =
      phamVi === "CA_NHAN"
        ? parseObjectIdArray(body.nguoiNhanIds)
        : [];

    if (
      phamVi === "CHI_HOI" &&
      chiHoiIds.length === 0
    ) {
      return responseError(
        "Vui lòng chọn ít nhất một Chi hội nhận thông báo",
      );
    }

    if (
      phamVi === "VAI_TRO" &&
      vaiTroNguoiNhan.length === 0
    ) {
      return responseError(
        "Vui lòng chọn ít nhất một vai trò nhận thông báo",
      );
    }

    if (
      phamVi === "CA_NHAN" &&
      nguoiNhanIds.length === 0
    ) {
      return responseError(
        "Vui lòng chọn ít nhất một người nhận thông báo",
      );
    }

    if (chiHoiIds.length > 0) {
      const existingChiHoiCount =
        await ChiHoi.countDocuments({
          _id: {
            $in: chiHoiIds,
          },
        });

      if (existingChiHoiCount !== chiHoiIds.length) {
        return responseError(
          "Có Chi hội được chọn không tồn tại",
        );
      }
    }

    if (nguoiNhanIds.length > 0) {
      const existingUserCount =
        await User.countDocuments({
          _id: {
            $in: nguoiNhanIds,
          },
        });

      if (existingUserCount !== nguoiNhanIds.length) {
        return responseError(
          "Có người nhận được chọn không tồn tại",
        );
      }
    }

    let ngayBatDau: Date | undefined;
    let ngayKetThuc: Date | undefined;
    let tepDinhKem: ReturnType<
      typeof parseTepDinhKem
    >;

    try {
      ngayBatDau = parseOptionalDate(
        body.ngayBatDau,
        "Thời gian bắt đầu",
      );

      ngayKetThuc = parseOptionalDate(
        body.ngayKetThuc,
        "Thời gian kết thúc",
      );

      tepDinhKem = parseTepDinhKem(
        body.tepDinhKem,
      );
    } catch (error) {
      return responseError(
        error instanceof Error
          ? error.message
          : "Dữ liệu thông báo không hợp lệ",
      );
    }

    if (
      ngayBatDau &&
      ngayKetThuc &&
      ngayKetThuc.getTime() <= ngayBatDau.getTime()
    ) {
      return responseError(
        "Thời gian kết thúc phải sau thời gian bắt đầu",
      );
    }

    const payload = {
      tieuDe,
      noiDung,
      loaiThongBao,
      mucDo,
      phamVi,

      chiHoiIds,
      vaiTroNguoiNhan,
      nguoiNhanIds,

      tepDinhKem,

      ngayBatDau,
      ngayKetThuc,

      trangThai,

      nguoiTaoId: new Types.ObjectId(
        session.userId,
      ),

      soLuotXem: 0,
      nguoiDaDocIds: [],
    };

    let createdThongBao: { _id: Types.ObjectId } | null = null;
    let lastCreateError: unknown = null;

    // Thử lại trong trường hợp rất hiếm mã tự sinh bị trùng.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        createdThongBao = await ThongBao.create({
          ...payload,
          maThongBao: taoMaThongBao(),
        });

        lastCreateError = null;
        break;
      } catch (error) {
        lastCreateError = error;

        if (!isDuplicateMaThongBaoError(error)) {
          throw error;
        }
      }
    }

    if (!createdThongBao) {
      throw (
        lastCreateError ??
        new Error("Không thể tạo mã thông báo")
      );
    }

    const populatedThongBao =
      await ThongBao.findById(createdThongBao._id)
        .populate({
          path: "nguoiTaoId",
          select: "username fullName hoTen role",
        })
        .lean();

    if (!populatedThongBao) {
      return responseError(
        "Thông báo đã được tạo nhưng không thể tải lại dữ liệu",
        500,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Tạo thông báo thành công",
        data: {
          thongBao: serializeThongBao(
            { ...populatedThongBao },
            session.userId,
          ),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Lỗi tạo thông báo:", error);

    if (
      error instanceof mongoose.Error.ValidationError
    ) {
      const validationMessage = Object.values(
        error.errors,
      )[0]?.message;

      return responseError(
        validationMessage ||
          "Dữ liệu thông báo không hợp lệ",
        400,
      );
    }

    if (
      error instanceof mongoose.Error.CastError
    ) {
      return responseError(
        "Dữ liệu định danh không hợp lệ",
        400,
      );
    }

    if (
      error &&
      typeof error === "object" &&
      (error as Record<string, unknown>).code === 11000
    ) {
      const duplicateError = error as { keyPattern?: { maThongBao?: unknown } };

      if (duplicateError.keyPattern?.maThongBao) {
        return responseError(
          "Mã thông báo bị trùng. Vui lòng thử tạo lại",
          409,
        );
      }

      return responseError(
        "Dữ liệu thông báo đã tồn tại",
        409,
      );
    }

    return responseError(
      error instanceof Error
        ? error.message
        : "Đã xảy ra lỗi khi tạo thông báo",
      500,
    );
  }
}