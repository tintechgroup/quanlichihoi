"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";

type TrangThaiDangKy =
  | "DA_DANG_KY"
  | "DA_THAM_GIA"
  | "VANG_MAT"
  | "DA_HUY"
  | string;

type TrangThaiHoatDong =
  | "CHO_PHE_DUYET"
  | "DA_DUYET"
  | "SAP_DIEN_RA"
  | "DANG_TRIEN_KHAI"
  | "DA_KET_THUC"
  | "DA_HUY"
  | string;

interface ChiHoi {
  id?: string;
  _id?: string;
  maChiHoi?: string;
  tenChiHoi?: string;
}

interface HoatDong {
  id?: string;
  _id?: string;
  maHoatDong: string;
  tenHoatDong: string;
  phamVi?: string;
  chiHoi?: ChiHoi | null;
  donViToChuc?: string;
  diaDiem?: string;
  thoiGianBatDau?: string;
  thoiGianKetThuc?: string;
  hanDangKy?: string;
  soLuongToiDa?: number | null;
  moTa?: string;
  noiDung?: string;
  trangThai?: TrangThaiHoatDong;
}

interface DangKyHoatDong {
  id?: string;
  _id?: string;
  trangThaiDangKy: TrangThaiDangKy;
  thoiGianDangKy?: string;
  thoiGianHuy?: string | null;
  ghiChu?: string;
  hoatDong: HoatDong;
}

interface HoiVien {
  id?: string;
  _id?: string;
  maHoiVien?: string;
  hoTen?: string;
  lop?: string;
  trangThai?: string;
}

interface ThongKe {
  tongBanGhi?: number;
  dangThamGia?: number;
  daDangKy?: number;
  daThamGia?: number;
  vangMat?: number;
  daHuy?: number;
}

interface ApiData {
  hoiVien?: HoiVien;
  thongKe?: ThongKe;
  danhSach?: DangKyHoatDong[];
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: ApiData;
}

interface MessageState {
  type: "success" | "error";
  text: string;
}

const TRANG_THAI_DANG_KY_OPTIONS = [
  { value: "", label: "Tất cả kết quả" },
  { value: "DA_DANG_KY", label: "Đã đăng ký" },
  { value: "DA_THAM_GIA", label: "Đã tham gia" },
  { value: "VANG_MAT", label: "Vắng mặt" },
  { value: "DA_HUY", label: "Đã hủy" },
];

