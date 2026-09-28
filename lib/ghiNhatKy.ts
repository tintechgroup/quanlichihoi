import type { NextRequest } from "next/server";
import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import NhatKyHeThong, {
  type HanhDongNhatKy,
  type KetQuaNhatKy,
  type MucDoNhatKy,
} from "@/models/NhatKyHeThong";

/* =========================================================
 * TYPES
 * ======================================================= */

export type NguoiDungNhatKy = {
  _id?: string | Types.ObjectId;
  id?: string | Types.ObjectId;
  tenDangNhap?: string;
  username?: string;
  hoTen?: string;
  name?: string;
  vaiTro?: string;
  role?: string;
};

export type GhiNhatKyInput = {
  nguoiDung?: NguoiDungNhatKy | null;

  nguoiDungId?: string | Types.ObjectId;
  tenDangNhap?: string;
  hoTen?: string;
  vaiTro?: string;

  hanhDong: HanhDongNhatKy;
  module: string;
  moTa: string;

  doiTuongId?: string | Types.ObjectId;
  doiTuongLoai?: string;

  duLieuCu?: unknown;
  duLieuMoi?: unknown;

  request?: NextRequest | Request | null;

  diaChiIP?: string;
  userAgent?: string;
  duongDan?: string;
  phuongThuc?: string;

  mucDo?: MucDoNhatKy;
  ketQua?: KetQuaNhatKy;
  loi?: string | Error | unknown;
};

export type KetQuaGhiNhatKy = {
  success: boolean;
  id?: string;
  error?: string;
};

/* =========================================================
 * CÁC TRƯỜNG KHÔNG ĐƯỢC LƯU VÀO NHẬT KÝ
 * ======================================================= */

const SENSITIVE_KEYS = new Set([
  "password",
  "matkhau",
  "mat_khau",
  "matKhau",

  "passwordmoi",
  "matkhaumoi",
  "matKhauMoi",

  "passwordcu",
  "matkhaucu",
  "matKhauCu",

  "xacnhanmatkhau",
  "xacNhanMatKhau",
  "confirmPassword",

  "token",
  "accessToken",
  "refreshToken",
  "sessionToken",
  "jwt",

  "secret",
  "apiKey",
  "apikey",

  "authorization",
  "cookie",
]);

/* =========================================================
 * HELPERS
 * ======================================================= */

function normalizeKey(value: string) {
  return value
    .trim()
    .replaceAll("-", "")
    .replaceAll("_", "")
    .toLowerCase();
}

function isSensitiveKey(key: string) {
  const normalizedKey = normalizeKey(key);

  return Array.from(SENSITIVE_KEYS).some(
    (sensitiveKey) =>
      normalizeKey(sensitiveKey) === normalizedKey,
  );
}

function sanitizeValue(
  value: unknown,
  visited = new WeakSet<object>(),
): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      sanitizeValue(item, visited),
    );
  }

  if (typeof value === "object") {
    if (visited.has(value)) {
      return "[Circular]";
    }

    visited.add(value);

    const result: Record<string, unknown> = {};

    Object.entries(
      value as Record<string, unknown>,
    ).forEach(([key, itemValue]) => {
      if (isSensitiveKey(key)) {
        result[key] = "[ĐÃ ẨN]";
        return;
      }

      result[key] = sanitizeValue(
        itemValue,
        visited,
      );
    });

    return result;
  }

  return String(value);
}

function toSafeRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const sanitized = sanitizeValue(value);

  if (
    sanitized &&
    typeof sanitized === "object" &&
    !Array.isArray(sanitized)
  ) {
    return sanitized as Record<string, unknown>;
  }

  return {
    giaTri: sanitized,
  };
}

function toObjectId(
  value?: string | Types.ObjectId | null,
) {
  if (!value) return undefined;

  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (!Types.ObjectId.isValid(value)) {
    return undefined;
  }

  return new Types.ObjectId(value);
}

function getErrorMessage(error: unknown) {
  if (!error) return undefined;

  if (error instanceof Error) {
    return error.message.slice(0, 2000);
  }

  if (typeof error === "string") {
    return error.slice(0, 2000);
  }

  try {
    return JSON.stringify(
      sanitizeValue(error),
    ).slice(0, 2000);
  } catch {
    return "Lỗi không xác định";
  }
}

