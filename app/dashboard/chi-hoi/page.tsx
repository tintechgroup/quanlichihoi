"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Award,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import DanhGiaChiHoiModal from "@/components/chi-hoi/DanhGiaChiHoiModal";
import XepLoaiChiHoiBadge from "@/components/chi-hoi/XepLoaiChiHoiBadge";

/* =========================================================
   TYPES
========================================================= */

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

type HoiVien = {
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

  trangThai:
    | "DANG_HOAT_DONG"
    | "TAM_NGUNG";

  taiKhoanId?: string;

  createdAt?: string;
};

type ChiHoi = {
  _id: string;

  maChiHoi: string;
  tenChiHoi: string;

  moTa?: string;

  soLuongThanhVien?: number;

  danhSachHoiVien?: HoiVien[];

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
  type:
    | "success"
    | "error";

  message: string;
};

const initialForm: ChiHoiForm = {
  maChiHoi: "",
  tenChiHoi: "",
  moTa: "",
};

/* =========================================================
   HELPERS
========================================================= */

function formatDateTime(
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

function formatBirthDate(
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
    },
  ).format(date);
}

function getGenderLabel(
  value?: HoiVien["gioiTinh"],
) {
  switch (value) {
    case "NAM":
      return "Nam";

    case "NU":
      return "Nữ";

    case "KHAC":
      return "Khác";

    default:
      return "—";
  }
}

function getMemberStatusLabel(
  value:
    HoiVien["trangThai"],
) {
  return value ===
    "DANG_HOAT_DONG"
    ? "Đang hoạt động"
    : "Tạm ngưng";
}

function escapeCsv(
  value: unknown,
) {
  const text =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  return `"${text.replace(
    /"/g,
    '""',
  )}"`;
}

/* =========================================================
   PAGE
========================================================= */

