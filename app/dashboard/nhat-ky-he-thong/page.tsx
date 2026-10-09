"use client";

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileClock,
  Filter,
  Loader2,
  LogIn,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  useRouter,
} from "next/navigation";

import * as XLSX from "xlsx";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type LogAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "RESET_PASSWORD"
  | "CHANGE_PASSWORD"
  | "BACKUP"
  | "RESTORE"
  | "OTHER";

type LogModule =
  | "AUTH"
  | "CHI_HOI"
  | "HOI_VIEN"
  | "BAN_CHAP_HANH"
  | "HOAT_DONG"
  | "TAI_CHINH"
  | "HOI_PHI"
  | "THONG_BAO"
  | "VAN_KIEN"
  | "HO_TRO"
  | "MINH_CHUNG"
  | "DANH_GIA"
  | "SAO_LUU"
  | "HE_THONG";

type CurrentUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
};

type SystemLog = {
  id: string;
  _id: string;

  userId?: string | null;

  username: string;
  fullName: string;
  role: string;

  action: LogAction;
  module: LogModule;

  description: string;

  targetId?: string;
  targetName?: string;

  metadata?: Record<string, unknown>;

  ipAddress?: string;
  userAgent?: string;

  createdAt?: string | null;
};

type LogStats = {
  tongSo: number;
  dangNhap: number;
  dangXuat: number;
  taoMoi: number;
  capNhat: number;
  xoa: number;
  pheDuyet: number;
  tuChoi: number;
  resetPassword: number;
  changePassword: number;
  saoLuu: number;
  phucHoi: number;
  other: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

type ActionDistribution = {
  action: string;
  total: number;
};

type ModuleDistribution = {
  module: string;
  total: number;
};

type LogData = {
  danhSach: SystemLog[];

  thongKe: LogStats;

  phanBoHanhDong: ActionDistribution[];

  phanBoPhanHe: ModuleDistribution[];

  phanTrang: Pagination;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  user?: CurrentUser;
  data?: unknown;
};

type Filters = {
  search: string;
  role: string;
  action: string;
  module: string;
  tuNgay: string;
  denNgay: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_FILTERS: Filters = {
  search: "",
  role: "",
  action: "",
  module: "",
  tuNgay: "",
  denNgay: "",
};

const ACTION_OPTIONS: Array<{
  value: LogAction;
  label: string;
}> = [
  {
    value: "LOGIN",
    label: "Đăng nhập",
  },
  {
    value: "LOGOUT",
    label: "Đăng xuất",
  },
  {
    value: "CREATE",
    label: "Tạo mới",
  },
  {
    value: "UPDATE",
    label: "Cập nhật",
  },
  {
    value: "DELETE",
    label: "Xóa",
  },
  {
    value: "APPROVE",
    label: "Phê duyệt",
  },
  {
    value: "REJECT",
    label: "Từ chối",
  },
  {
    value: "RESET_PASSWORD",
    label: "Đặt lại mật khẩu",
  },
  {
    value: "CHANGE_PASSWORD",
    label: "Đổi mật khẩu",
  },
  {
    value: "BACKUP",
    label: "Sao lưu",
  },
  {
    value: "RESTORE",
    label: "Phục hồi",
  },
  {
    value: "OTHER",
    label: "Khác",
  },
];

const MODULE_OPTIONS: Array<{
  value: LogModule;
  label: string;
}> = [
  {
    value: "AUTH",
    label: "Xác thực",
  },
  {
    value: "CHI_HOI",
    label: "Chi hội",
  },
  {
    value: "HOI_VIEN",
    label: "Hội viên",
  },
  {
    value: "BAN_CHAP_HANH",
    label: "Ban Chấp hành",
  },
  {
    value: "HOAT_DONG",
    label: "Hoạt động",
  },
  {
    value: "TAI_CHINH",
    label: "Tài chính",
  },
  {
    value: "HOI_PHI",
    label: "Hội phí",
  },
  {
    value: "THONG_BAO",
    label: "Thông báo",
  },
  {
    value: "VAN_KIEN",
    label: "Văn kiện",
  },
  {
    value: "HO_TRO",
    label: "Hỗ trợ",
  },
  {
    value: "MINH_CHUNG",
    label: "Minh chứng",
  },
  {
    value: "DANH_GIA",
    label: "Đánh giá",
  },
  {
    value: "SAO_LUU",
    label: "Sao lưu",
  },
  {
    value: "HE_THONG",
    label: "Hệ thống",
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
    const item =
      value as Record<
        string,
        unknown
      >;

    return String(
      item.id ??
        item._id ??
        item.userId ??
        "",
    );
  }

  return String(
    value,
  );
}

function getActionLabel(
  value: string,
) {
  return (
    ACTION_OPTIONS.find(
      (
        item,
      ) =>
        item.value ===
        value,
    )?.label ||
    value
  );
}

function getModuleLabel(
  value: string,
) {
  return (
    MODULE_OPTIONS.find(
      (
        item,
      ) =>
        item.value ===
        value,
    )?.label ||
    value
  );
}

function getRoleLabel(
  value: string,
) {
  const map: Record<
    string,
    string
  > = {
    ADMIN:
      "Quản trị viên",

    BAN_CHAP_HANH:
      "Ban Chấp hành",

    CHI_HOI_TRUONG:
      "Chi hội trưởng",

    HOI_VIEN:
      "Hội viên",
  };

  return (
    map[value] ||
    value ||
    "Không xác định"
  );
}

function formatDateTime(
  value?: string | null,
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
      second:
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

function actionClass(
  action: LogAction,
) {
  switch (
    action
  ) {
    case "LOGIN":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "LOGOUT":
      return "border-slate-200 bg-slate-50 text-slate-700";

    case "CREATE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "UPDATE":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "DELETE":
      return "border-red-200 bg-red-50 text-red-700";

    case "APPROVE":
      return "border-teal-200 bg-teal-50 text-teal-700";

    case "REJECT":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "RESET_PASSWORD":
    case "CHANGE_PASSWORD":
      return "border-purple-200 bg-purple-50 text-purple-700";

    case "BACKUP":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    case "RESTORE":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function fileDate() {
  const date =
    new Date();

  return [
    date.getFullYear(),
    String(
      date.getMonth() +
        1,
    ).padStart(
      2,
      "0",
    ),
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    ),
  ].join(
    "-",
  );
}

/* =========================================================
   SAFE JSON PARSER

   Quan trọng:
   Không dùng thẳng response.json()
   vì nếu API trả HTML 404 sẽ gây:
   Unexpected token '<'
========================================================= */

async function parseJson(
  response: Response,
): Promise<ApiResponse> {
  const text =
    await response.text();

  if (
    !text.trim()
  ) {
    return {
      success: false,
      message:
        `Máy chủ không trả dữ liệu. HTTP ${response.status}`,
    };
  }

  try {
    return JSON.parse(
      text,
    ) as ApiResponse;
  } catch {
    console.error(
      "Response không phải JSON:",
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
      success: false,
      message:
        `API trả dữ liệu không hợp lệ. HTTP ${response.status}`,
    };
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function NhatKyHeThongPage() {
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
    data,
    setData,
  ] =
    useState<LogData | null>(
      null,
    );

  const [
    filters,
    setFilters,
  ] =
    useState<Filters>({
      ...EMPTY_FILTERS,
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState<Filters>({
      ...EMPTY_FILTERS,
    });

  const [
    page,
    setPage,
  ] =
    useState(
      1,
    );

  const [
    limit,
    setLimit,
  ] =
    useState(
      20,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
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
    detailLog,
    setDetailLog,
  ] =
    useState<SystemLog | null>(
      null,
    );

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
              credentials:
                "include",
              cache:
                "no-store",
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

        if (
          !user ||
          user.role !==
            "ADMIN"
        ) {
          router.replace(
            "/dashboard",
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
     LOAD LOGS
  ======================================================= */

  const loadLogs =
    useCallback(
      async (
        targetPage: number,
        targetLimit: number,
        targetFilters:
          Filters,
        showRefresh =
          false,
      ) => {
        try {
          if (
            showRefresh
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

          params.set(
            "page",
            String(
              targetPage,
            ),
          );

          params.set(
            "limit",
            String(
              targetLimit,
            ),
          );

          if (
            targetFilters.search.trim()
          ) {
            params.set(
              "search",
              targetFilters.search.trim(),
            );
          }

          if (
            targetFilters.role
          ) {
            params.set(
              "role",
              targetFilters.role,
            );
          }

          if (
            targetFilters.action
          ) {
            params.set(
              "action",
              targetFilters.action,
            );
          }

          if (
            targetFilters.module
          ) {
            params.set(
              "module",
              targetFilters.module,
            );
          }

          if (
            targetFilters.tuNgay
          ) {
            params.set(
              "tuNgay",
              targetFilters.tuNgay,
            );
          }

          if (
            targetFilters.denNgay
          ) {
            params.set(
              "denNgay",
              targetFilters.denNgay,
            );
          }

          /*
           * CHỈ DÙNG ENDPOINT NÀY
           */
          const response =
            await fetch(
              `/api/system-log?${params.toString()}`,
              {
                credentials:
                  "include",
                cache:
                  "no-store",
              },
            );

          const result =
            await parseJson(
              response,
            );

          if (
            response.status ===
            401
          ) {
            router.replace(
              "/login",
            );

            return;
          }

          if (
            response.status ===
            403
          ) {
            router.replace(
              "/dashboard",
            );

            return;
          }

          if (
            !response.ok ||
            !result.success ||
            !result.data
          ) {
            throw new Error(
              result.message ||
                "Không thể tải nhật ký hệ thống",
            );
          }

          setData(
            result.data as
              LogData,
          );
        } catch (
          loadError
        ) {
          setData(
            null,
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Không thể tải nhật ký hệ thống",
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
        router,
      ],
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

                await loadLogs(
                  1,
                  20,
                  {
                    ...EMPTY_FILTERS,
                  },
                );
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
      loadLogs,
    ],
  );

  /* =======================================================
     FILTER
  ======================================================= */

  function applyFilters() {
    if (
      filters.tuNgay &&
      filters.denNgay &&
      filters.tuNgay >
        filters.denNgay
    ) {
      setError(
        "Khoảng thời gian không hợp lệ.",
      );

      return;
    }

    const next = {
      ...filters,
    };

    setAppliedFilters(
      next,
    );

    setPage(
      1,
    );

    void loadLogs(
      1,
      limit,
      next,
      true,
    );
  }

  function resetFilters() {
    const next = {
      ...EMPTY_FILTERS,
    };

    setFilters(
      next,
    );

    setAppliedFilters(
      next,
    );

    setPage(
      1,
    );

    setError(
      "",
    );

    void loadLogs(
      1,
      limit,
      next,
      true,
    );
  }

  function changePage(
    nextPage: number,
  ) {
    if (
      !data
    ) {
      return;
    }

    if (
      nextPage <
        1 ||
      nextPage >
        data.phanTrang
          .totalPages
    ) {
      return;
    }

    setPage(
      nextPage,
    );

    void loadLogs(
      nextPage,
      limit,
      appliedFilters,
      true,
    );
  }

  function changeLimit(
    nextLimit: number,
  ) {
    setLimit(
      nextLimit,
    );

    setPage(
      1,
    );

    void loadLogs(
      1,
      nextLimit,
      appliedFilters,
      true,
    );
  }

  /* =======================================================
     EXPORT CURRENT FILTER RESULT
  ======================================================= */

  async function exportLogs() {
    try {
      setRefreshing(
        true,
      );

      setError(
        "",
      );

      const allLogs:
        SystemLog[] = [];

      let exportPage =
        1;

      let totalPages =
        1;

      do {
        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(
            exportPage,
          ),
        );

        params.set(
          "limit",
          "100",
        );

        if (
          appliedFilters.search
        ) {
          params.set(
            "search",
            appliedFilters.search,
          );
        }

        if (
          appliedFilters.role
        ) {
          params.set(
            "role",
            appliedFilters.role,
          );
        }

        if (
          appliedFilters.action
        ) {
          params.set(
            "action",
            appliedFilters.action,
          );
        }

        if (
          appliedFilters.module
        ) {
          params.set(
            "module",
            appliedFilters.module,
          );
        }

        if (
          appliedFilters.tuNgay
        ) {
          params.set(
            "tuNgay",
            appliedFilters.tuNgay,
          );
        }

        if (
          appliedFilters.denNgay
        ) {
          params.set(
            "denNgay",
            appliedFilters.denNgay,
          );
        }

        const response =
          await fetch(
            `/api/system-log?${params.toString()}`,
            {
              credentials:
                "include",
              cache:
                "no-store",
            },
          );

        const result =
          await parseJson(
            response,
          );

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.message ||
              "Không thể xuất nhật ký",
          );
        }

        const exportData =
          result.data as
            LogData;

        allLogs.push(
          ...exportData.danhSach,
        );

        totalPages =
          exportData
            .phanTrang
            .totalPages;

        exportPage +=
          1;
      } while (
        exportPage <=
        totalPages
      );

      if (
        allLogs.length ===
        0
      ) {
        setError(
          "Không có nhật ký để xuất.",
        );

        return;
      }

      const rows =
        allLogs.map(
          (
            item,
            index,
          ) => ({
            STT:
              index +
              1,

            "Thời gian":
              formatDateTime(
                item.createdAt,
              ),

            "Tài khoản":
              item.username,

            "Họ tên":
              item.fullName,

            "Vai trò":
              getRoleLabel(
                item.role,
              ),

            "Hành động":
              getActionLabel(
                item.action,
              ),

            "Phân hệ":
              getModuleLabel(
                item.module,
              ),

            "Nội dung":
              item.description,

            "Đối tượng":
              item.targetName ||
              "",

            "ID đối tượng":
              item.targetId ||
              "",

            IP:
              item.ipAddress ||
              "",

            "User Agent":
              item.userAgent ||
              "",

            Metadata:
              JSON.stringify(
                item.metadata ||
                  {},
              ),
          }),
        );

      const worksheet =
        XLSX.utils.json_to_sheet(
          rows,
        );

      worksheet[
        "!cols"
      ] = [
        { wch: 7 },
        { wch: 22 },
        { wch: 20 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 55 },
        { wch: 30 },
        { wch: 28 },
        { wch: 20 },
        { wch: 50 },
        { wch: 50 },
      ];

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Nhật ký hệ thống",
      );

      XLSX.writeFile(
        workbook,
        `nhat-ky-he-thong-${fileDate()}.xlsx`,
      );
    } catch (
      exportError
    ) {
      setError(
        exportError instanceof
          Error
          ? exportError.message
          : "Không thể xuất nhật ký",
      );
    } finally {
      setRefreshing(
        false,
      );
    }
  }

  /* =======================================================
     DISTRIBUTION
  ======================================================= */

  const maxAction =
    useMemo(
      () =>
        Math.max(
          1,
          ...(
            data
              ?.phanBoHanhDong ??
            []
          ).map(
            (
              item,
            ) =>
              item.total,
          ),
        ),
      [
        data?.phanBoHanhDong,
      ],
    );

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
              Bảo mật hệ thống
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Nhật ký hệ thống
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Theo dõi các thao tác quan trọng phát sinh trên hệ thống phục vụ kiểm tra và giám sát.
            </p>

            {currentUser && (
              <p className="mt-1 text-xs text-slate-400">
                Quyền truy cập:{" "}
                <strong>
                  Quản trị viên
                </strong>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void exportLogs()
              }
              disabled={
                refreshing ||
                !data ||
                data.danhSach
                  .length ===
                  0
              }
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#123b68] px-4 text-sm font-semibold text-white hover:bg-[#0e3158] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download
                size={17}
              />

              Xuất Excel
            </button>

            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadLogs(
                  page,
                  limit,
                  appliedFilters,
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

        {/* ERROR */}

        {error && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>
                {error}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setError(
                  "",
                )
              }
            >
              <X
                size={17}
              />
            </button>
          </div>
        )}

        {/* STATS */}

        {data && (
          <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            <StatCard
              label="Tổng nhật ký"
              value={
                data.thongKe
                  .tongSo
              }
              icon={
                <FileClock
                  size={20}
                />
              }
            />

            <StatCard
              label="Đăng nhập"
              value={
                data.thongKe
                  .dangNhap
              }
              icon={
                <LogIn
                  size={20}
                />
              }
            />

            <StatCard
              label="Tạo mới"
              value={
                data.thongKe
                  .taoMoi
              }
              icon={
                <CheckCircle2
                  size={20}
                />
              }
            />

            <StatCard
              label="Cập nhật"
              value={
                data.thongKe
                  .capNhat
              }
              icon={
                <Activity
                  size={20}
                />
              }
            />

            <StatCard
              label="Xóa"
              value={
                data.thongKe
                  .xoa
              }
              icon={
                <Trash2
                  size={20}
                />
              }
            />

            <StatCard
              label="Phê duyệt"
              value={
                data.thongKe
                  .pheDuyet
              }
              icon={
                <ShieldCheck
                  size={20}
                />
              }
            />

            <StatCard
              label="Từ chối"
              value={
                data.thongKe
                  .tuChoi
              }
              icon={
                <AlertCircle
                  size={20}
                />
              }
            />

            <StatCard
              label="Backup / Restore"
              value={
                data.thongKe
                  .saoLuu +
                data.thongKe
                  .phucHoi
              }
              icon={
                <RefreshCw
                  size={20}
                />
              }
            />
          </section>
        )}

        {/* FILTER */}

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter
              size={18}
              className="text-[#123b68]"
            />

            <h2 className="font-semibold text-slate-900">
              Bộ lọc nhật ký
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
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
                    filters.search
                  }
                  onChange={(
                    event,
                  ) =>
                    setFilters(
                      (
                        current,
                      ) => ({
                        ...current,
                        search:
                          event.target.value,
                      }),
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      applyFilters();
                    }
                  }}
                  placeholder="Người dùng, nội dung, IP..."
                  className="h-11 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-[#123b68]"
                />
              </div>
            </FilterField>

            <FilterField
              label="Vai trò"
            >
              <select
                value={
                  filters.role
                }
                onChange={(
                  event,
                ) =>
                  setFilters(
                    (
                      current,
                    ) => ({
                      ...current,
                      role:
                        event.target.value,
                    }),
                  )
                }
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">
                  Tất cả vai trò
                </option>

                <option value="ADMIN">
                  Quản trị viên
                </option>

                <option value="BAN_CHAP_HANH">
                  Ban Chấp hành
                </option>

                <option value="CHI_HOI_TRUONG">
                  Chi hội trưởng
                </option>

                <option value="HOI_VIEN">
                  Hội viên
                </option>
              </select>
            </FilterField>

            <FilterField
              label="Phân hệ"
            >
              <select
                value={
                  filters.module
                }
                onChange={(
                  event,
                ) =>
                  setFilters(
                    (
                      current,
                    ) => ({
                      ...current,
                      module:
                        event.target.value,
                    }),
                  )
                }
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">
                  Tất cả module
                </option>

                {MODULE_OPTIONS.map(
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

            <FilterField
              label="Thao tác"
            >
              <select
                value={
                  filters.action
                }
                onChange={(
                  event,
                ) =>
                  setFilters(
                    (
                      current,
                    ) => ({
                      ...current,
                      action:
                        event.target.value,
                    }),
                  )
                }
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">
                  Tất cả thao tác
                </option>

                {ACTION_OPTIONS.map(
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

            <FilterField
              label="Từ ngày"
            >
              <input
                type="date"
                value={
                  filters.tuNgay
                }
                onChange={(
                  event,
                ) =>
                  setFilters(
                    (
                      current,
                    ) => ({
                      ...current,
                      tuNgay:
                        event.target.value,
                    }),
                  )
                }
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </FilterField>

            <FilterField
              label="Đến ngày"
            >
              <input
                type="date"
                value={
                  filters.denNgay
                }
                onChange={(
                  event,
                ) =>
                  setFilters(
                    (
                      current,
                    ) => ({
                      ...current,
                      denNgay:
                        event.target.value,
                    }),
                  )
                }
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </FilterField>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={
                resetFilters
              }
              disabled={
                refreshing
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw
                size={15}
              />

              Đặt lại
            </button>

            <button
              type="button"
              onClick={
                applyFilters
              }
              disabled={
                refreshing
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#123b68] px-5 text-sm font-semibold text-white"
            >
              {refreshing ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Filter
                  size={15}
                />
              )}

              Lọc
            </button>
          </div>
        </section>

        {/* ACTION DISTRIBUTION */}

        {data &&
          data.phanBoHanhDong.length >
            0 && (
            <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-950">
                Thống kê thao tác
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.phanBoHanhDong.map(
                  (
                    item,
                  ) => (
                    <DistributionRow
                      key={
                        item.action
                      }
                      label={getActionLabel(
                        item.action,
                      )}
                      value={
                        item.total
                      }
                      max={
                        maxAction
                      }
                    />
                  ),
                )}
              </div>
            </section>
          )}

        {/* TABLE */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">
                Danh sách nhật ký
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {data?.phanTrang.total ??
                  0}{" "}
                bản ghi phù hợp
              </p>
            </div>

            <select
              value={
                limit
              }
              onChange={(
                event,
              ) =>
                changeLimit(
                  Number(
                    event.target.value,
                  ),
                )
              }
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value={10}>
                10 / trang
              </option>

              <option value={20}>
                20 / trang
              </option>

              <option value={50}>
                50 / trang
              </option>

              <option value={100}>
                100 / trang
              </option>
            </select>
          </div>

          {!data ||
          data.danhSach.length ===
            0 ? (
            <div className="py-16 text-center">
              <FileClock
                size={44}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-medium text-slate-600">
                Chưa có nhật ký phù hợp.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      Thời gian
                    </th>

                    <th className="px-4 py-3">
                      Người thực hiện
                    </th>

                    <th className="px-4 py-3">
                      Thao tác
                    </th>

                    <th className="px-4 py-3">
                      Phân hệ
                    </th>

                    <th className="px-4 py-3">
                      Nội dung
                    </th>

                    <th className="px-4 py-3">
                      Đối tượng
                    </th>

                    <th className="px-4 py-3">
                      IP
                    </th>

                    <th className="px-4 py-3 text-right">
                      Chi tiết
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {data.danhSach.map(
                    (
                      item,
                    ) => (
                      <tr
                        key={
                          item.id
                        }
                        className="hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                          {formatDateTime(
                            item.createdAt,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <UserRound
                              size={17}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />

                            <div>
                              <p className="font-semibold text-slate-900">
                                {item.fullName ||
                                  item.username ||
                                  "Hệ thống"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {item.username
                                  ? `@${item.username}`
                                  : "—"}
                                {" • "}
                                {getRoleLabel(
                                  item.role,
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${actionClass(
                              item.action,
                            )}`}
                          >
                            {getActionLabel(
                              item.action,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                            {getModuleLabel(
                              item.module,
                            )}
                          </span>
                        </td>

                        <td className="max-w-[400px] px-4 py-4">
                          <p className="line-clamp-3 leading-6 text-slate-700">
                            {
                              item.description
                            }
                          </p>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          <p className="max-w-[220px] truncate">
                            {item.targetName ||
                              "—"}
                          </p>

                          {item.targetId && (
                            <p className="mt-1 max-w-[220px] truncate text-xs text-slate-400">
                              {
                                item.targetId
                              }
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-slate-600">
                          {item.ipAddress ||
                            "—"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setDetailLog(
                                item,
                              )
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:border-[#123b68] hover:text-[#123b68]"
                          >
                            <Eye
                              size={15}
                            />

                            Xem
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}

          {data &&
            data.phanTrang.total >
              0 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Trang{" "}
                  <strong>
                    {
                      data.phanTrang.page
                    }
                  </strong>{" "}
                  /{" "}
                  <strong>
                    {
                      data.phanTrang.totalPages
                    }
                  </strong>
                  {" • "}
                  {
                    data.phanTrang.total
                  }{" "}
                  bản ghi
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={
                      !data.phanTrang
                        .hasPrevious ||
                      refreshing
                    }
                    onClick={() =>
                      changePage(
                        page -
                          1,
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-40"
                  >
                    <ChevronLeft
                      size={16}
                    />

                    Trước
                  </button>

                  <button
                    type="button"
                    disabled={
                      !data.phanTrang
                        .hasNext ||
                      refreshing
                    }
                    onClick={() =>
                      changePage(
                        page +
                          1,
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-40"
                  >
                    Sau

                    <ChevronRight
                      size={16}
                    />
                  </button>
                </div>
              </div>
            )}
        </section>
      </div>

      {detailLog && (
        <LogDetailModal
          item={
            detailLog
          }
          onClose={() =>
            setDetailLog(
              null,
            )
          }
        />
      )}
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-h-[100px] items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="mt-2 text-2xl font-bold text-slate-950">
          {value}
        </p>
      </div>

      <div className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#123b68]">
        {icon}
      </div>
    </div>
  );
}

function DistributionRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width =
    max >
    0
      ? Math.min(
          100,
          value /
            max *
            100,
        )
      : 0;

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex justify-between gap-3">
        <span className="text-xs font-medium text-slate-600">
          {label}
        </span>

        <span className="text-xs font-bold text-slate-900">
          {value}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#123b68]"
          style={{
            width:
              `${width}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   DETAIL MODAL
========================================================= */

function LogDetailModal({
  item,
  onClose,
}: {
  item: SystemLog;
  onClose: () => void;
}) {
  const metadata =
    useMemo(
      () => {
        try {
          return JSON.stringify(
            item.metadata ||
              {},
            null,
            2,
          );
        } catch {
          return "{}";
        }
      },
      [
        item.metadata,
      ],
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Chi tiết nhật ký
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {formatDateTime(
                item.createdAt,
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X
              size={20}
            />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Info
            label="Người thực hiện"
            value={
              item.fullName ||
              "—"
            }
          />

          <Info
            label="Tài khoản"
            value={
              item.username ||
              "—"
            }
          />

          <Info
            label="Vai trò"
            value={getRoleLabel(
              item.role,
            )}
          />

          <Info
            label="Hành động"
            value={getActionLabel(
              item.action,
            )}
          />

          <Info
            label="Phân hệ"
            value={getModuleLabel(
              item.module,
            )}
          />

          <Info
            label="IP"
            value={
              item.ipAddress ||
              "—"
            }
          />

          <Info
            label="Đối tượng"
            value={
              item.targetName ||
              "—"
            }
          />

          <Info
            label="Target ID"
            value={
              item.targetId ||
              "—"
            }
          />

          <div className="md:col-span-2">
            <Info
              label="Nội dung"
              value={
                item.description
              }
            />
          </div>

          <div className="md:col-span-2">
            <Info
              label="User Agent"
              value={
                item.userAgent ||
                "—"
              }
            />
          </div>

          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Metadata
            </p>

            <pre className="max-h-[350px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {metadata}
            </pre>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={
              onClose
            }
            className="h-10 rounded-lg bg-[#123b68] px-5 text-sm font-semibold text-white"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
        {value}
      </p>
    </div>
  );
}