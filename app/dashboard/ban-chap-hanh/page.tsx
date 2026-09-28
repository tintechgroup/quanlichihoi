"use client";

import {
  Award,
  CheckCircle2,
  Edit3,
  Eye,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  FormEvent,
  ReactNode,
} from "react";

import CapTaiKhoanBanChapHanhModal from "@/components/ban-chap-hanh/CapTaiKhoanBanChapHanhModal";
import DanhGiaBanChapHanhModal from "@/components/ban-chap-hanh/DanhGiaBanChapHanhModal";
import DatLaiMatKhauBanChapHanhModal from "@/components/ban-chap-hanh/DatLaiMatKhauBanChapHanhModal";

type ChiHoi = {
  _id: string;
  maChiHoi: string;
  tenChiHoi: string;
};

type TaiKhoan = {
  _id: string;
  username: string;
  role?: string;
  isActive?: boolean;
};

type HoiVien = {
  _id: string;
  maHoiVien: string;
  hoTen: string;
  chiHoiId: ChiHoi | string;
  taiKhoanId?: TaiKhoan | string | null;
  trangThai: string;
};

type DanhGia = {
  _id?: string;
  xepLoai: string;
  nhanXet?: string;
};

type BanChapHanh = {
  _id: string;
  maBanChapHanh: string;
  hoiVienId: HoiVien | string;
  chiHoiId: ChiHoi | string;
  taiKhoanId?: TaiKhoan | string | null;
  chucVu: string;
  nhiemKy: string;
  ngayBatDau: string;
  ngayKetThuc?: string | null;
  trangThai: "DANG_DUONG_NHIEM" | "DA_KET_THUC";
  danhGia?: DanhGia | null;
  createdAt?: string;
  updatedAt?: string;
};

type FormData = {
  maBanChapHanh: string;
  hoiVienId: string;
  chiHoiId: string;
  chucVu: string;
  nhiemKy: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  trangThai: "DANG_DUONG_NHIEM" | "DA_KET_THUC";
};

type ListProps = {
  items: BanChapHanh[];
  onView: (item: BanChapHanh) => void;
  onEdit: (item: BanChapHanh) => void;
  onEvaluate: (item: BanChapHanh) => void;
  onAccount: (item: BanChapHanh) => void;
  onResetPassword: (item: BanChapHanh) => void;
  onDelete: (item: BanChapHanh) => void;
};

const EMPTY_FORM: FormData = {
  maBanChapHanh: "",
  hoiVienId: "",
  chiHoiId: "",
  chucVu: "",
  nhiemKy: "",
  ngayBatDau: "",
  ngayKetThuc: "",
  trangThai: "DANG_DUONG_NHIEM",
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Chưa xác định";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không hợp lệ";
  }

  return new Intl.DateTimeFormat("vi-VN").format(date);
}

function formatDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function getId(
  value: { _id: string } | string | null | undefined
) {
  if (!value) {
    return "";
  }

  return typeof value === "string" ? value : value._id;
}

function getHoiVien(item: BanChapHanh) {
  return typeof item.hoiVienId === "object"
    ? item.hoiVienId
    : null;
}

function getChiHoi(item: BanChapHanh) {
  return typeof item.chiHoiId === "object"
    ? item.chiHoiId
    : null;
}

function getTaiKhoan(item: BanChapHanh) {
  if (
    item.taiKhoanId &&
    typeof item.taiKhoanId === "object"
  ) {
    return item.taiKhoanId;
  }

  const hoiVien = getHoiVien(item);

  if (
    hoiVien?.taiKhoanId &&
    typeof hoiVien.taiKhoanId === "object"
  ) {
    return hoiVien.taiKhoanId;
  }

  return null;
}

function extractArray<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  if (!result || typeof result !== "object") {
    return [];
  }

  const object = result as {
    data?: unknown;
    items?: unknown;
  };

  if (Array.isArray(object.data)) {
    return object.data as T[];
  }

  if (
    object.data &&
    typeof object.data === "object"
  ) {
    const nestedData = object.data as {
      items?: unknown;
      data?: unknown;
    };

    if (Array.isArray(nestedData.items)) {
      return nestedData.items as T[];
    }

    if (Array.isArray(nestedData.data)) {
      return nestedData.data as T[];
    }
  }

  if (Array.isArray(object.items)) {
    return object.items as T[];
  }

  return [];
}

