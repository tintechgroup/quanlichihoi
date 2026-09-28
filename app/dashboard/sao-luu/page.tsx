"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Eye,
  FileClock,
  HardDrive,
  History,
  Info,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  X,
  XCircle,
} from "lucide-react";

/* =========================================================
 * TYPES
 * ======================================================= */

type ActiveTab = "SAO_LUU" | "NHAT_KY";

type ChiTietCollection = {
  tenCollection: string;
  soBanGhi: number;
  dungLuong?: number;
};

type SaoLuuItem = {
  _id: string;
  maSaoLuu: string;
  tenTep: string;
  loaiSaoLuu: "THU_CONG" | "TU_DONG";
  trangThai:
    | "DANG_XU_LY"
    | "HOAN_THANH"
    | "THAT_BAI";

  gridFsFileId?: string;
  mimeType?: string;
  phienBan?: string;

  tongSoBanGhi: number;
  dungLuong: number;

  danhSachCollection?: ChiTietCollection[];

  tenDangNhap?: string;
  hoTenNguoiTao?: string;

  thoiGianBatDau: string;
  thoiGianHoanThanh?: string;

  checksum?: string;
  ghiChu?: string;
  loi?: string;

  createdAt: string;
};

type SaoLuuThongKe = {
  tongSaoLuu: number;
  hoanThanh: number;
  thatBai: number;
  dangXuLy: number;
  tongDungLuong: number;
  tongBanGhiDaSaoLuu: number;
  banSaoLuuGanNhat?: SaoLuuItem | null;
};

type NhatKyItem = {
  _id: string;

  tenDangNhap?: string;
  hoTen?: string;
  vaiTro?: string;

  hanhDong: string;
  module: string;
  moTa: string;

  doiTuongId?: string;
  doiTuongLoai?: string;

  duLieuCu?: Record<string, unknown>;
  duLieuMoi?: Record<string, unknown>;

  diaChiIP?: string;
  userAgent?: string;
  duongDan?: string;
  phuongThuc?: string;

  mucDo: string;
  ketQua: string;
  loi?: string;

  createdAt: string;
};

type NhatKyThongKe = {
  tongBanGhi: number;
  thanhCong: number;
  thatBai: number;
  canhBao: number;
  nguyHiem: number;
  trongNgay: number;
};

type PhanTrang = {
  trangHienTai: number;
  gioiHan: number;
  tongBanGhi: number;
  tongTrang: number;
  coTrangTruoc: boolean;
  coTrangSau: boolean;
};

type SaoLuuResponse = {
  success?: boolean;
  message?: string;
  data?: {
    danhSach?: SaoLuuItem[];
    thongKe?: Partial<SaoLuuThongKe>;
    phanTrang?: Partial<PhanTrang>;
  };
};

type NhatKyResponse = {
  success?: boolean;
  message?: string;
  data?: {
    danhSach?: NhatKyItem[];
    thongKe?: Partial<NhatKyThongKe>;
    boLoc?: {
      danhSachModule?: string[];
      danhSachHanhDong?: string[];
      danhSachMucDo?: string[];
      danhSachKetQua?: string[];
    };
    phanTrang?: Partial<PhanTrang>;
  };
};

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  iconClassName: string;
};

/* =========================================================
 * CONSTANTS
 * ======================================================= */

const DEFAULT_PAGINATION: PhanTrang = {
  trangHienTai: 1,
  gioiHan: 10,
  tongBanGhi: 0,
  tongTrang: 1,
  coTrangTruoc: false,
  coTrangSau: false,
};

const DEFAULT_BACKUP_STATISTIC: SaoLuuThongKe = {
  tongSaoLuu: 0,
  hoanThanh: 0,
  thatBai: 0,
  dangXuLy: 0,
  tongDungLuong: 0,
  tongBanGhiDaSaoLuu: 0,
  banSaoLuuGanNhat: null,
};

const DEFAULT_LOG_STATISTIC: NhatKyThongKe = {
  tongBanGhi: 0,
  thanhCong: 0,
  thatBai: 0,
  canhBao: 0,
  nguyHiem: 0,
  trongNgay: 0,
};

const ACTION_LABELS: Record<string, string> = {
  DANG_NHAP: "Đăng nhập",
  DANG_XUAT: "Đăng xuất",
  DANG_NHAP_THAT_BAI: "Đăng nhập thất bại",
  TAO_MOI: "Tạo mới",
  CAP_NHAT: "Cập nhật",
  XOA: "Xóa dữ liệu",
  KHOA_TAI_KHOAN: "Khóa tài khoản",
  MO_KHOA_TAI_KHOAN: "Mở khóa tài khoản",
  DOI_MAT_KHAU: "Đổi mật khẩu",
  DAT_LAI_MAT_KHAU: "Đặt lại mật khẩu",
  CAP_TAI_KHOAN: "Cấp tài khoản",
  XUAT_EXCEL: "Xuất Excel",
  SAO_LUU: "Sao lưu",
  KHOI_PHUC: "Khôi phục",
  KHAC: "Khác",
};

