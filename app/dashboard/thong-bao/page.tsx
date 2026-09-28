"use client";

import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  Megaphone,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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

type MucDoThongBao =
  | "THONG_THUONG"
  | "QUAN_TRONG"
  | "KHAN_CAP";

type PhamViThongBao =
  | "TAT_CA"
  | "CHI_HOI"
  | "VAI_TRO"
  | "CA_NHAN";

type TrangThaiThongBao =
  | "NHAP"
  | "DA_DANG"
  | "DA_AN";

interface TepDinhKem {
  tenTep: string;
  duongDan: string;
  loaiTep?: string;
  kichThuoc?: number;
}

interface ChiHoiOption {
  id: string;
  maChiHoi: string;
  tenChiHoi: string;
}

interface NguoiDungOption {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
}

interface ThongBao {
  id: string;
  _id?: string;
  tieuDe: string;
  noiDung: string;
  loaiThongBao: LoaiThongBao;
  mucDo: MucDoThongBao;
  phamVi: PhamViThongBao;
  chiHoiIds: string[];
  vaiTroNguoiNhan: UserRole[];
  nguoiNhanIds: string[];
  tepDinhKem: TepDinhKem[];
  ngayBatDau?: string;
  ngayKetThuc?: string;
  trangThai: TrangThaiThongBao;
  daDoc?: boolean;
  soLuotXem?: number;
  nguoiTao?: {
    id?: string;
    fullName?: string;
    username?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface ThongBaoFormData {
  tieuDe: string;
  noiDung: string;
  loaiThongBao: LoaiThongBao;
  mucDo: MucDoThongBao;
  phamVi: PhamViThongBao;
  chiHoiIds: string[];
  vaiTroNguoiNhan: UserRole[];
  nguoiNhanIds: string[];
  tepDinhKem: TepDinhKem[];
  ngayBatDau: string;
  ngayKetThuc: string;
  trangThai: TrangThaiThongBao;
}

interface ThongKe {
  tong: number;
  chuaDoc: number;
  quanTrong: number;
  khanCap: number;
}

const EMPTY_FORM: ThongBaoFormData = {
  tieuDe: "",
  noiDung: "",
  loaiThongBao: "THONG_BAO_CHUNG",
  mucDo: "THONG_THUONG",
  phamVi: "TAT_CA",
  chiHoiIds: [],
  vaiTroNguoiNhan: [],
  nguoiNhanIds: [],
  tepDinhKem: [],
  ngayBatDau: "",
  ngayKetThuc: "",
  trangThai: "DA_DANG",
};

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  BAN_CHAP_HANH: "Ban Chấp hành",
  CHI_HOI_TRUONG: "Chi hội trưởng",
  HOI_VIEN: "Hội viên",
};

const LOAI_LABEL: Record<LoaiThongBao, string> = {
  THONG_BAO_CHUNG: "Thông báo chung",
  HOAT_DONG: "Thông báo hoạt động",
  TAI_LIEU: "Tài liệu",
  KHAC: "Thông báo khác",
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_FILE_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png,.webp";

function getId(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const item = value as Record<string, unknown>;

    return String(item.id ?? item._id ?? "");
  }

  return String(value);
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Máy chủ trả về dữ liệu không hợp lệ",
    );
  }
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 16);
}

