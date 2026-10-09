"use client";

import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  Clock3,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  
  Users,
  X,
  XCircle,
} from "lucide-react";

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type TrangThai =
  | "CHO_DUYET"
  | "DA_DUYET"
  | "TU_CHOI";

type XepLoai =
  | "XUAT_SAC"
  | "TOT"
  | "KHA"
  | "TRUNG_BINH"
  | "YEU";

type CurrentUser = {
  id: string;

  username: string;

  fullName: string;

  role: UserRole;
};

type ChiHoi = {
  _id?: string;

  id?: string;

  maChiHoi?: string;

  tenChiHoi?: string;
};

type HoiVien = {
  _id: string;

  maHoiVien: string;

  hoTen: string;

  lop?: string;

  khoaHoc?: string;

  chiHoiId?:
    | ChiHoi
    | string
    | null;
};

type UserRef = {
  _id?: string;

  id?: string;

  username?: string;

  fullName?: string;

  role?: UserRole;
};

type DiemRenLuyen = {
  _id: string;

  hoiVienId:
    | HoiVien
    | string;

  chiHoiId:
    | ChiHoi
    | string;

  hocKy: string;

  namHoc: string;

  diem: number;

  xepLoai: XepLoai;

  nhanXet?: string;

  trangThai: TrangThai;

  nguoiDeXuatId?:
    | UserRef
    | string;

  nguoiDuyetId?:
    | UserRef
    | string
    | null;

  ngayDuyet?: string | null;

  lyDoTuChoi?: string;

  createdAt?: string;

  updatedAt?: string;
};

type ThongKe = {
  tongSo: number;

  choDuyet: number;

  daDuyet: number;

  tuChoi: number;

  diemTrungBinh: number;
};

type ApiResponse = {
  success: boolean;

  message?: string;

  data?: unknown;

  user?: CurrentUser;
};