async function readResponse(response: Response) {
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || "Không thể xử lý yêu cầu"
    );
  }

  return result;
}

export default function BanChapHanhPage() {
  const [items, setItems] = useState<BanChapHanh[]>([]);
  const [hoiViens, setHoiViens] = useState<HoiVien[]>([]);
  const [chiHois, setChiHois] = useState<ChiHoi[]>([]);

  const [search, setSearch] = useState("");
  const [chiHoiFilter, setChiHoiFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [formError, setFormError] = useState("");

  const [formOpen, setFormOpen] = useState(false);

  const [editingItem, setEditingItem] =
    useState<BanChapHanh | null>(null);

  const [viewingItem, setViewingItem] =
    useState<BanChapHanh | null>(null);

  const [evaluatingItem, setEvaluatingItem] =
    useState<BanChapHanh | null>(null);

  const [accountItem, setAccountItem] =
    useState<BanChapHanh | null>(null);

  const accountMember = useMemo(() => accountItem ? {
    ...accountItem,
    hoTen: getHoiVien(accountItem)?.hoTen || "Thành viên",
    taiKhoan: getTaiKhoan(accountItem),
  } : null, [accountItem]);

  const [resetPasswordItem, setResetPasswordItem] =
    useState<BanChapHanh | null>(null);

  const [form, setForm] =
    useState<FormData>(EMPTY_FORM);

  const showSuccess = useCallback((message: string) => {
    setErrorMessage("");
    setSuccessMessage(message);

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
  }, []);

  const showError = useCallback((message: string) => {
    setSuccessMessage("");
    setErrorMessage(message);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        banChapHanhResponse,
        hoiVienResponse,
        chiHoiResponse,
      ] = await Promise.all([
        fetch("/api/ban-chap-hanh", {
          method: "GET",
          cache: "no-store",
        }),

        fetch("/api/hoi-vien", {
          method: "GET",
          cache: "no-store",
        }),

        fetch("/api/chi-hoi", {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      const [
        banChapHanhResult,
        hoiVienResult,
        chiHoiResult,
      ] = await Promise.all([
        readResponse(banChapHanhResponse),
        readResponse(hoiVienResponse),
        readResponse(chiHoiResponse),
      ]);

      setItems(
        extractArray<BanChapHanh>(banChapHanhResult)
      );

      setHoiViens(
        extractArray<HoiVien>(hoiVienResult)
      );

      setChiHois(
        extractArray<ChiHoi>(chiHoiResult)
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Không thể tải dữ liệu Ban Chấp hành"
      );
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the request and its loading state together when effect dependencies change.
    void loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const keyword = normalizeText(search);

    return items.filter((item) => {
      const hoiVien = getHoiVien(item);
      const chiHoi = getChiHoi(item);
      const taiKhoan = getTaiKhoan(item);

      const searchableText = normalizeText(
        [
          item.maBanChapHanh,
          item.chucVu,
          item.nhiemKy,
          hoiVien?.maHoiVien,
          hoiVien?.hoTen,
          chiHoi?.maChiHoi,
          chiHoi?.tenChiHoi,
          taiKhoan?.username,
          item.danhGia?.xepLoai,
        ].join(" ")
      );

      const matchSearch =
        !keyword ||
        searchableText.includes(keyword);

      const matchChiHoi =
        !chiHoiFilter ||
        getId(item.chiHoiId) === chiHoiFilter;

      const matchStatus =
        !statusFilter ||
        item.trangThai === statusFilter;

      return (
        matchSearch &&
        matchChiHoi &&
        matchStatus
      );
    });
  }, [
    items,
    search,
    chiHoiFilter,
    statusFilter,
  ]);

  const statistics = useMemo(() => {
    return {
      total: items.length,

      active: items.filter(
        (item) =>
          item.trangThai === "DANG_DUONG_NHIEM"
      ).length,

      accounts: items.filter((item) =>
        Boolean(getTaiKhoan(item))
      ).length,

      evaluated: items.filter((item) =>
        Boolean(item.danhGia)
      ).length,
    };
  }, [items]);

  function openCreateForm() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(item: BanChapHanh) {
    setEditingItem(item);

    setForm({
      maBanChapHanh: item.maBanChapHanh,
      hoiVienId: getId(item.hoiVienId),
      chiHoiId: getId(item.chiHoiId),
      chucVu: item.chucVu,
      nhiemKy: item.nhiemKy,
      ngayBatDau: formatDateInput(
        item.ngayBatDau
      ),
      ngayKetThuc: formatDateInput(
        item.ngayKetThuc
      ),
      trangThai: item.trangThai,
    });

    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function handleHoiVienChange(hoiVienId: string) {
    const selectedHoiVien = hoiViens.find(
      (item) => item._id === hoiVienId
    );

    setForm((current) => ({
      ...current,
      hoiVienId,
      chiHoiId: selectedHoiVien
        ? getId(selectedHoiVien.chiHoiId)
        : "",
    }));

    setFormError("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.maBanChapHanh.trim()) {
      setFormError(
        "Vui lòng nhập mã Ban Chấp hành"
      );
      return;
    }

    if (!form.hoiVienId) {
      setFormError("Vui lòng chọn Hội viên");
      return;
    }

    if (!form.chiHoiId) {
      setFormError("Vui lòng chọn Chi hội");
      return;
    }

    if (!form.chucVu.trim()) {
      setFormError("Vui lòng nhập chức vụ");
      return;
    }

    if (!form.nhiemKy.trim()) {
      setFormError("Vui lòng nhập nhiệm kỳ");
      return;
    }

    if (!form.ngayBatDau) {
      setFormError(
        "Vui lòng chọn ngày bắt đầu"
      );
      return;
    }

    if (
      form.ngayKetThuc &&
      new Date(form.ngayKetThuc) <
        new Date(form.ngayBatDau)
    ) {
      setFormError(
        "Ngày kết thúc không được nhỏ hơn ngày bắt đầu"
      );
      return;
    }

    const wasEditing = Boolean(editingItem);

    try {
      setSaving(true);
      setFormError("");

      const url = editingItem
        ? `/api/ban-chap-hanh/${editingItem._id}`
        : "/api/ban-chap-hanh";

      const response = await fetch(url, {
        method: editingItem ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          maBanChapHanh:
            form.maBanChapHanh
              .trim()
              .toUpperCase(),

          hoiVienId: form.hoiVienId,
          chiHoiId: form.chiHoiId,
          chucVu: form.chucVu.trim(),
          nhiemKy: form.nhiemKy.trim(),
          ngayBatDau: form.ngayBatDau,

          ngayKetThuc:
            form.ngayKetThuc || null,

          trangThai: form.trangThai,
        }),
      });

      const result = await readResponse(response);

      setFormOpen(false);
      setEditingItem(null);
      setForm(EMPTY_FORM);
      setFormError("");

      await loadData();

      showSuccess(
        result?.message ||
          (wasEditing
            ? "Cập nhật Ban Chấp hành thành công"
            : "Thêm Ban Chấp hành thành công")
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Không thể lưu thông tin Ban Chấp hành"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    item: BanChapHanh
  ) {
    const hoiVien = getHoiVien(item);

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa "${
        item.maBanChapHanh
      } - ${
        hoiVien?.hoTen || "Thành viên"
      }" khỏi Ban Chấp hành không?\n\nHồ sơ Hội viên sẽ không bị xóa.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/ban-chap-hanh/${item._id}`,
        {
          method: "DELETE",
        }
      );

      const result = await readResponse(response);

      await loadData();

      showSuccess(
        result?.message ||
          "Xóa thành viên Ban Chấp hành thành công"
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Không thể xóa thành viên Ban Chấp hành"
      );
    }
  }

  async function handleRefresh() {
    const confirmed = window.confirm(
      "Bạn có muốn làm mới toàn bộ dữ liệu và đưa các bộ lọc về mặc định không?"
    );

    if (!confirmed) {
      return;
    }

    setSearch("");
    setChiHoiFilter("");
    setStatusFilter("");

    await loadData();

    showSuccess(
      "Đã làm mới dữ liệu Ban Chấp hành"
    );
  }

  function handleEvaluationSuccess(
    message: string
  ) {
    setEvaluatingItem(null);
    void loadData();
    showSuccess(message);
  }

  function handleAccountSuccess(
    message: string
  ) {
    setAccountItem(null);
    void loadData();
    showSuccess(message);
  }

  function handleResetPasswordSuccess(
    message: string
  ) {
    /*
     * Không đóng modal tại đây.
     * Mật khẩu mới phải tiếp tục hiển thị
     * để Quản trị viên sao chép.
     */
    void loadData();
    showSuccess(message);
  }

  return (
    <main className="min-h-full bg-slate-100 px-4 py-6 font-sans sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#173d67]">
              Quản trị hệ thống
            </p>

            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
              Quản lý Ban Chấp hành
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Quản lý thành viên, chức vụ, nhiệm kỳ,
              tài khoản và kết quả đánh giá Ban Chấp
              hành.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#153b66] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f2f53]"
          >
            <Plus size={18} />
            Thêm Ban Chấp hành
          </button>
        </div>

        {successMessage && (
          <Alert type="success">
            {successMessage}
          </Alert>
        )}

        {errorMessage && (
          <Alert type="error">
            {errorMessage}
          </Alert>
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticCard
            title="Tổng thành viên"
            value={statistics.total}
            icon={<Users size={23} />}
            color="blue"
          />

          <StatisticCard
            title="Đang đương nhiệm"
            value={statistics.active}
            icon={<ShieldCheck size={23} />}
            color="green"
          />

          <StatisticCard
            title="Đã cấp tài khoản"
            value={statistics.accounts}
            icon={<KeyRound size={23} />}
            color="amber"
          />

          <StatisticCard
            title="Đã đánh giá"
            value={statistics.evaluated}
            icon={<Award size={23} />}
            color="violet"
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(280px,1fr)_240px_230px_auto]">
            <div className="relative">
              <Search
                size={19}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Tìm theo mã, họ tên, chức vụ, nhiệm kỳ hoặc tài khoản"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#173d67] focus:ring-2 focus:ring-[#173d67]/10"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Xóa nội dung tìm kiếm"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <select
              value={chiHoiFilter}
              onChange={(event) =>
                setChiHoiFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#173d67]"
            >
              <option value="">
                Tất cả Chi hội
              </option>

              {chiHois.map((chiHoi) => (
                <option
                  key={chiHoi._id}
                  value={chiHoi._id}
                >
                  {chiHoi.maChiHoi} -{" "}
                  {chiHoi.tenChiHoi}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#173d67]"
            >
              <option value="">
                Tất cả trạng thái
              </option>

              <option value="DANG_DUONG_NHIEM">
                Đang đương nhiệm
              </option>

              <option value="DA_KET_THUC">
                Đã kết thúc
              </option>
            </select>

            <button
              type="button"
              onClick={() =>
                void handleRefresh()
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={17} />
              Làm mới
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-600">
              <Loader2
                size={22}
                className="animate-spin text-[#173d67]"
              />
              Đang tải dữ liệu...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
              <UserCog
                size={42}
                className="text-slate-300"
              />

              <p className="mt-3 font-semibold text-slate-700">
                Chưa có thành viên Ban Chấp hành
                phù hợp
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Hãy thay đổi điều kiện tìm kiếm
                hoặc thêm thành viên mới.
              </p>
            </div>
          ) : (
            <>
              <DesktopTable
                items={filteredItems}
                onView={setViewingItem}
                onEdit={openEditForm}
                onEvaluate={setEvaluatingItem}
                onAccount={setAccountItem}
                onResetPassword={
                  setResetPasswordItem
                }
                onDelete={(item) =>
                  void handleDelete(item)
                }
              />

              <MobileList
                items={filteredItems}
                onView={setViewingItem}
                onEdit={openEditForm}
                onEvaluate={setEvaluatingItem}
                onAccount={setAccountItem}
                onResetPassword={
                  setResetPasswordItem
                }
                onDelete={(item) =>
                  void handleDelete(item)
                }
              />
            </>
          )}
        </section>
      </div>

      {formOpen && (
        <Modal
          title={
            editingItem
              ? "Cập nhật Ban Chấp hành"
              : "Thêm Ban Chấp hành"
          }
          subtitle={
            editingItem
              ? "Điều chỉnh thông tin chức vụ và nhiệm kỳ."
              : "Khai báo thành viên Ban Chấp hành mới."
          }
          onClose={closeForm}
        >
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <Field
                label="Mã Ban Chấp hành"
                required
              >
                <input
                  value={form.maBanChapHanh}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,

                      maBanChapHanh:
                        event.target.value
                          .toUpperCase(),
                    }));

                    setFormError("");
                  }}
                  placeholder="Ví dụ: BCH001"
                  className="form-control"
                  maxLength={30}
                />
              </Field>

              <Field
                label="Hội viên"
                required
              >
                <select
                  value={form.hoiVienId}
                  onChange={(event) =>
                    handleHoiVienChange(
                      event.target.value
                    )
                  }
                  className="form-control"
                >
                  <option value="">
                    Chọn Hội viên
                  </option>

                  {hoiViens.map((hoiVien) => (
                    <option
                      key={hoiVien._id}
                      value={hoiVien._id}
                    >
                      {hoiVien.maHoiVien} -{" "}
                      {hoiVien.hoTen}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Chi hội"
                required
              >
                <select
                  value={form.chiHoiId}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      chiHoiId:
                        event.target.value,
                    }));

                    setFormError("");
                  }}
                  className="form-control"
                >
                  <option value="">
                    Chọn Chi hội
                  </option>

                  {chiHois.map((chiHoi) => (
                    <option
                      key={chiHoi._id}
                      value={chiHoi._id}
                    >
                      {chiHoi.maChiHoi} -{" "}
                      {chiHoi.tenChiHoi}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Chức vụ"
                required
              >
                <input
                  value={form.chucVu}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      chucVu:
                        event.target.value,
                    }));

                    setFormError("");
                  }}
                  placeholder="Ví dụ: Chi hội trưởng"
                  className="form-control"
                  maxLength={100}
                />
              </Field>

              <Field
                label="Nhiệm kỳ"
                required
              >
                <input
                  value={form.nhiemKy}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      nhiemKy:
                        event.target.value,
                    }));

                    setFormError("");
                  }}
                  placeholder="Ví dụ: 2025 - 2027"
                  className="form-control"
                  maxLength={50}
                />
              </Field>

              <Field
                label="Trạng thái"
                required
              >
                <select
                  value={form.trangThai}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,

                      trangThai:
                        event.target
                          .value as FormData["trangThai"],
                    }));

                    setFormError("");
                  }}
                  className="form-control"
                >
                  <option value="DANG_DUONG_NHIEM">
                    Đang đương nhiệm
                  </option>

                  <option value="DA_KET_THUC">
                    Đã kết thúc
                  </option>
                </select>
              </Field>

              <Field
                label="Ngày bắt đầu"
                required
              >
                <input
                  type="date"
                  value={form.ngayBatDau}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,

                      ngayBatDau:
                        event.target.value,
                    }));

                    setFormError("");
                  }}
                  className="form-control"
                />
              </Field>

              <Field label="Ngày kết thúc">
                <input
                  type="date"
                  value={form.ngayKetThuc}
                  min={
                    form.ngayBatDau ||
                    undefined
                  }
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,

                      ngayKetThuc:
                        event.target.value,
                    }));

                    setFormError("");
                  }}
                  className="form-control"
                />
              </Field>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:col-span-2">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Đóng
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#153b66] px-5 text-sm font-semibold text-white hover:bg-[#0f2f53] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                )}

                {editingItem
                  ? "Lưu thay đổi"
                  : "Thêm thành viên"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewingItem && (
        <DetailModal
          item={viewingItem}
          onClose={() =>
            setViewingItem(null)
          }
        />
      )}

      {evaluatingItem && (
        <DanhGiaBanChapHanhModal
          isOpen={Boolean(evaluatingItem)}
          banChapHanh={evaluatingItem}
          onClose={() =>
            setEvaluatingItem(null)
          }
          onSuccess={
            handleEvaluationSuccess
          }
        />
      )}

      {accountItem && (
        <CapTaiKhoanBanChapHanhModal
          open={Boolean(accountItem)}
          member={accountMember}
          onClose={() =>
            setAccountItem(null)
          }
          onSuccess={handleAccountSuccess}
        />
      )}

      {resetPasswordItem && (
        <DatLaiMatKhauBanChapHanhModal
          isOpen={Boolean(
            resetPasswordItem
          )}
          banChapHanh={
            resetPasswordItem
          }
          onClose={() =>
            setResetPasswordItem(null)
          }
          onSuccess={
            handleResetPasswordSuccess
          }
        />
      )}

      <style jsx global>{`
        .form-control {
          width: 100%;
          height: 44px;
          border: 1px solid rgb(203 213 225);
          border-radius: 8px;
          background: white;
          padding: 0 12px;
          font-size: 14px;
          color: rgb(15 23 42);
          outline: none;
          transition:
            border-color 150ms,
            box-shadow 150ms;
        }

        .form-control:focus {
          border-color: #173d67;
          box-shadow: 0 0 0 3px
            rgba(23, 61, 103, 0.1);
        }
      `}</style>
    </main>
  );
}