function formatDate(value?: string) {
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

function formatFileSize(size?: number) {
  if (!size || size <= 0) return "";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(
    1,
  )} MB`;
}

function normalizeThongBao(
  raw: Partial<ThongBao> & Pick<ThongBao, "tieuDe" | "noiDung">,
): ThongBao {
  return {
    ...raw,
    id: getId(raw.id ?? raw._id),

    chiHoiIds: (raw.chiHoiIds ?? []).map(
      getId,
    ),

    nguoiNhanIds: (
      raw.nguoiNhanIds ?? []
    ).map(getId),

    vaiTroNguoiNhan:
      raw.vaiTroNguoiNhan ?? [],

    tepDinhKem: raw.tepDinhKem ?? [],

    trangThai:
      raw.trangThai ?? "DA_DANG",

    mucDo:
      raw.mucDo ?? "THONG_THUONG",

    loaiThongBao:
      raw.loaiThongBao ??
      "THONG_BAO_CHUNG",

    phamVi: raw.phamVi ?? "TAT_CA",

    createdAt:
      raw.createdAt ??
      new Date().toISOString(),
  };
}

export default function ThongBaoPage() {
  const [userRole, setUserRole] =
    useState<UserRole>("HOI_VIEN");

  const [sessionLoaded, setSessionLoaded] =
    useState(false);

  const [thongBaoList, setThongBaoList] =
    useState<ThongBao[]>([]);

  const [chiHoiList, setChiHoiList] =
    useState<ChiHoiOption[]>([]);

  const [nguoiDungList, setNguoiDungList] =
    useState<NguoiDungOption[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  const [keyword, setKeyword] =
    useState("");

  const [loaiFilter, setLoaiFilter] =
    useState("");

  const [mucDoFilter, setMucDoFilter] =
    useState("");

  const [
    trangThaiFilter,
    setTrangThaiFilter,
  ] = useState("");

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] =
    useState(1);

  const [total, setTotal] = useState(0);

  const [thongKe, setThongKe] =
    useState<ThongKe>({
      tong: 0,
      chuaDoc: 0,
      quanTrong: 0,
      khanCap: 0,
    });

  const [showFormModal, setShowFormModal] =
    useState(false);

  const [
    editingThongBao,
    setEditingThongBao,
  ] = useState<ThongBao | null>(null);

  const [
    viewingThongBao,
    setViewingThongBao,
  ] = useState<ThongBao | null>(null);

  const [
    deletingThongBao,
    setDeletingThongBao,
  ] = useState<ThongBao | null>(null);

  const canManage = [
    "ADMIN",
    "BAN_CHAP_HANH",
    "CHI_HOI_TRUONG",
  ].includes(userRole);

  const loadSession = useCallback(
    async () => {
      try {
        const response = await fetch(
          "/api/auth/me",
          {
            cache: "no-store",
          },
        );

        const result =
          await parseResponse(response);

        const role =
          result?.user?.role ??
          result?.data?.user?.role ??
          result?.data?.role;

        if (role) {
          setUserRole(role as UserRole);
        }
      } catch {
        // DashboardShell xử lý đăng nhập.
      } finally {
        setSessionLoaded(true);
      }
    },
    [],
  );

  const loadRecipients = useCallback(
    async () => {
      if (!canManage) return;

      try {
        const response = await fetch(
          "/api/thong-bao/nguoi-nhan",
          {
            cache: "no-store",
          },
        );

        const result =
          await parseResponse(response);

        if (
          !response.ok ||
          result.success === false
        ) {
          return;
        }

        const data = result.data ?? result;

        const rawChiHoi =
          data.chiHoi ??
          data.danhSachChiHoi ??
          [];

        const rawNguoiDung =
          data.nguoiDung ??
          data.danhSachNguoiDung ??
          [];

        setChiHoiList(
          rawChiHoi.map(
            (item: Partial<ChiHoiOption> & { _id?: string }) => ({
              id: getId(item),
              maChiHoi:
                item.maChiHoi ?? "",
              tenChiHoi:
                item.tenChiHoi ?? "",
            }),
          ),
        );

        setNguoiDungList(
          rawNguoiDung.map(
            (item: Partial<NguoiDungOption> & { _id?: string; hoTen?: string; role: UserRole }) => ({
              id: getId(item),

              username:
                item.username ?? "",

              fullName:
                item.fullName ??
                item.hoTen ??
                item.username ??
                "",

              role: item.role,
            }),
          ),
        );
      } catch {
        // API tạo thông báo tiếp tục kiểm tra.
      }
    },
    [canManage],
  );

  const loadThongBao = useCallback(
    async () => {
      if (!sessionLoaded) return;

      setLoading(true);
      setError("");

      try {
        const params =
          new URLSearchParams({
            page: String(page),
            limit: "10",
          });

        if (canManage) {
          params.set("mode", "quan-ly");
        }

        if (keyword.trim()) {
          params.set(
            "search",
            keyword.trim(),
          );
        }

        if (loaiFilter) {
          params.set(
            "loaiThongBao",
            loaiFilter,
          );
        }

        if (mucDoFilter) {
          params.set(
            "mucDo",
            mucDoFilter,
          );
        }

        if (trangThaiFilter) {
          params.set(
            "trangThai",
            trangThaiFilter,
          );
        }

        const response = await fetch(
          `/api/thong-bao?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

        const result =
          await parseResponse(response);

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
              "Không thể tải thông báo",
          );
        }

        const data = result.data ?? result;

        const rawList =
          data.danhSach ??
          data.items ??
          data.thongBao ??
          [];

        const pagination =
          data.phanTrang ??
          data.pagination ??
          {};

        const rawThongKe =
          data.thongKe ?? {};

        const normalized: ThongBao[] =
          rawList.map(normalizeThongBao);

        setThongBaoList(normalized);

        setTotal(
          Number(
            pagination.total ??
              data.total ??
              normalized.length,
          ),
        );

        setTotalPages(
          Math.max(
            1,
            Number(
              pagination.totalPages ??
                data.totalPages ??
                1,
            ),
          ),
        );

        setThongKe({
          tong: Number(
            rawThongKe.tong ??
              rawThongKe.tongThongBao ??
              data.total ??
              normalized.length,
          ),

          chuaDoc: Number(
            rawThongKe.chuaDoc ??
              rawThongKe.soChuaDoc ??
              normalized.filter(
                (item) => !item.daDoc,
              ).length,
          ),

          quanTrong: Number(
            rawThongKe.quanTrong ??
              normalized.filter(
                (item) =>
                  item.mucDo ===
                  "QUAN_TRONG",
              ).length,
          ),

          khanCap: Number(
            rawThongKe.khanCap ??
              normalized.filter(
                (item) =>
                  item.mucDo ===
                  "KHAN_CAP",
              ).length,
          ),
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Đã xảy ra lỗi khi tải thông báo",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      sessionLoaded,
      canManage,
      page,
      keyword,
      loaiFilter,
      mucDoFilter,
      trangThaiFilter,
    ],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the request and its loading state together when effect dependencies change.
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the request and its loading state together when effect dependencies change.
    void loadThongBao();
  }, [loadThongBao]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the request and its loading state together when effect dependencies change.
    void loadRecipients();
  }, [loadRecipients]);

  const openCreateModal = () => {
    setEditingThongBao(null);
    setShowFormModal(true);
    setError("");
    setSuccess("");
  };

  const openEditModal = (
    item: ThongBao,
  ) => {
    setEditingThongBao(item);
    setShowFormModal(true);
    setError("");
    setSuccess("");
  };

  const closeFormModal = () => {
    if (saving) return;

    setShowFormModal(false);
    setEditingThongBao(null);
  };

  const handleViewDetail = async (
    item: ThongBao,
  ) => {
    setError("");

    try {
      const response = await fetch(
        `/api/thong-bao/${item.id}`,
        {
          cache: "no-store",
        },
      );

      const result =
        await parseResponse(response);

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
            "Không thể xem thông báo",
        );
      }

      const rawDetail =
        result.data?.thongBao ??
        result.data ??
        result;

      const detail =
        normalizeThongBao(rawDetail);

      setViewingThongBao(detail);

      setThongBaoList((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? {
                ...notification,
                daDoc: true,
              }
            : notification,
        ),
      );

      if (!item.daDoc && !canManage) {
        setThongKe((current) => ({
          ...current,

          chuaDoc: Math.max(
            0,
            current.chuaDoc - 1,
          ),
        }));
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể xem thông báo",
      );
    }
  };

  const handleSaveThongBao = async (
    form: ThongBaoFormData,
  ) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const isEditing =
        Boolean(editingThongBao);

      const url = editingThongBao
        ? `/api/thong-bao/${editingThongBao.id}`
        : "/api/thong-bao";

      const response = await fetch(url, {
        method: editingThongBao
          ? "PUT"
          : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...form,

          ngayBatDau: form.ngayBatDau
            ? new Date(
                form.ngayBatDau,
              ).toISOString()
            : null,

          ngayKetThuc: form.ngayKetThuc
            ? new Date(
                form.ngayKetThuc,
              ).toISOString()
            : null,
        }),
      });

      const result =
        await parseResponse(response);

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
            "Không thể lưu thông báo",
        );
      }

      setShowFormModal(false);
      setEditingThongBao(null);

      setSuccess(
        isEditing
          ? "Cập nhật thông báo thành công"
          : "Tạo thông báo thành công",
      );

      await loadThongBao();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingThongBao) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/thong-bao/${deletingThongBao.id}`,
        {
          method: "DELETE",
        },
      );

      const result =
        await parseResponse(response);

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
            "Không thể xóa thông báo",
        );
      }

      setDeletingThongBao(null);

      setSuccess(
        "Xóa thông báo thành công",
      );

      if (
        thongBaoList.length === 1 &&
        page > 1
      ) {
        setPage(
          (current) => current - 1,
        );
      } else {
        await loadThongBao();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể xóa thông báo",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadItems =
      thongBaoList.filter(
        (item) => !item.daDoc,
      );

    if (unreadItems.length === 0) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await Promise.all(
        unreadItems.map(async (item) => {
          const response = await fetch(
            `/api/thong-bao/${item.id}/da-doc`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                daDoc: true,
              }),
            },
          );

          if (!response.ok) {
            throw new Error(
              "Không thể đánh dấu đã đọc",
            );
          }
        }),
      );

      setThongBaoList((current) =>
        current.map((item) => ({
          ...item,
          daDoc: true,
        })),
      );

      setThongKe((current) => ({
        ...current,
        chuaDoc: 0,
      }));

      setSuccess(
        "Đã đánh dấu tất cả thông báo là đã đọc",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể cập nhật thông báo",
      );
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setKeyword("");
    setLoaiFilter("");
    setMucDoFilter("");
    setTrangThaiFilter("");
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1540px]">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#123b68]">
              Quản trị hệ thống
            </p>

            <h1 className="text-3xl font-bold text-slate-950">
              Thông báo và tài liệu
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Theo dõi thông báo, đối tượng
              nhận và tài liệu đính kèm.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!canManage && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={
                  saving ||
                  thongKe.chuaDoc === 0
                }
                className="notification-secondary-button"
              >
                <CheckCheck size={18} />
                Đánh dấu đã đọc
              </button>
            )}

            {canManage && (
              <button
                type="button"
                onClick={openCreateModal}
                className="notification-primary-button"
              >
                <Plus size={19} />
                Tạo thông báo
              </button>
            )}
          </div>
        </div>

        {error && (
          <Notice
            type="error"
            text={error}
            onClose={() => setError("")}
          />
        )}

        {success && (
          <Notice
            type="success"
            text={success}
            onClose={() => setSuccess("")}
          />
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatisticCard
            title="Tổng thông báo"
            value={thongKe.tong}
            icon={<Bell />}
            color="blue"
          />

          <StatisticCard
            title="Chưa đọc"
            value={thongKe.chuaDoc}
            icon={<FileText />}
            color="amber"
          />

          <StatisticCard
            title="Quan trọng"
            value={thongKe.quanTrong}
            icon={<Megaphone />}
            color="emerald"
          />

          <StatisticCard
            title="Khẩn cấp"
            value={thongKe.khanCap}
            icon={<AlertCircle />}
            color="red"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_220px_190px_190px_130px]">
            <div className="relative">
              <Search
                size={19}
                className="absolute  top-1/2 -translate-y-1/2 text-slate-400 "
              />

              <input
                value={keyword}
                onChange={(event) => {
                  setKeyword(
                    event.target.value,
                  );

                  setPage(1);
                }}
                placeholder="Tìm theo tiêu đề hoặc nội dung"
                className="notification-control pl-10 ml-2 "
              />
            </div>

            <select
              value={loaiFilter}
              onChange={(event) => {
                setLoaiFilter(
                  event.target.value,
                );

                setPage(1);
              }}
              className="notification-control"
            >
              <option value="">
                Tất cả loại
              </option>

              {Object.entries(
                LOAI_LABEL,
              ).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ))}
            </select>

            <select
              value={mucDoFilter}
              onChange={(event) => {
                setMucDoFilter(
                  event.target.value,
                );

                setPage(1);
              }}
              className="notification-control"
            >
              <option value="">
                Tất cả mức độ
              </option>

              <option value="THONG_THUONG">
                Thông thường
              </option>

              <option value="QUAN_TRONG">
                Quan trọng
              </option>

              <option value="KHAN_CAP">
                Khẩn cấp
              </option>
            </select>

            {canManage ? (
              <select
                value={trangThaiFilter}
                onChange={(event) => {
                  setTrangThaiFilter(
                    event.target.value,
                  );

                  setPage(1);
                }}
                className="notification-control"
              >
                <option value="">
                  Tất cả trạng thái
                </option>

                <option value="NHAP">
                  Bản nháp
                </option>

                <option value="DA_DANG">
                  Đã đăng
                </option>

                <option value="DA_AN">
                  Đã ẩn
                </option>
              </select>
            ) : (
              <div className="hidden lg:block" />
            )}

            <button
              type="button"
              onClick={resetFilters}
              className="notification-secondary-button justify-center"
            >
              <RefreshCw size={17} />
              Làm mới
            </button>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2
                size={34}
                className="animate-spin text-[#123b68]"
              />
            </div>
          ) : thongBaoList.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center text-center">
              <Bell
                size={42}
                className="text-slate-300"
              />

              <p className="mt-4 font-semibold text-slate-700">
                Chưa có thông báo phù hợp
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Hãy thay đổi bộ lọc hoặc tạo
                thông báo mới.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {thongBaoList.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  canManage={canManage}
                  onView={() =>
                    void handleViewDetail(item)
                  }
                  onEdit={() =>
                    openEditModal(item)
                  }
                  onDelete={() =>
                    setDeletingThongBao(item)
                  }
                />
              ))}
            </div>
          )}

          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row">
            <p className="text-sm text-slate-500">
              Tổng cộng {total} thông báo
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage(
                    (current) => current - 1,
                  )
                }
                className="notification-page-button"
              >
                <ChevronLeft size={17} />
              </button>

              <span className="px-2 text-sm text-slate-600">
                Trang {page}/{totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage(
                    (current) => current + 1,
                  )
                }
                className="notification-page-button"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </div>

      <ThongBaoFormModal
        open={showFormModal}
        initialData={editingThongBao}
        chiHoiList={chiHoiList}
        nguoiDungList={nguoiDungList}
        saving={saving}
        onClose={closeFormModal}
        onSubmit={handleSaveThongBao}
      />

      <DetailModal
        item={viewingThongBao}
        onClose={() =>
          setViewingThongBao(null)
        }
      />

      <ConfirmModal
        open={Boolean(deletingThongBao)}
        loading={saving}
        title="Xóa thông báo"
        message={`Bạn có chắc muốn xóa thông báo “${
          deletingThongBao?.tieuDe ?? ""
        }”?`}
        onClose={() =>
          setDeletingThongBao(null)
        }
        onConfirm={handleDelete}
      />

      <style jsx global>{`
        .notification-control {
          height: 46px;
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          background: #ffffff;
          padding: 0 14px;
          font-size: 14px;
          color: #1e293b;
          outline: none;
          transition: 0.15s;
        }

        .notification-control:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px #dbeafe;
        }

        .notification-primary-button,
        .notification-secondary-button {
          height: 44px;
          border-radius: 11px;
          padding: 0 17px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          transition: 0.15s;
        }

        .notification-primary-button {
          background: #123b68;
          color: #ffffff;
        }

        .notification-primary-button:hover {
          background: #0d3158;
        }

        .notification-secondary-button {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
        }

        .notification-secondary-button:hover {
          background: #f8fafc;
        }

        .notification-primary-button:disabled,
        .notification-secondary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .notification-page-button {
          width: 36px;
          height: 36px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          display: grid;
          place-items: center;
          background: #ffffff;
        }

        .notification-page-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  );
}