const MODULE_LABELS: Record<string, string> = {
  XAC_THUC: "Xác thực",
  NGUOI_DUNG: "Người dùng",
  HOI_VIEN: "Hội viên",
  CHI_HOI: "Chi hội",
  BAN_CHAP_HANH: "Ban Chấp hành",
  HOAT_DONG: "Hoạt động",
  THONG_BAO: "Thông báo",
  DANH_GIA: "Đánh giá",
  THONG_KE: "Thống kê",
  SAO_LUU: "Sao lưu",
  HE_THONG: "Hệ thống",
};

/* =========================================================
 * HELPERS
 * ======================================================= */

function formatNumber(value: unknown) {
  const number = Number(value);

  return new Intl.NumberFormat("vi-VN").format(
    Number.isFinite(number) ? number : 0,
  );
}

function formatBytes(value: unknown) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const result =
    bytes / Math.pow(1024, unitIndex);

  return `${result.toFixed(
    unitIndex === 0 ? 0 : 2,
  )} ${units[unitIndex]}`;
}

function formatDateTime(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).format(date);
}

function getActionLabel(value?: string) {
  if (!value) return "Chưa xác định";

  return (
    ACTION_LABELS[value] ??
    value.replaceAll("_", " ")
  );
}

function getModuleLabel(value?: string) {
  if (!value) return "Chưa xác định";

  return (
    MODULE_LABELS[value] ??
    value.replaceAll("_", " ")
  );
}

function getRoleLabel(value?: string) {
  switch (value) {
    case "ADMIN":
      return "Quản trị viên";

    case "BAN_CHAP_HANH":
      return "Ban Chấp hành";

    case "CHI_HOI_TRUONG":
      return "Chi hội trưởng";

    case "HOI_VIEN":
      return "Hội viên";

    default:
      return value || "Hệ thống";
  }
}

function getBackupStatusLabel(value?: string) {
  switch (value) {
    case "DANG_XU_LY":
      return "Đang xử lý";

    case "HOAN_THANH":
      return "Hoàn thành";

    case "THAT_BAI":
      return "Thất bại";

    default:
      return value || "Chưa xác định";
  }
}