function getClientIp(
  request?: NextRequest | Request | null,
) {
  if (!request) return undefined;

  const forwardedFor =
    request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")[0]
      ?.trim();

    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) return realIp.trim();

  const cloudflareIp = request.headers.get(
    "cf-connecting-ip",
  );

  if (cloudflareIp) return cloudflareIp.trim();

  return undefined;
}

function getRequestPath(
  request?: NextRequest | Request | null,
) {
  if (!request) return undefined;

  try {
    return new URL(request.url).pathname;
  } catch {
    return request.url?.slice(0, 500);
  }
}

function getNguoiDungId(
  input: GhiNhatKyInput,
) {
  return (
    input.nguoiDungId ??
    input.nguoiDung?._id ??
    input.nguoiDung?.id
  );
}

function getTenDangNhap(
  input: GhiNhatKyInput,
) {
  return (
    input.tenDangNhap ??
    input.nguoiDung?.tenDangNhap ??
    input.nguoiDung?.username
  );
}

function getHoTen(input: GhiNhatKyInput) {
  return (
    input.hoTen ??
    input.nguoiDung?.hoTen ??
    input.nguoiDung?.name
  );
}

function getVaiTro(input: GhiNhatKyInput) {
  return (
    input.vaiTro ??
    input.nguoiDung?.vaiTro ??
    input.nguoiDung?.role
  );
}

/* =========================================================
 * HÀM GHI NHẬT KÝ CHÍNH
 * ======================================================= */

/**
 * Ghi một bản ghi nhật ký hệ thống.
 *
 * Hàm này không ném lỗi ra ngoài để tránh làm hỏng
 * chức năng chính nếu việc ghi nhật ký thất bại.
 */
export async function ghiNhatKy(
  input: GhiNhatKyInput,
): Promise<KetQuaGhiNhatKy> {
  try {
    await connectDB();

    const nguoiDungId = toObjectId(
      getNguoiDungId(input),
    );

    const doiTuongId = toObjectId(
      input.doiTuongId,
    );

    const request = input.request;

    const diaChiIP =
      input.diaChiIP ?? getClientIp(request);

    const userAgent =
      input.userAgent ??
      request?.headers.get("user-agent") ??
      undefined;

    const duongDan =
      input.duongDan ?? getRequestPath(request);

    const phuongThuc =
      input.phuongThuc ??
      request?.method ??
      undefined;

    const nhatKy = await NhatKyHeThong.create({
      nguoiDungId,

      tenDangNhap:
        getTenDangNhap(input)?.trim() ||
        undefined,

      hoTen:
        getHoTen(input)?.trim() || undefined,

      vaiTro:
        getVaiTro(input)?.trim() || undefined,

      hanhDong: input.hanhDong,

      module: input.module
        .trim()
        .toUpperCase(),

      moTa: input.moTa.trim(),

      doiTuongId,

      doiTuongLoai:
        input.doiTuongLoai?.trim() ||
        undefined,

      duLieuCu: toSafeRecord(
        input.duLieuCu,
      ),

      duLieuMoi: toSafeRecord(
        input.duLieuMoi,
      ),

      diaChiIP:
        diaChiIP?.slice(0, 100) || undefined,

      userAgent:
        userAgent?.slice(0, 1000) ||
        undefined,

      duongDan:
        duongDan?.slice(0, 500) ||
        undefined,

      phuongThuc:
        phuongThuc
          ?.trim()
          .toUpperCase()
          .slice(0, 20) || undefined,

      mucDo: input.mucDo ?? "THONG_TIN",

      ketQua:
        input.ketQua ?? "THANH_CONG",

      loi: getErrorMessage(input.loi),
    });

    return {
      success: true,
      id: nhatKy._id.toString(),
    };
  } catch (error) {
    console.error(
      "Không thể ghi nhật ký hệ thống:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Không thể ghi nhật ký hệ thống",
    };
  }
}

/* =========================================================
 * GHI NHẬT KÝ THÀNH CÔNG
 * ======================================================= */

export async function ghiNhatKyThanhCong(
  input: Omit<
    GhiNhatKyInput,
    "ketQua" | "loi"
  >,
) {
  return ghiNhatKy({
    ...input,
    ketQua: "THANH_CONG",
  });
}