function Notice({
  type,
  text,
  onClose,
}: {
  type: "error" | "success";
  text: string;
  onClose: () => void;
}) {
  const colorClass =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div
      className={`mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${colorClass}`}
    >
      {type === "error" ? (
        <AlertCircle size={18} />
      ) : (
        <Check size={18} />
      )}

      <span className="flex-1">
        {text}
      </span>

      <button
        type="button"
        onClick={onClose}
      >
        <X size={17} />
      </button>
    </div>
  );
}

function StatisticCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  color:
    | "blue"
    | "amber"
    | "emerald"
    | "red";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-600",
    emerald:
      "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="flex min-h-28 items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-slate-600">
          {title}
        </p>

        <strong className="mt-2 block text-2xl text-slate-950">
          {value}
        </strong>
      </div>

      <div
        className={`grid h-12 w-12 place-items-center rounded-xl ${colorClasses[color]}`}
      >
        {icon}
      </div>
    </div>
  );
}

function NotificationBadge({
  item,
}: {
  item: ThongBao;
}) {
  let colorClass =
    "border-blue-200 bg-blue-50 text-blue-700";

  let label = "Thông thường";

  if (item.mucDo === "QUAN_TRONG") {
    colorClass =
      "border-amber-200 bg-amber-50 text-amber-700";

    label = "Quan trọng";
  }

  if (item.mucDo === "KHAN_CAP") {
    colorClass =
      "border-red-200 bg-red-50 text-red-700";

    label = "Khẩn cấp";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
}

function NotificationRow({
  item,
  canManage,
  onView,
  onEdit,
  onDelete,
}: {
  item: ThongBao;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`grid gap-4 px-5 py-4 transition hover:bg-slate-50 lg:grid-cols-[52px_1fr_150px_170px_auto] lg:items-center ${
        !item.daDoc && !canManage
          ? "bg-blue-50/40"
          : ""
      }`}
    >
      <div
        className={`grid h-11 w-11 place-items-center rounded-xl ${
          item.mucDo === "KHAN_CAP"
            ? "bg-red-50 text-red-600"
            : "bg-blue-50 text-blue-700"
        }`}
      >
        <Bell size={20} />
      </div>

      <button
        type="button"
        onClick={onView}
        className="min-w-0 text-left"
      >
        <div className="flex items-center gap-2">
          <h3
            className={`truncate text-[15px] text-slate-900 ${
              !item.daDoc
                ? "font-bold"
                : "font-semibold"
            }`}
          >
            {item.tieuDe}
          </h3>

          {!item.daDoc && !canManage && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
          )}
        </div>

        <p className="mt-1 line-clamp-1 text-sm text-slate-500">
          {item.noiDung}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span>
            {LOAI_LABEL[item.loaiThongBao]}
          </span>

          {item.tepDinhKem.length >
            0 && (
            <span className="flex items-center gap-1">
              <Paperclip size={13} />
              {item.tepDinhKem.length} tệp
            </span>
          )}
        </div>
      </button>

      <div>
        <NotificationBadge item={item} />
      </div>

      <div className="text-sm text-slate-500">
        <p>{formatDate(item.createdAt)}</p>

        {canManage && (
          <p className="mt-1 text-xs">
            {item.soLuotXem ?? 0} lượt xem
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <ActionButton
          title="Xem thông báo"
          onClick={onView}
        >
          <Eye size={18} />
        </ActionButton>

        {canManage && (
          <>
            <ActionButton
              title="Sửa thông báo"
              onClick={onEdit}
              className="text-blue-700"
            >
              <Pencil size={18} />
            </ActionButton>

            <ActionButton
              title="Xóa thông báo"
              onClick={onDelete}
              className="border-red-200 text-red-600"
            >
              <Trash2 size={18} />
            </ActionButton>
          </>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  title,
  onClick,
  children,
  className = "",
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`grid h-[38px] w-[38px] place-items-center rounded-lg border border-slate-300 bg-white transition hover:bg-slate-50 ${className}`}
    >
      {children}
    </button>
  );
}

function ThongBaoFormModal({
  open,
  initialData,
  chiHoiList,
  nguoiDungList,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialData: ThongBao | null;
  chiHoiList: ChiHoiOption[];
  nguoiDungList: NguoiDungOption[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (
    form: ThongBaoFormData,
  ) => Promise<void>;
}) {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [form, setForm] =
    useState<ThongBaoFormData>({
      ...EMPTY_FORM,
    });

  const [uploading, setUploading] =
    useState(false);

  const [localError, setLocalError] =
    useState("");

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset editable modal state when the selected record or open state changes.
      setForm({
        tieuDe: initialData.tieuDe,

        noiDung: initialData.noiDung,

        loaiThongBao:
          initialData.loaiThongBao,

        mucDo: initialData.mucDo,

        phamVi: initialData.phamVi,

        chiHoiIds:
          initialData.chiHoiIds,

        vaiTroNguoiNhan:
          initialData.vaiTroNguoiNhan,

        nguoiNhanIds:
          initialData.nguoiNhanIds,

        tepDinhKem:
          initialData.tepDinhKem,

        ngayBatDau: toDateTimeLocal(
          initialData.ngayBatDau,
        ),

        ngayKetThuc: toDateTimeLocal(
          initialData.ngayKetThuc,
        ),

        trangThai:
          initialData.trangThai,
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        chiHoiIds: [],
        vaiTroNguoiNhan: [],
        nguoiNhanIds: [],
        tepDinhKem: [],
      });
    }

    setLocalError("");
    setUploading(false);
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape" &&
        !saving &&
        !uploading
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, saving, uploading, onClose]);

  if (!open) return null;

  const setField = <
    K extends keyof ThongBaoFormData,
  >(
    field: K,
    value: ThongBaoFormData[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setLocalError("");
  };

  const toggleValue = <T extends string>(
    values: T[],
    value: T,
  ) => {
    if (values.includes(value)) {
      return values.filter(
        (item) => item !== value,
      );
    }

    return [...values, value];
  };

  const handleScopeChange = (
    value: PhamViThongBao,
  ) => {
    setForm((current) => ({
      ...current,

      phamVi: value,

      chiHoiIds:
        value === "CHI_HOI"
          ? current.chiHoiIds
          : [],

      vaiTroNguoiNhan:
        value === "VAI_TRO"
          ? current.vaiTroNguoiNhan
          : [],

      nguoiNhanIds:
        value === "CA_NHAN"
          ? current.nguoiNhanIds
          : [],
    }));

    setLocalError("");
  };

  const handleChooseFiles = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFiles = Array.from(
      event.target.files ?? [],
    );

    event.target.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    const remainingFiles =
      MAX_FILES -
      form.tepDinhKem.length;

    if (remainingFiles <= 0) {
      setLocalError(
        `Chỉ được đính kèm tối đa ${MAX_FILES} tệp`,
      );

      return;
    }

    if (
      selectedFiles.length >
      remainingFiles
    ) {
      setLocalError(
        `Bạn chỉ có thể chọn thêm ${remainingFiles} tệp`,
      );

      return;
    }

    const oversizedFile =
      selectedFiles.find(
        (file) =>
          file.size > MAX_FILE_SIZE,
      );

    if (oversizedFile) {
      setLocalError(
        `Tệp “${oversizedFile.name}” vượt quá dung lượng 10 MB`,
      );

      return;
    }

    setUploading(true);
    setLocalError("");

    try {
      const uploadData =
        new globalThis.FormData();

      selectedFiles.forEach((file) => {
        uploadData.append("files", file);
      });

      const response = await fetch(
        "/api/thong-bao/upload",
        {
          method: "POST",
          body: uploadData,
        },
      );

      const result =
        await parseResponse(response);

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
            "Không thể tải tài liệu lên",
        );
      }

      const uploadedFiles =
        result?.data?.files ??
        result?.files ??
        result?.data ??
        [];

      if (
        !Array.isArray(uploadedFiles) ||
        uploadedFiles.length === 0
      ) {
        throw new Error(
          "Máy chủ không trả về thông tin tệp đã tải lên",
        );
      }

      setForm((current) => ({
        ...current,

        tepDinhKem: [
          ...current.tepDinhKem,
          ...uploadedFiles,
        ].slice(0, MAX_FILES),
      }));
    } catch (uploadError) {
      setLocalError(
        uploadError instanceof Error
          ? uploadError.message
          : "Không thể tải tài liệu lên",
      );
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (
    attachmentIndex: number,
  ) => {
    if (saving || uploading) return;

    setForm((current) => ({
      ...current,

      tepDinhKem:
        current.tepDinhKem.filter(
          (_, index) =>
            index !== attachmentIndex,
        ),
    }));

    setLocalError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!form.tieuDe.trim()) {
      setLocalError(
        "Vui lòng nhập tiêu đề thông báo",
      );

      return;
    }

    if (!form.noiDung.trim()) {
      setLocalError(
        "Vui lòng nhập nội dung thông báo",
      );

      return;
    }

    if (
      form.phamVi === "CHI_HOI" &&
      form.chiHoiIds.length === 0
    ) {
      setLocalError(
        "Vui lòng chọn ít nhất một Chi hội",
      );

      return;
    }

    if (
      form.phamVi === "VAI_TRO" &&
      form.vaiTroNguoiNhan.length === 0
    ) {
      setLocalError(
        "Vui lòng chọn ít nhất một vai trò",
      );

      return;
    }

    if (
      form.phamVi === "CA_NHAN" &&
      form.nguoiNhanIds.length === 0
    ) {
      setLocalError(
        "Vui lòng chọn ít nhất một người nhận",
      );

      return;
    }

    if (
      form.ngayBatDau &&
      form.ngayKetThuc &&
      new Date(form.ngayKetThuc) <=
        new Date(form.ngayBatDau)
    ) {
      setLocalError(
        "Thời gian kết thúc phải sau thời gian bắt đầu",
      );

      return;
    }

    if (uploading) {
      setLocalError(
        "Vui lòng chờ tải tài liệu hoàn tất",
      );

      return;
    }

    try {
      await onSubmit({
        ...form,
        tieuDe: form.tieuDe.trim(),
        noiDung: form.noiDung.trim(),
      });
    } catch (submitError) {
      setLocalError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể lưu thông báo",
      );
    }
  };

  const disabled =
    saving || uploading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !disabled
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <Bell size={22} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {initialData
                  ? "Cập nhật thông báo"
                  : "Tạo thông báo"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Nhập nội dung, chọn người nhận
                và tài liệu đính kèm.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            <X size={21} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {localError && (
              <Notice
                type="error"
                text={localError}
                onClose={() =>
                  setLocalError("")
                }
              />
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
                label="Tiêu đề thông báo"
                required
                wide
              >
                <input
                  value={form.tieuDe}
                  onChange={(event) =>
                    setField(
                      "tieuDe",
                      event.target.value,
                    )
                  }
                  maxLength={250}
                  disabled={saving}
                  placeholder="Nhập tiêu đề thông báo"
                  className="notification-control"
                />
              </FormField>

              <FormField label="Loại thông báo">
                <select
                  value={form.loaiThongBao}
                  onChange={(event) =>
                    setField(
                      "loaiThongBao",

                      event.target
                        .value as LoaiThongBao,
                    )
                  }
                  disabled={saving}
                  className="notification-control"
                >
                  <option value="THONG_BAO_CHUNG">
                    Thông báo chung
                  </option>

                  <option value="HOAT_DONG">
                    Thông báo hoạt động
                  </option>

                  <option value="TAI_LIEU">
                    Tài liệu
                  </option>

                  <option value="KHAC">
                    Thông báo khác
                  </option>
                </select>
              </FormField>

              <FormField label="Mức độ">
                <select
                  value={form.mucDo}
                  onChange={(event) =>
                    setField(
                      "mucDo",

                      event.target
                        .value as MucDoThongBao,
                    )
                  }
                  disabled={saving}
                  className="notification-control"
                >
                  <option value="THONG_THUONG">
                    Thông thường
                  </option>

                  <option value="QUAN_TRONG">
                    Quan trọng
                  </option>

                  <option value="KHAN_CAP">
                    Khẩn cấp
                  </option>
                </select>
              </FormField>

              <FormField
                label="Nội dung"
                required
                wide
              >
                <textarea
                  value={form.noiDung}
                  onChange={(event) =>
                    setField(
                      "noiDung",
                      event.target.value,
                    )
                  }
                  rows={7}
                  disabled={saving}
                  placeholder="Nhập nội dung thông báo"
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </FormField>
            </div>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                Phạm vi nhận thông báo
              </h3>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <ScopeButton
                  selected={
                    form.phamVi === "TAT_CA"
                  }
                  label="Tất cả"
                  description="Gửi toàn hệ thống"
                  onClick={() =>
                    handleScopeChange("TAT_CA")
                  }
                />

                <ScopeButton
                  selected={
                    form.phamVi === "CHI_HOI"
                  }
                  label="Theo Chi hội"
                  description="Chọn một hoặc nhiều Chi hội"
                  onClick={() =>
                    handleScopeChange("CHI_HOI")
                  }
                />

                <ScopeButton
                  selected={
                    form.phamVi === "VAI_TRO"
                  }
                  label="Theo vai trò"
                  description="Chọn nhóm quyền nhận"
                  onClick={() =>
                    handleScopeChange("VAI_TRO")
                  }
                />

                <ScopeButton
                  selected={
                    form.phamVi === "CA_NHAN"
                  }
                  label="Cá nhân"
                  description="Chọn người nhận cụ thể"
                  onClick={() =>
                    handleScopeChange("CA_NHAN")
                  }
                />
              </div>

              {form.phamVi ===
                "CHI_HOI" && (
                <ChoiceBox>
                  {chiHoiList.length ===
                  0 ? (
                    <p className="col-span-2 text-sm text-slate-500">
                      Chưa có dữ liệu Chi hội.
                    </p>
                  ) : (
                    chiHoiList.map(
                      (chiHoi) => (
                        <CheckOption
                          key={chiHoi.id}
                          checked={form.chiHoiIds.includes(
                            chiHoi.id,
                          )}
                          label={`${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`}
                          onChange={() =>
                            setField(
                              "chiHoiIds",

                              toggleValue(
                                form.chiHoiIds,
                                chiHoi.id,
                              ),
                            )
                          }
                        />
                      ),
                    )
                  )}
                </ChoiceBox>
              )}

              {form.phamVi ===
                "VAI_TRO" && (
                <ChoiceBox>
                  {(
                    Object.keys(
                      ROLE_LABEL,
                    ) as UserRole[]
                  ).map((role) => (
                    <CheckOption
                      key={role}
                      checked={form.vaiTroNguoiNhan.includes(
                        role,
                      )}
                      label={
                        ROLE_LABEL[role]
                      }
                      onChange={() =>
                        setField(
                          "vaiTroNguoiNhan",

                          toggleValue(
                            form.vaiTroNguoiNhan,
                            role,
                          ),
                        )
                      }
                    />
                  ))}
                </ChoiceBox>
              )}

              {form.phamVi ===
                "CA_NHAN" && (
                <ChoiceBox>
                  {nguoiDungList.length ===
                  0 ? (
                    <p className="col-span-2 text-sm text-slate-500">
                      Chưa có dữ liệu người
                      dùng.
                    </p>
                  ) : (
                    nguoiDungList.map(
                      (user) => (
                        <CheckOption
                          key={user.id}
                          checked={form.nguoiNhanIds.includes(
                            user.id,
                          )}
                          label={`${user.fullName} (${user.username})`}
                          onChange={() =>
                            setField(
                              "nguoiNhanIds",

                              toggleValue(
                                form.nguoiNhanIds,
                                user.id,
                              ),
                            )
                          }
                        />
                      ),
                    )
                  )}
                </ChoiceBox>
              )}
            </section>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <FormField label="Bắt đầu hiển thị">
                <input
                  type="datetime-local"
                  value={form.ngayBatDau}
                  onChange={(event) =>
                    setField(
                      "ngayBatDau",
                      event.target.value,
                    )
                  }
                  disabled={saving}
                  className="notification-control"
                />
              </FormField>

              <FormField label="Kết thúc hiển thị">
                <input
                  type="datetime-local"
                  value={form.ngayKetThuc}
                  min={
                    form.ngayBatDau ||
                    undefined
                  }
                  onChange={(event) =>
                    setField(
                      "ngayKetThuc",
                      event.target.value,
                    )
                  }
                  disabled={saving}
                  className="notification-control"
                />
              </FormField>

              <FormField label="Trạng thái">
                <select
                  value={form.trangThai}
                  onChange={(event) =>
                    setField(
                      "trangThai",

                      event.target
                        .value as TrangThaiThongBao,
                    )
                  }
                  disabled={saving}
                  className="notification-control"
                >
                  <option value="DA_DANG">
                    Đăng thông báo
                  </option>

                  <option value="NHAP">
                    Lưu bản nháp
                  </option>

                  <option value="DA_AN">
                    Ẩn thông báo
                  </option>
                </select>
              </FormField>
            </div>

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Tài liệu đính kèm
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Tối đa 5 tệp, mỗi tệp
                    không vượt quá 10 MB.
                  </p>
                </div>

                <span className="text-xs font-medium text-slate-500">
                  {form.tepDinhKem.length}/
                  {MAX_FILES}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleChooseFiles}
                className="hidden"
              />

              <button
                type="button"
                disabled={
                  disabled ||
                  form.tepDinhKem.length >=
                    MAX_FILES
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-7 text-center transition hover:border-blue-500 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2
                      size={28}
                      className="animate-spin text-blue-700"
                    />

                    <span className="mt-3 text-sm font-semibold text-blue-700">
                      Đang tải tài liệu...
                    </span>
                  </>
                ) : (
                  <>
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-blue-100 text-blue-700">
                      <Upload size={21} />
                    </div>

                    <span className="mt-3 text-sm font-semibold text-slate-800">
                      Nhấn vào đây để chọn tài
                      liệu
                    </span>

                    <span className="mt-1 text-xs text-slate-500">
                      Không cần nhập tên tệp
                      hoặc đường dẫn thủ công
                    </span>
                  </>
                )}
              </button>

              {form.tepDinhKem.length >
                0 && (
                <div className="mt-4 space-y-2">
                  {form.tepDinhKem.map(
                    (file, index) => (
                      <div
                        key={`${file.duongDan}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                          <FileText
                            size={20}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {file.tenTep}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatFileSize(
                              file.kichThuoc,
                            )}
                          </p>
                        </div>

                        <a
                          href={file.duongDan}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                        >
                          Xem
                        </a>

                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            removeAttachment(
                              index,
                            )
                          }
                          className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2
                            size={17}
                          />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4">
            <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
              <Paperclip size={15} />

              <span>
                {form.tepDinhKem.length > 0
                  ? `Đã đính kèm ${form.tepDinhKem.length} tệp`
                  : "Chưa có tài liệu đính kèm"}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                disabled={disabled}
                onClick={onClose}
                className="notification-secondary-button"
              >
                Đóng
              </button>

              <button
                type="submit"
                disabled={disabled}
                className="notification-primary-button min-w-36 justify-center"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Send size={18} />

                    {initialData
                      ? "Lưu thay đổi"
                      : "Tạo thông báo"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  required = false,
  wide = false,
  children,
}: {
  label: string;
  required?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={
        wide ? "md:col-span-2" : ""
      }
    >
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

function ScopeButton({
  selected,
  label,
  description,
  onClick,
}: {
  selected: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition ${
        selected
          ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
          : "border-slate-200 bg-white hover:border-blue-300"
      }`}
    >
      <span
        className={`block text-sm font-semibold ${
          selected
            ? "text-blue-700"
            : "text-slate-800"
        }`}
      >
        {label}
      </span>

      <span className="mt-1 block text-xs text-slate-500">
        {description}
      </span>
    </button>
  );
}

function ChoiceBox({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mt-4 grid max-h-52 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-4 md:grid-cols-2">
      {children}
    </div>
  );
}

function CheckOption({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-blue-700"
      />

      <span className="text-sm text-slate-700">
        {label}
      </span>
    </label>
  );
}

function DetailModal({
  item,
  onClose,
}: {
  item: ThongBao | null;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div className="pr-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <NotificationBadge item={item} />

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {LOAI_LABEL[
                  item.loaiThongBao
                ] ?? "Thông báo"}
              </span>
            </div>

            <h2 className="text-2xl font-bold text-slate-950">
              {item.tieuDe}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Đăng lúc{" "}
              {formatDate(item.createdAt)}

              {item.nguoiTao?.fullName
                ? ` bởi ${item.nguoiTao.fullName}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X />
          </button>
        </div>

        <div className="p-6">
          <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
            {item.noiDung}
          </div>

          {item.tepDinhKem.length >
            0 && (
            <div className="mt-7">
              <h3 className="mb-3 font-semibold text-slate-900">
                Tài liệu đính kèm
              </h3>

              <div className="space-y-2">
                {item.tepDinhKem.map(
                  (file, index) => (
                    <a
                      key={`${file.duongDan}-${index}`}
                      href={file.duongDan}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
                    >
                      <FileText className="shrink-0 text-blue-700" />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {file.tenTep}
                        </p>

                        <p className="text-xs text-slate-500">
                          {formatFileSize(
                            file.kichThuoc,
                          )}
                        </p>
                      </div>
                    </a>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="notification-primary-button"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  open,
  loading,
  title,
  message,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
          <Trash2 />
        </div>

        <h3 className="mt-4 text-xl font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {message}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="notification-secondary-button"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading && (
              <Loader2
                size={17}
                className="animate-spin"
              />
            )}

            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}