type FormData = {
  hoiVienId: string;

  hocKy: string;

  namHoc: string;

  diem: string;

  xepLoai: XepLoai;

  nhanXet: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_FORM: FormData = {
  hoiVienId: "",

  hocKy: "HK1",

  namHoc: "",

  diem: "",

  xepLoai: "TOT",

  nhanXet: "",
};

const XEP_LOAI_OPTIONS: Array<{
  value: XepLoai;

  label: string;
}> = [
  {
    value: "XUAT_SAC",

    label: "Xuất sắc",
  },

  {
    value: "TOT",

    label: "Tốt",
  },

  {
    value: "KHA",

    label: "Khá",
  },

  {
    value: "TRUNG_BINH",

    label: "Trung bình",
  },

  {
    value: "YEU",

    label: "Yếu",
  },
];

const TRANG_THAI_OPTIONS: Array<{
  value: TrangThai;

  label: string;
}> = [
  {
    value: "CHO_DUYET",

    label: "Chờ duyệt",
  },

  {
    value: "DA_DUYET",

    label: "Đã duyệt",
  },

  {
    value: "TU_CHOI",

    label: "Từ chối",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function getId(
  value: unknown,
) {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    typeof value ===
    "object"
  ) {
    const record =
      value as Record<
        string,
        unknown
      >;

    return String(
      record._id ??
        record.id ??
        "",
    );
  }

  return String(
    value,
  );
}

function getHoiVien(
  value:
    | HoiVien
    | string,
) {
  if (
    value &&
    typeof value ===
      "object"
  ) {
    return value;
  }

  return null;
}

function getChiHoi(
  value:
    | ChiHoi
    | string
    | null
    | undefined,
) {
  if (
    value &&
    typeof value ===
      "object"
  ) {
    return value;
  }

  return null;
}

function getUser(
  value:
    | UserRef
    | string
    | null
    | undefined,
) {
  if (
    value &&
    typeof value ===
      "object"
  ) {
    return value;
  }

  return null;
}

function formatDateTime(
  value?:
    string
    | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

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
      hour:
        "2-digit",

      minute:
        "2-digit",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}

function getXepLoaiLabel(
  value:
    string,
) {
  return (
    XEP_LOAI_OPTIONS.find(
      (
        item,
      ) =>
        item.value ===
        value,
    )?.label ||
    value
  );
}

function getTrangThaiLabel(
  value:
    string,
) {
  return (
    TRANG_THAI_OPTIONS.find(
      (
        item,
      ) =>
        item.value ===
        value,
    )?.label ||
    value
  );
}

function normalizeSearch(
  value:
    unknown,
) {
  return String(
    value ??
      "",
  )
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /đ/g,
      "d",
    )
    .replace(
      /Đ/g,
      "D",
    )
    .toLowerCase()
    .trim();
}

/* =========================================================
   API PARSER
========================================================= */

async function parseJson(
  response:
    Response,
): Promise<ApiResponse> {
  const text =
    await response.text();

  if (
    !text.trim()
  ) {
    return {
      success:
        false,

      message:
        `API không trả dữ liệu. HTTP ${response.status}`,
    };
  }

  try {
    return JSON.parse(
      text,
    ) as ApiResponse;
  } catch {
    console.error(
      "API không trả JSON:",
      {
        url:
          response.url,

        status:
          response.status,

        body:
          text.slice(
            0,
            500,
          ),
      },
    );

    return {
      success:
        false,

      message:
        `Dữ liệu máy chủ trả về không hợp lệ. HTTP ${response.status}`,
    };
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function DiemRenLuyenPage() {
  const router =
    useRouter();

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null,
    );

  const [
    danhSach,
    setDanhSach,
  ] =
    useState<
      DiemRenLuyen[]
    >([]);

  const [
    hoiVienList,
    setHoiVienList,
  ] =
    useState<
      HoiVien[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    submitting,
    setSubmitting,
  ] =
    useState(
      false,
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState(
      "",
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      "",
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const [
    hocKyFilter,
    setHocKyFilter,
  ] =
    useState(
      "",
    );

  const [
    namHocFilter,
    setNamHocFilter,
  ] =
    useState(
      "",
    );

  const [
    trangThaiFilter,
    setTrangThaiFilter,
  ] =
    useState(
      "",
    );

  const [
    thongKe,
    setThongKe,
  ] =
    useState<ThongKe>({
      tongSo:
        0,

      choDuyet:
        0,

      daDuyet:
        0,

      tuChoi:
        0,

      diemTrungBinh:
        0,
    });

  const [
    showCreate,
    setShowCreate,
  ] =
    useState(
      false,
    );

  const [
    form,
    setForm,
  ] =
    useState<FormData>({
      ...EMPTY_FORM,
    });

  const [
    approveTarget,
    setApproveTarget,
  ] =
    useState<DiemRenLuyen | null>(
      null,
    );

  const [
    rejectTarget,
    setRejectTarget,
  ] =
    useState<DiemRenLuyen | null>(
      null,
    );

  const [
    rejectReason,
    setRejectReason,
  ] =
    useState(
      "",
    );

  const canApprove =
    currentUser?.role ===
      "ADMIN" ||
    currentUser?.role ===
      "BAN_CHAP_HANH";

  const canCreate =
    currentUser?.role ===
      "ADMIN" ||
    currentUser?.role ===
      "BAN_CHAP_HANH" ||
    currentUser?.role ===
      "CHI_HOI_TRUONG";

  /* =======================================================
     CURRENT USER
  ======================================================= */

  const loadCurrentUser =
    useCallback(
      async () => {
        const response =
          await fetch(
            "/api/auth/me",
            {
              cache:
                "no-store",

              credentials:
                "include",
            },
          );

        const result =
          await parseJson(
            response,
          );

        if (
          response.status ===
            401 ||
          !result.success
        ) {
          router.replace(
            "/login",
          );

          return null;
        }

        let user =
          result.user;

        if (
          !user &&
          result.data &&
          typeof result.data ===
            "object"
        ) {
          const raw =
            result.data as Record<
              string,
              unknown
            >;

          const source =
            raw.user &&
            typeof raw.user ===
              "object"
              ? raw.user as Record<
                  string,
                  unknown
                >
              : raw;

          user = {
            id:
              getId(
                source.id ??
                  source._id ??
                  source.userId,
              ),

            username:
              String(
                source.username ??
                  "",
              ),

            fullName:
              String(
                source.fullName ??
                  source.hoTen ??
                  source.username ??
                  "",
              ),

            role:
              String(
                source.role ??
                  "",
              ) as
                UserRole,
          };
        }

        if (!user) {
          router.replace(
            "/login",
          );

          return null;
        }

        setCurrentUser(
          user,
        );

        return user;
      },
      [
        router,
      ],
    );

  /* =======================================================
     LOAD DIEM REN LUYEN
  ======================================================= */

  const loadDiemRenLuyen =
    useCallback(
      async (
        refresh =
          false,
      ) => {
        try {
          if (
            refresh
          ) {
            setRefreshing(
              true,
            );
          } else {
            setLoading(
              true,
            );
          }

          setError(
            "",
          );

          const params =
            new URLSearchParams();

          if (
            hocKyFilter
          ) {
            params.set(
              "hocKy",
              hocKyFilter,
            );
          }

          if (
            namHocFilter.trim()
          ) {
            params.set(
              "namHoc",
              namHocFilter.trim(),
            );
          }

          if (
            trangThaiFilter
          ) {
            params.set(
              "trangThai",
              trangThaiFilter,
            );
          }

          const response =
            await fetch(
              `/api/diem-ren-luyen?${params.toString()}`,
              {
                cache:
                  "no-store",

                credentials:
                  "include",
              },
            );

          const result =
            await parseJson(
              response,
            );

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ||
                "Không thể tải điểm rèn luyện",
            );
          }

          const data =
            result.data as
              | {
                  danhSach?:
                    DiemRenLuyen[];

                  thongKe?:
                    ThongKe;
                }
              | undefined;

          setDanhSach(
            Array.isArray(
              data?.danhSach,
            )
              ? data.danhSach
              : [],
          );

          if (
            data?.thongKe
          ) {
            setThongKe(
              data.thongKe,
            );
          } else {
            setThongKe({
              tongSo:
                0,

              choDuyet:
                0,

              daDuyet:
                0,

              tuChoi:
                0,

              diemTrungBinh:
                0,
            });
          }
        } catch (
          loadError
        ) {
          setDanhSach(
            [],
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Không thể tải dữ liệu điểm rèn luyện",
          );
        } finally {
          setLoading(
            false,
          );

          setRefreshing(
            false,
          );
        }
      },
      [
        hocKyFilter,
        namHocFilter,
        trangThaiFilter,
      ],
    );

  /* =======================================================
     LOAD HOI VIEN
  ======================================================= */

  const loadHoiVien =
    useCallback(
      async (
        user:
          CurrentUser,
      ) => {
        if (
          user.role ===
          "HOI_VIEN"
        ) {
          setHoiVienList(
            [],
          );

          return;
        }

        try {
          const response =
            await fetch(
              "/api/hoi-vien",
              {
                cache:
                  "no-store",

                credentials:
                  "include",
              },
            );

          const result =
            await parseJson(
              response,
            );

          if (
            !response.ok ||
            !result.success
          ) {
            return;
          }

          if (
            Array.isArray(
              result.data,
            )
          ) {
            setHoiVienList(
              result.data as
                HoiVien[],
            );

            return;
          }

          if (
            result.data &&
            typeof result.data ===
              "object"
          ) {
            const raw =
              result.data as Record<
                string,
                unknown
              >;

            const list =
              raw.danhSach ??
              raw.data ??
              raw.items;

            if (
              Array.isArray(
                list,
              )
            ) {
              setHoiVienList(
                list as
                  HoiVien[],
              );
            }
          }
        } catch (
          loadError
        ) {
          console.error(
            "Không tải được Hội viên:",
            loadError,
          );
        }
      },
      [],
    );

  /* =======================================================
     INITIAL
  ======================================================= */

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            void (
              async () => {
                const user =
                  await loadCurrentUser();

                if (!user) {
                  return;
                }

                await Promise.all([
                  loadHoiVien(
                    user,
                  ),

                  loadDiemRenLuyen(),
                ]);
              }
            )();
          },
          0,
        );

      return () => {
        window.clearTimeout(
          timer,
        );
      };
    },
    [
      loadCurrentUser,
      loadDiemRenLuyen,
      loadHoiVien,
    ],
  );

  /* =======================================================
     SEARCH LOCAL
  ======================================================= */

  const filtered =
    useMemo(
      () => {
        const keyword =
          normalizeSearch(
            search,
          );

        if (!keyword) {
          return danhSach;
        }

        return danhSach.filter(
          (
            item,
          ) => {
            const hoiVien =
              getHoiVien(
                item.hoiVienId,
              );

            const chiHoi =
              getChiHoi(
                item.chiHoiId,
              );

            const content =
              [
                hoiVien?.maHoiVien,
                hoiVien?.hoTen,
                hoiVien?.lop,
                hoiVien?.khoaHoc,
                chiHoi?.maChiHoi,
                chiHoi?.tenChiHoi,
                item.hocKy,
                item.namHoc,
                item.diem,
                getXepLoaiLabel(
                  item.xepLoai,
                ),
                getTrangThaiLabel(
                  item.trangThai,
                ),
              ]
                .map(
                  normalizeSearch,
                )
                .join(
                  " ",
                );

            return content.includes(
              keyword,
            );
          },
        );
      },
      [
        danhSach,
        search,
      ],
    );

  /* =======================================================
     CREATE
  ======================================================= */

  function openCreateForm() {
    setError(
      "",
    );

    setMessage(
      "",
    );

    setForm({
      ...EMPTY_FORM,

      namHoc:
        "",
    });

    setShowCreate(
      true,
    );
  }

  async function handleCreate(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !form.hoiVienId
    ) {
      setError(
        "Vui lòng chọn Hội viên.",
      );

      return;
    }

    if (
      !form.hocKy
    ) {
      setError(
        "Vui lòng chọn học kỳ.",
      );

      return;
    }

    if (
      !form.namHoc.trim()
    ) {
      setError(
        "Vui lòng nhập năm học.",
      );

      return;
    }

    const diem =
      Number(
        form.diem,
      );

    if (
      !Number.isFinite(
        diem,
      ) ||
      diem <
        0 ||
      diem >
        100
    ) {
      setError(
        "Điểm rèn luyện phải từ 0 đến 100.",
      );

      return;
    }

    try {
      setSubmitting(
        true,
      );

      setError(
        "",
      );

      setMessage(
        "",
      );

      const response =
        await fetch(
          "/api/diem-ren-luyen",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                hoiVienId:
                  form.hoiVienId,

                hocKy:
                  form.hocKy,

                namHoc:
                  form.namHoc.trim(),

                diem,

                xepLoai:
                  form.xepLoai,

                nhanXet:
                  form.nhanXet.trim(),
              }),
          },
        );

      const result =
        await parseJson(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể lưu điểm rèn luyện",
        );
      }

      setShowCreate(
        false,
      );

      setForm({
        ...EMPTY_FORM,
      });

      setMessage(
        result.message ||
          "Lưu điểm rèn luyện thành công.",
      );

      await loadDiemRenLuyen(
        true,
      );
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Không thể lưu điểm rèn luyện",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     APPROVE
  ======================================================= */

  async function handleApprove() {
    if (
      !approveTarget
    ) {
      return;
    }

    try {
      setSubmitting(
        true,
      );

      setError(
        "",
      );

      setMessage(
        "",
      );

      const response =
        await fetch(
          `/api/diem-ren-luyen/${approveTarget._id}`,
          {
            method:
              "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                trangThai:
                  "DA_DUYET",
              }),
          },
        );

      const result =
        await parseJson(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể duyệt điểm rèn luyện",
        );
      }

      setApproveTarget(
        null,
      );

      setMessage(
        result.message ||
          "Duyệt điểm rèn luyện thành công.",
      );

      await loadDiemRenLuyen(
        true,
      );
    } catch (
      approveError
    ) {
      setError(
        approveError instanceof
          Error
          ? approveError.message
          : "Không thể duyệt điểm rèn luyện",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     REJECT
  ======================================================= */

  async function handleReject() {
    if (
      !rejectTarget
    ) {
      return;
    }

    if (
      !rejectReason.trim()
    ) {
      setError(
        "Vui lòng nhập lý do từ chối.",
      );

      return;
    }

    try {
      setSubmitting(
        true,
      );

      setError(
        "",
      );

      setMessage(
        "",
      );

      const response =
        await fetch(
          `/api/diem-ren-luyen/${rejectTarget._id}`,
          {
            method:
              "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                trangThai:
                  "TU_CHOI",

                lyDoTuChoi:
                  rejectReason.trim(),
              }),
          },
        );

      const result =
        await parseJson(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể từ chối điểm rèn luyện",
        );
      }

      setRejectTarget(
        null,
      );

      setRejectReason(
        "",
      );

      setMessage(
        result.message ||
          "Đã từ chối điểm rèn luyện.",
      );

      await loadDiemRenLuyen(
        true,
      );
    } catch (
      rejectError
    ) {
      setError(
        rejectError instanceof
          Error
          ? rejectError.message
          : "Không thể từ chối điểm rèn luyện",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     RESET FILTERS
  ======================================================= */

  function resetFilters() {
    setSearch(
      "",
    );

    setHocKyFilter(
      "",
    );

    setNamHocFilter(
      "",
    );

    setTrangThaiFilter(
      "",
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2
          size={36}
          className="animate-spin text-[#123b68]"
        />
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-full bg-[#f4f7fb] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1700px]">
        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123b68]">
              Rèn luyện Hội viên
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Điểm rèn luyện
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {currentUser?.role ===
              "HOI_VIEN"
                ? "Theo dõi kết quả điểm rèn luyện và trạng thái xét duyệt của bạn."
                : currentUser?.role ===
                    "CHI_HOI_TRUONG"
                  ? "Đề xuất điểm rèn luyện cho Hội viên thuộc Chi hội và theo dõi kết quả xét duyệt."
                  : "Quản lý, xét duyệt và theo dõi kết quả rèn luyện của Hội viên."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canCreate && (
              <button
                type="button"
                onClick={
                  openCreateForm
                }
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#123b68] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0e3158]"
              >
                <Plus
                  size={17}
                />

                {currentUser?.role ===
                "CHI_HOI_TRUONG"
                  ? "Đề xuất điểm"
                  : "Thêm điểm"}
              </button>
            )}

            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadDiemRenLuyen(
                  true,
                )
              }
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Làm mới
            </button>
          </div>
        </div>

        {/* NOTICES */}

        {error && (
          <Notice
            type="error"
            onClose={() =>
              setError(
                "",
              )
            }
          >
            {error}
          </Notice>
        )}

        {message && (
          <Notice
            type="success"
            onClose={() =>
              setMessage(
                "",
              )
            }
          >
            {message}
          </Notice>
        )}

        {/* STATS */}

        <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Tổng hồ sơ"
            value={
              thongKe.tongSo
            }
            icon={
              <Users
                size={20}
              />
            }
          />

          <StatCard
            label="Chờ duyệt"
            value={
              thongKe.choDuyet
            }
            icon={
              <Clock3
                size={20}
              />
            }
          />

          <StatCard
            label="Đã duyệt"
            value={
              thongKe.daDuyet
            }
            icon={
              <CheckCircle2
                size={20}
              />
            }
          />

          <StatCard
            label="Từ chối"
            value={
              thongKe.tuChoi
            }
            icon={
              <XCircle
                size={20}
              />
            }
          />

          <StatCard
            label="Điểm trung bình"
            value={
              thongKe.diemTrungBinh.toFixed(
                2,
              )
            }
            icon={
              <Star
                size={20}
              />
            }
          />
        </section>

        {/* FILTER */}

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter
              size={18}
              className="text-[#123b68]"
            />

            <h2 className="font-semibold text-slate-900">
              Bộ lọc
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <FilterField
              label="Tìm kiếm"
            >
              <div className="relative">
                <Search
                  size={16}
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
                  placeholder="Mã, họ tên, lớp..."
                  className="h-11 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-[#123b68]"
                />
              </div>
            </FilterField>

            <FilterField
              label="Học kỳ"
            >
              <select
                value={
                  hocKyFilter
                }
                onChange={(
                  event,
                ) =>
                  setHocKyFilter(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">
                  Tất cả học kỳ
                </option>

                <option value="HK1">
                  Học kỳ 1
                </option>

                <option value="HK2">
                  Học kỳ 2
                </option>

                <option value="HE">
                  Học kỳ hè
                </option>
              </select>
            </FilterField>

            <FilterField
              label="Năm học"
            >
              <input
                value={
                  namHocFilter
                }
                onChange={(
                  event,
                ) =>
                  setNamHocFilter(
                    event.target.value,
                  )
                }
                placeholder="VD: 2026-2027"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#123b68]"
              />
            </FilterField>

            <FilterField
              label="Trạng thái"
            >
              <select
                value={
                  trangThaiFilter
                }
                onChange={(
                  event,
                ) =>
                  setTrangThaiFilter(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">
                  Tất cả
                </option>

                {TRANG_THAI_OPTIONS.map(
                  (
                    item,
                  ) => (
                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      {
                        item.label
                      }
                    </option>
                  ),
                )}
              </select>
            </FilterField>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw
                  size={15}
                />

                Đặt lại
              </button>

              <button
                type="button"
                onClick={() =>
                  void loadDiemRenLuyen(
                    true,
                  )
                }
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#123b68] px-3 text-sm font-semibold text-white"
              >
                <Filter
                  size={15}
                />

                Lọc
              </button>
            </div>
          </div>
        </section>

        {/* TABLE */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-950">
              Danh sách điểm rèn luyện
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filtered.length} kết quả
            </p>
          </div>

          {filtered.length ===
          0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1300px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      Hội viên
                    </th>

                    <th className="px-4 py-3">
                      Chi hội
                    </th>

                    <th className="px-4 py-3 text-center">
                      Học kỳ
                    </th>

                    <th className="px-4 py-3 text-center">
                      Điểm
                    </th>

                    <th className="px-4 py-3">
                      Xếp loại
                    </th>

                    <th className="px-4 py-3">
                      Trạng thái
                    </th>

                    <th className="px-4 py-3">
                      Người đề xuất
                    </th>

                    <th className="px-4 py-3">
                      Nhận xét
                    </th>

                    {canApprove && (
                      <th className="px-4 py-3 text-right">
                        Thao tác
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filtered.map(
                    (
                      item,
                    ) => {
                      const hoiVien =
                        getHoiVien(
                          item.hoiVienId,
                        );

                      const chiHoi =
                        getChiHoi(
                          item.chiHoiId,
                        );

                      const creator =
                        getUser(
                          item.nguoiDeXuatId,
                        );

                      return (
                        <tr
                          key={
                            item._id
                          }
                          className="hover:bg-slate-50/70"
                        >
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-900">
                              {hoiVien?.hoTen ||
                                "—"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {hoiVien?.maHoiVien ||
                                "—"}

                              {hoiVien?.lop
                                ? ` • ${hoiVien.lop}`
                                : ""}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {chiHoi
                              ? `${chiHoi.maChiHoi || ""}${chiHoi.maChiHoi && chiHoi.tenChiHoi ? " - " : ""}${chiHoi.tenChiHoi || ""}`
                              : "—"}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <p className="font-medium">
                              {
                                item.hocKy
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                item.namHoc
                              }
                            </p>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className="text-xl font-bold text-[#123b68]">
                              {
                                item.diem
                              }
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <XepLoaiBadge
                              value={
                                item.xepLoai
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <TrangThaiBadge
                              value={
                                item.trangThai
                              }
                            />

                            {item.trangThai ===
                              "TU_CHOI" &&
                              item.lyDoTuChoi && (
                                <p className="mt-2 max-w-[220px] text-xs text-red-600">
                                  {
                                    item.lyDoTuChoi
                                  }
                                </p>
                              )}
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {creator?.fullName ||
                              creator?.username ||
                              "—"}

                            <p className="mt-1 text-xs text-slate-400">
                              {formatDateTime(
                                item.createdAt,
                              )}
                            </p>
                          </td>

                          <td className="max-w-[280px] px-4 py-4 text-slate-600">
                            <p className="line-clamp-3">
                              {item.nhanXet ||
                                "—"}
                            </p>
                          </td>

                          {canApprove && (
                            <td className="px-4 py-4">
                              {item.trangThai ===
                              "CHO_DUYET" ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setApproveTarget(
                                        item,
                                      )
                                    }
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                                  >
                                    <Check
                                      size={15}
                                    />

                                    Duyệt
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectReason(
                                        "",
                                      );

                                      setRejectTarget(
                                        item,
                                      );
                                    }}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                                  >
                                    <X
                                      size={15}
                                    />

                                    Từ chối
                                  </button>
                                </div>
                              ) : (
                                <div className="text-right text-xs text-slate-400">
                                  {item.ngayDuyet
                                    ? formatDateTime(
                                        item.ngayDuyet,
                                      )
                                    : "Đã xử lý"}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* CREATE MODAL */}

      {showCreate && (
        <Modal
          title={
            currentUser?.role ===
            "CHI_HOI_TRUONG"
              ? "Đề xuất điểm rèn luyện"
              : "Thêm điểm rèn luyện"
          }
          onClose={() => {
            if (
              !submitting
            ) {
              setShowCreate(
                false,
              );
            }
          }}
        >
          <form
            onSubmit={
              handleCreate
            }
            className="space-y-4"
          >
            <FormField
              label="Hội viên"
              required
            >
              <select
                required
                value={
                  form.hoiVienId
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      hoiVienId:
                        event.target.value,
                    }),
                  )
                }
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">
                  -- Chọn Hội viên --
                </option>

                {hoiVienList.map(
                  (
                    member,
                  ) => {
                    const chiHoi =
                      getChiHoi(
                        member.chiHoiId,
                      );

                    return (
                      <option
                        key={
                          member._id
                        }
                        value={
                          member._id
                        }
                      >
                        {
                          member.maHoiVien
                        }{" "}
                        -{" "}
                        {
                          member.hoTen
                        }

                        {chiHoi?.maChiHoi
                          ? ` - ${chiHoi.maChiHoi}`
                          : ""}
                      </option>
                    );
                  },
                )}
              </select>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Học kỳ"
                required
              >
                <select
                  required
                  value={
                    form.hocKy
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        hocKy:
                          event.target.value,
                      }),
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="HK1">
                    Học kỳ 1
                  </option>

                  <option value="HK2">
                    Học kỳ 2
                  </option>

                  <option value="HE">
                    Học kỳ hè
                  </option>
                </select>
              </FormField>

              <FormField
                label="Năm học"
                required
              >
                <input
                  required
                  value={
                    form.namHoc
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        namHoc:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="VD: 2026-2027"
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Điểm rèn luyện"
                required
              >
                <input
                  required
                  type="number"
                  min={0}
                  max={100}
                  value={
                    form.diem
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        diem:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="0 - 100"
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </FormField>

              <FormField
                label="Xếp loại"
                required
              >
                <select
                  required
                  value={
                    form.xepLoai
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        xepLoai:
                          event.target.value as
                            XepLoai,
                      }),
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  {XEP_LOAI_OPTIONS.map(
                    (
                      item,
                    ) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </FormField>
            </div>

            <FormField
              label="Nhận xét"
            >
              <textarea
                rows={5}
                maxLength={2000}
                value={
                  form.nhanXet
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      nhanXet:
                        event.target.value,
                    }),
                  )
                }
                placeholder="Nhập nhận xét về quá trình rèn luyện..."
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#123b68]"
              />
            </FormField>

            {currentUser?.role ===
              "CHI_HOI_TRUONG" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Điểm do Chi hội trưởng đề xuất sẽ ở trạng thái
                <strong> Chờ duyệt </strong>
                cho đến khi BCH hoặc Quản trị viên xác nhận.
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={() =>
                  setShowCreate(
                    false,
                  )
                }
                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={
                  submitting
                }
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#123b68] px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                {currentUser?.role ===
                "CHI_HOI_TRUONG"
                  ? "Gửi đề xuất"
                  : "Lưu điểm"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* APPROVE */}

      {approveTarget && (
        <ConfirmModal
          icon={
            <ShieldCheck
              size={30}
              className="text-emerald-600"
            />
          }
          title="Duyệt điểm rèn luyện"
          confirmText="Duyệt điểm"
          confirmClass="bg-emerald-600 hover:bg-emerald-700"
          loading={
            submitting
          }
          onCancel={() =>
            setApproveTarget(
              null,
            )
          }
          onConfirm={
            handleApprove
          }
        >
          <p className="text-sm leading-6 text-slate-600">
            Xác nhận duyệt điểm{" "}
            <strong>
              {
                approveTarget.diem
              }
            </strong>{" "}
            cho Hội viên{" "}
            <strong>
              {getHoiVien(
                approveTarget.hoiVienId,
              )?.hoTen ||
                "này"}
            </strong>
            ?
          </p>
        </ConfirmModal>
      )}

      {/* REJECT */}

      {rejectTarget && (
        <Modal
          title="Từ chối điểm rèn luyện"
          onClose={() => {
            if (
              !submitting
            ) {
              setRejectTarget(
                null,
              );

              setRejectReason(
                "",
              );
            }
          }}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Bạn đang từ chối điểm rèn luyện của{" "}
              <strong>
                {getHoiVien(
                  rejectTarget.hoiVienId,
                )?.hoTen ||
                  "Hội viên"}
              </strong>
              .
            </div>

            <FormField
              label="Lý do từ chối"
              required
            >
              <textarea
                rows={5}
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
                placeholder="Nhập lý do từ chối..."
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
              />
            </FormField>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={() => {
                  setRejectTarget(
                    null,
                  );

                  setRejectReason(
                    "",
                  );
                }}
                className="h-10 rounded-lg border border-slate-300 px-4 text-sm"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={() =>
                  void handleReject()
                }
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                Từ chối
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function Notice({
  type,

  children,

  onClose,
}: {
  type:
    "success"
    | "error";

  children:
    ReactNode;

  onClose:
    () => void;
}) {
  const success =
    type ===
    "success";

  return (
    <div
      className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {success ? (
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />
        ) : (
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />
        )}

        {children}
      </div>

      <button
        type="button"
        onClick={
          onClose
        }
      >
        <X
          size={17}
        />
      </button>
    </div>
  );
}

function StatCard({
  label,

  value,

  icon,
}: {
  label:
    string;

  value:
    number
    | string;

  icon:
    ReactNode;
}) {
  return (
    <div className="flex min-h-[105px] items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="mt-2 text-2xl font-bold text-slate-950">
          {value}
        </p>
      </div>

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#123b68]">
        {icon}
      </div>
    </div>
  );
}

function FilterField({
  label,

  children,
}: {
  label:
    string;

  children:
    ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </span>

      {children}
    </label>
  );
}

function FormField({
  label,

  required = false,

  children,
}: {
  label:
    string;

  required?:
    boolean;

  children:
    ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
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

function XepLoaiBadge({
  value,
}: {
  value:
    XepLoai;
}) {
  let className =
    "border-slate-200 bg-slate-50 text-slate-700";

  if (
    value ===
    "XUAT_SAC"
  ) {
    className =
      "border-purple-200 bg-purple-50 text-purple-700";
  }

  if (
    value ===
    "TOT"
  ) {
    className =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value ===
    "KHA"
  ) {
    className =
      "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    value ===
    "TRUNG_BINH"
  ) {
    className =
      "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    value ===
    "YEU"
  ) {
    className =
      "border-red-200 bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {getXepLoaiLabel(
        value,
      )}
    </span>
  );
}

function TrangThaiBadge({
  value,
}: {
  value:
    TrangThai;
}) {
  if (
    value ===
    "DA_DUYET"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2
          size={13}
        />

        Đã duyệt
      </span>
    );
  }

  if (
    value ===
    "TU_CHOI"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        <XCircle
          size={13}
        />

        Từ chối
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <Clock3
        size={13}
      />

      Chờ duyệt
    </span>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <Award
        size={44}
        className="mx-auto text-slate-300"
      />

      <p className="mt-3 text-sm font-medium text-slate-600">
        Chưa có dữ liệu điểm rèn luyện
      </p>

      <p className="mt-1 text-xs text-slate-400">
        Dữ liệu mới sẽ xuất hiện tại đây.
      </p>
    </div>
  );
}

function Modal({
  title,

  children,

  onClose,
}: {
  title:
    string;

  children:
    ReactNode;

  onClose:
    () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-slate-950">
            {title}
          </h2>

          <button
            type="button"
            onClick={
              onClose
            }
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X
              size={19}
            />
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  icon,

  title,

  children,

  confirmText,

  confirmClass,

  loading,

  onCancel,

  onConfirm,
}: {
  icon:
    ReactNode;

  title:
    string;

  children:
    ReactNode;

  confirmText:
    string;

  confirmClass:
    string;

  loading:
    boolean;

  onCancel:
    () => void;

  onConfirm:
    () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
          {icon}
        </div>

        <h2 className="mt-4 text-lg font-bold text-slate-950">
          {title}
        </h2>

        <div className="mt-2">
          {children}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              onCancel
            }
            className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium"
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              onConfirm
            }
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-50 ${confirmClass}`}
          >
            {loading && (
              <Loader2
                size={16}
                className="animate-spin"
              />
            )}

            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}