/* =========================================================
 * GHI NHẬT KÝ THẤT BẠI
 * ======================================================= */

export async function ghiNhatKyThatBai(
  input: Omit<GhiNhatKyInput, "ketQua"> & {
    loi: unknown;
  },
) {
  return ghiNhatKy({
    ...input,
    ketQua: "THAT_BAI",
    mucDo: input.mucDo ?? "CANH_BAO",
  });
}

/* =========================================================
 * GHI NHẬT KÝ ĐĂNG NHẬP
 * ======================================================= */

export async function ghiNhatKyDangNhap(
  input: {
    nguoiDung: NguoiDungNhatKy;
    request?: NextRequest | Request | null;
  },
) {
  return ghiNhatKyThanhCong({
    nguoiDung: input.nguoiDung,
    request: input.request,
    hanhDong: "DANG_NHAP",
    module: "XAC_THUC",
    moTa: "Đăng nhập hệ thống thành công",
    mucDo: "THONG_TIN",
  });
}

/* =========================================================
 * GHI NHẬT KÝ ĐĂNG NHẬP THẤT BẠI
 * ======================================================= */

export async function ghiNhatKyDangNhapThatBai(
  input: {
    tenDangNhap?: string;
    loi?: unknown;
    request?: NextRequest | Request | null;
  },
) {
  return ghiNhatKyThatBai({
    tenDangNhap: input.tenDangNhap,
    request: input.request,
    hanhDong: "DANG_NHAP_THAT_BAI",
    module: "XAC_THUC",
    moTa: `Đăng nhập thất bại${
      input.tenDangNhap
        ? ` với tài khoản ${input.tenDangNhap}`
        : ""
    }`,
    mucDo: "CANH_BAO",
    loi:
      input.loi ??
      "Tên đăng nhập hoặc mật khẩu không chính xác",
  });
}

/* =========================================================
 * GHI NHẬT KÝ ĐĂNG XUẤT
 * ======================================================= */

export async function ghiNhatKyDangXuat(
  input: {
    nguoiDung: NguoiDungNhatKy;
    request?: NextRequest | Request | null;
  },
) {
  return ghiNhatKyThanhCong({
    nguoiDung: input.nguoiDung,
    request: input.request,
    hanhDong: "DANG_XUAT",
    module: "XAC_THUC",
    moTa: "Đăng xuất khỏi hệ thống",
    mucDo: "THONG_TIN",
  });
}

/* =========================================================
 * GHI NHẬT KÝ TẠO MỚI
 * ======================================================= */

export async function ghiNhatKyTaoMoi(
  input: {
    nguoiDung: NguoiDungNhatKy;
    module: string;
    moTa: string;
    doiTuongId?: string | Types.ObjectId;
    doiTuongLoai?: string;
    duLieuMoi?: unknown;
    request?: NextRequest | Request | null;
  },
) {
  return ghiNhatKyThanhCong({
    ...input,
    hanhDong: "TAO_MOI",
    mucDo: "THONG_TIN",
  });
}

/* =========================================================
 * GHI NHẬT KÝ CẬP NHẬT
 * ======================================================= */

export async function ghiNhatKyCapNhat(
  input: {
    nguoiDung: NguoiDungNhatKy;
    module: string;
    moTa: string;
    doiTuongId?: string | Types.ObjectId;
    doiTuongLoai?: string;
    duLieuCu?: unknown;
    duLieuMoi?: unknown;
    request?: NextRequest | Request | null;
  },
) {
  return ghiNhatKyThanhCong({
    ...input,
    hanhDong: "CAP_NHAT",
    mucDo: "THONG_TIN",
  });
}

/* =========================================================
 * GHI NHẬT KÝ XÓA
 * ======================================================= */

export async function ghiNhatKyXoa(
  input: {
    nguoiDung: NguoiDungNhatKy;
    module: string;
    moTa: string;
    doiTuongId?: string | Types.ObjectId;
    doiTuongLoai?: string;
    duLieuCu?: unknown;
    request?: NextRequest | Request | null;
  },
) {
  return ghiNhatKyThanhCong({
    ...input,
    hanhDong: "XOA",
    mucDo: "CANH_BAO",
  });
}