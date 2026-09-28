import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import * as XLSX from "xlsx";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import ChiHoi from "@/models/ChiHoi";
import HoiVien from "@/models/HoiVien";
import HoatDong from "@/models/HoatDong";
import DangKyHoatDong from "@/models/DangKyHoatDong";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionData = {
  _id?: string;
  id?: string;
  role?: string;
  user?: {
    _id?: string;
    id?: string;
    role?: string;
  };
};

type DangKyStatistic = {
  _id: Types.ObjectId;
  tongDangKy: number;
  daDangKy: number;
  daThamGia: number;
  vangMat: number;
  daHuy: number;
};

const ALLOWED_ROLES = ["ADMIN", "BAN_CHAP_HANH"];

const TRANG_THAI_HOAT_DONG: Record<string, string> = {
  CHO_PHE_DUYET: "Chờ phê duyệt",
  DA_DUYET: "Đã duyệt",
  SAP_DIEN_RA: "Sắp diễn ra",
  DANG_TRIEN_KHAI: "Đang triển khai",
  DA_KET_THUC: "Đã kết thúc",
  TAM_HOAN: "Tạm hoãn",
  DA_HUY: "Đã hủy",
  TU_CHOI: "Từ chối",
};

const TRANG_THAI_HOI_VIEN: Record<string, string> = {
  DANG_HOAT_DONG: "Đang hoạt động",
  TAM_NGUNG: "Tạm ngừng",
};

const PHAM_VI_HOAT_DONG: Record<string, string> = {
  TOAN_TRUONG: "Toàn trường",
  LIEN_CHI_HOI: "Liên Chi hội",
  CHI_HOI: "Chi hội",
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDate(value: string | null, endOfDay = false) {
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

function formatDate(value?: string | Date | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).format(date);
}

function getObjectIdString(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "_id" in value
  ) {
    return getObjectIdString((value as { _id: unknown })._id);
  }

  return String(value);
}

function calculatePercentage(attended: number, registered: number) {
  if (registered <= 0) return 0;
  return Math.round((attended / registered) * 100);
}

