import { NextRequest, NextResponse } from "next/server";
import { QueryFilter, Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import NhatKyHeThong, {
  type HanhDongNhatKy,
  type INhatKyHeThong,
  type KetQuaNhatKy,
  type MucDoNhatKy,
} from "@/models/NhatKyHeThong";

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

type ActionStatistic = {
  _id: string;
  soLuong: number;
};

type ModuleStatistic = {
  _id: string;
  soLuong: number;
};

/* =========================================================
 * CONSTANTS
 * ======================================================= */

const ALLOWED_ROLES = ["ADMIN"];

const VALID_ACTIONS: HanhDongNhatKy[] = [
  "DANG_NHAP",
  "DANG_XUAT",
  "DANG_NHAP_THAT_BAI",
  "TAO_MOI",
  "CAP_NHAT",
  "XOA",
  "KHOA_TAI_KHOAN",
  "MO_KHOA_TAI_KHOAN",
  "DOI_MAT_KHAU",
  "DAT_LAI_MAT_KHAU",
  "CAP_TAI_KHOAN",
  "XUAT_EXCEL",
  "SAO_LUU",
  "KHOI_PHUC",
  "KHAC",
];

const VALID_LEVELS: MucDoNhatKy[] = [
  "THONG_TIN",
  "CANH_BAO",
  "NGUY_HIEM",
];

const VALID_RESULTS: KetQuaNhatKy[] = [
  "THANH_CONG",
  "THAT_BAI",
];

/* =========================================================
 * HELPERS
 * ======================================================= */

function escapeRegex(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function parsePositiveInteger(
  value: string | null,
  defaultValue: number,
) {
  if (!value) return defaultValue;

  const number = Number.parseInt(value, 10);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return defaultValue;
  }

  return number;
}

function parseDate(
  value: string | null,
  endOfDay = false,
) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
}

function getStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getCurrentUser(
  session: SessionData | null,
) {
  if (!session) return null;
  return session.user ?? session;
}

