"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";

type ChiHoi = {
  _id: string;
  maChiHoi: string;
  tenChiHoi: string;
};

type TaiKhoan = {
  _id: string;
  username: string;
  role: string;
  isActive: boolean;
};

type DanhGia = {
  xepLoai:
    | "XUAT_SAC"
    | "TOT"
    | "KHA"
    | "TRUNG_BINH"
    | "YEU";
  nhanXet?: string;
};

type HoiVien = {
  _id: string;
  maHoiVien: string;
  hoTen: string;
  ngaySinh?: string;
  gioiTinh?: "NAM" | "NU" | "KHAC";
  email?: string;
  soDienThoai?: string;
  lop?: string;
  khoaHoc?: string;
  diaChi?: string;
  chiHoiId: ChiHoi | string;
  taiKhoanId?: TaiKhoan | string;
  trangThai: "DANG_HOAT_DONG" | "TAM_NGUNG";
  danhGia?: DanhGia | null;
  createdAt: string;
};

type ExportHoiVienExcelButtonProps = {
  onError?: (message: string) => void;
};

function formatDate(value?: string) {
  if (!value) {
    return "";
  }

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

function getGioiTinhLabel(gioiTinh?: HoiVien["gioiTinh"]) {
  if (gioiTinh === "NAM") return "Nam";
  if (gioiTinh === "NU") return "Nữ";
  if (gioiTinh === "KHAC") return "Khác";

  return "";
}

function getTrangThaiLabel(
  trangThai: HoiVien["trangThai"],
) {
  return trangThai === "DANG_HOAT_DONG"
    ? "Đang hoạt động"
    : "Tạm ngừng";
}

function getXepLoaiLabel(xepLoai?: DanhGia["xepLoai"]) {
  if (xepLoai === "XUAT_SAC") return "Xuất sắc";
  if (xepLoai === "TOT") return "Tốt";
  if (xepLoai === "KHA") return "Khá";
  if (xepLoai === "TRUNG_BINH") return "Trung bình";
  if (xepLoai === "YEU") return "Yếu";

  return "Chưa đánh giá";
}

function getChiHoi(hoiVien: HoiVien): ChiHoi | null {
  if (
    typeof hoiVien.chiHoiId === "object" &&
    hoiVien.chiHoiId !== null
  ) {
    return hoiVien.chiHoiId;
  }

  return null;
}

function getTaiKhoan(hoiVien: HoiVien): TaiKhoan | null {
  if (
    typeof hoiVien.taiKhoanId === "object" &&
    hoiVien.taiKhoanId !== null
  ) {
    return hoiVien.taiKhoanId;
  }

  return null;
}

export default function ExportHoiVienExcelButton({
  onError,
}: ExportHoiVienExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    try {
      setIsExporting(true);
      onError?.("");

      // Không truyền bộ lọc để lấy toàn bộ Hội viên.
      const response = await fetch("/api/hoi-vien", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Không thể lấy danh sách Hội viên để xuất Excel",
        );
      }

      const danhSachHoiVien: HoiVien[] = result.data || [];

      if (danhSachHoiVien.length === 0) {
        throw new Error("Chưa có Hội viên để xuất Excel");
      }

      const excelData = danhSachHoiVien.map(
        (hoiVien, index) => {
          const chiHoi = getChiHoi(hoiVien);
          const taiKhoan = getTaiKhoan(hoiVien);

          return {
            STT: index + 1,
            "Mã Hội viên": hoiVien.maHoiVien,
            "Họ và tên": hoiVien.hoTen,
            "Ngày sinh": formatDate(hoiVien.ngaySinh),
            "Giới tính": getGioiTinhLabel(hoiVien.gioiTinh),
            Email: hoiVien.email || "",
            "Số điện thoại": hoiVien.soDienThoai || "",
            Lớp: hoiVien.lop || "",
            "Khóa học": hoiVien.khoaHoc || "",
            "Địa chỉ": hoiVien.diaChi || "",
            "Mã Chi hội": chiHoi?.maChiHoi || "",
            "Tên Chi hội": chiHoi?.tenChiHoi || "",
            "Trạng thái": getTrangThaiLabel(
              hoiVien.trangThai,
            ),
            "Trạng thái tài khoản": taiKhoan
              ? taiKhoan.isActive
                ? "Đang hoạt động"
                : "Đã khóa"
              : "Chưa cấp tài khoản",
            "Tên đăng nhập": taiKhoan?.username || "",
            "Xếp loại": getXepLoaiLabel(
              hoiVien.danhGia?.xepLoai,
            ),
            "Nhận xét đánh giá":
              hoiVien.danhGia?.nhanXet || "",
            "Ngày tạo": formatDate(hoiVien.createdAt),
          };
        },
      );

      const worksheet = XLSX.utils.json_to_sheet(excelData);

      worksheet["!cols"] = [
        { wch: 7 },
        { wch: 16 },
        { wch: 28 },
        { wch: 14 },
        { wch: 12 },
        { wch: 30 },
        { wch: 16 },
        { wch: 22 },
        { wch: 18 },
        { wch: 35 },
        { wch: 16 },
        { wch: 28 },
        { wch: 18 },
        { wch: 22 },
        { wch: 20 },
        { wch: 16 },
        { wch: 45 },
        { wch: 14 },
      ];

      worksheet["!autofilter"] = {
        ref: `A1:R${excelData.length + 1}`,
      };

      const workbook = XLSX.utils.book_new();

      workbook.Props = {
        Title: "Danh sách Hội viên",
        Subject: "Quản lý Hội viên",
        Author: "Hệ thống quản lý Liên Chi hội",
        Company: "Liên Chi hội Khoa Sư phạm",
        CreatedDate: new Date(),
      };

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Danh sách Hội viên",
      );

      const currentDate = new Date()
        .toISOString()
        .slice(0, 10);

      XLSX.writeFile(
        workbook,
        `danh-sach-hoi-vien-${currentDate}.xlsx`,
      );
    } catch (error) {
      onError?.(
        error instanceof Error
          ? error.message
          : "Không thể xuất danh sách Hội viên",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={isExporting}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-white px-5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {isExporting ? (
        <LoaderCircle size={18} className="animate-spin" />
      ) : (
        <Download size={18} />
      )}

      {isExporting ? "Đang xuất..." : "Xuất Excel"}
    </button>
  );
}