function getBackupStatusClass(value?: string) {
  switch (value) {
    case "DANG_XU_LY":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "HOAN_THANH":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "THAT_BAI":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getActionClass(value?: string) {
  switch (value) {
    case "DANG_NHAP":
    case "MO_KHOA_TAI_KHOAN":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "TAO_MOI":
    case "CAP_TAI_KHOAN":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "CAP_NHAT":
    case "DOI_MAT_KHAU":
    case "DAT_LAI_MAT_KHAU":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "DANG_NHAP_THAT_BAI":
    case "XOA":
    case "KHOA_TAI_KHOAN":
      return "border-red-200 bg-red-50 text-red-700";

    case "SAO_LUU":
    case "KHOI_PHUC":
      return "border-violet-200 bg-violet-50 text-violet-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getLevelLabel(value?: string) {
  switch (value) {
    case "THONG_TIN":
      return "Thông tin";

    case "CANH_BAO":
      return "Cảnh báo";

    case "NGUY_HIEM":
      return "Nguy hiểm";

    default:
      return value || "Chưa xác định";
  }
}

function getLevelClass(value?: string) {
  switch (value) {
    case "THONG_TIN":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "CANH_BAO":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "NGUY_HIEM":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function stringifyData(
  value?: Record<string, unknown>,
) {
  if (!value || Object.keys(value).length === 0) {
    return "Không có dữ liệu";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Không thể hiển thị dữ liệu";
  }
}

async function readJson<T>(
  response: Response,
): Promise<T> {
  const contentType =
    response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    throw new Error(
      text ||
        `Máy chủ trả về dữ liệu không hợp lệ (${response.status})`,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(
      "Không thể đọc dữ liệu từ máy chủ",
    );
  }
}

/* =========================================================
 * STAT CARD
 * ======================================================= */

function StatCard({
  title,
  value,
  description,
  icon,
  iconClassName,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
 * MODAL WRAPPER
 * ======================================================= */

function Modal({
  children,
  onClose,
  maxWidth = "max-w-2xl",
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`max-h-[92vh] w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${maxWidth}`}
      >
        {children}
      </div>
    </div>
  );
}

/* =========================================================
 * CREATE BACKUP MODAL
 * ======================================================= */

function CreateBackupModal({
  creating,
  onClose,
  onSubmit,
}: {
  creating: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Database size={22} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Tạo bản sao lưu
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Sao lưu toàn bộ dữ liệu hệ thống.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={creating}
          onClick={onClose}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Info
              size={20}
              className="mt-0.5 shrink-0 text-blue-700"
            />

            <div className="text-sm leading-6 text-blue-800">
              <p className="font-bold">
                Dữ liệu sẽ được lưu trong MongoDB GridFS
              </p>

              <p className="mt-1">
                Quá trình có thể mất một khoảng thời gian
                tùy theo số lượng dữ liệu.
              </p>
            </div>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Ghi chú
          </span>

          <textarea
            value={note}
            onChange={(event) =>
              setNote(event.target.value)
            }
            maxLength={1000}
            rows={4}
            placeholder="Nhập lý do hoặc nội dung sao lưu..."
            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />

          <span className="mt-1 block text-right text-xs text-slate-400">
            {note.length}/1000
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={creating}
          className="h-10 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Đóng
        </button>

        <button
          type="button"
          disabled={creating}
          onClick={() => void onSubmit(note)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
        >
          {creating ? (
            <LoaderCircle
              size={17}
              className="animate-spin"
            />
          ) : (
            <Archive size={17} />
          )}

          {creating
            ? "Đang sao lưu..."
            : "Tạo bản sao lưu"}
        </button>
      </div>
    </Modal>
  );
}

/* =========================================================
 * BACKUP DETAIL MODAL
 * ======================================================= */

function BackupDetailModal({
  item,
  downloading,
  onClose,
  onDownload,
}: {
  item: SaoLuuItem;
  downloading: boolean;
  onClose: () => void;
  onDownload: (item: SaoLuuItem) => Promise<void>;
}) {
  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <HardDrive size={22} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Chi tiết bản sao lưu
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {item.maSaoLuu}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">
              Trạng thái
            </p>

            <span
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getBackupStatusClass(
                item.trangThai,
              )}`}
            >
              {getBackupStatusLabel(
                item.trangThai,
              )}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">
              Dung lượng
            </p>

            <p className="mt-2 font-bold text-slate-900">
              {formatBytes(item.dungLuong)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">
              Tổng bản ghi
            </p>

            <p className="mt-2 font-bold text-slate-900">
              {formatNumber(item.tongSoBanGhi)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">
              Loại sao lưu
            </p>

            <p className="mt-2 font-bold text-slate-900">
              {item.loaiSaoLuu === "TU_DONG"
                ? "Tự động"
                : "Thủ công"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="font-bold text-slate-800">
              Thông tin file
            </p>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  Tên file
                </dt>

                <dd className="max-w-[65%] break-all text-right font-medium text-slate-800">
                  {item.tenTep}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  Phiên bản
                </dt>

                <dd className="font-medium text-slate-800">
                  {item.phienBan || "1.0"}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  Bắt đầu
                </dt>

                <dd className="text-right font-medium text-slate-800">
                  {formatDateTime(
                    item.thoiGianBatDau,
                  )}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  Hoàn thành
                </dt>

                <dd className="text-right font-medium text-slate-800">
                  {formatDateTime(
                    item.thoiGianHoanThanh,
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="font-bold text-slate-800">
              Người tạo
            </p>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  Họ tên
                </dt>

                <dd className="font-medium text-slate-800">
                  {item.hoTenNguoiTao ||
                    "Không xác định"}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  Tài khoản
                </dt>

                <dd className="font-medium text-slate-800">
                  {item.tenDangNhap || "—"}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  Ghi chú
                </dt>

                <dd className="max-w-[65%] text-right font-medium text-slate-800">
                  {item.ghiChu || "Không có"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {item.checksum && (
          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <p className="font-bold text-slate-800">
              Checksum SHA-256
            </p>

            <p className="mt-2 break-all rounded-lg bg-slate-950 p-3 font-mono text-xs leading-6 text-emerald-300">
              {item.checksum}
            </p>
          </div>
        )}

        {item.loi && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-bold">
              Lỗi sao lưu
            </p>

            <p className="mt-1 whitespace-pre-wrap">
              {item.loi}
            </p>
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <p className="font-bold text-slate-800">
              Danh sách collection
            </p>
          </div>

          <div className="max-h-72 overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                    Collection
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                    Bản ghi
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                    Dung lượng
                  </th>
                </tr>
              </thead>

              <tbody>
                {(item.danhSachCollection ?? []).map(
                  (collection, index) => (
                    <tr
                      key={`${collection.tenCollection}-${index}`}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-slate-700">
                        {collection.tenCollection}
                      </td>

                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                        {formatNumber(
                          collection.soBanGhi,
                        )}
                      </td>

                      <td className="px-4 py-3 text-right text-sm text-slate-500">
                        {formatBytes(
                          collection.dungLuong,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>

            {!item.danhSachCollection?.length && (
              <p className="p-6 text-center text-sm text-slate-500">
                Không có thông tin collection.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Đóng
        </button>

        {item.trangThai === "HOAN_THANH" && (
          <button
            type="button"
            disabled={downloading}
            onClick={() => void onDownload(item)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
          >
            {downloading ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            ) : (
              <Download size={17} />
            )}

            Tải xuống
          </button>
        )}
      </div>
    </Modal>
  );
}

/* =========================================================
 * DELETE MODAL
 * ======================================================= */

function DeleteBackupModal({
  item,
  deleting,
  onClose,
  onDelete,
}: {
  item: SaoLuuItem;
  deleting: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Trash2 size={27} />
        </div>

        <h2 className="mt-5 text-xl font-bold text-slate-950">
          Xóa bản sao lưu?
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Bản sao lưu{" "}
          <strong>{item.maSaoLuu}</strong> và file
          trong GridFS sẽ bị xóa vĩnh viễn. Thao tác
          này không thể hoàn tác.
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={() => void onDelete()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            ) : (
              <Trash2 size={17} />
            )}

            Xóa bản sao lưu
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
 * LOG DETAIL MODAL
 * ======================================================= */

function LogDetailModal({
  item,
  onClose,
}: {
  item: NhatKyItem;
  onClose: () => void;
}) {
  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            Chi tiết nhật ký
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {formatDateTime(item.createdAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </div>

      <div className="max-h-[72vh] overflow-y-auto p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">
              Người thực hiện
            </p>

            <p className="mt-2 font-bold text-slate-900">
              {item.hoTen ||
                item.tenDangNhap ||
                "Hệ thống"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {getRoleLabel(item.vaiTro)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">
              Hành động
            </p>

            <p className="mt-2 font-bold text-slate-900">
              {getActionLabel(item.hanhDong)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {getModuleLabel(item.module)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">
            Nội dung
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-800">
            {item.moTa}
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4 text-sm">
            <p className="font-bold text-slate-800">
              Thông tin truy cập
            </p>

            <div className="mt-3 space-y-2 text-slate-600">
              <p>IP: {item.diaChiIP || "—"}</p>
              <p>
                Phương thức:{" "}
                {item.phuongThuc || "—"}
              </p>
              <p className="break-all">
                Đường dẫn: {item.duongDan || "—"}
              </p>
              <p>
                Mức độ:{" "}
                {getLevelLabel(item.mucDo)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 text-sm">
            <p className="font-bold text-slate-800">
              Kết quả
            </p>

            <p
              className={`mt-3 font-bold ${
                item.ketQua === "THANH_CONG"
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              {item.ketQua === "THANH_CONG"
                ? "Thành công"
                : "Thất bại"}
            </p>

            {item.loi && (
              <p className="mt-2 whitespace-pre-wrap text-red-600">
                {item.loi}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 font-bold text-slate-800">
              Dữ liệu cũ
            </p>

            <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-200">
              {stringifyData(item.duLieuCu)}
            </pre>
          </div>

          <div>
            <p className="mb-2 font-bold text-slate-800">
              Dữ liệu mới
            </p>

            <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-200">
              {stringifyData(item.duLieuMoi)}
            </pre>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Đóng
        </button>
      </div>
    </Modal>
  );
}

/* =========================================================
 * MAIN PAGE
 * ======================================================= */

export default function SaoLuuPage() {
  const [activeTab, setActiveTab] =
    useState<ActiveTab>("SAO_LUU");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* Backup states */
  const [backupList, setBackupList] = useState<
    SaoLuuItem[]
  >([]);

  const [backupStatistic, setBackupStatistic] =
    useState<SaoLuuThongKe>(
      DEFAULT_BACKUP_STATISTIC,
    );

  const [backupPagination, setBackupPagination] =
    useState<PhanTrang>(DEFAULT_PAGINATION);

  const [backupPage, setBackupPage] = useState(1);
  const [backupSearch, setBackupSearch] =
    useState("");
  const [backupStatus, setBackupStatus] =
    useState("");
  const [backupType, setBackupType] =
    useState("");

  const [backupLoading, setBackupLoading] =
    useState(true);
  const [creating, setCreating] = useState(false);
  const [downloadingId, setDownloadingId] =
    useState("");
  const [deleting, setDeleting] =
    useState(false);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [selectedBackup, setSelectedBackup] =
    useState<SaoLuuItem | null>(null);

  const [deleteBackup, setDeleteBackup] =
    useState<SaoLuuItem | null>(null);

  /* Log states */
  const [logList, setLogList] = useState<
    NhatKyItem[]
  >([]);

  const [logStatistic, setLogStatistic] =
    useState<NhatKyThongKe>(
      DEFAULT_LOG_STATISTIC,
    );

  const [logPagination, setLogPagination] =
    useState<PhanTrang>(DEFAULT_PAGINATION);

  const [logModules, setLogModules] = useState<
    string[]
  >([]);

  const [logActions, setLogActions] = useState<
    string[]
  >([]);

  const [logPage, setLogPage] = useState(1);
  const [logSearch, setLogSearch] = useState("");
  const [logModule, setLogModule] = useState("");
  const [logAction, setLogAction] = useState("");
  const [logLevel, setLogLevel] = useState("");
  const [logResult, setLogResult] = useState("");

  const [logLoading, setLogLoading] =
    useState(false);

  const [selectedLog, setSelectedLog] =
    useState<NhatKyItem | null>(null);

  const backupRequestRef = useRef(0);
  const logRequestRef = useRef(0);

  /* =======================================================
   * LOAD BACKUPS
   * ===================================================== */

  const loadBackups = useCallback(async () => {
    const requestId = ++backupRequestRef.current;

    try {
      setBackupLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", backupPage.toString());
      params.set("limit", "10");

      if (backupSearch.trim()) {
        params.set(
          "search",
          backupSearch.trim(),
        );
      }

      if (backupStatus) {
        params.set(
          "trangThai",
          backupStatus,
        );
      }

      if (backupType) {
        params.set(
          "loaiSaoLuu",
          backupType,
        );
      }

      const response = await fetch(
        `/api/sao-luu?${params.toString()}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );

      const result =
        await readJson<SaoLuuResponse>(response);

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
            "Không thể tải lịch sử sao lưu",
        );
      }

      if (requestId !== backupRequestRef.current) {
        return;
      }

      setBackupList(
        Array.isArray(result.data?.danhSach)
          ? result.data.danhSach
          : [],
      );

      setBackupStatistic({
        ...DEFAULT_BACKUP_STATISTIC,
        ...(result.data?.thongKe ?? {}),
      });

      setBackupPagination({
        ...DEFAULT_PAGINATION,
        ...(result.data?.phanTrang ?? {}),
      });
    } catch (loadError) {
      if (requestId !== backupRequestRef.current) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải lịch sử sao lưu",
      );
    } finally {
      if (requestId === backupRequestRef.current) {
        setBackupLoading(false);
      }
    }
  }, [
    backupPage,
    backupSearch,
    backupStatus,
    backupType,
  ]);

  /* =======================================================
   * LOAD LOGS
   * ===================================================== */

  const loadLogs = useCallback(async () => {
    const requestId = ++logRequestRef.current;

    try {
      setLogLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", logPage.toString());
      params.set("limit", "15");

      if (logSearch.trim()) {
        params.set("search", logSearch.trim());
      }

      if (logModule) {
        params.set("module", logModule);
      }

      if (logAction) {
        params.set("hanhDong", logAction);
      }

      if (logLevel) {
        params.set("mucDo", logLevel);
      }

      if (logResult) {
        params.set("ketQua", logResult);
      }

      const response = await fetch(
        `/api/nhat-ky?${params.toString()}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );

      const result =
        await readJson<NhatKyResponse>(response);

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
            "Không thể tải nhật ký hệ thống",
        );
      }

      if (requestId !== logRequestRef.current) {
        return;
      }

      setLogList(
        Array.isArray(result.data?.danhSach)
          ? result.data.danhSach
          : [],
      );

      setLogStatistic({
        ...DEFAULT_LOG_STATISTIC,
        ...(result.data?.thongKe ?? {}),
      });

      setLogPagination({
        ...DEFAULT_PAGINATION,
        ...(result.data?.phanTrang ?? {}),
      });

      setLogModules(
        Array.isArray(
          result.data?.boLoc?.danhSachModule,
        )
          ? result.data?.boLoc
              ?.danhSachModule ?? []
          : [],
      );

      setLogActions(
        Array.isArray(
          result.data?.boLoc
            ?.danhSachHanhDong,
        )
          ? result.data?.boLoc
              ?.danhSachHanhDong ?? []
          : [],
      );
    } catch (loadError) {
      if (requestId !== logRequestRef.current) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải nhật ký hệ thống",
      );
    } finally {
      if (requestId === logRequestRef.current) {
        setLogLoading(false);
      }
    }
  }, [
    logPage,
    logSearch,
    logModule,
    logAction,
    logLevel,
    logResult,
  ]);

  useEffect(() => {
    if (activeTab !== "SAO_LUU") return;

    const timeout = window.setTimeout(() => {
      void loadBackups();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [activeTab, loadBackups]);

  useEffect(() => {
    if (activeTab !== "NHAT_KY") return;

    const timeout = window.setTimeout(() => {
      void loadLogs();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [activeTab, loadLogs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep pagination synchronized with filters and the available results.
    setBackupPage(1);
  }, [backupSearch, backupStatus, backupType]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep pagination synchronized with filters and the available results.
    setLogPage(1);
  }, [
    logSearch,
    logModule,
    logAction,
    logLevel,
    logResult,
  ]);

  /* =======================================================
   * ACTIONS
   * ===================================================== */

  const createBackup = async (note: string) => {
    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        "/api/sao-luu",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ghiChu: note.trim(),
            loaiSaoLuu: "THU_CONG",
          }),
        },
      );

      const result =
        await readJson<SaoLuuResponse>(response);

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
            "Không thể tạo bản sao lưu",
        );
      }

      setShowCreateModal(false);
      setSuccess(
        result.message ||
          "Tạo bản sao lưu thành công",
      );

      setBackupPage(1);
      await loadBackups();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Không thể tạo bản sao lưu",
      );
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (
    item: SaoLuuItem,
  ) => {
    try {
      setDownloadingId(item._id);
      setError("");

      const response = await fetch(
        `/api/sao-luu/${item._id}/tai-xuong`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const contentType =
          response.headers.get(
            "content-type",
          ) ?? "";

        if (
          contentType.includes("application/json")
        ) {
          const result =
            await readJson<{
              message?: string;
            }>(response);

          throw new Error(
            result.message ||
              "Không thể tải bản sao lưu",
          );
        }

        throw new Error(
          "Không thể tải bản sao lưu",
        );
      }

      const blob = await response.blob();
      const objectUrl =
        window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = objectUrl;
      link.download =
        item.tenTep ||
        `${item.maSaoLuu}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Không thể tải bản sao lưu",
      );
    } finally {
      setDownloadingId("");
    }
  };

  const handleDeleteBackup = async () => {
    if (!deleteBackup) return;

    try {
      setDeleting(true);
      setError("");

      const response = await fetch(
        `/api/sao-luu/${deleteBackup._id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const result = await readJson<{
        success?: boolean;
        message?: string;
      }>(response);

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
            "Không thể xóa bản sao lưu",
        );
      }

      setDeleteBackup(null);
      setSuccess(
        result.message ||
          "Xóa bản sao lưu thành công",
      );

      if (
        backupList.length === 1 &&
        backupPage > 1
      ) {
        setBackupPage((current) => current - 1);
      } else {
        await loadBackups();
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Không thể xóa bản sao lưu",
      );
    } finally {
      setDeleting(false);
    }
  };

  const sortedLogModules = useMemo(
    () => [...logModules].sort(),
    [logModules],
  );

  /* =======================================================
   * RENDER
   * ===================================================== */

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto w-full max-w-[1650px] px-4 py-7 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#123d68]">
              Quản trị hệ thống
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Sao lưu và bảo mật
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Quản lý bản sao lưu và theo dõi nhật ký
              truy cập hệ thống.
            </p>
          </div>

          {activeTab === "SAO_LUU" && (
            <button
              type="button"
              onClick={() =>
                setShowCreateModal(true)
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-950"
            >
              <Plus size={18} />
              Tạo bản sao lưu
            </button>
          )}
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex gap-3">
              <XCircle
                size={19}
                className="mt-0.5 shrink-0"
              />
              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="flex gap-3">
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0"
              />
              <span>{success}</span>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* TABS */}
        <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setActiveTab("SAO_LUU");
              setError("");
            }}
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
              activeTab === "SAO_LUU"
                ? "bg-blue-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Database size={17} />
            Sao lưu dữ liệu
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("NHAT_KY");
              setError("");
            }}
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
              activeTab === "NHAT_KY"
                ? "bg-blue-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <History size={17} />
            Nhật ký bảo mật
          </button>
        </div>

        {/* =================================================
         * BACKUP TAB
         * =============================================== */}

        {activeTab === "SAO_LUU" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Tổng bản sao lưu"
                value={formatNumber(
                  backupStatistic.tongSaoLuu,
                )}
                description="Tổng số lần sao lưu dữ liệu"
                icon={<Archive size={23} />}
                iconClassName="bg-blue-50 text-blue-700"
              />

              <StatCard
                title="Sao lưu thành công"
                value={formatNumber(
                  backupStatistic.hoanThanh,
                )}
                description="Các bản sao lưu hoàn chỉnh"
                icon={<ShieldCheck size={23} />}
                iconClassName="bg-emerald-50 text-emerald-700"
              />

              <StatCard
                title="Tổng dung lượng"
                value={formatBytes(
                  backupStatistic.tongDungLuong,
                )}
                description={`${formatNumber(
                  backupStatistic.tongBanGhiDaSaoLuu,
                )} bản ghi đã sao lưu`}
                icon={<HardDrive size={23} />}
                iconClassName="bg-violet-50 text-violet-700"
              />

              <StatCard
                title="Sao lưu thất bại"
                value={formatNumber(
                  backupStatistic.thatBai,
                )}
                description={`${formatNumber(
                  backupStatistic.dangXuLy,
                )} tiến trình đang xử lý`}
                icon={<ShieldAlert size={23} />}
                iconClassName="bg-red-50 text-red-700"
              />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={backupSearch}
                    onChange={(event) =>
                      setBackupSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Tìm mã, tên file hoặc người tạo"
                    className="h-11 w-full rounded-xl border border-slate-300 pl-11 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <select
                  value={backupStatus}
                  onChange={(event) =>
                    setBackupStatus(
                      event.target.value,
                    )
                  }
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                >
                  <option value="">
                    Tất cả trạng thái
                  </option>
                  <option value="DANG_XU_LY">
                    Đang xử lý
                  </option>
                  <option value="HOAN_THANH">
                    Hoàn thành
                  </option>
                  <option value="THAT_BAI">
                    Thất bại
                  </option>
                </select>

                <select
                  value={backupType}
                  onChange={(event) =>
                    setBackupType(
                      event.target.value,
                    )
                  }
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                >
                  <option value="">
                    Tất cả loại
                  </option>
                  <option value="THU_CONG">
                    Thủ công
                  </option>
                  <option value="TU_DONG">
                    Tự động
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() => void loadBackups()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw size={17} />
                  Làm mới
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-bold text-slate-900">
                  Lịch sử sao lưu
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Quản lý và tải xuống các bản sao lưu
                  dữ liệu.
                </p>
              </div>

              {backupLoading ? (
                <div className="flex min-h-80 items-center justify-center">
                  <LoaderCircle
                    size={36}
                    className="animate-spin text-blue-700"
                  />
                </div>
              ) : backupList.length === 0 ? (
                <div className="flex min-h-80 flex-col items-center justify-center text-center">
                  <Archive
                    size={44}
                    className="text-slate-300"
                  />

                  <p className="mt-4 font-bold text-slate-700">
                    Chưa có bản sao lưu
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Nhấn “Tạo bản sao lưu” để bắt đầu.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1150px]">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Mã sao lưu
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            File
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Người tạo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Thời gian
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                            Bản ghi
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                            Dung lượng
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Trạng thái
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-500">
                            Thao tác
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {backupList.map(
                          (item, index) => (
                            <tr
                              key={`${item._id}-${index}`}
                              className="border-t border-slate-100 hover:bg-blue-50/30"
                            >
                              <td className="px-4 py-4">
                                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                                  {item.maSaoLuu}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <p className="max-w-60 truncate text-sm font-semibold text-slate-900">
                                  {item.tenTep}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {item.loaiSaoLuu ===
                                  "TU_DONG"
                                    ? "Tự động"
                                    : "Thủ công"}
                                </p>
                              </td>

                              <td className="px-4 py-4">
                                <p className="text-sm font-semibold text-slate-800">
                                  {item.hoTenNguoiTao ||
                                    "Không xác định"}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {item.tenDangNhap || "—"}
                                </p>
                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                                {formatDateTime(
                                  item.createdAt,
                                )}
                              </td>

                              <td className="px-4 py-4 text-right text-sm font-bold text-slate-800">
                                {formatNumber(
                                  item.tongSoBanGhi,
                                )}
                              </td>

                              <td className="px-4 py-4 text-right text-sm font-medium text-slate-700">
                                {formatBytes(
                                  item.dungLuong,
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getBackupStatusClass(
                                    item.trangThai,
                                  )}`}
                                >
                                  {getBackupStatusLabel(
                                    item.trangThai,
                                  )}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedBackup(
                                        item,
                                      )
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                                    title="Xem chi tiết"
                                  >
                                    <Eye size={17} />
                                  </button>

                                  {item.trangThai ===
                                    "HOAN_THANH" && (
                                    <button
                                      type="button"
                                      disabled={
                                        downloadingId ===
                                        item._id
                                      }
                                      onClick={() =>
                                        void downloadBackup(
                                          item,
                                        )
                                      }
                                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                                      title="Tải xuống"
                                    >
                                      {downloadingId ===
                                      item._id ? (
                                        <LoaderCircle
                                          size={17}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Download
                                          size={17}
                                        />
                                      )}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    disabled={
                                      item.trangThai ===
                                      "DANG_XU_LY"
                                    }
                                    onClick={() =>
                                      setDeleteBackup(
                                        item,
                                      )
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    title="Xóa"
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                    <p className="text-sm text-slate-500">
                      Tổng cộng{" "}
                      {formatNumber(
                        backupPagination.tongBanGhi,
                      )}{" "}
                      bản sao lưu
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={
                          !backupPagination.coTrangTruoc
                        }
                        onClick={() =>
                          setBackupPage((page) =>
                            Math.max(1, page - 1),
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40"
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <span className="text-sm font-semibold text-slate-700">
                        {backupPagination.trangHienTai}/
                        {backupPagination.tongTrang}
                      </span>

                      <button
                        disabled={
                          !backupPagination.coTrangSau
                        }
                        onClick={() =>
                          setBackupPage((page) =>
                            Math.min(
                              backupPagination.tongTrang,
                              page + 1,
                            ),
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* =================================================
         * LOG TAB
         * =============================================== */}

        {activeTab === "NHAT_KY" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Tổng nhật ký"
                value={formatNumber(
                  logStatistic.tongBanGhi,
                )}
                description={`${formatNumber(
                  logStatistic.trongNgay,
                )} hoạt động hôm nay`}
                icon={<FileClock size={23} />}
                iconClassName="bg-blue-50 text-blue-700"
              />

              <StatCard
                title="Thành công"
                value={formatNumber(
                  logStatistic.thanhCong,
                )}
                description="Thao tác hoàn tất thành công"
                icon={<ShieldCheck size={23} />}
                iconClassName="bg-emerald-50 text-emerald-700"
              />

              <StatCard
                title="Thất bại"
                value={formatNumber(
                  logStatistic.thatBai,
                )}
                description="Các thao tác xảy ra lỗi"
                icon={<XCircle size={23} />}
                iconClassName="bg-red-50 text-red-700"
              />

              <StatCard
                title="Cảnh báo"
                value={formatNumber(
                  logStatistic.canhBao +
                    logStatistic.nguyHiem,
                )}
                description={`${formatNumber(
                  logStatistic.nguyHiem,
                )} sự kiện nguy hiểm`}
                icon={<ShieldAlert size={23} />}
                iconClassName="bg-amber-50 text-amber-700"
              />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[1fr_190px_210px_170px_170px_auto]">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={logSearch}
                    onChange={(event) =>
                      setLogSearch(event.target.value)
                    }
                    placeholder="Tìm người dùng, nội dung hoặc IP"
                    className="h-11 w-full rounded-xl border border-slate-300 pl-11 pr-4 text-sm outline-none"
                  />
                </div>

                <select
                  value={logModule}
                  onChange={(event) =>
                    setLogModule(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">
                    Tất cả module
                  </option>

                  {sortedLogModules.map(
                    (module, index) => (
                      <option
                        key={`${module}-${index}`}
                        value={module}
                      >
                        {getModuleLabel(module)}
                      </option>
                    ),
                  )}
                </select>

                <select
                  value={logAction}
                  onChange={(event) =>
                    setLogAction(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">
                    Tất cả hành động
                  </option>

                  {logActions.map(
                    (action, index) => (
                      <option
                        key={`${action}-${index}`}
                        value={action}
                      >
                        {getActionLabel(action)}
                      </option>
                    ),
                  )}
                </select>

                <select
                  value={logLevel}
                  onChange={(event) =>
                    setLogLevel(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">
                    Tất cả mức độ
                  </option>
                  <option value="THONG_TIN">
                    Thông tin
                  </option>
                  <option value="CANH_BAO">
                    Cảnh báo
                  </option>
                  <option value="NGUY_HIEM">
                    Nguy hiểm
                  </option>
                </select>

                <select
                  value={logResult}
                  onChange={(event) =>
                    setLogResult(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">
                    Tất cả kết quả
                  </option>
                  <option value="THANH_CONG">
                    Thành công
                  </option>
                  <option value="THAT_BAI">
                    Thất bại
                  </option>
                </select>

                <button
                  onClick={() => void loadLogs()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50"
                >
                  <RefreshCw size={17} />
                  Làm mới
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-bold text-slate-900">
                  Nhật ký hoạt động
                </h2>
              </div>

              {logLoading ? (
                <div className="flex min-h-80 items-center justify-center">
                  <LoaderCircle
                    size={36}
                    className="animate-spin text-blue-700"
                  />
                </div>
              ) : logList.length === 0 ? (
                <div className="flex min-h-80 flex-col items-center justify-center">
                  <History
                    size={44}
                    className="text-slate-300"
                  />

                  <p className="mt-4 font-bold text-slate-700">
                    Chưa có nhật ký
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1250px]">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Thời gian
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Người dùng
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Hành động
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Module
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Nội dung
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Mức độ
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Kết quả
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-500">
                            Chi tiết
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {logList.map((item, index) => (
                          <tr
                            key={`${item._id}-${index}`}
                            className="border-t border-slate-100 hover:bg-blue-50/30"
                          >
                            <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                              {formatDateTime(
                                item.createdAt,
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <User
                                  size={17}
                                  className="text-slate-400"
                                />

                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {item.hoTen ||
                                      item.tenDangNhap ||
                                      "Hệ thống"}
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    {getRoleLabel(
                                      item.vaiTro,
                                    )}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getActionClass(
                                  item.hanhDong,
                                )}`}
                              >
                                {getActionLabel(
                                  item.hanhDong,
                                )}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-sm font-medium text-slate-700">
                              {getModuleLabel(
                                item.module,
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <p className="line-clamp-2 max-w-80 text-sm text-slate-700">
                                {item.moTa}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getLevelClass(
                                  item.mucDo,
                                )}`}
                              >
                                {getLevelLabel(
                                  item.mucDo,
                                )}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`text-sm font-bold ${
                                  item.ketQua ===
                                  "THANH_CONG"
                                    ? "text-emerald-700"
                                    : "text-red-700"
                                }`}
                              >
                                {item.ketQua ===
                                "THANH_CONG"
                                  ? "Thành công"
                                  : "Thất bại"}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() =>
                                  setSelectedLog(item)
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                              >
                                <Eye size={17} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                    <p className="text-sm text-slate-500">
                      Tổng cộng{" "}
                      {formatNumber(
                        logPagination.tongBanGhi,
                      )}{" "}
                      nhật ký
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={
                          !logPagination.coTrangTruoc
                        }
                        onClick={() =>
                          setLogPage((page) =>
                            Math.max(1, page - 1),
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40"
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <span className="text-sm font-semibold text-slate-700">
                        {logPagination.trangHienTai}/
                        {logPagination.tongTrang}
                      </span>

                      <button
                        disabled={
                          !logPagination.coTrangSau
                        }
                        onClick={() =>
                          setLogPage((page) =>
                            Math.min(
                              logPagination.tongTrang,
                              page + 1,
                            ),
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <LockKeyhole
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>
            Chỉ tài khoản Quản trị viên được quyền tạo,
            tải xuống, xóa bản sao lưu và xem nhật ký bảo
            mật.
          </p>
        </div>
      </div>

      {showCreateModal && (
        <CreateBackupModal
          creating={creating}
          onClose={() =>
            !creating && setShowCreateModal(false)
          }
          onSubmit={createBackup}
        />
      )}

      {selectedBackup && (
        <BackupDetailModal
          item={selectedBackup}
          downloading={
            downloadingId === selectedBackup._id
          }
          onClose={() => setSelectedBackup(null)}
          onDownload={downloadBackup}
        />
      )}

      {deleteBackup && (
        <DeleteBackupModal
          item={deleteBackup}
          deleting={deleting}
          onClose={() =>
            !deleting && setDeleteBackup(null)
          }
          onDelete={handleDeleteBackup}
        />
      )}

      {selectedLog && (
        <LogDetailModal
          item={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}