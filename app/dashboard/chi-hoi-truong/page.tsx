"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  
  
  
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Unlock,
  UserCog,
  X,
} from "lucide-react";

type ChiHoi = {
  _id: string;
  maChiHoi: string;
  tenChiHoi: string;
};

type ChiHoiTruong = {
  _id: string;

  username: string;
  fullName: string;

  email?: string;
  phone?: string;

  chiHoiId?:
    | ChiHoi
    | string
    | null;

  isActive: boolean;

  createdAt?: string;
};

type FormData = {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  chiHoiId: string;
};

const EMPTY_FORM: FormData = {
  username: "",
  password: "",
  fullName: "",
  email: "",
  phone: "",
  chiHoiId: "",
};

function getChiHoi(
  item: ChiHoiTruong,
): ChiHoi | null {
  if (
    item.chiHoiId &&
    typeof item.chiHoiId ===
      "object"
  ) {
    return item.chiHoiId;
  }

  return null;
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

export default function ChiHoiTruongPage() {
  const [
    items,
    setItems,
  ] =
    useState<ChiHoiTruong[]>(
      [],
    );

  const [
    chiHoiList,
    setChiHoiList,
  ] =
    useState<ChiHoi[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

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
    search,
    setSearch,
  ] = useState("");

  const [
    chiHoiFilter,
    setChiHoiFilter,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editing,
    setEditing,
  ] =
    useState<ChiHoiTruong | null>(
      null,
    );

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
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    detail,
    setDetail,
  ] =
    useState<ChiHoiTruong | null>(
      null,
    );

  const [
    resetTarget,
    setResetTarget,
  ] =
    useState<ChiHoiTruong | null>(
      null,
    );

  const [
    resetPassword,
    setResetPassword,
  ] = useState("");

  const [
    showResetPassword,
    setShowResetPassword,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const loadChiHoi =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/chi-hoi",
            {
              cache:
                "no-store",
            },
          );

        const result =
          await response.json();

        if (
          response.ok &&
          result.success &&
          Array.isArray(
            result.data,
          )
        ) {
          setChiHoiList(
            result.data,
          );
        }
      } catch {
        setChiHoiList([]);
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

        if (chiHoiFilter) {
          query.set(
            "chiHoiId",
            chiHoiFilter,
          );
        }

        if (statusFilter) {
          query.set(
            "status",
            statusFilter,
          );
        }

        const response =
          await fetch(
            `/api/chi-hoi-truong?${query.toString()}`,
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
              "Không thể tải dữ liệu",
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
      chiHoiFilter,
      statusFilter,
    ]);

  useEffect(() => {
    void Promise.all([
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
      loadChiHoi(),
      loadData(),
    ]);
  }, [
    loadChiHoi,
    loadData,
  ]);

  const activeCount =
    useMemo(
      () =>
        items.filter(
          (item) =>
            item.isActive,
        ).length,
      [items],
    );

  function openCreate() {
    setEditing(null);

    setForm(EMPTY_FORM);

    setShowPassword(false);

    setShowForm(true);
  }

  function openEdit(
    item: ChiHoiTruong,
  ) {
    const chiHoi =
      getChiHoi(item);

    setEditing(item);

    setForm({
      username:
        item.username,

      password: "",

      fullName:
        item.fullName,

      email:
        item.email || "",

      phone:
        item.phone || "",

      chiHoiId:
        chiHoi?._id || "",
    });

    setShowForm(true);
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setSubmitting(true);

      setMessage(null);

      const endpoint =
        editing
          ? `/api/chi-hoi-truong/${editing._id}`
          : "/api/chi-hoi-truong";

      const body =
        editing
          ? {
              fullName:
                form.fullName,
              email:
                form.email,
              phone:
                form.phone,
              chiHoiId:
                form.chiHoiId,
            }
          : form;

      const response =
        await fetch(
          endpoint,
          {
            method:
              editing
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                body,
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
            "Không thể lưu dữ liệu",
        );
      }

      setShowForm(false);

      setEditing(null);

      setForm(EMPTY_FORM);

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
            : "Không thể lưu dữ liệu",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(
    item: ChiHoiTruong,
  ) {
    try {
      setActionLoading(true);

      const response =
        await fetch(
          `/api/chi-hoi-truong/${item._id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                isActive:
                  !item.isActive,
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
            "Không thể cập nhật trạng thái",
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
            : "Không thể cập nhật trạng thái",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetPassword(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!resetTarget) {
      return;
    }

    try {
      setActionLoading(true);

      const response =
        await fetch(
          `/api/chi-hoi-truong/${resetTarget._id}/reset-password`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                newPassword:
                  resetPassword,
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
            "Không thể đặt lại mật khẩu",
        );
      }

      setResetTarget(null);

      setResetPassword("");

      setMessage({
        type: "success",
        text:
          result.message,
      });
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể đặt lại mật khẩu",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteItem(
    item: ChiHoiTruong,
  ) {
    const ok =
      window.confirm(
        `Xóa tài khoản Chi hội trưởng ${item.fullName}?`,
      );

    if (!ok) {
      return;
    }

    try {
      setActionLoading(true);

      const response =
        await fetch(
          `/api/chi-hoi-truong/${item._id}`,
          {
            method: "DELETE",
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
            "Không thể xóa",
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
            : "Không thể xóa",
      });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f7fb]">
      <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        {/* HEADER */}

        <div className="mb-5 flex flex-col gap-4 sm:mb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#12345B]">
              Quản trị nhân sự
            </p>

            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
              Quản lý Chi hội
              trưởng
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Quản lý tài khoản,
              Chi hội phụ trách và
              trạng thái hoạt động
              của Chi hội trưởng.
            </p>
          </div>

          <button
            type="button"
            onClick={
              openCreate
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#12345B] px-5 text-sm font-semibold text-white sm:w-auto"
          >
            <Plus size={18} />

            Thêm Chi hội trưởng
          </button>
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

        {/* SUMMARY */}

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <SummaryCard
            title="Tổng Chi hội trưởng"
            value={
              items.length
            }
          />

          <SummaryCard
            title="Đang hoạt động"
            value={
              activeCount
            }
          />
        </div>

        {/* FILTER */}

        <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_180px_auto]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Tìm họ tên, tài khoản, email, SĐT"
              className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm"
            />
          </div>

          <select
            value={
              chiHoiFilter
            }
            onChange={(
              event,
            ) =>
              setChiHoiFilter(
                event.target.value,
              )
            }
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">
              Tất cả Chi hội
            </option>

            {chiHoiList.map(
              (chiHoi) => (
                <option
                  key={
                    chiHoi._id
                  }
                  value={
                    chiHoi._id
                  }
                >
                  {
                    chiHoi.maChiHoi
                  }{" "}
                  -{" "}
                  {
                    chiHoi.tenChiHoi
                  }
                </option>
              ),
            )}
          </select>

          <select
            value={
              statusFilter
            }
            onChange={(
              event,
            ) =>
              setStatusFilter(
                event.target.value,
              )
            }
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">
              Tất cả trạng thái
            </option>

            <option value="ACTIVE">
              Đang hoạt động
            </option>

            <option value="INACTIVE">
              Đã khóa
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

        {/* LIST */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <h2 className="font-bold text-slate-900">
              Danh sách Chi hội
              trưởng
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tổng số:{" "}
              {
                items.length
              }
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2
                size={30}
                className="animate-spin text-[#12345B]"
              />
            </div>
          ) : items.length ===
            0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
              <UserCog
                size={38}
                className="text-slate-300"
              />

              <p className="mt-3 text-sm text-slate-500">
                Chưa có Chi hội
                trưởng.
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE */}

              <div className="grid gap-3 bg-slate-50 p-3 md:grid-cols-2 lg:hidden">
                {items.map(
                  (item) => {
                    const chiHoi =
                      getChiHoi(
                        item,
                      );

                    return (
                      <article
                        key={
                          item._id
                        }
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-slate-900">
                              {
                                item.fullName
                              }
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              @
                              {
                                item.username
                              }
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.isActive
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {item.isActive
                              ? "Hoạt động"
                              : "Đã khóa"}
                          </span>
                        </div>

                        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="font-medium text-slate-700">
                            {chiHoi
                              ? `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`
                              : "Chưa gán Chi hội"}
                          </p>

                          <p className="mt-2 text-slate-500">
                            {item.email ||
                              "Chưa có email"}
                          </p>

                          <p className="mt-1 text-slate-500">
                            {item.phone ||
                              "Chưa có SĐT"}
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <ActionButton
                            icon={
                              <Eye
                                size={
                                  16
                                }
                              />
                            }
                            label="Chi tiết"
                            onClick={() =>
                              setDetail(
                                item,
                              )
                            }
                          />

                          <ActionButton
                            icon={
                              <Pencil
                                size={
                                  16
                                }
                              />
                            }
                            label="Sửa"
                            onClick={() =>
                              openEdit(
                                item,
                              )
                            }
                          />

                          <ActionButton
                            icon={
                              <KeyRound
                                size={
                                  16
                                }
                              />
                            }
                            label="Đặt lại MK"
                            onClick={() => {
                              setResetTarget(
                                item,
                              );

                              setResetPassword(
                                "",
                              );
                            }}
                          />

                          <ActionButton
                            icon={
                              item.isActive ? (
                                <Lock
                                  size={
                                    16
                                  }
                                />
                              ) : (
                                <Unlock
                                  size={
                                    16
                                  }
                                />
                              )
                            }
                            label={
                              item.isActive
                                ? "Khóa"
                                : "Mở khóa"
                            }
                            onClick={() =>
                              void toggleStatus(
                                item,
                              )
                            }
                          />
                        </div>
                      </article>
                    );
                  },
                )}
              </div>

              {/* DESKTOP */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1200px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">
                        Họ tên
                      </th>

                      <th className="px-5 py-3">
                        Tài khoản
                      </th>

                      <th className="px-5 py-3">
                        Chi hội
                      </th>

                      <th className="px-5 py-3">
                        Email
                      </th>

                      <th className="px-5 py-3">
                        SĐT
                      </th>

                      <th className="px-5 py-3">
                        Trạng thái
                      </th>

                      <th className="px-5 py-3 text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {items.map(
                      (item) => {
                        const chiHoi =
                          getChiHoi(
                            item,
                          );

                        return (
                          <tr
                            key={
                              item._id
                            }
                          >
                            <td className="px-5 py-4 font-semibold text-slate-900">
                              {
                                item.fullName
                              }
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {
                                item.username
                              }
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {chiHoi
                                ? `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`
                                : "—"}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {item.email ||
                                "—"}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {item.phone ||
                                "—"}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  item.isActive
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {item.isActive
                                  ? "Hoạt động"
                                  : "Đã khóa"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-1">
                                <IconButton
                                  title="Chi tiết"
                                  onClick={() =>
                                    setDetail(
                                      item,
                                    )
                                  }
                                >
                                  <Eye
                                    size={
                                      17
                                    }
                                  />
                                </IconButton>

                                <IconButton
                                  title="Chỉnh sửa"
                                  onClick={() =>
                                    openEdit(
                                      item,
                                    )
                                  }
                                >
                                  <Pencil
                                    size={
                                      17
                                    }
                                  />
                                </IconButton>

                                <IconButton
                                  title="Reset mật khẩu"
                                  onClick={() => {
                                    setResetTarget(
                                      item,
                                    );

                                    setResetPassword(
                                      "",
                                    );
                                  }}
                                >
                                  <KeyRound
                                    size={
                                      17
                                    }
                                  />
                                </IconButton>

                                <IconButton
                                  title={
                                    item.isActive
                                      ? "Khóa tài khoản"
                                      : "Mở khóa tài khoản"
                                  }
                                  onClick={() =>
                                    void toggleStatus(
                                      item,
                                    )
                                  }
                                >
                                  {item.isActive ? (
                                    <Lock
                                      size={
                                        17
                                      }
                                    />
                                  ) : (
                                    <Unlock
                                      size={
                                        17
                                      }
                                    />
                                  )}
                                </IconButton>

                                <IconButton
                                  title="Xóa"
                                  danger
                                  onClick={() =>
                                    void deleteItem(
                                      item,
                                    )
                                  }
                                >
                                  <Trash2
                                    size={
                                      17
                                    }
                                  />
                                </IconButton>
                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* FORM MODAL */}

      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:px-6">
              <h2 className="text-lg font-bold">
                {editing
                  ? "Cập nhật Chi hội trưởng"
                  : "Thêm Chi hội trưởng"}
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

            <form
              onSubmit={
                handleSubmit
              }
              className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6"
            >
              {!editing && (
                <>
                  <Field
                    label="Tên đăng nhập"
                    value={
                      form.username
                    }
                    onChange={(
                      value,
                    ) =>
                      setForm({
                        ...form,
                        username:
                          value,
                      })
                    }
                  />

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Mật khẩu
                    </label>

                    <div className="relative">
                      <input
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          form.password
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm({
                            ...form,
                            password:
                              event.target
                                .value,
                          })
                        }
                        className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-11 text-sm"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            !showPassword,
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      >
                        {showPassword ? (
                          <EyeOff
                            size={
                              18
                            }
                          />
                        ) : (
                          <Eye
                            size={
                              18
                            }
                          />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <Field
                label="Họ và tên"
                value={
                  form.fullName
                }
                onChange={(
                  value,
                ) =>
                  setForm({
                    ...form,
                    fullName:
                      value,
                  })
                }
              />

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
                  form.phone
                }
                onChange={(
                  value,
                ) =>
                  setForm({
                    ...form,
                    phone:
                      value.replace(
                        /\D/g,
                        "",
                      ),
                  })
                }
              />

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Chi hội phụ
                  trách
                </span>

                <select
                  value={
                    form.chiHoiId
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      chiHoiId:
                        event.target
                          .value,
                    })
                  }
                  required
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">
                    Chọn Chi hội
                  </option>

                  {chiHoiList.map(
                    (
                      chiHoi,
                    ) => (
                      <option
                        key={
                          chiHoi._id
                        }
                        value={
                          chiHoi._id
                        }
                      >
                        {
                          chiHoi.maChiHoi
                        }{" "}
                        -{" "}
                        {
                          chiHoi.tenChiHoi
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:col-span-2 sm:flex-row sm:justify-end">
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
                  {submitting && (
                    <Loader2
                      size={
                        17
                      }
                      className="animate-spin"
                    />
                  )}

                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL */}

      {detail && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4">
          <div className="w-full rounded-t-2xl bg-white p-5 sm:max-w-lg sm:rounded-2xl sm:p-6">
            <div className="flex justify-between">
              <h2 className="text-lg font-bold">
                Chi tiết Chi hội
                trưởng
              </h2>

              <button
                type="button"
                onClick={() =>
                  setDetail(
                    null,
                  )
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <DetailRow
                label="Họ tên"
                value={
                  detail.fullName
                }
              />

              <DetailRow
                label="Tên đăng nhập"
                value={
                  detail.username
                }
              />

              <DetailRow
                label="Email"
                value={
                  detail.email ||
                  "—"
                }
              />

              <DetailRow
                label="Số điện thoại"
                value={
                  detail.phone ||
                  "—"
                }
              />

              <DetailRow
                label="Chi hội"
                value={
                  getChiHoi(
                    detail,
                  )
                    ? `${getChiHoi(detail)!.maChiHoi} - ${getChiHoi(detail)!.tenChiHoi}`
                    : "—"
                }
              />

              <DetailRow
                label="Ngày tạo"
                value={formatDate(
                  detail.createdAt,
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD */}

      {resetTarget && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4">
          <form
            onSubmit={
              handleResetPassword
            }
            className="w-full rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl sm:p-6"
          >
            <h2 className="text-lg font-bold">
              Đặt lại mật khẩu
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {
                resetTarget.fullName
              }
            </p>

            <div className="relative mt-5">
              <input
                type={
                  showResetPassword
                    ? "text"
                    : "password"
                }
                value={
                  resetPassword
                }
                onChange={(
                  event,
                ) =>
                  setResetPassword(
                    event.target.value,
                  )
                }
                placeholder="Mật khẩu mới"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-11 text-sm"
              />

              <button
                type="button"
                onClick={() =>
                  setShowResetPassword(
                    !showResetPassword,
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showResetPassword ? (
                  <EyeOff
                    size={
                      18
                    }
                  />
                ) : (
                  <Eye
                    size={
                      18
                    }
                  />
                )}
              </button>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setResetTarget(
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
                  actionLoading
                }
                className="h-11 rounded-lg bg-[#12345B] px-5 text-sm font-semibold text-white"
              >
                Đặt lại mật khẩu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">
        {title}
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
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold">
        {label}
      </span>

      <input
        type={type}
        value={value}
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

function DetailRow({
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

function IconButton({
  title,
  children,
  danger = false,
  onClick,
}: {
  title: string;
  children:
    React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon:
    React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
    >
      {icon}

      {label}
    </button>
  );
}