function DesktopTable({
  items,
  onView,
  onEdit,
  onEvaluate,
  onAccount,
  onResetPassword,
  onDelete,
}: ListProps) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[1450px] border-collapse">
        <thead>
          <tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-600">
            <th className="px-4 py-4">
              STT
            </th>

            <th className="px-4 py-4">
              Mã BCH
            </th>

            <th className="px-4 py-4">
              Hội viên
            </th>

            <th className="px-4 py-4">
              Chi hội
            </th>

            <th className="px-4 py-4">
              Chức vụ
            </th>

            <th className="px-4 py-4">
              Nhiệm kỳ
            </th>

            <th className="px-4 py-4">
              Tài khoản
            </th>

            <th className="px-4 py-4">
              Xếp loại
            </th>

            <th className="px-4 py-4">
              Trạng thái
            </th>

            <th className="px-4 py-4 text-right">
              Thao tác
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => {
            const hoiVien =
              getHoiVien(item);

            const chiHoi =
              getChiHoi(item);

            const taiKhoan =
              getTaiKhoan(item);

            return (
              <tr
                key={item._id}
                className="border-t border-slate-100 text-sm text-slate-700 transition hover:bg-slate-50/70"
              >
                <td className="px-4 py-4">
                  {index + 1}
                </td>

                <td className="px-4 py-4">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 font-bold text-[#173d67]">
                    {item.maBanChapHanh}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {hoiVien?.hoTen ||
                      "Không xác định"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {hoiVien?.maHoiVien ||
                      "—"}
                  </p>
                </td>

                <td className="px-4 py-4">
                  {chiHoi
                    ? `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`
                    : "Không xác định"}
                </td>

                <td className="px-4 py-4 font-medium text-slate-900">
                  {item.chucVu}
                </td>

                <td className="px-4 py-4">
                  {item.nhiemKy}
                </td>

                <td className="px-4 py-4">
                  {taiKhoan ? (
                    <>
                      <p className="font-medium text-slate-900">
                        {
                          taiKhoan.username
                        }
                      </p>

                      <p
                        className={`mt-1 text-xs font-medium ${
                          taiKhoan.isActive ===
                          false
                            ? "text-red-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {taiKhoan.isActive ===
                        false
                          ? "Đang bị khóa"
                          : "Đã cấp"}
                      </p>
                    </>
                  ) : (
                    <span className="text-slate-500">
                      Chưa cấp
                    </span>
                  )}
                </td>

                <td className="px-4 py-4">
                  <RatingBadge
                    rating={
                      item.danhGia?.xepLoai
                    }
                  />
                </td>

                <td className="px-4 py-4">
                  <StatusBadge
                    status={item.trangThai}
                  />
                </td>

                <td className="px-4 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    {taiKhoan ? (
                      <button
                        type="button"
                        onClick={() =>
                          onResetPassword(
                            item
                          )
                        }
                        className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#173d67] bg-white px-3 text-xs font-semibold text-[#173d67] transition hover:bg-blue-50"
                        title="Đặt lại mật khẩu"
                      >
                        <KeyRound
                          size={15}
                        />
                        Đặt lại MK
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onAccount(item)
                        }
                        disabled={
                          item.trangThai ===
                          "DA_KET_THUC"
                        }
                        className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        title={
                          item.trangThai ===
                          "DA_KET_THUC"
                            ? "Không thể cấp tài khoản cho nhiệm kỳ đã kết thúc"
                            : "Cấp tài khoản Ban Chấp hành"
                        }
                      >
                        <UserCog
                          size={15}
                        />
                        Cấp tài khoản
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        onEvaluate(item)
                      }
                      className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-violet-300 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                      title={
                        item.danhGia
                          ? "Cập nhật đánh giá"
                          : "Đánh giá Ban Chấp hành"
                      }
                    >
                      <Award size={15} />

                      {item.danhGia
                        ? "Sửa đánh giá"
                        : "Đánh giá"}
                    </button>

                    <ActionButton
                      title="Xem chi tiết"
                      onClick={() =>
                        onView(item)
                      }
                    >
                      <Eye size={17} />
                    </ActionButton>

                    <ActionButton
                      title="Chỉnh sửa"
                      onClick={() =>
                        onEdit(item)
                      }
                    >
                      <Edit3 size={17} />
                    </ActionButton>

                    <ActionButton
                      title="Xóa"
                      danger
                      onClick={() =>
                        onDelete(item)
                      }
                    >
                      <Trash2 size={17} />
                    </ActionButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MobileList({
  items,
  onView,
  onEdit,
  onEvaluate,
  onAccount,
  onResetPassword,
  onDelete,
}: ListProps) {
  return (
    <div className="divide-y divide-slate-200 lg:hidden">
      {items.map((item) => {
        const hoiVien =
          getHoiVien(item);

        const chiHoi =
          getChiHoi(item);

        const taiKhoan =
          getTaiKhoan(item);

        return (
          <article
            key={item._id}
            className="p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#173d67]">
                  {item.maBanChapHanh}
                </span>

                <h2 className="mt-3 truncate font-bold text-slate-950">
                  {hoiVien?.hoTen ||
                    "Không xác định"}
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  {item.chucVu}
                </p>
              </div>

              <StatusBadge
                status={item.trangThai}
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <MobileInfo
                label="Chi hội"
                value={
                  chiHoi
                    ? `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`
                    : "Không xác định"
                }
              />

              <MobileInfo
                label="Nhiệm kỳ"
                value={item.nhiemKy}
              />

              <MobileInfo
                label="Tài khoản"
                value={
                  taiKhoan?.username ||
                  "Chưa cấp"
                }
              />

              <div>
                <dt className="mb-1 text-xs font-bold uppercase text-slate-500">
                  Xếp loại
                </dt>

                <dd>
                  <RatingBadge
                    rating={
                      item.danhGia?.xepLoai
                    }
                  />
                </dd>
              </div>
            </dl>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {taiKhoan ? (
                <MobileAction
                  label="Đặt lại MK"
                  icon={
                    <KeyRound size={16} />
                  }
                  onClick={() =>
                    onResetPassword(item)
                  }
                />
              ) : (
                <MobileAction
                  label="Cấp tài khoản"
                  icon={
                    <UserCog size={16} />
                  }
                  onClick={() =>
                    onAccount(item)
                  }
                  disabled={
                    item.trangThai ===
                    "DA_KET_THUC"
                  }
                />
              )}

              <MobileAction
                label={
                  item.danhGia
                    ? "Sửa đánh giá"
                    : "Đánh giá"
                }
                icon={
                  <Award size={16} />
                }
                onClick={() =>
                  onEvaluate(item)
                }
              />

              <MobileAction
                label="Chi tiết"
                icon={<Eye size={16} />}
                onClick={() =>
                  onView(item)
                }
              />

              <MobileAction
                label="Chỉnh sửa"
                icon={
                  <Edit3 size={16} />
                }
                onClick={() =>
                  onEdit(item)
                }
              />

              <MobileAction
                label="Xóa"
                icon={
                  <Trash2 size={16} />
                }
                danger
                onClick={() =>
                  onDelete(item)
                }
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function DetailModal({
  item,
  onClose,
}: {
  item: BanChapHanh;
  onClose: () => void;
}) {
  const hoiVien =
    getHoiVien(item);

  const chiHoi =
    getChiHoi(item);

  const taiKhoan =
    getTaiKhoan(item);

  return (
    <Modal
      title="Thông tin Ban Chấp hành"
      subtitle={`${
        item.maBanChapHanh
      } - ${
        hoiVien?.hoTen ||
        "Không xác định"
      }`}
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
        <DetailItem label="Mã Ban Chấp hành">
          {item.maBanChapHanh}
        </DetailItem>

        <DetailItem label="Hội viên">
          {hoiVien
            ? `${hoiVien.maHoiVien} - ${hoiVien.hoTen}`
            : "Không xác định"}
        </DetailItem>

        <DetailItem label="Chi hội">
          {chiHoi
            ? `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`
            : "Không xác định"}
        </DetailItem>

        <DetailItem label="Chức vụ">
          {item.chucVu}
        </DetailItem>

        <DetailItem label="Nhiệm kỳ">
          {item.nhiemKy}
        </DetailItem>

        <DetailItem label="Trạng thái">
          <StatusBadge
            status={item.trangThai}
          />
        </DetailItem>

        <DetailItem label="Ngày bắt đầu">
          {formatDate(
            item.ngayBatDau
          )}
        </DetailItem>

        <DetailItem label="Ngày kết thúc">
          {formatDate(
            item.ngayKetThuc
          )}
        </DetailItem>

        <DetailItem label="Tài khoản">
          {taiKhoan?.username ||
            "Chưa cấp tài khoản"}
        </DetailItem>

        <DetailItem label="Trạng thái tài khoản">
          {taiKhoan
            ? taiKhoan.isActive === false
              ? "Đang bị khóa"
              : "Đang hoạt động"
            : "Chưa có tài khoản"}
        </DetailItem>

        <DetailItem label="Xếp loại">
          <RatingBadge
            rating={
              item.danhGia?.xepLoai
            }
          />
        </DetailItem>

        <div className="sm:col-span-2">
          <DetailItem label="Nhận xét">
            {item.danhGia?.nhanXet?.trim() ||
              "Chưa có nội dung nhận xét"}
          </DetailItem>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Đóng
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-600">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="text-sm font-medium leading-6 text-slate-900">
        {children}
      </div>
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
    | "green"
    | "amber"
    | "violet";
}) {
  const colors = {
    blue: "bg-blue-50 text-[#173d67]",
    green:
      "bg-emerald-50 text-emerald-700",
    amber:
      "bg-amber-50 text-amber-700",
    violet:
      "bg-violet-50 text-violet-700",
  };

  return (
    <div className="flex min-h-24 items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-600">
          {title}
        </p>

        <p className="mt-2 text-2xl font-bold text-slate-950">
          {value}
        </p>
      </div>

      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color]}`}
      >
        {icon}
      </div>
    </div>
  );
}

function Alert({
  type,
  children,
}: {
  type: "success" | "error";
  children: ReactNode;
}) {
  return (
    <div
      className={`mb-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2
          size={19}
          className="mt-0.5 shrink-0"
        />
      ) : (
        <X
          size={19}
          className="mt-0.5 shrink-0"
        />
      )}

      <span>{children}</span>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: BanChapHanh["trangThai"];
}) {
  if (
    status === "DANG_DUONG_NHIEM"
  ) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Đang đương nhiệm
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      Đã kết thúc
    </span>
  );
}
function RatingBadge({
  rating,
}: {
  rating?: string;
}) {
  if (!rating) {
    return (
      <span className="text-xs font-medium text-slate-500">
        Chưa đánh giá
      </span>
    );
  }

  const normalized = normalizeText(rating)
    .replace(/[\s-]+/g, "_")
    .toUpperCase();

  const ratingConfig: Record<
    string,
    {
      label: string;
      className: string;
    }
  > = {
    XUAT_SAC: {
      label: "Xuất sắc",
      className:
        "border-violet-200 bg-violet-50 text-violet-700",
    },

    TOT: {
      label: "Tốt",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    },

    KHA: {
      label: "Khá",
      className:
        "border-blue-200 bg-blue-50 text-blue-700",
    },

    TRUNG_BINH: {
      label: "Trung bình",
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    },

    YEU: {
      label: "Yếu",
      className:
        "border-red-200 bg-red-50 text-red-700",
    },
  };

  const config = ratingConfig[normalized] || {
    label: rating,
    className:
      "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}


function ActionButton({
  title,
  onClick,
  danger = false,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-600 hover:bg-slate-100 hover:text-[#173d67]"
      }`}
    >
      {children}
    </button>
  );
}

function MobileAction({
  label,
  icon,
  onClick,
  danger = false,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-slate-300 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="mb-1 text-xs font-bold uppercase text-slate-500">
        {label}
      </dt>

      <dd className="break-words font-medium text-slate-800">
        {value}
      </dd>
    </div>
  );
}