function setSheetLayout(
  sheet: XLSX.WorkSheet,
  widths: number[],
  lastColumn: string,
  rowCount: number,
) {
  sheet["!cols"] = widths.map((width) => ({ wch: width }));

  if (rowCount > 0) {
    sheet["!autofilter"] = {
      ref: `A1:${lastColumn}${rowCount}`,
    };
  }

  sheet["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: "A2",
    activePane: "bottomLeft",
    state: "frozen",
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const session = (await getCurrentSession()) as SessionData | null;
    const currentUser = session?.user ?? session;
    const role = currentUser?.role;

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        { status: 401 },
      );
    }

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền xuất báo cáo thống kê",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);

    const keyword = searchParams.get("search")?.trim() ?? "";
    const chiHoiId = searchParams.get("chiHoiId")?.trim() ?? "";
    const trangThai = searchParams.get("trangThai")?.trim() ?? "";
    const tuNgayValue = searchParams.get("tuNgay");
    const denNgayValue = searchParams.get("denNgay");

    if (chiHoiId && !Types.ObjectId.isValid(chiHoiId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Chi hội không hợp lệ",
        },
        { status: 400 },
      );
    }

    const tuNgay = parseDate(tuNgayValue);
    const denNgay = parseDate(denNgayValue, true);

    if (tuNgayValue && !tuNgay) {
      return NextResponse.json(
        {
          success: false,
          message: "Ngày bắt đầu không hợp lệ",
        },
        { status: 400 },
      );
    }

    if (denNgayValue && !denNgay) {
      return NextResponse.json(
        {
          success: false,
          message: "Ngày kết thúc không hợp lệ",
        },
        { status: 400 },
      );
    }

    if (tuNgay && denNgay && tuNgay > denNgay) {
      return NextResponse.json(
        {
          success: false,
          message: "Ngày bắt đầu không được lớn hơn ngày kết thúc",
        },
        { status: 400 },
      );
    }

    const chiHoiQuery: Record<string, unknown> = {};
    const hoiVienQuery: Record<string, unknown> = {};
    const hoatDongQuery: Record<string, unknown> = {};

    if (chiHoiId) {
      const objectId = new Types.ObjectId(chiHoiId);

      chiHoiQuery._id = objectId;
      hoiVienQuery.chiHoiId = objectId;
      hoatDongQuery.chiHoiId = objectId;
    }

    if (trangThai) {
      hoatDongQuery.trangThai = trangThai;
    }

    if (tuNgay || denNgay) {
      const dateFilter: Record<string, Date> = {};

      if (tuNgay) {
        dateFilter.$gte = tuNgay;
      }

      if (denNgay) {
        dateFilter.$lte = denNgay;
      }

      hoatDongQuery.thoiGianBatDau = dateFilter;
    }

    if (keyword) {
      const regex = new RegExp(escapeRegex(keyword), "i");

      hoatDongQuery.$or = [
        { maHoatDong: regex },
        { tenHoatDong: regex },
        { donViToChuc: regex },
        { diaDiem: regex },
        { moTa: regex },
        { noiDung: regex },
      ];
    }

    const [chiHoiList, hoiVienList, hoatDongList] = await Promise.all([
      ChiHoi.find(chiHoiQuery)
        .select("_id maChiHoi tenChiHoi trangThai")
        .sort({ maChiHoi: 1 })
        .lean(),

      HoiVien.find(hoiVienQuery)
        .select(
          "_id maHoiVien hoTen ngaySinh gioiTinh email soDienThoai lop khoaHoc chiHoiId taiKhoanId trangThai createdAt",
        )
        .sort({ hoTen: 1 })
        .lean(),

      HoatDong.find(hoatDongQuery)
        .select(
          "_id maHoatDong tenHoatDong phamVi chiHoiId donViToChuc diaDiem thoiGianBatDau thoiGianKetThuc hanDangKy soLuongToiDa moTa noiDung trangThai createdAt",
        )
        .sort({ thoiGianBatDau: -1 })
        .lean(),
    ]);

    const hoatDongIds = hoatDongList.map(
      (item) => new Types.ObjectId(item._id.toString()),
    );

    const dangKyStatistics: DangKyStatistic[] =
      hoatDongIds.length > 0
        ? await DangKyHoatDong.aggregate<DangKyStatistic>([
            {
              $match: {
                hoatDongId: {
                  $in: hoatDongIds,
                },
              },
            },
            {
              $group: {
                _id: "$hoatDongId",

                tongDangKy: {
                  $sum: 1,
                },

                daDangKy: {
                  $sum: {
                    $cond: [
                      { $eq: ["$trangThaiDangKy", "DA_DANG_KY"] },
                      1,
                      0,
                    ],
                  },
                },

                daThamGia: {
                  $sum: {
                    $cond: [
                      { $eq: ["$trangThaiDangKy", "DA_THAM_GIA"] },
                      1,
                      0,
                    ],
                  },
                },

                vangMat: {
                  $sum: {
                    $cond: [
                      { $eq: ["$trangThaiDangKy", "VANG_MAT"] },
                      1,
                      0,
                    ],
                  },
                },

                daHuy: {
                  $sum: {
                    $cond: [
                      { $eq: ["$trangThaiDangKy", "DA_HUY"] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ])
        : [];

    const dangKyMap = new Map(
      dangKyStatistics.map((item) => [
        item._id.toString(),
        {
          tongDangKy: item.tongDangKy,
          daDangKy: item.daDangKy,
          daThamGia: item.daThamGia,
          vangMat: item.vangMat,
          daHuy: item.daHuy,
        },
      ]),
    );

    const chiHoiMap = new Map(
      chiHoiList.map((item) => [
        item._id.toString(),
        {
          maChiHoi: item.maChiHoi ?? "",
          tenChiHoi: item.tenChiHoi ?? "",
          trangThai: item.trangThai ?? "",
        },
      ]),
    );

    const tongDangKy = dangKyStatistics.reduce(
      (total, item) => total + item.tongDangKy,
      0,
    );

    const tongThamGia = dangKyStatistics.reduce(
      (total, item) => total + item.daThamGia,
      0,
    );

    const tongVangMat = dangKyStatistics.reduce(
      (total, item) => total + item.vangMat,
      0,
    );

    const tongDaHuy = dangKyStatistics.reduce(
      (total, item) => total + item.daHuy,
      0,
    );

    const workbook = XLSX.utils.book_new();

    /*
     * Sheet 1: Tổng quan
     */
    const tongQuanRows = [
      ["BÁO CÁO THỐNG KÊ HỆ THỐNG"],
      [],
      ["Ngày xuất báo cáo", formatDateTime(new Date())],
      ["Người xuất", role],
      [],
      ["Bộ lọc", "Giá trị"],
      ["Từ khóa", keyword || "Tất cả"],
      [
        "Chi hội",
        chiHoiId
          ? chiHoiMap.get(chiHoiId)?.tenChiHoi || "Không xác định"
          : "Tất cả",
      ],
      [
        "Trạng thái hoạt động",
        trangThai
          ? TRANG_THAI_HOAT_DONG[trangThai] || trangThai
          : "Tất cả",
      ],
      ["Từ ngày", tuNgay ? formatDate(tuNgay) : "Không giới hạn"],
      ["Đến ngày", denNgay ? formatDate(denNgay) : "Không giới hạn"],
      [],
      ["CHỈ SỐ", "SỐ LƯỢNG"],
      ["Tổng Chi hội", chiHoiList.length],
      ["Tổng Hội viên", hoiVienList.length],
      ["Hội viên đang hoạt động", 
        hoiVienList.filter(
          (item) => item.trangThai === "DANG_HOAT_DONG",
        ).length,
      ],
      ["Hội viên tạm ngừng",
        hoiVienList.filter(
          (item) => item.trangThai === "TAM_NGUNG",
        ).length,
      ],
      ["Tổng hoạt động", hoatDongList.length],
      [
        "Hoạt động chờ phê duyệt",
        hoatDongList.filter(
          (item) => item.trangThai === "CHO_DUYET",
        ).length,
      ],
      [
        "Hoạt động đang triển khai",
        hoatDongList.filter(
          (item) => item.trangThai === "DANG_DIEN_RA",
        ).length,
      ],
      [
        "Hoạt động đã kết thúc",
        hoatDongList.filter(
          (item) => item.trangThai === "DA_KET_THUC",
        ).length,
      ],
      ["Tổng lượt đăng ký", tongDangKy],
      ["Tổng lượt tham gia", tongThamGia],
      ["Tổng lượt vắng mặt", tongVangMat],
      ["Tổng lượt hủy", tongDaHuy],
      [
        "Tỷ lệ tham gia",
        `${calculatePercentage(tongThamGia, tongDangKy)}%`,
      ],
    ];

    const tongQuanSheet = XLSX.utils.aoa_to_sheet(tongQuanRows);

    tongQuanSheet["!cols"] = [
      { wch: 32 },
      { wch: 28 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      tongQuanSheet,
      "Tổng quan",
    );

    /*
     * Sheet 2: Danh sách hoạt động
     */
    const hoatDongRows = hoatDongList.map((item, index) => {
      const statistic = dangKyMap.get(item._id.toString()) ?? {
        tongDangKy: 0,
        daDangKy: 0,
        daThamGia: 0,
        vangMat: 0,
        daHuy: 0,
      };

      const itemChiHoiId = getObjectIdString(item.chiHoiId);
      const chiHoi = chiHoiMap.get(itemChiHoiId);

      return {
        STT: index + 1,
        "Mã hoạt động": item.maHoatDong ?? "",
        "Tên hoạt động": item.tenHoatDong ?? "",
        "Phạm vi":
          PHAM_VI_HOAT_DONG[item.phamVi ?? ""] ??
          item.phamVi ??
          "",
        "Mã Chi hội": chiHoi?.maChiHoi ?? "",
        "Tên Chi hội": chiHoi?.tenChiHoi ?? "",
        "Đơn vị tổ chức": item.donViToChuc ?? "",
        "Địa điểm": item.diaDiem ?? "",
        "Thời gian bắt đầu": formatDateTime(item.thoiGianBatDau),
        "Thời gian kết thúc": formatDateTime(item.thoiGianKetThuc),
        "Hạn đăng ký": formatDateTime(item.hanDangKy),
        "Số lượng tối đa": item.soLuongToiDa ?? "Không giới hạn",
        "Trạng thái":
          TRANG_THAI_HOAT_DONG[item.trangThai ?? ""] ??
          item.trangThai ??
          "",
        "Tổng đăng ký": statistic.tongDangKy,
        "Đang đăng ký": statistic.daDangKy,
        "Đã tham gia": statistic.daThamGia,
        "Vắng mặt": statistic.vangMat,
        "Đã hủy": statistic.daHuy,
        "Tỷ lệ tham gia":
          `${calculatePercentage(
            statistic.daThamGia,
            statistic.tongDangKy,
          )}%`,
        "Mô tả": item.moTa ?? "",
        "Nội dung": item.noiDung ?? "",
      };
    });

    const hoatDongSheet = XLSX.utils.json_to_sheet(hoatDongRows);

    setSheetLayout(
      hoatDongSheet,
      [
        6, 16, 30, 18, 15, 28, 25, 25, 22, 22, 22,
        18, 20, 15, 15, 15, 15, 12, 18, 40, 50,
      ],
      "U",
      hoatDongRows.length + 1,
    );

    XLSX.utils.book_append_sheet(
      workbook,
      hoatDongSheet,
      "Hoạt động",
    );

    /*
     * Sheet 3: Danh sách Hội viên
     */
    const hoiVienRows = hoiVienList.map((item, index) => {
      const itemChiHoiId = getObjectIdString(item.chiHoiId);
      const chiHoi = chiHoiMap.get(itemChiHoiId);

      return {
        STT: index + 1,
        "Mã Hội viên": item.maHoiVien ?? "",
        "Họ và tên": item.hoTen ?? "",
        "Ngày sinh": formatDate(item.ngaySinh),
        "Giới tính":
          item.gioiTinh === "NAM"
            ? "Nam"
            : item.gioiTinh === "NU"
              ? "Nữ"
              : item.gioiTinh === "KHAC"
                ? "Khác"
                : "",
        Email: item.email ?? "",
        "Số điện thoại": item.soDienThoai ?? "",
        Lớp: item.lop ?? "",
        "Khóa học": item.khoaHoc ?? "",
        "Mã Chi hội": chiHoi?.maChiHoi ?? "",
        "Tên Chi hội": chiHoi?.tenChiHoi ?? "",
        "Đã cấp tài khoản": item.taiKhoanId ? "Có" : "Chưa",
        "Trạng thái":
          TRANG_THAI_HOI_VIEN[item.trangThai ?? ""] ??
          item.trangThai ??
          "",
        "Ngày tạo": formatDateTime(item.createdAt),
      };
    });

    const hoiVienSheet = XLSX.utils.json_to_sheet(hoiVienRows);

    setSheetLayout(
      hoiVienSheet,
      [6, 16, 28, 15, 12, 30, 18, 15, 15, 15, 28, 18, 18, 22],
      "N",
      hoiVienRows.length + 1,
    );

    XLSX.utils.book_append_sheet(
      workbook,
      hoiVienSheet,
      "Hội viên",
    );

    /*
     * Sheet 4: Thống kê theo Chi hội
     */
    const thongKeChiHoiRows = chiHoiList.map((chiHoi, index) => {
      const currentChiHoiId = chiHoi._id.toString();

      const soHoiVien = hoiVienList.filter(
        (item) =>
          getObjectIdString(item.chiHoiId) === currentChiHoiId,
      ).length;

      const soHoiVienHoatDong = hoiVienList.filter(
        (item) =>
          getObjectIdString(item.chiHoiId) === currentChiHoiId &&
          item.trangThai === "DANG_HOAT_DONG",
      ).length;

      const hoatDongCuaChiHoi = hoatDongList.filter(
        (item) =>
          getObjectIdString(item.chiHoiId) === currentChiHoiId,
      );

      let soDangKy = 0;
      let soThamGia = 0;
      let soVangMat = 0;
      let soHuy = 0;

      hoatDongCuaChiHoi.forEach((hoatDong) => {
        const statistic = dangKyMap.get(
          hoatDong._id.toString(),
        );

        if (!statistic) return;

        soDangKy += statistic.tongDangKy;
        soThamGia += statistic.daThamGia;
        soVangMat += statistic.vangMat;
        soHuy += statistic.daHuy;
      });

      return {
        STT: index + 1,
        "Mã Chi hội": chiHoi.maChiHoi ?? "",
        "Tên Chi hội": chiHoi.tenChiHoi ?? "",
        "Số Hội viên": soHoiVien,
        "Hội viên hoạt động": soHoiVienHoatDong,
        "Số hoạt động": hoatDongCuaChiHoi.length,
        "Lượt đăng ký": soDangKy,
        "Lượt tham gia": soThamGia,
        "Lượt vắng mặt": soVangMat,
        "Lượt hủy": soHuy,
        "Tỷ lệ tham gia":
          `${calculatePercentage(soThamGia, soDangKy)}%`,
      };
    });

    const thongKeChiHoiSheet =
      XLSX.utils.json_to_sheet(thongKeChiHoiRows);

    setSheetLayout(
      thongKeChiHoiSheet,
      [6, 16, 30, 16, 22, 16, 16, 16, 18, 14, 18],
      "K",
      thongKeChiHoiRows.length + 1,
    );

    XLSX.utils.book_append_sheet(
      workbook,
      thongKeChiHoiSheet,
      "Thống kê Chi hội",
    );

    const output = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
      compression: true,
    }) as ArrayBuffer;

    const today = new Date().toISOString().slice(0, 10);
    const filename = `bao-cao-thong-ke-${today}.xlsx`;

    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Lỗi xuất báo cáo Excel:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể xuất báo cáo Excel",
      },
      { status: 500 },
    );
  }
}