function getId(value?: { id?: string; _id?: string } | null) {
  return value?.id || value?._id || "";
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getTrangThaiDangKyLabel(status?: TrangThaiDangKy) {
  switch (status) {
    case "DA_DANG_KY":
      return "Đã đăng ký";
    case "DA_THAM_GIA":
      return "Đã tham gia";
    case "VANG_MAT":
      return "Vắng mặt";
    case "DA_HUY":
      return "Đã hủy";
    default:
      return status || "Chưa xác định";
  }
}

function getTrangThaiDangKyClass(status?: TrangThaiDangKy) {
  switch (status) {
    case "DA_DANG_KY":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "DA_THAM_GIA":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "VANG_MAT":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "DA_HUY":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getTrangThaiHoatDongLabel(status?: TrangThaiHoatDong) {
  switch (status) {
    case "CHO_PHE_DUYET":
      return "Chờ phê duyệt";
    case "DA_DUYET":
      return "Đã duyệt";
    case "SAP_DIEN_RA":
      return "Sắp diễn ra";
    case "DANG_TRIEN_KHAI":
      return "Đang triển khai";
    case "DA_KET_THUC":
      return "Đã kết thúc";
    case "DA_HUY":
      return "Đã hủy";
    default:
      return status || "Chưa xác định";
  }
}

function getTrangThaiHoatDongClass(status?: TrangThaiHoatDong) {
  switch (status) {
    case "CHO_PHE_DUYET":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "DA_DUYET":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "SAP_DIEN_RA":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "DANG_TRIEN_KHAI":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "DA_KET_THUC":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "DA_HUY":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

async function parseResponse(response: Response): Promise<ApiResponse> {
  const text = await response.text();

  if (!text.trim()) {
    return {
      success: false,
      message: "Máy chủ không trả về dữ liệu",
    };
  }

  try {
    return JSON.parse(text) as ApiResponse;
  } catch {
    return {
      success: false,
      message: "Dữ liệu máy chủ trả về không hợp lệ",
    };
  }
}

export default function HoatDongCuaToiPage() {
  const router = useRouter();

  const [data, setData] = useState<ApiData>({
    hoiVien: undefined,
    thongKe: {},
    danhSach: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [message, setMessage] = useState<MessageState | null>(null);
  const [selectedItem, setSelectedItem] =
    useState<DangKyHoatDong | null>(null);
  const [cancelItem, setCancelItem] =
    useState<DangKyHoatDong | null>(null);

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setMessage(null);

      try {
        const response = await fetch("/api/hoat-dong/cua-toi", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const result = await parseResponse(response);

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Không thể tải danh sách hoạt động",
          );
        }

        setData({
          hoiVien: result.data?.hoiVien,
          thongKe: result.data?.thongKe || {},
          danhSach: Array.isArray(result.data?.danhSach)
            ? result.data.danhSach
            : [],
        });
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Đã xảy ra lỗi khi tải dữ liệu",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the request and its loading state together when effect dependencies change.
    void loadData();
  }, [loadData]);

  const danhSach = useMemo(() => data.danhSach || [], [data.danhSach]);
  const thongKe = data.thongKe || {};

  const filteredList = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return danhSach.filter((item) => {
      const activity = item.hoatDong;

      const searchableText = [
        activity?.maHoatDong,
        activity?.tenHoatDong,
        activity?.diaDiem,
        activity?.donViToChuc,
        activity?.chiHoi?.maChiHoi,
        activity?.chiHoi?.tenChiHoi,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        keyword.length === 0 || searchableText.includes(keyword);

      const matchesStatus =
        !statusFilter || item.trangThaiDangKy === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [danhSach, search, statusFilter]);

  const total =
    thongKe.tongBanGhi ??
    danhSach.length;

  const daDangKy =
    thongKe.dangThamGia ??
    thongKe.daDangKy ??
    danhSach.filter(
      (item) => item.trangThaiDangKy === "DA_DANG_KY",
    ).length;

  const daThamGia =
    thongKe.daThamGia ??
    danhSach.filter(
      (item) => item.trangThaiDangKy === "DA_THAM_GIA",
    ).length;

  const vangMat =
    thongKe.vangMat ??
    danhSach.filter(
      (item) => item.trangThaiDangKy === "VANG_MAT",
    ).length;

  const daHuy =
    thongKe.daHuy ??
    danhSach.filter(
      (item) => item.trangThaiDangKy === "DA_HUY",
    ).length;

  function canCancel(item: DangKyHoatDong) {
    if (item.trangThaiDangKy !== "DA_DANG_KY") {
      return false;
    }

    const activityStatus = item.hoatDong?.trangThai;

    if (
      activityStatus === "DANG_TRIEN_KHAI" ||
      activityStatus === "DA_KET_THUC" ||
      activityStatus === "DA_HUY"
    ) {
      return false;
    }

    if (item.hoatDong?.hanDangKy) {
      const deadline = new Date(item.hoatDong.hanDangKy);

      if (
        !Number.isNaN(deadline.getTime()) &&
        // eslint-disable-next-line react-hooks/purity -- Preserve the live registration deadline check on every render.
        deadline.getTime() < Date.now()
      ) {
        return false;
      }
    }

    return true;
  }

  async function handleCancelRegistration() {
    if (!cancelItem) return;

    const activityId = getId(cancelItem.hoatDong);

    if (!activityId) {
      setMessage({
        type: "error",
        text: "Không tìm thấy mã hoạt động",
      });
      setCancelItem(null);
      return;
    }

    setCancelling(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/hoat-dong/${activityId}/dang-ky`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const result = await parseResponse(response);

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể hủy đăng ký hoạt động",
        );
      }

      setMessage({
        type: "success",
        text: result.message || "Hủy đăng ký hoạt động thành công",
      });

      setCancelItem(null);
      await loadData(true);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi hủy đăng ký",
      });
    } finally {
      setCancelling(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("");
    setMessage(null);
    void loadData(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] px-5 py-8 lg:px-8">
        <div className="mb-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#123b68]">
            Dành cho Hội viên
          </p>

          <h1 className="text-3xl font-bold text-slate-950">
            Hoạt động của tôi
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Theo dõi các hoạt động đã đăng ký và kết quả tham gia của
            bạn.
          </p>

          {data.hoiVien && (
            <p className="mt-2 text-sm font-medium text-[#123b68]">
              {data.hoiVien.maHoiVien} - {data.hoiVien.hoTen}
              {data.hoiVien.lop ? ` · Lớp ${data.hoiVien.lop}` : ""}
            </p>
          )}
        </div>

        {message && (
          <div
            className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertCircle size={18} />
              )}

              <span>{message.text}</span>
            </div>

            <button
              type="button"
              onClick={() => setMessage(null)}
              className="rounded-md p-1 hover:bg-black/5"
              aria-label="Đóng thông báo"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Tổng đăng ký"
            value={total}
            icon={<Users size={23} />}
            iconClass="bg-blue-50 text-blue-700"
          />

          <StatCard
            label="Đã đăng ký"
            value={daDangKy}
            icon={<Clock3 size={23} />}
            iconClass="bg-indigo-50 text-indigo-700"
          />

          <StatCard
            label="Đã tham gia"
            value={daThamGia}
            icon={<UserCheck size={23} />}
            iconClass="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            label="Vắng mặt"
            value={vangMat}
            icon={<UserX size={23} />}
            iconClass="bg-amber-50 text-amber-700"
          />

          <StatCard
            label="Đã hủy"
            value={daHuy}
            icon={<X size={23} />}
            iconClass="bg-red-50 text-red-700"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo mã, tên hoạt động, địa điểm hoặc Chi hội"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 min-w-[220px] rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
            >
              {TRANG_THAI_DANG_KY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetFilters}
              disabled={refreshing}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin" : ""}
              />
              Làm mới
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 size={34} className="animate-spin text-[#123b68]" />
              <p className="text-sm">Đang tải hoạt động của bạn...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
                <CalendarDays size={35} />
              </div>

              <h3 className="text-base font-semibold text-slate-800">
                Chưa có hoạt động phù hợp
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Bạn chưa đăng ký hoạt động hoặc không có kết quả phù
                hợp với bộ lọc.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1250px] w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-600">
                      <th className="px-4 py-4">STT</th>
                      <th className="px-4 py-4">Mã hoạt động</th>
                      <th className="px-4 py-4">Tên hoạt động</th>
                      <th className="px-4 py-4">Chi hội</th>
                      <th className="px-4 py-4">Thời gian</th>
                      <th className="px-4 py-4">Địa điểm</th>
                      <th className="px-4 py-4">Hoạt động</th>
                      <th className="px-4 py-4">Kết quả</th>
                      <th className="px-4 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredList.map((item, index) => {
                      const activity = item.hoatDong;
                      const activityId = getId(activity);

                      return (
                        <tr
                          key={
                            getId(item) ||
                            `${activityId}-${item.thoiGianDangKy}-${index}`
                          }
                          className="border-t border-slate-200 text-sm text-slate-700 hover:bg-slate-50/70"
                        >
                          <td className="px-4 py-4">{index + 1}</td>

                          <td className="px-4 py-4">
                            <span className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-[#123b68]">
                              {activity?.maHoatDong || "—"}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <p className="max-w-[230px] truncate font-semibold text-slate-950">
                              {activity?.tenHoatDong || "—"}
                            </p>

                            <p className="mt-1 max-w-[230px] truncate text-xs text-slate-500">
                              {activity?.moTa || "Không có mô tả"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            {activity?.chiHoi ? (
                              <>
                                <p className="font-medium text-slate-800">
                                  {activity.chiHoi.maChiHoi || "—"}
                                </p>
                                <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                                  {activity.chiHoi.tenChiHoi || "—"}
                                </p>
                              </>
                            ) : (
                              <span className="text-slate-500">
                                Toàn Liên Chi hội
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <p>
                              Bắt đầu:{" "}
                              {formatDateTime(activity?.thoiGianBatDau)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Kết thúc:{" "}
                              {formatDateTime(activity?.thoiGianKetThuc)}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex max-w-[170px] items-center gap-2">
                              <MapPin
                                size={16}
                                className="shrink-0 text-slate-400"
                              />
                              <span className="truncate">
                                {activity?.diaDiem || "Chưa cập nhật"}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${getTrangThaiHoatDongClass(
                                activity?.trangThai,
                              )}`}
                            >
                              {getTrangThaiHoatDongLabel(
                                activity?.trangThai,
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${getTrangThaiDangKyClass(
                                item.trangThaiDangKy,
                              )}`}
                            >
                              {getTrangThaiDangKyLabel(
                                item.trangThaiDangKy,
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedItem(item)}
                                className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 font-medium text-slate-700 transition hover:border-[#123b68] hover:text-[#123b68]"
                              >
                                <Eye size={17} />
                                Chi tiết
                              </button>

                              {canCancel(item) && (
                                <button
                                  type="button"
                                  onClick={() => setCancelItem(item)}
                                  className="flex h-10 items-center gap-2 rounded-lg border border-red-300 px-3 font-medium text-red-600 transition hover:bg-red-50"
                                >
                                  <RotateCcw size={17} />
                                  Hủy đăng ký
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
                Hiển thị {filteredList.length} trên tổng số {danhSach.length}{" "}
                hoạt động.
              </div>
            </>
          )}
        </section>
      </div>

      {selectedItem && (
        <DetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {cancelItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertCircle size={25} />
              </div>

              <h2 className="text-xl font-bold text-slate-950">
                Xác nhận hủy đăng ký
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Bạn có chắc chắn muốn hủy đăng ký hoạt động{" "}
                <strong>
                  {cancelItem.hoatDong.maHoatDong} -{" "}
                  {cancelItem.hoatDong.tenHoatDong}
                </strong>{" "}
                không?
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setCancelItem(null)}
                disabled={cancelling}
                className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleCancelRegistration}
                disabled={cancelling}
                className="flex h-11 items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling && (
                  <Loader2 size={17} className="animate-spin" />
                )}
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      </div>

      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>
    </div>
  );
}

function DetailModal({
  item,
  onClose,
}: {
  item: DangKyHoatDong;
  onClose: () => void;
}) {
  const activity = item.hoatDong;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Chi tiết hoạt động
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {activity.maHoatDong} - {activity.tenHoatDong}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Đóng"
          >
            <X size={21} />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <InfoItem
            label="Tên hoạt động"
            value={activity.tenHoatDong}
          />

          <InfoItem
            label="Trạng thái hoạt động"
            value={getTrangThaiHoatDongLabel(activity.trangThai)}
          />

          <InfoItem
            label="Kết quả đăng ký"
            value={getTrangThaiDangKyLabel(item.trangThaiDangKy)}
          />

          <InfoItem
            label="Thời gian đăng ký"
            value={formatDateTime(item.thoiGianDangKy)}
          />

          <InfoItem
            label="Thời gian bắt đầu"
            value={formatDateTime(activity.thoiGianBatDau)}
          />

          <InfoItem
            label="Thời gian kết thúc"
            value={formatDateTime(activity.thoiGianKetThuc)}
          />

          <InfoItem
            label="Hạn đăng ký"
            value={formatDateTime(activity.hanDangKy)}
          />

          <InfoItem
            label="Số lượng tối đa"
            value={
              activity.soLuongToiDa
                ? `${activity.soLuongToiDa} người`
                : "Không giới hạn"
            }
          />

          <InfoItem
            label="Địa điểm"
            value={activity.diaDiem || "Chưa cập nhật"}
          />

          <InfoItem
            label="Đơn vị tổ chức"
            value={activity.donViToChuc || "Chưa cập nhật"}
          />

          <div className="md:col-span-2">
            <InfoItem
              label="Chi hội"
              value={
                activity.chiHoi
                  ? `${activity.chiHoi.maChiHoi || ""} - ${
                      activity.chiHoi.tenChiHoi || ""
                    }`
                  : "Toàn Liên Chi hội"
              }
            />
          </div>

          <div className="md:col-span-2">
            <InfoItem
              label="Mô tả"
              value={activity.moTa || "Không có mô tả"}
            />
          </div>

          <div className="md:col-span-2">
            <InfoItem
              label="Nội dung"
              value={activity.noiDung || "Không có nội dung"}
            />
          </div>

          {item.ghiChu && (
            <div className="md:col-span-2">
              <InfoItem label="Ghi chú" value={item.ghiChu} />
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg bg-[#123b68] px-6 text-sm font-semibold text-white hover:bg-[#0e3158]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}