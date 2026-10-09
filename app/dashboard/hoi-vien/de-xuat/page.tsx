"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type CurrentUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
};

type ChiHoi = {
  _id: string;
  maChiHoi: string;
  tenChiHoi: string;
};

type DeXuat = {
  _id: string;

  maHoiVien: string;

  hoTen: string;

  ngaySinh?: string;

  gioiTinh?:
    | "NAM"
    | "NU"
    | "KHAC";

  email?: string;

  soDienThoai?: string;

  lop?: string;

  khoaHoc?: string;

  diaChi?: string;

  chiHoiId:
    | ChiHoi
    | string;

  trangThai:
    | "CHO_XU_LY"
    | "DA_PHE_DUYET"
    | "TU_CHOI";

  nguoiDeXuatTen: string;

  nguoiXuLyTen?: string;

  lyDoTuChoi?: string;

  ngayXuLy?: string;

  createdAt: string;
};

type FormData = {
  maHoiVien: string;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: string;
  email: string;
  soDienThoai: string;
  lop: string;
  khoaHoc: string;
  diaChi: string;
};

const EMPTY_FORM: FormData = {
  maHoiVien: "",
  hoTen: "",
  ngaySinh: "",
  gioiTinh: "",
  email: "",
  soDienThoai: "",
  lop: "",
  khoaHoc: "",
  diaChi: "",
};

function statusLabel(
  status:
    DeXuat["trangThai"],
) {
  switch (status) {
    case "CHO_XU_LY":
      return "Chờ xử lý";

    case "DA_PHE_DUYET":
      return "Đã phê duyệt";

    case "TU_CHOI":
      return "Từ chối";
  }
}