/* =========================================================
 * GET: DANH SÁCH NHẬT KÝ
 * ======================================================= */

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const session =
      (await getCurrentSession()) as SessionData | null;

    const currentUser = getCurrentUser(session);
    const role =
      currentUser?.role ?? currentUser?.vaiTro;

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
            "Chỉ Quản trị viên mới được xem nhật ký hệ thống",
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
      15,
    );

    /*
     * Không cho tải quá 100 bản ghi trong một lần.
     */
    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;

    const search =
      searchParams.get("search")?.trim() ?? "";

    const hanhDong =
      searchParams.get("hanhDong")?.trim() ?? "";

    const moduleFilter =
      searchParams
        .get("module")
        ?.trim()
        .toUpperCase() ?? "";

    const mucDo =
      searchParams.get("mucDo")?.trim() ?? "";

    const ketQua =
      searchParams.get("ketQua")?.trim() ?? "";

    const nguoiDungId =
      searchParams
        .get("nguoiDungId")
        ?.trim() ?? "";

    const tuNgayValue =
      searchParams.get("tuNgay");

    const denNgayValue =
      searchParams.get("denNgay");

    /*
     * Kiểm tra giá trị bộ lọc.
     */
    if (
      hanhDong &&
      !VALID_ACTIONS.includes(
        hanhDong as HanhDongNhatKy,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Hành động nhật ký không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      mucDo &&
      !VALID_LEVELS.includes(
        mucDo as MucDoNhatKy,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Mức độ nhật ký không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      ketQua &&
      !VALID_RESULTS.includes(
        ketQua as KetQuaNhatKy,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Kết quả nhật ký không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      nguoiDungId &&
      !Types.ObjectId.isValid(nguoiDungId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Người dùng không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const tuNgay = parseDate(tuNgayValue);
    const denNgay = parseDate(
      denNgayValue,
      true,
    );

    if (tuNgayValue && !tuNgay) {
      return NextResponse.json(
        {
          success: false,
          message: "Ngày bắt đầu không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (denNgayValue && !denNgay) {
      return NextResponse.json(
        {
          success: false,
          message: "Ngày kết thúc không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      tuNgay &&
      denNgay &&
      tuNgay.getTime() > denNgay.getTime()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ngày bắt đầu không được lớn hơn ngày kết thúc",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Tạo điều kiện truy vấn.
     */
    const query: QueryFilter<INhatKyHeThong> =
      {};

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        "i",
      );

      query.$or = [
        {
          tenDangNhap: regex,
        },
        {
          hoTen: regex,
        },
        {
          moTa: regex,
        },
        {
          module: regex,
        },
        {
          diaChiIP: regex,
        },
        {
          duongDan: regex,
        },
        {
          doiTuongLoai: regex,
        },
      ];
    }

    if (hanhDong) {
      query.hanhDong =
        hanhDong as HanhDongNhatKy;
    }

    if (moduleFilter) {
      query.module = moduleFilter;
    }

    if (mucDo) {
      query.mucDo = mucDo as MucDoNhatKy;
    }

    if (ketQua) {
      query.ketQua =
        ketQua as KetQuaNhatKy;
    }

    if (nguoiDungId) {
      query.nguoiDungId =
        new Types.ObjectId(nguoiDungId);
    }

    if (tuNgay || denNgay) {
      query.createdAt = {};

      if (tuNgay) {
        query.createdAt.$gte = tuNgay;
      }

      if (denNgay) {
        query.createdAt.$lte = denNgay;
      }
    }

    const startOfToday = getStartOfToday();

    /*
     * Truy vấn song song để giảm thời gian chờ.
     */
    const [
      danhSach,
      tongBanGhi,
      tongToanBo,
      thanhCong,
      thatBai,
      canhBao,
      nguyHiem,
      trongNgay,
      thongKeHanhDong,
      thongKeModule,
      danhSachModule,
    ] = await Promise.all([
      NhatKyHeThong.find(query)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      NhatKyHeThong.countDocuments(query),

      NhatKyHeThong.countDocuments({}),

      NhatKyHeThong.countDocuments({
        ketQua: "THANH_CONG",
      }),

      NhatKyHeThong.countDocuments({
        ketQua: "THAT_BAI",
      }),

      NhatKyHeThong.countDocuments({
        mucDo: "CANH_BAO",
      }),

      NhatKyHeThong.countDocuments({
        mucDo: "NGUY_HIEM",
      }),

      NhatKyHeThong.countDocuments({
        createdAt: {
          $gte: startOfToday,
        },
      }),

      NhatKyHeThong.aggregate<ActionStatistic>([
        {
          $group: {
            _id: "$hanhDong",
            soLuong: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            soLuong: -1,
          },
        },
      ]),

      NhatKyHeThong.aggregate<ModuleStatistic>([
        {
          $group: {
            _id: "$module",
            soLuong: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            soLuong: -1,
          },
        },
        {
          $limit: 10,
        },
      ]),

      NhatKyHeThong.distinct("module"),
    ]);

    const tongTrang = Math.max(
      1,
      Math.ceil(tongBanGhi / limit),
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Lấy danh sách nhật ký thành công",

        data: {
          danhSach,

          thongKe: {
            tongBanGhi: tongToanBo,
            thanhCong,
            thatBai,
            canhBao,
            nguyHiem,
            trongNgay,
          },

          thongKeHanhDong:
            thongKeHanhDong.map((item) => ({
              hanhDong:
                item._id || "KHONG_XAC_DINH",
              soLuong: item.soLuong,
            })),

          thongKeModule:
            thongKeModule.map((item) => ({
              module:
                item._id || "KHONG_XAC_DINH",
              soLuong: item.soLuong,
            })),

          boLoc: {
            danhSachModule: danhSachModule
              .filter(Boolean)
              .sort(),

            danhSachHanhDong:
              VALID_ACTIONS,

            danhSachMucDo:
              VALID_LEVELS,

            danhSachKetQua:
              VALID_RESULTS,
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
      "Lỗi lấy danh sách nhật ký:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể lấy danh sách nhật ký hệ thống",
      },
      {
        status: 500,
      },
    );
  }
}