export default function ChiHoiPage() {
  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null,
    );

  const [
    chiHoiList,
    setChiHoiList,
  ] = useState<ChiHoi[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    notice,
    setNotice,
  ] =
    useState<Notice | null>(
      null,
    );

  /* SEARCH */

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [
    appliedSearch,
    setAppliedSearch,
  ] = useState("");

  /* FORM */

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingChiHoi,
    setEditingChiHoi,
  ] =
    useState<ChiHoi | null>(
      null,
    );

  const [
    formData,
    setFormData,
  ] =
    useState<ChiHoiForm>(
      initialForm,
    );

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  /* DETAIL */

  const [
    detailChiHoi,
    setDetailChiHoi,
  ] =
    useState<ChiHoi | null>(
      null,
    );

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  /* RATING */

  const [
    ratingTarget,
    setRatingTarget,
  ] =
    useState<ChiHoi | null>(
      null,
    );

  /* DELETE */

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<ChiHoi | null>(
      null,
    );

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    deleteError,
    setDeleteError,
  ] = useState("");

  const canManage =
    currentUser?.role ===
    "ADMIN";

  /* =======================================================
     LOAD CURRENT USER
  ======================================================= */

  const loadCurrentUser =
    useCallback(async () => {
      try {
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
                raw.hoTen ??
                "",

              role:
                raw.role,
            });
          }
        }
      } catch {
        // Không chặn trang vì API Chi hội
        // vẫn kiểm tra quyền server-side.
      }
    }, []);

  /* =======================================================
     LOAD CHI HOI
  ======================================================= */

  const loadChiHoi =
    useCallback(
      async (
        keyword = "",
      ) => {
        try {
          setLoading(true);

          setNotice(null);

          const query =
            new URLSearchParams();

          if (
            keyword.trim()
          ) {
            query.set(
              "search",
              keyword.trim(),
            );
          }

          const url =
            query.toString()
              ? `/api/chi-hoi?${query.toString()}`
              : "/api/chi-hoi";

          const response =
            await fetch(
              url,
              {
                method: "GET",
                cache:
                  "no-store",
              },
            );

          const result =
            await response.json();

          if (!response.ok) {
            setNotice({
              type: "error",

              message:
                result.message ||
                "Không thể tải danh sách Chi hội",
            });

            setChiHoiList(
              [],
            );

            return;
          }

          setChiHoiList(
            Array.isArray(
              result.data,
            )
              ? result.data
              : [],
          );
        } catch {
          setNotice({
            type: "error",

            message:
              "Không thể kết nối đến hệ thống",
          });
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void Promise.all([
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
      loadCurrentUser(),

      loadChiHoi(),
    ]);
  }, [
    loadCurrentUser,
    loadChiHoi,
  ]);

  /* =======================================================
     SEARCH
  ======================================================= */

  function handleSearch(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const keyword =
      searchInput.trim();

    setAppliedSearch(
      keyword,
    );

    void loadChiHoi(
      keyword,
    );
  }

  function handleResetSearch() {
    setSearchInput("");

    setAppliedSearch("");

    void loadChiHoi("");
  }

  /* =======================================================
     CREATE / EDIT
  ======================================================= */

  function openCreateForm() {
    setEditingChiHoi(
      null,
    );

    setFormData(
      initialForm,
    );

    setFormError("");

    setShowForm(true);
  }

  function openEditForm(
    chiHoi: ChiHoi,
  ) {
    setEditingChiHoi(
      chiHoi,
    );

    setFormData({
      maChiHoi:
        chiHoi.maChiHoi,

      tenChiHoi:
        chiHoi.tenChiHoi,

      moTa:
        chiHoi.moTa || "",
    });

    setFormError("");

    setShowForm(true);
  }

  function closeForm() {
    if (submitting) {
      return;
    }

    setShowForm(false);

    setEditingChiHoi(
      null,
    );

    setFormData(
      initialForm,
    );

    setFormError("");
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError("");

    setNotice(null);

    const maChiHoi =
      formData.maChiHoi
        .trim()
        .toUpperCase();

    const tenChiHoi =
      formData.tenChiHoi.trim();

    const moTa =
      formData.moTa.trim();

    if (!maChiHoi) {
      setFormError(
        "Vui lòng nhập mã Chi hội",
      );

      return;
    }

    if (!tenChiHoi) {
      setFormError(
        "Vui lòng nhập tên Chi hội",
      );

      return;
    }

    try {
      setSubmitting(true);

      const editingId =
        editingChiHoi?._id;

      const response =
        await fetch(
          editingId
            ? `/api/chi-hoi/${editingId}`
            : "/api/chi-hoi",
          {
            method:
              editingId
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                maChiHoi,
                tenChiHoi,
                moTa,
              }),
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        setFormError(
          result.message ||
            (editingId
              ? "Không thể cập nhật Chi hội"
              : "Không thể thêm Chi hội"),
        );

        return;
      }

      setShowForm(false);

      setEditingChiHoi(
        null,
      );

      setFormData(
        initialForm,
      );

      await loadChiHoi(
        appliedSearch,
      );

      setNotice({
        type: "success",

        message:
          editingId
            ? "Cập nhật Chi hội thành công"
            : "Thêm Chi hội thành công",
      });
    } catch {
      setFormError(
        "Không thể kết nối đến hệ thống",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     DETAIL
  ======================================================= */

  async function openDetail(
    chiHoi: ChiHoi,
  ) {
    try {
      setDetailLoading(
        true,
      );

      setDetailChiHoi(
        chiHoi,
      );

      const response =
        await fetch(
          `/api/chi-hoi/${chiHoi._id}`,
          {
            method: "GET",

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
        setNotice({
          type: "error",

          message:
            result.message ||
            "Không thể tải chi tiết Chi hội",
        });

        setDetailChiHoi(
          null,
        );

        return;
      }

      setDetailChiHoi(
        result.data,
      );
    } catch {
      setNotice({
        type: "error",

        message:
          "Không thể tải chi tiết Chi hội",
      });

      setDetailChiHoi(
        null,
      );
    } finally {
      setDetailLoading(
        false,
      );
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  function openDeleteDialog(
    chiHoi: ChiHoi,
  ) {
    setDeleteTarget(
      chiHoi,
    );

    setDeleteError("");
  }

  function closeDeleteDialog() {
    if (deleting) {
      return;
    }

    setDeleteTarget(
      null,
    );

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

      const response =
        await fetch(
          `/api/chi-hoi/${deleteTarget._id}`,
          {
            method:
              "DELETE",
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        setDeleteError(
          result.message ||
            "Không thể xóa Chi hội",
        );

        return;
      }

      setDeleteTarget(
        null,
      );

      await loadChiHoi(
        appliedSearch,
      );

      setNotice({
        type: "success",

        message:
          "Xóa Chi hội thành công",
      });
    } catch {
      setDeleteError(
        "Không thể kết nối đến hệ thống",
      );
    } finally {
      setDeleting(false);
    }
  }

  /* =======================================================
     EVALUATION
  ======================================================= */

  function handleEvaluationSaved() {
    setNotice({
      type: "success",

      message:
        "Đánh giá Chi hội thành công",
    });

    void loadChiHoi(
      appliedSearch,
    );
  }

  /* =======================================================
     EXPORT
  ======================================================= */

  function exportChiHoiCsv() {
    const rows = [
      [
        "STT",
        "Mã Chi hội",
        "Tên Chi hội",
        "Số thành viên",
        "Xếp loại",
        "Mô tả",
        "Ngày tạo",
      ],

      ...chiHoiList.map(
        (
          chiHoi,
          index,
        ) => [
          index + 1,

          chiHoi.maChiHoi,

          chiHoi.tenChiHoi,

          chiHoi.soLuongThanhVien ??
            0,

          chiHoi.danhGia
            ?.xepLoai ||
            "Chưa đánh giá",

          chiHoi.moTa || "",

          formatDateTime(
            chiHoi.createdAt,
          ),
        ],
      ),
    ];

    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map(
              escapeCsv,
            )
            .join(","),
        )
        .join("\r\n");

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        "a",
      );

    link.href = url;

    link.download =
      "danh-sach-chi-hoi.csv";

    document.body.appendChild(
      link,
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url,
    );
  }

  function exportMembersCsv(
    chiHoi: ChiHoi,
  ) {
    const members =
      chiHoi.danhSachHoiVien ||
      [];

    const rows = [
      [
        "STT",
        "Mã Hội viên",
        "Họ tên",
        "Ngày sinh",
        "Giới tính",
        "Email",
        "Số điện thoại",
        "Lớp",
        "Khóa học",
        "Trạng thái",
      ],

      ...members.map(
        (
          member,
          index,
        ) => [
          index + 1,

          member.maHoiVien,

          member.hoTen,

          formatBirthDate(
            member.ngaySinh,
          ),

          getGenderLabel(
            member.gioiTinh,
          ),

          member.email || "",

          member.soDienThoai ||
            "",

          member.lop || "",

          member.khoaHoc || "",

          getMemberStatusLabel(
            member.trangThai,
          ),
        ],
      ),
    ];

    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map(
              escapeCsv,
            )
            .join(","),
        )
        .join("\r\n");

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        "a",
      );

    link.href = url;

    link.download =
      `hoi-vien-${chiHoi.maChiHoi}.csv`;

    document.body.appendChild(
      link,
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url,
    );
  }

  const totalMembers =
    useMemo(
      () =>
        chiHoiList.reduce(
          (
            sum,
            chiHoi,
          ) =>
            sum +
            (chiHoi.soLuongThanhVien ??
              0),
          0,
        ),
      [chiHoiList],
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#f3f7fb]">
      <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        {/* HEADER */}

        <div className="mb-5 flex flex-col gap-4 sm:mb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#12345B]">
              Quản trị hệ thống
            </p>

            <h1 className="text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
              Quản lý Chi hội
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Quản lý, tìm kiếm
              và xem danh sách Hội
              viên trực thuộc từng
              Chi hội.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={
                exportChiHoiCsv
              }
              disabled={
                chiHoiList.length ===
                0
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
            >
              <Download
                size={18}
              />

              Xuất danh sách
            </button>

            {canManage && (
              <button
                type="button"
                onClick={
                  openCreateForm
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#12345B] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0C2949] sm:w-auto"
              >
                <Plus
                  size={18}
                />

                Thêm Chi hội
              </button>
            )}
          </div>
        </div>

        {/* SUMMARY */}

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Tổng Chi hội
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {
                chiHoiList.length
              }
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Tổng Hội viên trong
              danh sách
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {
                totalMembers
              }
            </p>
          </div>
        </div>

        {/* NOTICE */}

        {notice && (
          <div
            className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              notice.type ===
              "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {notice.type ===
            "success" ? (
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

            <span>
              {
                notice.message
              }
            </span>
          </div>
        )}

        {/* LIST */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
          {/* SEARCH */}

          <div className="border-b border-slate-200 p-4 sm:p-5">
            <form
              onSubmit={
                handleSearch
              }
              className="flex flex-col gap-3 lg:flex-row"
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={
                    searchInput
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearchInput(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Nhập mã hoặc tên Chi hội"
                  className="h-12 w-full rounded-xl border border-slate-300 pl-11 pr-4 text-sm outline-none focus:border-[#12345B] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={
                  loading
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#12345B] px-5 text-sm font-semibold text-white hover:bg-[#0C2949] disabled:opacity-50 lg:w-auto"
              >
                <Search
                  size={18}
                />

                Tìm kiếm
              </button>

              <button
                type="button"
                onClick={
                  handleResetSearch
                }
                disabled={
                  loading
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 lg:w-auto"
              >
                <RefreshCw
                  size={17}
                />

                Làm mới
              </button>
            </form>

            {appliedSearch && (
              <p className="mt-3 text-sm text-slate-500">
                Kết quả tìm kiếm
                cho:{" "}
                <strong className="text-slate-700">
                  {
                    appliedSearch
                  }
                </strong>
              </p>
            )}
          </div>

          {/* TITLE */}

          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Danh sách Chi hội
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Tìm thấy{" "}
                {
                  chiHoiList.length
                }{" "}
                Chi hội
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center p-6">
              <div className="text-center">
                <LoaderCircle
                  size={30}
                  className="mx-auto animate-spin text-[#12345B]"
                />

                <p className="mt-3 text-sm text-slate-500">
                  Đang tải danh
                  sách...
                </p>
              </div>
            </div>
          ) : chiHoiList.length ===
            0 ? (
            <div className="flex min-h-64 items-center justify-center p-6">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#12345B]">
                  <Building2
                    size={24}
                  />
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-900">
                  Không tìm thấy
                  Chi hội
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Hãy thay đổi từ
                  khóa tìm kiếm.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1180px] border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-16 px-5 py-3 text-left text-xs font-bold uppercase text-slate-600">
                        STT
                      </th>

                      <th className="w-32 px-5 py-3 text-left text-xs font-bold uppercase text-slate-600">
                        Mã Chi hội
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-600">
                        Tên Chi hội
                      </th>

                      <th className="w-36 px-5 py-3 text-center text-xs font-bold uppercase text-slate-600">
                        Số thành viên
                      </th>

                      <th className="w-36 px-5 py-3 text-left text-xs font-bold uppercase text-slate-600">
                        Xếp loại
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-600">
                        Mô tả
                      </th>

                      <th className="w-40 px-5 py-3 text-left text-xs font-bold uppercase text-slate-600">
                        Ngày tạo
                      </th>

                      <th className="w-48 px-5 py-3 text-right text-xs font-bold uppercase text-slate-600">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {chiHoiList.map(
                      (
                        chiHoi,
                        index,
                      ) => (
                        <tr
                          key={
                            chiHoi._id
                          }
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {index +
                              1}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-bold text-[#12345B]">
                              {
                                chiHoi.maChiHoi
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                            {
                              chiHoi.tenChiHoi
                            }
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-700">
                              {chiHoi.soLuongThanhVien ??
                                0}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <XepLoaiChiHoiBadge
                              xepLoai={
                                chiHoi
                                  .danhGia
                                  ?.xepLoai
                              }
                            />
                          </td>

                          <td className="max-w-xs px-5 py-4 text-sm text-slate-600">
                            <p className="line-clamp-2">
                              {chiHoi.moTa ||
                                "—"}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDateTime(
                              chiHoi.createdAt,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="Đánh giá"
                                onClick={() =>
                                  setRatingTarget(
                                    chiHoi,
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                              >
                                <Award
                                  size={
                                    18
                                  }
                                />
                              </button>

                              <button
                                type="button"
                                title="Xem chi tiết"
                                onClick={() =>
                                  void openDetail(
                                    chiHoi,
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-blue-50 hover:text-[#12345B]"
                              >
                                <Eye
                                  size={
                                    18
                                  }
                                />
                              </button>

                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    title="Chỉnh sửa"
                                    onClick={() =>
                                      openEditForm(
                                        chiHoi,
                                      )
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-blue-50 hover:text-[#12345B]"
                                  >
                                    <Pencil
                                      size={
                                        18
                                      }
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    title="Xóa"
                                    onClick={() =>
                                      openDeleteDialog(
                                        chiHoi,
                                      )
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2
                                      size={
                                        18
                                      }
                                    />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE/TABLET */}

              <div className="grid gap-3 bg-slate-50 p-3 sm:p-5 md:grid-cols-2 lg:hidden">
                {chiHoiList.map(
                  (
                    chiHoi,
                    index,
                  ) => (
                    <article
                      key={
                        chiHoi._id
                      }
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">
                            Chi hội #
                            {index +
                              1}
                          </p>

                          <h3 className="mt-1 break-words font-bold text-slate-900">
                            {
                              chiHoi.tenChiHoi
                            }
                          </h3>
                        </div>

                        <span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#12345B]">
                          {
                            chiHoi.maChiHoi
                          }
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                        <div>
                          <p className="text-xs text-slate-500">
                            Thành viên
                          </p>

                          <p className="mt-1 text-lg font-bold text-slate-900">
                            {chiHoi.soLuongThanhVien ??
                              0}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Xếp loại
                          </p>

                          <div className="mt-1">
                            <XepLoaiChiHoiBadge
                              xepLoai={
                                chiHoi
                                  .danhGia
                                  ?.xepLoai
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                        {chiHoi.moTa ||
                          "Chưa có mô tả"}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            void openDetail(
                              chiHoi,
                            )
                          }
                          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700"
                        >
                          <Eye
                            size={
                              16
                            }
                          />

                          Chi tiết
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setRatingTarget(
                              chiHoi,
                            )
                          }
                          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-300 text-sm font-semibold text-amber-700"
                        >
                          <Award
                            size={
                              16
                            }
                          />

                          Đánh giá
                        </button>

                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  chiHoi,
                                )
                              }
                              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-300 text-sm font-semibold text-[#12345B]"
                            >
                              <Pencil
                                size={
                                  16
                                }
                              />

                              Sửa
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openDeleteDialog(
                                  chiHoi,
                                )
                              }
                              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-red-300 text-sm font-semibold text-red-700"
                            >
                              <Trash2
                                size={
                                  16
                                }
                              />

                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ),
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===================================================
          CREATE / EDIT MODAL
      =================================================== */}

      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-5">
          <button
            type="button"
            aria-label="Đóng"
            onClick={
              closeForm
            }
            className="absolute inset-0"
          />

          <div className="relative z-10 max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingChiHoi
                    ? "Cập nhật Chi hội"
                    : "Thêm Chi hội mới"}
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X
                  size={20}
                />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5 p-4 sm:p-6"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Mã Chi hội *
                </label>

                <input
                  value={
                    formData.maChiHoi
                  }
                  onChange={(
                    event,
                  ) =>
                    setFormData(
                      (
                        current,
                      ) => ({
                        ...current,

                        maChiHoi:
                          event.target.value.toUpperCase(),
                      }),
                    )
                  }
                  required
                  maxLength={
                    30
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-[#12345B] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Tên Chi hội *
                </label>

                <input
                  value={
                    formData.tenChiHoi
                  }
                  onChange={(
                    event,
                  ) =>
                    setFormData(
                      (
                        current,
                      ) => ({
                        ...current,

                        tenChiHoi:
                          event.target.value,
                      }),
                    )
                  }
                  required
                  className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-[#12345B] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Mô tả
                </label>

                <textarea
                  value={
                    formData.moTa
                  }
                  onChange={(
                    event,
                  ) =>
                    setFormData(
                      (
                        current,
                      ) => ({
                        ...current,

                        moTa:
                          event.target.value,
                      }),
                    )
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#12345B] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {
                    formError
                  }
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    submitting
                  }
                  className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700"
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
                    <LoaderCircle
                      size={
                        17
                      }
                      className="animate-spin"
                    />
                  )}

                  {editingChiHoi
                    ? "Lưu thay đổi"
                    : "Thêm Chi hội"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          DETAIL MODAL
      =================================================== */}

      {detailChiHoi && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Đóng"
            onClick={() =>
              setDetailChiHoi(
                null,
              )
            }
            className="absolute inset-0"
          />

          <div className="relative z-10 flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Chi tiết Chi hội
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    detailChiHoi.maChiHoi
                  }{" "}
                  -{" "}
                  {
                    detailChiHoi.tenChiHoi
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetailChiHoi(
                    null,
                  )
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X
                  size={20}
                />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {detailLoading ? (
                <div className="flex min-h-72 items-center justify-center">
                  <LoaderCircle
                    size={30}
                    className="animate-spin text-[#12345B]"
                  />
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoCard
                      label="Mã Chi hội"
                      value={
                        detailChiHoi.maChiHoi
                      }
                    />

                    <InfoCard
                      label="Tên Chi hội"
                      value={
                        detailChiHoi.tenChiHoi
                      }
                    />

                    <InfoCard
                      label="Số Hội viên"
                      value={String(
                        detailChiHoi.soLuongThanhVien ??
                          0,
                      )}
                    />

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Xếp loại
                      </p>

                      <div className="mt-2">
                        <XepLoaiChiHoiBadge
                          xepLoai={
                            detailChiHoi
                              .danhGia
                              ?.xepLoai
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Mô tả
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {detailChiHoi.moTa ||
                        "Chưa có mô tả"}
                    </p>
                  </div>

                  {/* MEMBER HEADER */}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Danh sách Hội
                        viên
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Tổng số:{" "}
                        {
                          detailChiHoi
                            .danhSachHoiVien
                            ?.length
                        }{" "}
                        Hội viên
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={
                        !detailChiHoi
                          .danhSachHoiVien
                          ?.length
                      }
                      onClick={() =>
                        exportMembersCsv(
                          detailChiHoi,
                        )
                      }
                      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      <Download
                        size={
                          16
                        }
                      />

                      Xuất Hội viên
                    </button>
                  </div>

                  {!detailChiHoi
                    .danhSachHoiVien
                    ?.length ? (
                    <div className="mt-4 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-center">
                      <Users
                        size={32}
                        className="text-slate-300"
                      />

                      <p className="mt-3 text-sm text-slate-500">
                        Chi hội chưa
                        có Hội viên.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* MEMBER MOBILE */}

                      <div className="mt-4 grid gap-3 md:hidden">
                        {detailChiHoi.danhSachHoiVien.map(
                          (
                            member,
                          ) => (
                            <div
                              key={
                                member._id
                              }
                              className="rounded-xl border border-slate-200 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-bold text-slate-900">
                                    {
                                      member.hoTen
                                    }
                                  </p>

                                  <p className="mt-1 text-xs font-semibold text-[#12345B]">
                                    {
                                      member.maHoiVien
                                    }
                                  </p>
                                </div>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    member.trangThai ===
                                    "DANG_HOAT_DONG"
                                      ? "bg-green-50 text-green-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {getMemberStatusLabel(
                                    member.trangThai,
                                  )}
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                <MemberValue
                                  label="Giới tính"
                                  value={getGenderLabel(
                                    member.gioiTinh,
                                  )}
                                />

                                <MemberValue
                                  label="Ngày sinh"
                                  value={formatBirthDate(
                                    member.ngaySinh,
                                  )}
                                />

                                <MemberValue
                                  label="Lớp"
                                  value={
                                    member.lop ||
                                    "—"
                                  }
                                />

                                <MemberValue
                                  label="Khóa học"
                                  value={
                                    member.khoaHoc ||
                                    "—"
                                  }
                                />

                                <div className="col-span-2">
                                  <MemberValue
                                    label="Email"
                                    value={
                                      member.email ||
                                      "—"
                                    }
                                  />
                                </div>

                                <div className="col-span-2">
                                  <MemberValue
                                    label="Số điện thoại"
                                    value={
                                      member.soDienThoai ||
                                      "—"
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>

                      {/* MEMBER DESKTOP */}

                      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                        <table className="w-full min-w-[1050px]">
                          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                            <tr>
                              <th className="px-4 py-3">
                                STT
                              </th>

                              <th className="px-4 py-3">
                                Mã Hội viên
                              </th>

                              <th className="px-4 py-3">
                                Họ tên
                              </th>

                              <th className="px-4 py-3">
                                Giới tính
                              </th>

                              <th className="px-4 py-3">
                                Ngày sinh
                              </th>

                              <th className="px-4 py-3">
                                Email
                              </th>

                              <th className="px-4 py-3">
                                SĐT
                              </th>

                              <th className="px-4 py-3">
                                Lớp
                              </th>

                              <th className="px-4 py-3">
                                Trạng thái
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-200">
                            {detailChiHoi.danhSachHoiVien.map(
                              (
                                member,
                                index,
                              ) => (
                                <tr
                                  key={
                                    member._id
                                  }
                                >
                                  <td className="px-4 py-3 text-sm text-slate-500">
                                    {index +
                                      1}
                                  </td>

                                  <td className="px-4 py-3 text-sm font-semibold text-[#12345B]">
                                    {
                                      member.maHoiVien
                                    }
                                  </td>

                                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                    {
                                      member.hoTen
                                    }
                                  </td>

                                  <td className="px-4 py-3 text-sm text-slate-600">
                                    {getGenderLabel(
                                      member.gioiTinh,
                                    )}
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                                    {formatBirthDate(
                                      member.ngaySinh,
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-sm text-slate-600">
                                    {member.email ||
                                      "—"}
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                                    {member.soDienThoai ||
                                      "—"}
                                  </td>

                                  <td className="px-4 py-3 text-sm text-slate-600">
                                    {member.lop ||
                                      "—"}
                                  </td>

                                  <td className="px-4 py-3">
                                    <span
                                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                                        member.trangThai ===
                                        "DANG_HOAT_DONG"
                                          ? "bg-green-50 text-green-700"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {getMemberStatusLabel(
                                        member.trangThai,
                                      )}
                                    </span>
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE */}

      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-5">
          <button
            type="button"
            className="absolute inset-0"
            onClick={
              closeDeleteDialog
            }
          />

          <div className="relative z-10 w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6">
            <AlertTriangle
              size={28}
              className="text-red-600"
            />

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Xóa Chi hội
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Bạn có chắc chắn
              muốn xóa{" "}

              <strong>
                {
                  deleteTarget.tenChiHoi
                }
              </strong>
              ?
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Chi hội đang có Hội
              viên sẽ không được
              phép xóa.
            </p>

            {deleteError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {
                  deleteError
                }
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={
                  closeDeleteDialog
                }
                disabled={
                  deleting
                }
                className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() =>
                  void confirmDelete()
                }
                disabled={
                  deleting
                }
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting && (
                  <LoaderCircle
                    size={
                      17
                    }
                    className="animate-spin"
                  />
                )}

                Xóa Chi hội
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RATING */}

      {ratingTarget && (
        <DanhGiaChiHoiModal
          chiHoi={
            ratingTarget
          }
          onClose={() =>
            setRatingTarget(
              null,
            )
          }
          onSaved={
            handleEvaluationSaved
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function InfoCard({
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

      <p className="mt-2 break-words text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function MemberValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words font-medium text-slate-700">
        {value}
      </p>
    </div>
  );
}