function statusClass(
  status:
    DeXuat["trangThai"],
) {
  switch (status) {
    case "CHO_XU_LY":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "DA_PHE_DUYET":
      return "border-green-200 bg-green-50 text-green-700";

    case "TU_CHOI":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

function genderLabel(
  value?: string,
) {
  if (value === "NAM") {
    return "Nam";
  }

  if (value === "NU") {
    return "Nữ";
  }

  if (value === "KHAC") {
    return "Khác";
  }

  return "—";
}

function formatDate(
  value?: string,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export default function DeXuatHoiVienPage() {
  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null,
    );

  const [
    items,
    setItems,
  ] = useState<DeXuat[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    message,
    setMessage,
  ] =
    useState<{
      type:
        | "success"
        | "error";
      text: string;
    } | null>(null);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    form,
    setForm,
  ] =
    useState<FormData>(
      EMPTY_FORM,
    );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    selected,
    setSelected,
  ] =
    useState<DeXuat | null>(
      null,
    );

  const [
    rejectTarget,
    setRejectTarget,
  ] =
    useState<DeXuat | null>(
      null,
    );

  const [
    rejectReason,
    setRejectReason,
  ] = useState("");

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const isLeader =
    currentUser?.role ===
    "CHI_HOI_TRUONG";

  const canApprove =
    currentUser?.role ===
      "ADMIN" ||
    currentUser?.role ===
      "BAN_CHAP_HANH";

  const loadUser =
    useCallback(async () => {
      const response =
        await fetch(
          "/api/auth/me",
          {
            cache:
              "no-store",
          },
        );

      const result =
        await response.json();

      if (
        response.ok &&
        result.success
      ) {
        const raw =
          result.user ??
          result.data?.user ??
          result.data;

        if (raw) {
          setCurrentUser({
            id:
              raw.id ??
              raw._id ??
              raw.userId ??
              "",

            username:
              raw.username ??
              "",

            fullName:
              raw.fullName ??
              "",

            role:
              raw.role,
          });
        }
      }
    }, []);

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);

        const query =
          new URLSearchParams();

        if (search.trim()) {
          query.set(
            "search",
            search.trim(),
          );
        }

        if (status) {
          query.set(
            "status",
            status,
          );
        }

        const response =
          await fetch(
            `/api/de-xuat-hoi-vien?${query.toString()}`,
            {
              cache:
                "no-store",
            },
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Không thể tải đề xuất",
          );
        }

        setItems(
          Array.isArray(
            result.data,
          )
            ? result.data
            : [],
        );
      } catch (error) {
        setMessage({
          type: "error",

          text:
            error instanceof
            Error
              ? error.message
              : "Không thể tải dữ liệu",
        });
      } finally {
        setLoading(false);
      }
    }, [
      search,
      status,
    ]);

  useEffect(() => {
    void Promise.all([
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
      loadUser(),
      loadData(),
    ]);
  }, [
    loadUser,
    loadData,
  ]);

  const stats =
    useMemo(
      () => ({
        total:
          items.length,

        pending:
          items.filter(
            (item) =>
              item.trangThai ===
              "CHO_XU_LY",
          ).length,

        approved:
          items.filter(
            (item) =>
              item.trangThai ===
              "DA_PHE_DUYET",
          ).length,

        rejected:
          items.filter(
            (item) =>
              item.trangThai ===
              "TU_CHOI",
          ).length,
      }),
      [items],
    );

  async function submitProposal(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setSubmitting(true);

      const response =
        await fetch(
          "/api/de-xuat-hoi-vien",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                form,
              ),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể gửi đề xuất",
        );
      }

      setForm(EMPTY_FORM);

      setShowForm(false);

      setMessage({
        type: "success",

        text:
          result.message,
      });

      await loadData();
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể gửi đề xuất",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function approve(
    item: DeXuat,
  ) {
    const confirmed =
      window.confirm(
        `Phê duyệt Hội viên ${item.maHoiVien} - ${item.hoTen}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setProcessing(true);

      const response =
        await fetch(
          `/api/de-xuat-hoi-vien/${item._id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "APPROVE",
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể phê duyệt",
        );
      }

      setMessage({
        type: "success",

        text:
          result.message,
      });

      await loadData();
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể phê duyệt",
      });
    } finally {
      setProcessing(false);
    }
  }

  async function reject(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!rejectTarget) {
      return;
    }

    try {
      setProcessing(true);

      const response =
        await fetch(
          `/api/de-xuat-hoi-vien/${rejectTarget._id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "REJECT",

                lyDoTuChoi:
                  rejectReason,
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể từ chối",
        );
      }

      setRejectTarget(
        null,
      );

      setRejectReason("");

      setMessage({
        type: "success",

        text:
          result.message,
      });

      await loadData();
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể từ chối",
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f7fb]">
      <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-5 flex flex-col gap-4 sm:mb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#12345B]">
              Quản lý Hội viên
            </p>

            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
              Đề xuất Hội viên mới
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Chi hội trưởng gửi
              đề xuất; BCH hoặc
              Quản trị viên phê
              duyệt trước khi Hội
              viên được thêm chính
              thức.
            </p>
          </div>

          {isLeader && (
            <button
              type="button"
              onClick={() =>
                setShowForm(
                  true,
                )
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#12345B] px-5 text-sm font-semibold text-white sm:w-auto"
            >
              <Plus size={18} />

              Đề xuất Hội viên mới
            </button>
          )}
        </div>

        {message && (
          <div
            className={`mb-5 rounded-xl border p-3 text-sm ${
              message.type ===
              "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {
              message.text
            }
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Tổng đề xuất"
            value={
              stats.total
            }
          />

          <Stat
            label="Chờ xử lý"
            value={
              stats.pending
            }
          />

          <Stat
            label="Đã phê duyệt"
            value={
              stats.approved
            }
          />

          <Stat
            label="Từ chối"
            value={
              stats.rejected
            }
          />
        </div>

        <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Tìm mã, họ tên, email, SĐT"
              className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm"
            />
          </div>

          <select
            value={status}
            onChange={(
              event,
            ) =>
              setStatus(
                event.target.value,
              )
            }
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">
              Tất cả trạng thái
            </option>

            <option value="CHO_XU_LY">
              Chờ xử lý
            </option>

            <option value="DA_PHE_DUYET">
              Đã phê duyệt
            </option>

            <option value="TU_CHOI">
              Từ chối
            </option>
          </select>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700"
          >
            <RefreshCw
              size={17}
            />

            Làm mới
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2
                size={30}
                className="animate-spin text-[#12345B]"
              />
            </div>
          ) : items.length ===
            0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <UserPlus
                size={38}
                className="text-slate-300"
              />

              <p className="mt-3 text-sm text-slate-500">
                Chưa có đề xuất
                Hội viên.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {items.map(
                (item) => {
                  const chiHoi =
                    typeof item.chiHoiId ===
                    "object"
                      ? item.chiHoiId
                      : null;

                  return (
                    <article
                      key={
                        item._id
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#12345B]">
                              {
                                item.maHoiVien
                              }
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                item.trangThai,
                              )}`}
                            >
                              {statusLabel(
                                item.trangThai,
                              )}
                            </span>
                          </div>

                          <h3 className="mt-3 font-bold text-slate-900">
                            {
                              item.hoTen
                            }
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {chiHoi
                              ? `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`
                              : "Chi hội"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Người đề xuất:{" "}
                            {
                              item.nguoiDeXuatTen
                            }{" "}
                            •{" "}
                            {formatDate(
                              item.createdAt,
                            )}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() =>
                              setSelected(
                                item,
                              )
                            }
                            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700"
                          >
                            <Eye
                              size={
                                16
                              }
                            />

                            Chi tiết
                          </button>

                          {canApprove &&
                            item.trangThai ===
                              "CHO_XU_LY" && (
                              <>
                                <button
                                  type="button"
                                  disabled={
                                    processing
                                  }
                                  onClick={() =>
                                    void approve(
                                      item,
                                    )
                                  }
                                  className="flex h-10 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white"
                                >
                                  <CheckCircle2
                                    size={
                                      16
                                    }
                                  />

                                  Phê duyệt
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    processing
                                  }
                                  onClick={() => {
                                    setRejectTarget(
                                      item,
                                    );

                                    setRejectReason(
                                      "",
                                    );
                                  }}
                                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-600"
                                >
                                  <XCircle
                                    size={
                                      16
                                    }
                                  />

                                  Từ chối
                                </button>
                              </>
                            )}
                        </div>
                      </div>

                      {item.trangThai ===
                        "TU_CHOI" &&
                        item.lyDoTuChoi && (
                          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                            Lý do từ
                            chối:{" "}
                            {
                              item.lyDoTuChoi
                            }
                          </div>
                        )}
                    </article>
                  );
                },
              )}
            </div>
          )}
        </div>
      </div>

      {/* FORM */}

      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4">
          <form
            onSubmit={
              submitProposal
            }
            className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-3xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:px-6">
              <h2 className="text-lg font-bold">
                Đề xuất Hội viên
                mới
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowForm(
                    false,
                  )
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
              <Field
                label="Mã Hội viên"
                value={
                  form.maHoiVien
                }
                required
                onChange={(
                  value,
                ) =>
                  setForm({
                    ...form,

                    maHoiVien:
                      value.toUpperCase(),
                  })
                }
              />

              <Field
                label="Họ tên"
                value={
                  form.hoTen
                }
                required
                onChange={(
                  value,
                ) =>
                  setForm({
                    ...form,
                    hoTen:
                      value,
                  })
                }
              />

              <Field
                label="Ngày sinh"
                value={
                  form.ngaySinh
                }
                type="date"
                onChange={(
                  value,
                ) =>
                  setForm({
                    ...form,
                    ngaySinh:
                      value,
                  })
                }
              />

              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Giới tính
                </span>

                <select
                  value={
                    form.gioiTinh
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      gioiTinh:
                        event
                          .target
                          .value,
                    })
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">
                    Chọn giới tính
                  </option>

                  <option value="NAM">
                    Nam
                  </option>

                  <option value="NU">
                    Nữ
                  </option>

                  <option value="KHAC">
                    Khác
                  </option>
                </select>
              </label>

              <Field
                label="Email"
                value={
                  form.email
                }
                type="email"
                onChange={(
                  value,
                ) =>
                  setForm({
                    ...form,
                    email:
                      value,
                  })
                }
              />

              <Field
                label="Số điện thoại"
                value={
                  form.soDienThoai
                }
                onChange={(
                  value,
                ) =>
                  setForm({
                    ...form,

                    soDienThoai:
                      value.replace(
                        /\D/g,
                        "",
                      ),
                  })
                }
              />

              <Field
                label="Lớp"
                value={
                  form.lop
                }
                onChange={(
                  value,
                ) =>
                  setForm({
                    ...form,
                    lop:
                      value,
                  })
                }
              />

              <Field
                label="Khóa học"
                value={
                  form.khoaHoc
                }
                onChange={(
                  value,
                ) =>
                  setForm({
                    ...form,
                    khoaHoc:
                      value,
                  })
                }
              />

              <div className="sm:col-span-2">
                <Field
                  label="Địa chỉ"
                  value={
                    form.diaChi
                  }
                  onChange={(
                    value,
                  ) =>
                    setForm({
                      ...form,
                      diaChi:
                        value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setShowForm(
                    false,
                  )
                }
                className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-semibold"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={
                  submitting
                }
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#12345B] px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2
                    size={
                      17
                    }
                    className="animate-spin"
                  />
                ) : (
                  <Send
                    size={
                      17
                    }
                  />
                )}

                Gửi đề xuất
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DETAIL */}

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">
                Chi tiết đề xuất
              </h2>

              <button
                type="button"
                onClick={() =>
                  setSelected(
                    null,
                  )
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Detail
                label="Mã Hội viên"
                value={
                  selected.maHoiVien
                }
              />

              <Detail
                label="Họ tên"
                value={
                  selected.hoTen
                }
              />

              <Detail
                label="Ngày sinh"
                value={formatDate(
                  selected.ngaySinh,
                )}
              />

              <Detail
                label="Giới tính"
                value={genderLabel(
                  selected.gioiTinh,
                )}
              />

              <Detail
                label="Email"
                value={
                  selected.email ||
                  "—"
                }
              />

              <Detail
                label="Số điện thoại"
                value={
                  selected.soDienThoai ||
                  "—"
                }
              />

              <Detail
                label="Lớp"
                value={
                  selected.lop ||
                  "—"
                }
              />

              <Detail
                label="Khóa học"
                value={
                  selected.khoaHoc ||
                  "—"
                }
              />

              <div className="sm:col-span-2">
                <Detail
                  label="Địa chỉ"
                  value={
                    selected.diaChi ||
                    "—"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT */}

      {rejectTarget && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4">
          <form
            onSubmit={reject}
            className="w-full rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl sm:p-6"
          >
            <h2 className="text-lg font-bold">
              Từ chối đề xuất
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {
                rejectTarget.hoTen
              }
            </p>

            <textarea
              value={
                rejectReason
              }
              onChange={(
                event,
              ) =>
                setRejectReason(
                  event.target.value,
                )
              }
              rows={4}
              required
              placeholder="Nhập lý do từ chối"
              className="mt-4 w-full resize-none rounded-lg border border-slate-300 p-3 text-sm"
            />

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setRejectTarget(
                    null,
                  )
                }
                className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-semibold"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={
                  processing
                }
                className="h-11 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white"
              >
                Xác nhận từ chối
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 sm:text-sm">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  required = false,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  required?: boolean;
  type?: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold">
        {label}

        {required && (
          <span className="text-red-500">
            {" "}
            *
          </span>
        )}
      </span>

      <input
        type={type}
        value={value}
        required={
          required
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
      />
    </label>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}