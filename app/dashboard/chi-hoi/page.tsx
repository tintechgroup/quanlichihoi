"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  AlertTriangle,
  Award,
  Building2,
  CheckCircle2,
  Eye,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import DanhGiaChiHoiModal from "@/components/chi-hoi/DanhGiaChiHoiModal";
import XepLoaiChiHoiBadge from "@/components/chi-hoi/XepLoaiChiHoiBadge";

type ChiHoi = {
  _id: string;
  maChiHoi: string;
  tenChiHoi: string;
  moTa?: string;

  danhGia?: {
    _id: string;
    xepLoai: string;
    nhanXet: string;
    updatedAt: string;
  };

  createdAt: string;
  updatedAt: string;
};

type ChiHoiForm = {
  maChiHoi: string;
  tenChiHoi: string;
  moTa: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

const initialForm: ChiHoiForm = {
  maChiHoi: "",
  tenChiHoi: "",
  moTa: "",
};

export default function ChiHoiPage() {
  const [chiHoiList, setChiHoiList] = useState<ChiHoi[]>([]);
  const [loading, setLoading] = useState(true);

  const [notice, setNotice] = useState<Notice | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingChiHoi, setEditingChiHoi] =
    useState<ChiHoi | null>(null);
  const [formData, setFormData] =
    useState<ChiHoiForm>(initialForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [detailChiHoi, setDetailChiHoi] =
    useState<ChiHoi | null>(null);

  const [ratingTarget, setRatingTarget] =
    useState<ChiHoi | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<ChiHoi | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadChiHoi = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/chi-hoi", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setNotice({
          type: "error",
          message:
            result.message || "Không thể tải danh sách Chi hội",
        });
        return;
      }

      setChiHoiList(result.data);
    } catch {
      setNotice({
        type: "error",
        message: "Không thể kết nối đến hệ thống",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the request and its loading state together when effect dependencies change.
    void loadChiHoi();
  }, [loadChiHoi]);

  function openCreateForm() {
    setEditingChiHoi(null);
    setFormData(initialForm);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(chiHoi: ChiHoi) {
    setEditingChiHoi(chiHoi);

    setFormData({
      maChiHoi: chiHoi.maChiHoi,
      tenChiHoi: chiHoi.tenChiHoi,
      moTa: chiHoi.moTa || "",
    });

    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    if (submitting) {
      return;
    }

    setShowForm(false);
    setEditingChiHoi(null);
    setFormData(initialForm);
    setFormError("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");
    setNotice(null);

    const maChiHoi = formData.maChiHoi.trim().toUpperCase();
    const tenChiHoi = formData.tenChiHoi.trim();
    const moTa = formData.moTa.trim();

    if (!maChiHoi) {
      setFormError("Vui lòng nhập mã Chi hội");
      return;
    }

    if (!tenChiHoi) {
      setFormError("Vui lòng nhập tên Chi hội");
      return;
    }

    try {
      setSubmitting(true);

      const editingId = editingChiHoi?._id;

      const response = await fetch(
        editingId
          ? `/api/chi-hoi/${editingId}`
          : "/api/chi-hoi",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            maChiHoi,
            tenChiHoi,
            moTa,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setFormError(
          result.message ||
            (editingId
              ? "Không thể cập nhật Chi hội"
              : "Không thể thêm Chi hội")
        );
        return;
      }

      setShowForm(false);
      setEditingChiHoi(null);
      setFormData(initialForm);

      await loadChiHoi();

      setNotice({
        type: "success",
        message: editingId
          ? "Cập nhật Chi hội thành công"
          : "Thêm Chi hội thành công",
      });
    } catch {
      setFormError("Không thể kết nối đến hệ thống");
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteDialog(chiHoi: ChiHoi) {
    setDeleteTarget(chiHoi);
    setDeleteError("");
  }

  function closeDeleteDialog() {
    if (deleting) {
      return;
    }

    setDeleteTarget(null);
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleting(true);
      setDeleteError("");
      setNotice(null);

      const response = await fetch(
        `/api/chi-hoi/${deleteTarget._id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setDeleteError(
          result.message || "Không thể xóa Chi hội"
        );
        return;
      }

      setDeleteTarget(null);

      await loadChiHoi();

      setNotice({
        type: "success",
        message: "Xóa Chi hội thành công",
      });
    } catch {
      setDeleteError("Không thể kết nối đến hệ thống");
    } finally {
      setDeleting(false);
    }
  }

  function handleEvaluationSaved() {
    setNotice({
      type: "success",
      message: "Đánh giá Chi hội thành công",
    });

    void loadChiHoi();
  }

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return (
    <section>
      {/* Tiêu đề trang */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#12345B]">
            Quản trị hệ thống
          </p>

          <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-900 sm:text-[28px]">
            Quản lý Chi hội
          </h1>

          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-600">
            Quản lý thông tin và đánh giá các Chi hội trực thuộc.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#12345B] px-5 text-sm font-semibold text-white transition hover:bg-[#0C2949] focus:outline-none focus:ring-2 focus:ring-[#12345B]/30 sm:w-auto"
        >
          <Plus size={18} />
          Thêm Chi hội
        </button>
      </div>

      {/* Thông báo */}
      {notice && (
        <div
          className={`mb-5 flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0"
            />
          )}

          <span>{notice.message}</span>
        </div>
      )}

      {/* Danh sách */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Danh sách Chi hội
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tổng số: {chiHoiList.length} Chi hội
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadChiHoi()}
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-[#12345B] hover:text-[#12345B] disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Làm mới
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center p-6">
            <div className="text-center">
              <LoaderCircle
                size={30}
                className="mx-auto animate-spin text-[#12345B]"
              />

              <p className="mt-3 text-sm text-slate-500">
                Đang tải danh sách...
              </p>
            </div>
          </div>
        ) : chiHoiList.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center p-6">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#12345B]">
                <Building2 size={24} />
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-900">
                Chưa có Chi hội
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Nhấn “Thêm Chi hội” để tạo dữ liệu đầu tiên.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Bảng desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1080px] border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-16 px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      STT
                    </th>

                    <th className="w-32 px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Mã Chi hội
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Tên Chi hội
                    </th>

                    <th className="w-36 px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Xếp loại
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Mô tả
                    </th>

                    <th className="w-36 px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Ngày tạo
                    </th>

                    <th className="w-48 px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {chiHoiList.map((chiHoi, index) => (
                    <tr
                      key={chiHoi._id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded bg-blue-50 px-2.5 py-1 text-sm font-bold text-[#12345B]">
                          {chiHoi.maChiHoi}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                        {chiHoi.tenChiHoi}
                      </td>

                      <td className="px-5 py-4">
                        <XepLoaiChiHoiBadge
                          xepLoai={chiHoi.danhGia?.xepLoai}
                        />
                      </td>

                      <td className="max-w-xs px-5 py-4 text-sm leading-6 text-slate-600">
                        {chiHoi.moTa || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(chiHoi.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            title="Đánh giá"
                            onClick={() =>
                              setRatingTarget(chiHoi)
                            }
                            className="rounded-md p-2 text-slate-600 transition hover:bg-amber-50 hover:text-amber-700"
                          >
                            <Award size={18} />
                          </button>

                          <button
                            type="button"
                            title="Xem chi tiết"
                            onClick={() =>
                              setDetailChiHoi(chiHoi)
                            }
                            className="rounded-md p-2 text-slate-600 transition hover:bg-blue-50 hover:text-[#12345B]"
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            type="button"
                            title="Chỉnh sửa"
                            onClick={() => openEditForm(chiHoi)}
                            className="rounded-md p-2 text-slate-600 transition hover:bg-blue-50 hover:text-[#12345B]"
                          >
                            <Pencil size={18} />
                          </button>

                          <button
                            type="button"
                            title="Xóa"
                            onClick={() =>
                              openDeleteDialog(chiHoi)
                            }
                            className="rounded-md p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Thẻ mobile và tablet */}
            <div className="grid gap-4 bg-slate-50 p-4 sm:p-5 md:grid-cols-2 lg:hidden">
              {chiHoiList.map((chiHoi, index) => (
                <article
                  key={chiHoi._id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        Chi hội #{index + 1}
                      </p>

                      <h3 className="mt-1 break-words text-base font-bold leading-6 text-slate-900">
                        {chiHoi.tenChiHoi}
                      </h3>
                    </div>

                    <span className="shrink-0 rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#12345B]">
                      {chiHoi.maChiHoi}
                    </span>
                  </div>

                  <div className="mt-3">
                    <XepLoaiChiHoiBadge
                      xepLoai={chiHoi.danhGia?.xepLoai}
                    />
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Mô tả
                    </p>

                    <p className="mt-1 break-words text-sm leading-6 text-slate-700">
                      {chiHoi.moTa || "Chưa có mô tả"}
                    </p>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    Ngày tạo: {formatDate(chiHoi.createdAt)}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => setRatingTarget(chiHoi)}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-amber-300 text-xs font-semibold text-amber-700"
                    >
                      <Award size={16} />
                      Đánh giá
                    </button>

                    <button
                      type="button"
                      onClick={() => setDetailChiHoi(chiHoi)}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-300 text-xs font-semibold text-slate-700"
                    >
                      <Eye size={16} />
                      Xem
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditForm(chiHoi)}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-blue-300 text-xs font-semibold text-[#12345B]"
                    >
                      <Pencil size={16} />
                      Sửa
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openDeleteDialog(chiHoi)
                      }
                      className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-red-300 text-xs font-semibold text-red-700"
                    >
                      <Trash2 size={16} />
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal thêm và chỉnh sửa */}
      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-5">
          <button
            type="button"
            aria-label="Đóng biểu mẫu"
            onClick={closeForm}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-2xl sm:max-w-xl sm:rounded-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingChiHoi
                    ? "Cập nhật Chi hội"
                    : "Thêm Chi hội mới"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Nhập đầy đủ thông tin Chi hội.
                </p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeForm}
                disabled={submitting}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-5 sm:p-6"
            >
              <div>
                <label
                  htmlFor="maChiHoi"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Mã Chi hội
                  <span className="ml-1 text-red-600">*</span>
                </label>

                <input
                  id="maChiHoi"
                  type="text"
                  value={formData.maChiHoi}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      maChiHoi:
                        event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Ví dụ: SP01"
                  maxLength={30}
                  required
                  className="h-11 w-full rounded-md border border-slate-300 px-3.5 text-sm text-slate-900 outline-none focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/15"
                />
              </div>

              <div>
                <label
                  htmlFor="tenChiHoi"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Tên Chi hội
                  <span className="ml-1 text-red-600">*</span>
                </label>

                <input
                  id="tenChiHoi"
                  type="text"
                  value={formData.tenChiHoi}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      tenChiHoi: event.target.value,
                    }))
                  }
                  placeholder="Nhập tên Chi hội"
                  maxLength={150}
                  required
                  className="h-11 w-full rounded-md border border-slate-300 px-3.5 text-sm text-slate-900 outline-none focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/15"
                />
              </div>

              <div>
                <label
                  htmlFor="moTa"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Mô tả
                </label>

                <textarea
                  id="moTa"
                  value={formData.moTa}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      moTa: event.target.value,
                    }))
                  }
                  placeholder="Nhập nội dung mô tả"
                  rows={4}
                  maxLength={500}
                  className="w-full resize-none rounded-md border border-slate-300 px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/15"
                />
              </div>

              {formError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="h-11 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#12345B] px-5 text-sm font-semibold text-white hover:bg-[#0C2949] disabled:opacity-50"
                >
                  {submitting && (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  )}

                  {submitting
                    ? "Đang lưu..."
                    : editingChiHoi
                      ? "Lưu thay đổi"
                      : "Thêm Chi hội"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xem chi tiết */}
      {detailChiHoi && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-5">
          <button
            type="button"
            aria-label="Đóng thông tin"
            onClick={() => setDetailChiHoi(null)}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-2xl sm:max-w-xl sm:rounded-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <h2 className="text-lg font-bold text-slate-900">
                Thông tin Chi hội
              </h2>

              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setDetailChiHoi(null)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <dl className="space-y-5">
                <div>
                  <dt className="text-sm font-semibold text-slate-500">
                    Mã Chi hội
                  </dt>

                  <dd className="mt-1 text-[15px] font-bold text-[#12345B]">
                    {detailChiHoi.maChiHoi}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-slate-500">
                    Tên Chi hội
                  </dt>

                  <dd className="mt-1 text-[15px] text-slate-900">
                    {detailChiHoi.tenChiHoi}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-slate-500">
                    Xếp loại
                  </dt>

                  <dd className="mt-2">
                    <XepLoaiChiHoiBadge
                      xepLoai={
                        detailChiHoi.danhGia?.xepLoai
                      }
                    />
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-slate-500">
                    Mô tả
                  </dt>

                  <dd className="mt-1 whitespace-pre-wrap text-[15px] leading-6 text-slate-700">
                    {detailChiHoi.moTa || "Chưa có mô tả"}
                  </dd>
                </div>

                <div className="grid gap-5 border-t border-slate-200 pt-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-semibold text-slate-500">
                      Ngày tạo
                    </dt>

                    <dd className="mt-1 text-sm text-slate-700">
                      {formatDate(detailChiHoi.createdAt)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-semibold text-slate-500">
                      Cập nhật gần nhất
                    </dt>

                    <dd className="mt-1 text-sm text-slate-700">
                      {formatDate(detailChiHoi.updatedAt)}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-5">
          <button
            type="button"
            aria-label="Đóng xác nhận"
            onClick={closeDeleteDialog}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 w-full rounded-t-xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-xl sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
              <AlertTriangle size={24} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Xác nhận xóa Chi hội
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Anh có chắc chắn muốn xóa Chi hội{" "}
              <strong>{deleteTarget.tenChiHoi}</strong>? Hành động
              này không thể hoàn tác.
            </p>

            {deleteError && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={deleting}
                className="h-11 rounded-md border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {deleting && (
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                )}

                {deleting ? "Đang xóa..." : "Xóa Chi hội"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal đánh giá */}
      {ratingTarget && (
        <DanhGiaChiHoiModal
          chiHoi={ratingTarget}
          onClose={() => setRatingTarget(null)}
          onSaved={handleEvaluationSaved}
        />
      )}
    </section>
  );
}