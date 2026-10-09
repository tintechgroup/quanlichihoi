"use client";

import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  useRouter,
} from "next/navigation";

import QuanLyNguoiThamGiaModal from "@/components/hoat-dong/QuanLyNguoiThamGiaModal";
import LichSuThamGiaModal from "@/components/hoat-dong/LichSuThamGiaModal";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type TrangThaiHoatDong =
  | "CHO_DUYET"
  | "DA_DUYET"
  | "TU_CHOI"
  | "SAP_DIEN_RA"
  | "DANG_DIEN_RA"
  | "DA_KET_THUC"
  | "DA_HUY";

type PhamViHoatDong =
  | "LIEN_CHI_HOI"
  | "CHI_HOI";

type TrangThaiDangKy =
  | "DA_DANG_KY"
  | "DA_THAM_GIA"
  | "VANG_MAT"
  | "VANG_CO_LY_DO"
  | "DA_HUY";

interface CurrentUser {
  id: string;

  username: string;

  fullName: string;

  role: UserRole;
}

interface ChiHoi {
  id?: string;

  _id?: string;

  maChiHoi: string;

  tenChiHoi: string;
}

interface HoatDong {
  id?: string;

  _id?: string;

  maHoatDong: string;

  tenHoatDong: string;

  phamVi: PhamViHoatDong;

  chiHoiId?:
    | ChiHoi
    | string
    | null;

  chiHoi?:
    | ChiHoi
    | null;

  donViToChuc?: string;

  diaDiem: string;

  thoiGianBatDau: string;

  thoiGianKetThuc: string;

  hanDangKy?: string;

  soLuongToiDa?:
    | number
    | null;

  moTa?: string;

  noiDung?: string;

  trangThai:
    TrangThaiHoatDong;

  createdAt?: string;

  updatedAt?: string;
}

interface DangKyCuaToi {
  id?: string;

  _id?: string;

  trangThaiDangKy:
    TrangThaiDangKy;

  trangThai?:
    TrangThaiDangKy;

  hoatDong:
    HoatDong;

  hoatDongId?:
    HoatDong
    | null;

  thoiGianDangKy?:
    string;

  thoiGianHuy?:
    string
    | null;

  thoiGianDiemDanh?:
    string
    | null;

  lyDoHuy?:
    string;

  lyDoVang?:
    string;

  ghiChu?:
    string;
}

interface ApiResponse {
  success: boolean;

  message?: string;

  user?:
    CurrentUser;

  data?:
    unknown;

  activities?:
    HoatDong[];
}

interface FormData {
  maHoatDong:
    string;

  tenHoatDong:
    string;

  phamVi:
    PhamViHoatDong;

  chiHoiId:
    string;

  donViToChuc:
    string;

  diaDiem:
    string;

  thoiGianBatDau:
    string;

  thoiGianKetThuc:
    string;

  hanDangKy:
    string;

  soLuongToiDa:
    string;

  moTa:
    string;

  noiDung:
    string;

  trangThai:
    TrangThaiHoatDong;
}

interface MessageState {
  type:
    | "success"
    | "error";

  text:
    string;
}

interface ConfirmState {
  type:
    | "delete"
    | "status"
    | "register"
    | "cancel-registration";

  activity:
    HoatDong;

  nextStatus?:
    TrangThaiHoatDong;
}

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_FORM:
  FormData = {
  maHoatDong:
    "",

  tenHoatDong:
    "",

  phamVi:
    "CHI_HOI",

  chiHoiId:
    "",

  donViToChuc:
    "",

  diaDiem:
    "",

  thoiGianBatDau:
    "",

  thoiGianKetThuc:
    "",

  hanDangKy:
    "",

  soLuongToiDa:
    "",

  moTa:
    "",

  noiDung:
    "",

  trangThai:
    "CHO_DUYET",
};

const STATUS_OPTIONS:
  Array<{
    value:
      TrangThaiHoatDong;

    label:
      string;
  }> = [
    {
      value:
        "CHO_DUYET",

      label:
        "Chờ phê duyệt",
    },

    {
      value:
        "DA_DUYET",

      label:
        "Đã duyệt",
    },

    {
      value:
        "TU_CHOI",

      label:
        "Từ chối",
    },

    {
      value:
        "SAP_DIEN_RA",

      label:
        "Sắp diễn ra",
    },

    {
      value:
        "DANG_DIEN_RA",

      label:
        "Đang triển khai",
    },

    {
      value:
        "DA_KET_THUC",

      label:
        "Đã kết thúc",
    },

    {
      value:
        "DA_HUY",

      label:
        "Đã hủy",
    },
  ];

/*
 * Giữ tương thích với component
 * QuanLyNguoiThamGiaModal hiện tại.
 */
const ParticipantModal =
  QuanLyNguoiThamGiaModal as React.ComponentType<
    Record<
      string,
      unknown
    >
  >;

/* =========================================================
   HELPERS
========================================================= */

function getId(
  value?:
    | string
    | {
        id?: string;

        _id?: string;
      }
    | null,
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

  return (
    value.id ||
    value._id ||
    ""
  );
}

function getActivityChiHoi(
  activity:
    HoatDong,
): ChiHoi | null {
  if (
    activity.chiHoi
  ) {
    return activity.chiHoi;
  }

  if (
    activity.chiHoiId &&
    typeof activity.chiHoiId ===
      "object"
  ) {
    return activity.chiHoiId;
  }

  return null;
}

function getChiHoiId(
  activity:
    HoatDong,
) {
  if (
    activity.chiHoiId
  ) {
    return getId(
      activity.chiHoiId,
    );
  }

  return getId(
    activity.chiHoi,
  );
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

function toDateTimeLocal(
  value?:
    string
    | null,
) {
  if (!value) {
    return "";
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
    return "";
  }

  const timezoneOffset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() -
      timezoneOffset,
  )
    .toISOString()
    .slice(
      0,
      16,
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

function getStatusLabel(
  status?:
    TrangThaiHoatDong,
) {
  return (
    STATUS_OPTIONS.find(
      (
        item,
      ) =>
        item.value ===
        status,
    )?.label ||
    "Chưa xác định"
  );
}

function getStatusClass(
  status?:
    TrangThaiHoatDong,
) {
  switch (
    status
  ) {
    case "CHO_DUYET":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "DA_DUYET":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "TU_CHOI":
      return "border-red-200 bg-red-50 text-red-700";

    case "SAP_DIEN_RA":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";

    case "DANG_DIEN_RA":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "DA_KET_THUC":
      return "border-slate-300 bg-slate-100 text-slate-700";

    case "DA_HUY":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getRegistrationLabel(
  status?:
    TrangThaiDangKy,
) {
  switch (
    status
  ) {
    case "DA_DANG_KY":
      return "Đã đăng ký";

    case "DA_THAM_GIA":
      return "Đã tham gia";

    case "VANG_MAT":
      return "Vắng mặt";

    case "VANG_CO_LY_DO":
      return "Vắng có lý do";

    case "DA_HUY":
      return "Đã hủy";

    default:
      return "Chưa đăng ký";
  }
}

function getRegistrationClass(
  status?:
    TrangThaiDangKy,
) {
  switch (
    status
  ) {
    case "DA_DANG_KY":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "DA_THAM_GIA":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "VANG_MAT":
      return "border-red-200 bg-red-50 text-red-700";

    case "VANG_CO_LY_DO":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "DA_HUY":
      return "border-slate-300 bg-slate-100 text-slate-600";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

/* =========================================================
   API DATA EXTRACTORS
========================================================= */

function extractActivities(
  result:
    ApiResponse,
): HoatDong[] {
  if (
    Array.isArray(
      result.data,
    )
  ) {
    return result.data as
      HoatDong[];
  }

  if (
    result.data &&
    typeof result.data ===
      "object"
  ) {
    const objectData =
      result.data as {
        danhSach?:
          HoatDong[];

        activities?:
          HoatDong[];

        hoatDong?:
          HoatDong[];

        data?:
          HoatDong[];
      };

    if (
      Array.isArray(
        objectData.danhSach,
      )
    ) {
      return objectData.danhSach;
    }

    if (
      Array.isArray(
        objectData.activities,
      )
    ) {
      return objectData.activities;
    }

    if (
      Array.isArray(
        objectData.hoatDong,
      )
    ) {
      return objectData.hoatDong;
    }

    if (
      Array.isArray(
        objectData.data,
      )
    ) {
      return objectData.data;
    }
  }

  if (
    Array.isArray(
      result.activities,
    )
  ) {
    return result.activities;
  }

  return [];
}

function extractChiHoi(
  result:
    ApiResponse,
): ChiHoi[] {
  if (
    Array.isArray(
      result.data,
    )
  ) {
    return result.data as
      ChiHoi[];
  }

  if (
    result.data &&
    typeof result.data ===
      "object"
  ) {
    const objectData =
      result.data as {
        danhSach?:
          ChiHoi[];

        chiHoi?:
          ChiHoi[];

        data?:
          ChiHoi[];
      };

    if (
      Array.isArray(
        objectData.danhSach,
      )
    ) {
      return objectData.danhSach;
    }

    if (
      Array.isArray(
        objectData.chiHoi,
      )
    ) {
      return objectData.chiHoi;
    }

    if (
      Array.isArray(
        objectData.data,
      )
    ) {
      return objectData.data;
    }
  }

  return [];
}

/*
 * API /api/hoat-dong/cua-toi mới trả:
 *
 * data.danhSach[]
 * {
 *   hoatDong,
 *   hoatDongId,
 *   trangThai,
 *   ...
 * }
 *
 * Trong khi page cũ dùng:
 *
 * registration.trangThaiDangKy
 *
 * Hàm này chuẩn hóa cả hai cấu trúc.
 */
function extractRegistrations(
  result:
    ApiResponse,
): DangKyCuaToi[] {
  if (
    !result.data ||
    typeof result.data !==
      "object"
  ) {
    return [];
  }

  const objectData =
    result.data as {
      danhSach?:
        Array<
          Record<
            string,
            unknown
          >
        >;

      dangKy?:
        Array<
          Record<
            string,
            unknown
          >
        >;

      registrations?:
        Array<
          Record<
            string,
            unknown
          >
        >;
    };

  const rawList =
    objectData.danhSach ??
    objectData.dangKy ??
    objectData.registrations ??
    [];

  if (
    !Array.isArray(
      rawList,
    )
  ) {
    return [];
  }

  return rawList
    .map(
      (
        raw,
      ): DangKyCuaToi | null => {
        const activity =
          (
            raw.hoatDong ??
            raw.hoatDongId
          ) as
            | HoatDong
            | null
            | undefined;

        if (
          !activity ||
          typeof activity !==
            "object"
        ) {
          return null;
        }

        const status =
          String(
            raw.trangThaiDangKy ??
              raw.trangThai ??
              "",
          ) as
            TrangThaiDangKy;

        if (
          ![
            "DA_DANG_KY",
            "DA_THAM_GIA",
            "VANG_MAT",
            "VANG_CO_LY_DO",
            "DA_HUY",
          ].includes(
            status,
          )
        ) {
          return null;
        }

        return {
          id:
            String(
              raw.id ??
                raw._id ??
                "",
            ),

          _id:
            String(
              raw._id ??
                raw.id ??
                "",
            ),

          trangThaiDangKy:
            status,

          trangThai:
            status,

          hoatDong:
            activity,

          hoatDongId:
            activity,

          thoiGianDangKy:
            typeof raw.thoiGianDangKy ===
            "string"
              ? raw.thoiGianDangKy
              : undefined,

          thoiGianHuy:
            typeof raw.thoiGianHuy ===
            "string"
              ? raw.thoiGianHuy
              : null,

          thoiGianDiemDanh:
            typeof raw.thoiGianDiemDanh ===
            "string"
              ? raw.thoiGianDiemDanh
              : null,

          lyDoHuy:
            typeof raw.lyDoHuy ===
            "string"
              ? raw.lyDoHuy
              : "",

          lyDoVang:
            typeof raw.lyDoVang ===
            "string"
              ? raw.lyDoVang
              : "",

          ghiChu:
            typeof raw.ghiChu ===
            "string"
              ? raw.ghiChu
              : "",
        };
      },
    )
    .filter(
      (
        item,
      ): item is DangKyCuaToi =>
        item !==
        null,
    );
}

async function parseApiResponse(
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
        `Máy chủ không trả dữ liệu. HTTP ${response.status}`,
    };
  }

  try {
    return JSON.parse(
      text,
    ) as
      ApiResponse;
  } catch {
    console.error(
      "API trả dữ liệu không hợp lệ:",
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

export default function HoatDongPage() {
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
    activities,
    setActivities,
  ] =
    useState<HoatDong[]>(
      [],
    );

  const [
    chiHoiList,
    setChiHoiList,
  ] =
    useState<ChiHoi[]>(
      [],
    );

  const [
    registrations,
    setRegistrations,
  ] =
    useState<DangKyCuaToi[]>(
      [],
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
    submitting,
    setSubmitting,
  ] =
    useState(
      false,
    );

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(
      false,
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const [
    scopeFilter,
    setScopeFilter,
  ] =
    useState(
      "",
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState(
      "",
    );

  const [
    message,
    setMessage,
  ] =
    useState<MessageState | null>(
      null,
    );

  const [
    showFormModal,
    setShowFormModal,
  ] =
    useState(
      false,
    );

  const [
    editingActivity,
    setEditingActivity,
  ] =
    useState<HoatDong | null>(
      null,
    );

  const [
    detailActivity,
    setDetailActivity,
  ] =
    useState<HoatDong | null>(
      null,
    );

  const [
    participantActivity,
    setParticipantActivity,
  ] =
    useState<HoatDong | null>(
      null,
    );

  const [
    showHistoryModal,
    setShowHistoryModal,
  ] =
    useState(
      false,
    );

  const [
    confirmState,
    setConfirmState,
  ] =
    useState<ConfirmState | null>(
      null,
    );

  const [
    formData,
    setFormData,
  ] =
    useState<FormData>({
      ...EMPTY_FORM,
    });

  const isMember =
    currentUser?.role ===
    "HOI_VIEN";

  const canManage =
    currentUser?.role ===
      "ADMIN" ||
    currentUser?.role ===
      "BAN_CHAP_HANH" ||
    currentUser?.role ===
      "CHI_HOI_TRUONG";

  const canDelete =
    currentUser?.role ===
    "ADMIN";

  /* =======================================================
     LOAD CURRENT USER
  ======================================================= */

  const loadCurrentUser =
    useCallback(
      async () => {
        const response =
          await fetch(
            "/api/auth/me",
            {
              method:
                "GET",

              credentials:
                "include",

              cache:
                "no-store",
            },
          );

        const result =
          await parseApiResponse(
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
          const data =
            result.data as
              Record<
                string,
                unknown
              >;

          const source =
            data.user &&
            typeof data.user ===
              "object"
              ? data.user as
                  Record<
                    string,
                    unknown
                  >
              : data;

          const role =
            String(
              source.role ??
                "",
            ) as
              UserRole;

          if (
            [
              "ADMIN",
              "BAN_CHAP_HANH",
              "CHI_HOI_TRUONG",
              "HOI_VIEN",
            ].includes(
              role,
            )
          ) {
            user = {
              id:
                String(
                  source.id ??
                    source._id ??
                    source.userId ??
                    "",
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

              role,
            };
          }
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
     LOAD ACTIVITIES
  ======================================================= */

  const loadActivities =
    useCallback(
      async () => {
        const response =
          await fetch(
            "/api/hoat-dong",
            {
              method:
                "GET",

              credentials:
                "include",

              cache:
                "no-store",
            },
          );

        const result =
          await parseApiResponse(
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
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Không thể tải danh sách hoạt động",
          );
        }

        setActivities(
          extractActivities(
            result,
          ),
        );
      },
      [
        router,
      ],
    );

  /* =======================================================
     LOAD CHI HOI
  ======================================================= */

  const loadChiHoi =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/chi-hoi",
              {
                method:
                  "GET",

                credentials:
                  "include",

                cache:
                  "no-store",
              },
            );

          const result =
            await parseApiResponse(
              response,
            );

          if (
            response.ok &&
            result.success
          ) {
            setChiHoiList(
              extractChiHoi(
                result,
              ),
            );
          }
        } catch (
          error
        ) {
          console.error(
            "Lỗi lấy danh sách Chi hội:",
            error,
          );
        }
      },
      [],
    );

  /* =======================================================
     LOAD MY REGISTRATIONS
  ======================================================= */

  const loadMyRegistrations =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/hoat-dong/cua-toi",
              {
                method:
                  "GET",

                credentials:
                  "include",

                cache:
                  "no-store",
              },
            );

          const result =
            await parseApiResponse(
              response,
            );

          if (
            response.ok &&
            result.success
          ) {
            setRegistrations(
              extractRegistrations(
                result,
              ),
            );
          }
        } catch (
          error
        ) {
          console.error(
            "Lỗi lấy đăng ký hoạt động:",
            error,
          );
        }
      },
      [],
    );

  /* =======================================================
     LOAD PAGE
  ======================================================= */

  const loadPage =
    useCallback(
      async (
        showRefresh =
          false,
      ) => {
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

        setMessage(
          null,
        );

        try {
          const user =
            await loadCurrentUser();

          if (!user) {
            return;
          }

          await Promise.all([
            loadActivities(),

            user.role ===
            "HOI_VIEN"
              ? loadMyRegistrations()
              : loadChiHoi(),
          ]);
        } catch (
          error
        ) {
          setMessage({
            type:
              "error",

            text:
              error instanceof
                Error
                ? error.message
                : "Đã xảy ra lỗi khi tải dữ liệu",
          });
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
        loadActivities,
        loadChiHoi,
        loadCurrentUser,
        loadMyRegistrations,
      ],
    );

  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
      void loadPage();
    },
    [
      loadPage,
    ],
  );

  /* =======================================================
     REGISTRATION MAP
  ======================================================= */

  const registrationMap =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            DangKyCuaToi
          >();

        registrations.forEach(
          (
            registration,
          ) => {
            const activityId =
              getId(
                registration.hoatDong,
              );

            if (
              activityId
            ) {
              map.set(
                activityId,
                registration,
              );
            }
          },
        );

        return map;
      },
      [
        registrations,
      ],
    );

  /* =======================================================
     FILTERED ACTIVITIES
  ======================================================= */

  const filteredActivities =
    useMemo(
      () => {
        const keyword =
          normalizeSearch(
            search,
          );

        return activities.filter(
          (
            activity,
          ) => {
            const chiHoi =
              getActivityChiHoi(
                activity,
              );

            const searchableText =
              [
                activity.maHoatDong,
                activity.tenHoatDong,
                activity.donViToChuc,
                activity.diaDiem,
                activity.moTa,
                activity.noiDung,
                chiHoi?.maChiHoi,
                chiHoi?.tenChiHoi,
              ]
                .filter(
                  Boolean,
                )
                .map(
                  normalizeSearch,
                )
                .join(
                  " ",
                );

            const matchesSearch =
              !keyword ||
              searchableText.includes(
                keyword,
              );

            const matchesScope =
              !scopeFilter ||
              activity.phamVi ===
                scopeFilter;

            const matchesStatus =
              !statusFilter ||
              activity.trangThai ===
                statusFilter;

            return (
              matchesSearch &&
              matchesScope &&
              matchesStatus
            );
          },
        );
      },
      [
        activities,
        scopeFilter,
        search,
        statusFilter,
      ],
    );

  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics =
    useMemo(
      () => ({
        total:
          activities.length,

        pending:
          activities.filter(
            (
              activity,
            ) =>
              activity.trangThai ===
              "CHO_DUYET",
          ).length,

        running:
          activities.filter(
            (
              activity,
            ) =>
              activity.trangThai ===
              "DANG_DIEN_RA",
          ).length,

        completed:
          activities.filter(
            (
              activity,
            ) =>
              activity.trangThai ===
              "DA_KET_THUC",
          ).length,
      }),
      [
        activities,
      ],
    );

  /* =======================================================
     MESSAGE
  ======================================================= */

  function showMessage(
    type:
      MessageState["type"],

    text:
      string,
  ) {
    setMessage({
      type,
      text,
    });

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }

  /* =======================================================
     CREATE
  ======================================================= */

  function openCreateModal() {
    setEditingActivity(
      null,
    );

    setFormData({
      ...EMPTY_FORM,
    });

    setShowFormModal(
      true,
    );
  }

  /* =======================================================
     EDIT
  ======================================================= */

  function openEditModal(
    activity:
      HoatDong,
  ) {
    setEditingActivity(
      activity,
    );

    setFormData({
      maHoatDong:
        activity.maHoatDong ||
        "",

      tenHoatDong:
        activity.tenHoatDong ||
        "",

      phamVi:
        activity.phamVi ||
        "CHI_HOI",

      chiHoiId:
        getChiHoiId(
          activity,
        ),

      donViToChuc:
        activity.donViToChuc ||
        "",

      diaDiem:
        activity.diaDiem ||
        "",

      thoiGianBatDau:
        toDateTimeLocal(
          activity.thoiGianBatDau,
        ),

      thoiGianKetThuc:
        toDateTimeLocal(
          activity.thoiGianKetThuc,
        ),

      hanDangKy:
        toDateTimeLocal(
          activity.hanDangKy,
        ),

      soLuongToiDa:
        activity.soLuongToiDa !==
          null &&
        activity.soLuongToiDa !==
          undefined
          ? String(
              activity.soLuongToiDa,
            )
          : "",

      moTa:
        activity.moTa ||
        "",

      noiDung:
        activity.noiDung ||
        "",

      trangThai:
        activity.trangThai ||
        "CHO_DUYET",
    });

    setShowFormModal(
      true,
    );
  }

  function closeFormModal() {
    if (
      submitting
    ) {
      return;
    }

    setShowFormModal(
      false,
    );

    setEditingActivity(
      null,
    );

    setFormData({
      ...EMPTY_FORM,
    });
  }

  function updateForm<
    K extends keyof FormData,
  >(
    field:
      K,

    value:
      FormData[K],
  ) {
    setFormData(
      (
        previous,
      ) => ({
        ...previous,

        [field]:
          value,

        ...(field ===
          "phamVi" &&
        value ===
          "LIEN_CHI_HOI"
          ? {
              chiHoiId:
                "",
            }
          : {}),
      }),
    );
  }

  /* =======================================================
     SAVE ACTIVITY
  ======================================================= */

  async function handleSubmitForm(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !formData.maHoatDong.trim() ||
      !formData.tenHoatDong.trim() ||
      !formData.diaDiem.trim() ||
      !formData.thoiGianBatDau ||
      !formData.thoiGianKetThuc
    ) {
      showMessage(
        "error",
        "Vui lòng nhập đầy đủ các trường bắt buộc",
      );

      return;
    }

    if (
      formData.phamVi ===
        "CHI_HOI" &&
      !formData.chiHoiId
    ) {
      showMessage(
        "error",
        "Vui lòng chọn Chi hội tổ chức hoạt động",
      );

      return;
    }

    const startDate =
      new Date(
        formData.thoiGianBatDau,
      );

    const endDate =
      new Date(
        formData.thoiGianKetThuc,
      );

    if (
      Number.isNaN(
        startDate.getTime(),
      ) ||
      Number.isNaN(
        endDate.getTime(),
      )
    ) {
      showMessage(
        "error",
        "Thời gian hoạt động không hợp lệ",
      );

      return;
    }

    if (
      endDate.getTime() <=
      startDate.getTime()
    ) {
      showMessage(
        "error",
        "Thời gian kết thúc phải sau thời gian bắt đầu",
      );

      return;
    }

    if (
      formData.hanDangKy
    ) {
      const deadline =
        new Date(
          formData.hanDangKy,
        );

      if (
        Number.isNaN(
          deadline.getTime(),
        )
      ) {
        showMessage(
          "error",
          "Hạn đăng ký không hợp lệ",
        );

        return;
      }

      if (
        deadline.getTime() >
        startDate.getTime()
      ) {
        showMessage(
          "error",
          "Hạn đăng ký không được sau thời gian bắt đầu hoạt động",
        );

        return;
      }
    }

    if (
      formData.soLuongToiDa &&
      (
        !Number.isFinite(
          Number(
            formData.soLuongToiDa,
          ),
        ) ||
        Number(
          formData.soLuongToiDa,
        ) <=
          0
      )
    ) {
      showMessage(
        "error",
        "Số lượng tối đa phải lớn hơn 0",
      );

      return;
    }

    setSubmitting(
      true,
    );

    try {
      const editingId =
        getId(
          editingActivity,
        );

      const endpoint =
        editingActivity
          ? `/api/hoat-dong/${editingId}`
          : "/api/hoat-dong";

      const response =
        await fetch(
          endpoint,
          {
            method:
              editingActivity
                ? "PUT"
                : "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                maHoatDong:
                  formData.maHoatDong
                    .trim()
                    .toUpperCase(),

                tenHoatDong:
                  formData.tenHoatDong.trim(),

                phamVi:
                  formData.phamVi,

                chiHoiId:
                  formData.phamVi ===
                  "CHI_HOI"
                    ? formData.chiHoiId
                    : null,

                donViToChuc:
                  formData.donViToChuc.trim(),

                diaDiem:
                  formData.diaDiem.trim(),

                thoiGianBatDau:
                  startDate.toISOString(),

                thoiGianKetThuc:
                  endDate.toISOString(),

                hanDangKy:
                  formData.hanDangKy
                    ? new Date(
                        formData.hanDangKy,
                      ).toISOString()
                    : null,

                soLuongToiDa:
                  formData.soLuongToiDa
                    ? Number(
                        formData.soLuongToiDa,
                      )
                    : null,

                moTa:
                  formData.moTa.trim(),

                noiDung:
                  formData.noiDung.trim(),

                trangThai:
                  formData.trangThai,
              }),
          },
        );

      const result =
        await parseApiResponse(
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
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            (
              editingActivity
                ? "Không thể cập nhật hoạt động"
                : "Không thể thêm hoạt động"
            ),
        );
      }

      closeFormModal();

      showMessage(
        "success",

        result.message ||
          (
            editingActivity
              ? "Cập nhật hoạt động thành công"
              : "Thêm hoạt động thành công"
          ),
      );

      await loadActivities();
    } catch (
      error
    ) {
      showMessage(
        "error",

        error instanceof
          Error
          ? error.message
          : "Đã xảy ra lỗi khi lưu hoạt động",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     CONFIRM ACTION
  ======================================================= */

  async function handleConfirmAction() {
    if (
      !confirmState
    ) {
      return;
    }

    const activityId =
      getId(
        confirmState.activity,
      );

    if (
      !activityId
    ) {
      showMessage(
        "error",
        "Không tìm thấy hoạt động",
      );

      setConfirmState(
        null,
      );

      return;
    }

    setActionLoading(
      true,
    );

    try {
      let endpoint =
        "";

      let method =
        "";

      let body:
        | string
        | undefined;

      if (
        confirmState.type ===
        "delete"
      ) {
        endpoint =
          `/api/hoat-dong/${activityId}`;

        method =
          "DELETE";
      }

      if (
        confirmState.type ===
        "status"
      ) {
        endpoint =
          `/api/hoat-dong/${activityId}/trang-thai`;

        method =
          "PATCH";

        body =
          JSON.stringify({
            trangThai:
              confirmState.nextStatus,
          });
      }

      if (
        confirmState.type ===
        "register"
      ) {
        endpoint =
          `/api/hoat-dong/${activityId}/dang-ky`;

        method =
          "POST";
      }

      if (
        confirmState.type ===
        "cancel-registration"
      ) {
        endpoint =
          `/api/hoat-dong/${activityId}/dang-ky`;

        method =
          "DELETE";
      }

      const response =
        await fetch(
          endpoint,
          {
            method,

            credentials:
              "include",

            headers:
              body
                ? {
                    "Content-Type":
                      "application/json",
                  }
                : undefined,

            body,
          },
        );

      const result =
        await parseApiResponse(
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
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể thực hiện thao tác",
        );
      }

      const successMessage =
        result.message ||
        (
          confirmState.type ===
          "delete"
            ? "Xóa hoạt động thành công"
            : confirmState.type ===
                "status"
              ? "Cập nhật trạng thái thành công"
              : confirmState.type ===
                  "register"
                ? "Đăng ký tham gia thành công"
                : "Hủy đăng ký thành công"
        );

      setConfirmState(
        null,
      );

      showMessage(
        "success",
        successMessage,
      );

      await loadActivities();

      if (
        isMember
      ) {
        await loadMyRegistrations();
      }
    } catch (
      error
    ) {
      showMessage(
        "error",

        error instanceof
          Error
          ? error.message
          : "Đã xảy ra lỗi khi thực hiện thao tác",
      );
    } finally {
      setActionLoading(
        false,
      );
    }
  }

  /* =======================================================
     MEMBER REGISTER RULE
  ======================================================= */

  function canMemberRegister(
    activity:
      HoatDong,
  ) {
    if (
      activity.trangThai !==
        "DA_DUYET" &&
      activity.trangThai !==
        "SAP_DIEN_RA"
    ) {
      return false;
    }

    if (
      activity.hanDangKy
    ) {
      const deadline =
        new Date(
          activity.hanDangKy,
        );

      if (
        !Number.isNaN(
          deadline.getTime(),
        ) &&
        deadline.getTime() <
          // eslint-disable-next-line react-hooks/purity -- Keep deadline checks based on the current time on every render.
          Date.now()
      ) {
        return false;
      }
    }

    return true;
  }

  /* =======================================================
     FILTER RESET
  ======================================================= */

  function resetFilters() {
    setSearch(
      "",
    );

    setScopeFilter(
      "",
    );

    setStatusFilter(
      "",
    );

    void loadPage(
      true,
    );
  }

  /* =======================================================
     CONFIRM TEXT
  ======================================================= */

  function getConfirmContent() {
    if (
      !confirmState
    ) {
      return {
        title:
          "",

        description:
          "",

        button:
          "",

        destructive:
          false,
      };
    }

    switch (
      confirmState.type
    ) {
      case "delete":
        return {
          title:
            "Xác nhận xóa hoạt động",

          description:
            `Bạn có chắc chắn muốn xóa hoạt động “${confirmState.activity.maHoatDong} - ${confirmState.activity.tenHoatDong}” không? Dữ liệu liên quan có thể bị ảnh hưởng.`,

          button:
            "Xóa hoạt động",

          destructive:
            true,
        };

      case "status":
        return {
          title:
            "Xác nhận cập nhật trạng thái",

          description:
            `Chuyển hoạt động “${confirmState.activity.maHoatDong}” sang trạng thái “${getStatusLabel(
              confirmState.nextStatus,
            )}”?`,

          button:
            "Cập nhật",

          destructive:
            confirmState.nextStatus ===
              "DA_HUY" ||
            confirmState.nextStatus ===
              "TU_CHOI",
        };

      case "register":
        return {
          title:
            "Xác nhận đăng ký",

          description:
            `Bạn có muốn đăng ký tham gia hoạt động “${confirmState.activity.maHoatDong} - ${confirmState.activity.tenHoatDong}” không?`,

          button:
            "Đăng ký tham gia",

          destructive:
            false,
        };

      case "cancel-registration":
        return {
          title:
            "Xác nhận hủy đăng ký",

          description:
            `Bạn có chắc chắn muốn hủy đăng ký hoạt động “${confirmState.activity.maHoatDong} - ${confirmState.activity.tenHoatDong}” không?`,

          button:
            "Hủy đăng ký",

          destructive:
            true,
        };
    }
  }

  const confirmContent =
    getConfirmContent();

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#f3f7fb]">
      <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-5 flex flex-col justify-between gap-4 sm:mb-7 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#123b68]">
              {isMember
                ? "Hoạt động Liên Chi hội"
                : "Quản trị hệ thống"}
            </p>

            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
              {isMember
                ? "Danh sách hoạt động"
                : "Quản lý hoạt động"}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {isMember
                ? "Xem thông tin, đăng ký tham gia và theo dõi lịch sử hoạt động."
                : "Quản lý kế hoạch, phê duyệt, tiến độ, người tham gia và thông tin các hoạt động."}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {isMember && (
              <button
                type="button"
                onClick={() =>
                  setShowHistoryModal(
                    true,
                  )
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#123b68] bg-white px-5 text-sm font-semibold text-[#123b68] shadow-sm transition hover:bg-blue-50 sm:w-auto"
              >
                <Clock3
                  size={19}
                />

                Lịch sử tham gia
              </button>
            )}

            {canManage && (
              <button
                type="button"
                onClick={
                  openCreateModal
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#123b68] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0e3158] sm:w-auto"
              >
                <Plus
                  size={19}
                />

                Thêm hoạt động
              </button>
            )}
          </div>
        </div>

        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (
          <div
            className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              message.type ===
              "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex min-w-0 items-start gap-2">
              {message.type ===
              "success" ? (
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

              <span className="break-words">
                {message.text}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setMessage(
                  null,
                )
              }
              className="shrink-0 rounded-md p-1 hover:bg-black/5"
              aria-label="Đóng thông báo"
            >
              <X
                size={17}
              />
            </button>
          </div>
        )}

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Tổng hoạt động"
            value={
              statistics.total
            }
            icon={
              <CalendarDays
                size={23}
              />
            }
            iconClass="bg-blue-50 text-blue-700"
          />

          <StatCard
            label="Chờ phê duyệt"
            value={
              statistics.pending
            }
            icon={
              <Clock3
                size={23}
              />
            }
            iconClass="bg-amber-50 text-amber-700"
          />

          <StatCard
            label="Đang triển khai"
            value={
              statistics.running
            }
            icon={
              <RefreshCw
                size={23}
              />
            }
            iconClass="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            label="Đã kết thúc"
            value={
              statistics.completed
            }
            icon={
              <Check
                size={23}
              />
            }
            iconClass="bg-violet-50 text-violet-700"
          />
        </div>

        {/* =================================================
            LIST
        ================================================= */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
          {/* FILTER */}

          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:p-4 xl:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
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
                placeholder="Tìm theo mã, tên, đơn vị hoặc địa điểm"
                className="h-12 w-full rounded-xl border border-slate-300 pl-12 pr-4 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="relative w-full xl:min-w-[225px] xl:w-auto">
              <Filter
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={
                  scopeFilter
                }
                onChange={(
                  event,
                ) =>
                  setScopeFilter(
                    event.target.value,
                  )
                }
                className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-11 pr-10 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  Tất cả phạm vi
                </option>

                <option value="LIEN_CHI_HOI">
                  Toàn Liên Chi hội
                </option>

                <option value="CHI_HOI">
                  Chi hội
                </option>
              </select>

              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative w-full xl:min-w-[225px] xl:w-auto">
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
                className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 pr-10 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  Tất cả trạng thái
                </option>

                {STATUS_OPTIONS.map(
                  (
                    status,
                  ) => (
                    <option
                      key={
                        status.value
                      }
                      value={
                        status.value
                      }
                    >
                      {
                        status.label
                      }
                    </option>
                  ),
                )}
              </select>

              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={
                resetFilters
              }
              disabled={
                refreshing
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 xl:w-auto"
            >
              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Làm mới
            </button>
          </div>

          {/* CONTENT */}

          {loading ? (
            <div className="flex min-h-[330px] flex-col items-center justify-center gap-3 px-4 text-slate-500">
              <Loader2
                size={34}
                className="animate-spin text-[#123b68]"
              />

              <span className="text-center text-sm">
                Đang tải danh sách hoạt động...
              </span>
            </div>
          ) : filteredActivities.length ===
            0 ? (
            <div className="flex min-h-[330px] flex-col items-center justify-center px-5 text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
                <CalendarDays
                  size={34}
                />
              </div>

              <h3 className="font-semibold text-slate-800">
                Chưa có hoạt động phù hợp
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Hãy thay đổi bộ lọc hoặc thêm hoạt động mới.
              </p>
            </div>
          ) : (
            <>
              {/* =============================================
                  MOBILE
              ============================================= */}

              <div className="divide-y divide-slate-200 md:hidden">
                {filteredActivities.map(
                  (
                    activity,
                    index,
                  ) => {
                    const activityId =
                      getId(
                        activity,
                      );

                    const chiHoi =
                      getActivityChiHoi(
                        activity,
                      );

                    const registration =
                      registrationMap.get(
                        activityId,
                      );

                    return (
                      <article
                        key={
                          activityId ||
                          `${activity.maHoatDong}-${index}`
                        }
                        className="space-y-4 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-[#123b68]">
                                {
                                  activity.maHoatDong
                                }
                              </span>

                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                  activity.trangThai,
                                )}`}
                              >
                                {getStatusLabel(
                                  activity.trangThai,
                                )}
                              </span>

                              {registration &&
                                registration.trangThaiDangKy !==
                                  "DA_HUY" && (
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRegistrationClass(
                                      registration.trangThaiDangKy,
                                    )}`}
                                  >
                                    {getRegistrationLabel(
                                      registration.trangThaiDangKy,
                                    )}
                                  </span>
                                )}
                            </div>

                            <h3 className="mt-3 break-words text-base font-bold text-slate-950">
                              {
                                activity.tenHoatDong
                              }
                            </h3>

                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                              {activity.moTa ||
                                "Không có mô tả"}
                            </p>
                          </div>

                          <span className="shrink-0 text-xs font-medium text-slate-400">
                            #
                            {index +
                              1}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Phạm vi
                            </p>

                            <p className="mt-1 font-medium text-slate-800">
                              {activity.phamVi ===
                              "LIEN_CHI_HOI"
                                ? "Toàn Liên Chi hội"
                                : chiHoi
                                  ? `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`
                                  : "Chi hội"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Địa điểm
                            </p>

                            <div className="mt-1 flex items-start gap-2 font-medium text-slate-800">
                              <MapPin
                                size={15}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />

                              <span className="break-words">
                                {activity.diaDiem ||
                                  "Chưa cập nhật"}
                              </span>
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Thời gian
                            </p>

                            <div className="mt-1 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                              <p>
                                <span className="font-medium">
                                  Bắt đầu:
                                </span>{" "}
                                {formatDateTime(
                                  activity.thoiGianBatDau,
                                )}
                              </p>

                              <p>
                                <span className="font-medium">
                                  Kết thúc:
                                </span>{" "}
                                {formatDateTime(
                                  activity.thoiGianKetThuc,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* MANAGER */}

                        {canManage && (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <select
                              value=""
                              onChange={(
                                event,
                              ) => {
                                const nextStatus =
                                  event.target.value as
                                    TrangThaiHoatDong;

                                if (
                                  !nextStatus
                                ) {
                                  return;
                                }

                                setConfirmState({
                                  type:
                                    "status",

                                  activity,

                                  nextStatus,
                                });
                              }}
                              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="">
                                Cập nhật trạng thái
                              </option>

                              {STATUS_OPTIONS.map(
                                (
                                  status,
                                ) => (
                                  <option
                                    key={
                                      status.value
                                    }
                                    value={
                                      status.value
                                    }
                                    disabled={
                                      status.value ===
                                      activity.trangThai
                                    }
                                  >
                                    {
                                      status.label
                                    }
                                  </option>
                                ),
                              )}
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                setParticipantActivity(
                                  activity,
                                )
                              }
                              className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-emerald-300 px-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                            >
                              <Users
                                size={17}
                              />

                              Người tham gia
                            </button>
                          </div>
                        )}

                        {/* MEMBER */}

                        {isMember &&
                          (() => {
                            if (
                              registration
                                ?.trangThaiDangKy ===
                              "DA_DANG_KY"
                            ) {
                              return (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmState({
                                      type:
                                        "cancel-registration",

                                      activity,
                                    })
                                  }
                                  className="h-11 w-full rounded-lg border border-red-300 px-4 text-sm font-medium text-red-600 hover:bg-red-50"
                                >
                                  Hủy đăng ký
                                </button>
                              );
                            }

                            if (
                              registration &&
                              registration.trangThaiDangKy !==
                                "DA_HUY"
                            ) {
                              return (
                                <div
                                  className={`rounded-lg border px-3 py-2.5 text-center text-sm font-semibold ${getRegistrationClass(
                                    registration.trangThaiDangKy,
                                  )}`}
                                >
                                  {getRegistrationLabel(
                                    registration.trangThaiDangKy,
                                  )}
                                </div>
                              );
                            }

                            if (
                              canMemberRegister(
                                activity,
                              )
                            ) {
                              return (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmState({
                                      type:
                                        "register",

                                      activity,
                                    })
                                  }
                                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-300 px-4 text-sm font-medium text-blue-700 hover:bg-blue-50"
                                >
                                  <UserCheck
                                    size={17}
                                  />

                                  Đăng ký tham gia
                                </button>
                              );
                            }

                            return null;
                          })()}

                        {/* ACTIONS */}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDetailActivity(
                                activity,
                              )
                            }
                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:border-[#123b68] hover:text-[#123b68]"
                          >
                            <Eye
                              size={18}
                            />

                            Xem
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  activity,
                                )
                              }
                              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-blue-300 text-sm font-medium text-blue-700 hover:bg-blue-50"
                            >
                              <Pencil
                                size={17}
                              />

                              Sửa
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  type:
                                    "delete",

                                  activity,
                                })
                              }
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                              title="Xóa hoạt động"
                              aria-label="Xóa hoạt động"
                            >
                              <Trash2
                                size={17}
                              />
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  },
                )}
              </div>

              {/* =============================================
                  DESKTOP
              ============================================= */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1500px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-600">
                      <th className="px-4 py-4">
                        STT
                      </th>

                      <th className="px-4 py-4">
                        Mã hoạt động
                      </th>

                      <th className="px-4 py-4">
                        Tên hoạt động
                      </th>

                      <th className="px-4 py-4">
                        Phạm vi
                      </th>

                      <th className="px-4 py-4">
                        Thời gian
                      </th>

                      <th className="px-4 py-4">
                        Địa điểm
                      </th>

                      <th className="px-4 py-4">
                        Trạng thái
                      </th>

                      <th className="min-w-[500px] px-4 py-4 text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredActivities.map(
                      (
                        activity,
                        index,
                      ) => {
                        const activityId =
                          getId(
                            activity,
                          );

                        const chiHoi =
                          getActivityChiHoi(
                            activity,
                          );

                        const registration =
                          registrationMap.get(
                            activityId,
                          );

                        return (
                          <tr
                            key={
                              activityId ||
                              `${activity.maHoatDong}-${index}`
                            }
                            className="border-t border-slate-200 text-sm text-slate-700 hover:bg-slate-50/70"
                          >
                            <td className="px-4 py-4">
                              {index +
                                1}
                            </td>

                            <td className="px-4 py-4">
                              <span className="whitespace-nowrap rounded-lg bg-blue-50 px-3 py-2 font-semibold text-[#123b68]">
                                {
                                  activity.maHoatDong
                                }
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <p className="max-w-[250px] truncate font-semibold text-slate-950">
                                {
                                  activity.tenHoatDong
                                }
                              </p>

                              <p className="mt-1 max-w-[250px] truncate text-xs text-slate-500">
                                {activity.donViToChuc ||
                                  activity.moTa ||
                                  "—"}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p className="whitespace-nowrap font-medium">
                                {activity.phamVi ===
                                "LIEN_CHI_HOI"
                                  ? "Toàn Liên Chi hội"
                                  : "Chi hội"}
                              </p>

                              {activity.phamVi ===
                                "CHI_HOI" &&
                                chiHoi && (
                                  <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                                    {
                                      chiHoi.maChiHoi
                                    }{" "}
                                    -{" "}
                                    {
                                      chiHoi.tenChiHoi
                                    }
                                  </p>
                                )}
                            </td>

                            <td className="px-4 py-4">
                              <p className="whitespace-nowrap">
                                {formatDateTime(
                                  activity.thoiGianBatDau,
                                )}
                              </p>

                              <p className="mt-1 whitespace-nowrap text-xs text-slate-400">
                                đến{" "}
                                {formatDateTime(
                                  activity.thoiGianKetThuc,
                                )}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex max-w-[200px] items-start gap-2">
                                <MapPin
                                  size={15}
                                  className="mt-0.5 shrink-0 text-slate-400"
                                />

                                <span className="line-clamp-2">
                                  {activity.diaDiem ||
                                    "—"}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-col items-start gap-2">
                                <span
                                  className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                    activity.trangThai,
                                  )}`}
                                >
                                  {getStatusLabel(
                                    activity.trangThai,
                                  )}
                                </span>

                                {registration &&
                                  registration.trangThaiDangKy !==
                                    "DA_HUY" && (
                                    <span
                                      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${getRegistrationClass(
                                        registration.trangThaiDangKy,
                                      )}`}
                                    >
                                      {getRegistrationLabel(
                                        registration.trangThaiDangKy,
                                      )}
                                    </span>
                                  )}
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {/* MANAGER */}

                                {canManage && (
                                  <>
                                    <select
                                      value=""
                                      onChange={(
                                        event,
                                      ) => {
                                        const nextStatus =
                                          event.target.value as
                                            TrangThaiHoatDong;

                                        if (
                                          !nextStatus
                                        ) {
                                          return;
                                        }

                                        setConfirmState({
                                          type:
                                            "status",

                                          activity,

                                          nextStatus,
                                        });
                                      }}
                                      className="h-10 min-w-[175px] rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68]"
                                    >
                                      <option value="">
                                        Cập nhật trạng thái
                                      </option>

                                      {STATUS_OPTIONS.map(
                                        (
                                          status,
                                        ) => (
                                          <option
                                            key={
                                              status.value
                                            }
                                            value={
                                              status.value
                                            }
                                            disabled={
                                              status.value ===
                                              activity.trangThai
                                            }
                                          >
                                            {
                                              status.label
                                            }
                                          </option>
                                        ),
                                      )}
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setParticipantActivity(
                                          activity,
                                        )
                                      }
                                      className="inline-flex h-10 min-w-[138px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-emerald-300 px-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                                    >
                                      <Users
                                        size={17}
                                      />

                                      Người tham gia
                                    </button>
                                  </>
                                )}

                                {/* MEMBER */}

                                {isMember &&
                                  (() => {
                                    if (
                                      registration
                                        ?.trangThaiDangKy ===
                                      "DA_DANG_KY"
                                    ) {
                                      return (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setConfirmState({
                                              type:
                                                "cancel-registration",

                                              activity,
                                            })
                                          }
                                          className="h-10 shrink-0 whitespace-nowrap rounded-lg border border-red-300 px-4 font-medium text-red-600 hover:bg-red-50"
                                        >
                                          Hủy đăng ký
                                        </button>
                                      );
                                    }

                                    if (
                                      registration &&
                                      registration.trangThaiDangKy !==
                                        "DA_HUY"
                                    ) {
                                      return (
                                        <span
                                          className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold ${getRegistrationClass(
                                            registration.trangThaiDangKy,
                                          )}`}
                                        >
                                          {getRegistrationLabel(
                                            registration.trangThaiDangKy,
                                          )}
                                        </span>
                                      );
                                    }

                                    if (
                                      canMemberRegister(
                                        activity,
                                      )
                                    ) {
                                      return (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setConfirmState({
                                              type:
                                                "register",

                                              activity,
                                            })
                                          }
                                          className="flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-blue-300 px-4 font-medium text-blue-700 hover:bg-blue-50"
                                        >
                                          <UserCheck
                                            size={17}
                                          />

                                          Đăng ký
                                        </button>
                                      );
                                    }

                                    return null;
                                  })()}

                                {/* COMMON */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDetailActivity(
                                      activity,
                                    )
                                  }
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:border-[#123b68] hover:text-[#123b68]"
                                  title="Xem chi tiết"
                                >
                                  <Eye
                                    size={18}
                                  />
                                </button>

                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditModal(
                                        activity,
                                      )
                                    }
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50"
                                    title="Sửa hoạt động"
                                  >
                                    <Pencil
                                      size={17}
                                    />
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmState({
                                        type:
                                          "delete",

                                        activity,
                                      })
                                    }
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                                    title="Xóa hoạt động"
                                  >
                                    <Trash2
                                      size={17}
                                    />
                                  </button>
                                )}
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

          {/* FOOTER */}

          {!loading &&
            filteredActivities.length >
              0 && (
              <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Hiển thị{" "}
                  <strong className="text-slate-700">
                    {
                      filteredActivities.length
                    }
                  </strong>{" "}
                  hoạt động
                </span>

                <span>
                  Tổng hệ thống:{" "}
                  <strong className="text-slate-700">
                    {
                      activities.length
                    }
                  </strong>
                </span>
              </div>
            )}
        </section>

        {/* =================================================
            FORM MODAL
        ================================================= */}

        {showFormModal && (
          <ActivityFormModal
            editing={
              Boolean(
                editingActivity,
              )
            }
            formData={
              formData
            }
            chiHoiList={
              chiHoiList
            }
            submitting={
              submitting
            }
            onUpdate={
              updateForm
            }
            onClose={
              closeFormModal
            }
            onSubmit={
              handleSubmitForm
            }
          />
        )}

        {/* =================================================
            DETAIL
        ================================================= */}

        {detailActivity && (
          <ActivityDetailModal
            activity={
              detailActivity
            }
            onClose={() =>
              setDetailActivity(
                null,
              )
            }
          />
        )}

        {/* =================================================
            CONFIRM
        ================================================= */}

        {confirmState && (
          <ConfirmModal
            title={
              confirmContent.title
            }
            description={
              confirmContent.description
            }
            confirmLabel={
              confirmContent.button
            }
            destructive={
              confirmContent.destructive
            }
            loading={
              actionLoading
            }
            onClose={() => {
              if (
                !actionLoading
              ) {
                setConfirmState(
                  null,
                );
              }
            }}
            onConfirm={() =>
              void handleConfirmAction()
            }
          />
        )}

        {/* =================================================
            PARTICIPANTS
        ================================================= */}

        {participantActivity && (
          <ParticipantModal
            isOpen={
              true
            }
            open={
              true
            }
            hoatDong={
              participantActivity
            }
            activity={
              participantActivity
            }
            hoatDongId={getId(
              participantActivity,
            )}
            activityId={getId(
              participantActivity,
            )}
            maHoatDong={
              participantActivity.maHoatDong
            }
            tenHoatDong={
              participantActivity.tenHoatDong
            }
            onClose={() =>
              setParticipantActivity(
                null,
              )
            }
            onSuccess={() =>
              loadActivities()
            }
            onUpdated={() =>
              loadActivities()
            }
          />
        )}

        {/* =================================================
            LICH SU THAM GIA
        ================================================= */}

        {isMember &&
          showHistoryModal && (
            <LichSuThamGiaModal
              isOpen={
                true
              }
              open={
                true
              }
              onClose={() =>
                setShowHistoryModal(
                  false,
                )
              }
            />
          )}
      </div>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,

  value,

  icon,

  iconClass,
}: {
  label:
    string;

  value:
    number
    | string;

  icon:
    ReactNode;

  iconClass:
    string;
}) {
  return (
    <div className="flex min-h-[108px] items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          {label}
        </p>

        <p className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
          {value}
        </p>
      </div>

      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${iconClass}`}
      >
        {icon}
      </div>
    </div>
  );
}

/* =========================================================
   FORM MODAL
========================================================= */

function ActivityFormModal({
  editing,

  formData,

  chiHoiList,

  submitting,

  onUpdate,

  onClose,

  onSubmit,
}: {
  editing:
    boolean;

  formData:
    FormData;

  chiHoiList:
    ChiHoi[];

  submitting:
    boolean;

  onUpdate:
    <
      K extends keyof FormData,
    >(
      field:
        K,

      value:
        FormData[K],
    ) => void;

  onClose:
    () => void;

  onSubmit:
    (
      event:
        FormEvent<HTMLFormElement>,
    ) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-2 sm:p-4">
      <form
        onSubmit={
          onSubmit
        }
        className="max-h-[96vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl sm:rounded-2xl"
      >
        {/* HEADER */}

        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-950 sm:text-xl">
              {editing
                ? "Cập nhật hoạt động"
                : "Thêm hoạt động"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Nhập đầy đủ thông tin kế hoạch hoạt động.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              submitting
            }
            className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Đóng"
          >
            <X
              size={21}
            />
          </button>
        </div>

        {/* FIELDS */}

        <div className="grid gap-4 p-4 sm:gap-5 sm:p-6 md:grid-cols-2">
          <FormField
            label="Mã hoạt động"
            required
            value={
              formData.maHoatDong
            }
            onChange={(
              value,
            ) =>
              onUpdate(
                "maHoatDong",
                value.toUpperCase(),
              )
            }
          />

          <FormField
            label="Tên hoạt động"
            required
            value={
              formData.tenHoatDong
            }
            onChange={(
              value,
            ) =>
              onUpdate(
                "tenHoatDong",
                value,
              )
            }
          />

          <SelectField
            label="Phạm vi"
            required
            value={
              formData.phamVi
            }
            onChange={(
              value,
            ) =>
              onUpdate(
                "phamVi",
                value as
                  PhamViHoatDong,
              )
            }
            options={[
              {
                value:
                  "LIEN_CHI_HOI",

                label:
                  "Toàn Liên Chi hội",
              },

              {
                value:
                  "CHI_HOI",

                label:
                  "Chi hội",
              },
            ]}
          />

          {formData.phamVi ===
          "CHI_HOI" ? (
            <SelectField
              label="Chi hội"
              required
              value={
                formData.chiHoiId
              }
              onChange={(
                value,
              ) =>
                onUpdate(
                  "chiHoiId",
                  value,
                )
              }
              options={[
                {
                  value:
                    "",

                  label:
                    "Chọn Chi hội",
                },

                ...chiHoiList.map(
                  (
                    chiHoi,
                  ) => ({
                    value:
                      getId(
                        chiHoi,
                      ),

                    label:
                      `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`,
                  }),
                ),
              ]}
            />
          ) : (
            <FormField
              label="Đơn vị tổ chức"
              value={
                formData.donViToChuc
              }
              onChange={(
                value,
              ) =>
                onUpdate(
                  "donViToChuc",
                  value,
                )
              }
            />
          )}

          {formData.phamVi ===
            "CHI_HOI" && (
            <FormField
              label="Đơn vị tổ chức"
              value={
                formData.donViToChuc
              }
              onChange={(
                value,
              ) =>
                onUpdate(
                  "donViToChuc",
                  value,
                )
              }
            />
          )}

          <FormField
            label="Địa điểm"
            required
            value={
              formData.diaDiem
            }
            onChange={(
              value,
            ) =>
              onUpdate(
                "diaDiem",
                value,
              )
            }
          />

          <FormField
            label="Thời gian bắt đầu"
            type="datetime-local"
            required
            value={
              formData.thoiGianBatDau
            }
            onChange={(
              value,
            ) =>
              onUpdate(
                "thoiGianBatDau",
                value,
              )
            }
          />

          <FormField
            label="Thời gian kết thúc"
            type="datetime-local"
            required
            value={
              formData.thoiGianKetThuc
            }
            onChange={(
              value,
            ) =>
              onUpdate(
                "thoiGianKetThuc",
                value,
              )
            }
          />

          <FormField
            label="Hạn đăng ký"
            type="datetime-local"
            value={
              formData.hanDangKy
            }
            onChange={(
              value,
            ) =>
              onUpdate(
                "hanDangKy",
                value,
              )
            }
          />

          <FormField
            label="Số lượng tối đa"
            type="number"
            min="1"
            value={
              formData.soLuongToiDa
            }
            placeholder="Để trống nếu không giới hạn"
            onChange={(
              value,
            ) =>
              onUpdate(
                "soLuongToiDa",
                value,
              )
            }
          />

          <SelectField
            label="Trạng thái"
            value={
              formData.trangThai
            }
            onChange={(
              value,
            ) =>
              onUpdate(
                "trangThai",

                value as
                  TrangThaiHoatDong,
              )
            }
            options={
              STATUS_OPTIONS
            }
          />

          <div className="md:col-span-2">
            <TextAreaField
              label="Mô tả"
              value={
                formData.moTa
              }
              onChange={(
                value,
              ) =>
                onUpdate(
                  "moTa",
                  value,
                )
              }
            />
          </div>

          <div className="md:col-span-2">
            <TextAreaField
              label="Nội dung"
              value={
                formData.noiDung
              }
              onChange={(
                value,
              ) =>
                onUpdate(
                  "noiDung",
                  value,
                )
              }
            />
          </div>
        </div>

        {/* FOOTER */}

        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              submitting
            }
            className="h-11 w-full rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
          >
            Đóng
          </button>

          <button
            type="submit"
            disabled={
              submitting
            }
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#123b68] px-5 text-sm font-semibold text-white hover:bg-[#0e3158] disabled:opacity-60 sm:w-auto"
          >
            {submitting && (
              <Loader2
                size={17}
                className="animate-spin"
              />
            )}

            {editing
              ? "Lưu thay đổi"
              : "Thêm hoạt động"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   DETAIL MODAL
========================================================= */

function ActivityDetailModal({
  activity,

  onClose,
}: {
  activity:
    HoatDong;

  onClose:
    () => void;
}) {
  const chiHoi =
    getActivityChiHoi(
      activity,
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-2 sm:p-4">
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-950 sm:text-xl">
              Chi tiết hoạt động
            </h2>

            <p className="mt-1 break-words text-sm text-slate-500">
              {
                activity.maHoatDong
              }{" "}
              -{" "}
              {
                activity.tenHoatDong
              }
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Đóng"
          >
            <X
              size={21}
            />
          </button>
        </div>

        <div className="grid gap-3 p-4 sm:gap-4 sm:p-6 md:grid-cols-2">
          <InfoItem
            label="Mã hoạt động"
            value={
              activity.maHoatDong
            }
          />

          <InfoItem
            label="Trạng thái"
            value={getStatusLabel(
              activity.trangThai,
            )}
          />

          <InfoItem
            label="Tên hoạt động"
            value={
              activity.tenHoatDong
            }
          />

          <InfoItem
            label="Phạm vi"
            value={
              activity.phamVi ===
              "LIEN_CHI_HOI"
                ? "Toàn Liên Chi hội"
                : "Chi hội"
            }
          />

          <InfoItem
            label="Chi hội"
            value={
              chiHoi
                ? `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`
                : "Không áp dụng"
            }
          />

          <InfoItem
            label="Đơn vị tổ chức"
            value={
              activity.donViToChuc ||
              "Chưa cập nhật"
            }
          />

          <InfoItem
            label="Địa điểm"
            value={
              activity.diaDiem ||
              "Chưa cập nhật"
            }
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
            label="Bắt đầu"
            value={formatDateTime(
              activity.thoiGianBatDau,
            )}
          />

          <InfoItem
            label="Kết thúc"
            value={formatDateTime(
              activity.thoiGianKetThuc,
            )}
          />

          <InfoItem
            label="Hạn đăng ký"
            value={formatDateTime(
              activity.hanDangKy,
            )}
          />

          <div className="md:col-span-2">
            <InfoItem
              label="Mô tả"
              value={
                activity.moTa ||
                "Không có mô tả"
              }
            />
          </div>

          <div className="md:col-span-2">
            <InfoItem
              label="Nội dung"
              value={
                activity.noiDung ||
                "Không có nội dung"
              }
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={
              onClose
            }
            className="h-11 w-full rounded-lg bg-[#123b68] px-6 text-sm font-semibold text-white hover:bg-[#0e3158] sm:w-auto"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CONFIRM MODAL
========================================================= */

function ConfirmModal({
  title,

  description,

  confirmLabel,

  destructive,

  loading,

  onClose,

  onConfirm,
}: {
  title:
    string;

  description:
    string;

  confirmLabel:
    string;

  destructive:
    boolean;

  loading:
    boolean;

  onClose:
    () => void;

  onConfirm:
    () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="p-5 sm:p-6">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
              destructive
                ? "bg-red-50 text-red-600"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            <AlertCircle
              size={25}
            />
          </div>

          <h2 className="text-lg font-bold text-slate-950 sm:text-xl">
            {title}
          </h2>

          <p className="mt-3 break-words text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              loading
            }
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={
              onConfirm
            }
            disabled={
              loading
            }
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto ${
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#123b68] hover:bg-[#0e3158]"
            }`}
          >
            {loading && (
              <Loader2
                size={17}
                className="animate-spin"
              />
            )}

            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,

  value,

  type =
    "text",

  required =
    false,

  placeholder,

  min,

  onChange,
}: {
  label:
    string;

  value:
    string;

  type?:
    string;

  required?:
    boolean;

  placeholder?:
    string;

  min?:
    string;

  onChange:
    (
      value:
        string,
    ) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="text-red-500">
            {" "}
            *
          </span>
        )}
      </span>

      <input
        type={
          type
        }
        value={
          value
        }
        min={
          min
        }
        required={
          required
        }
        placeholder={
          placeholder
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="h-12 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100 sm:px-4"
      />
    </label>
  );
}

/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,

  value,

  options,

  required =
    false,

  onChange,
}: {
  label:
    string;

  value:
    string;

  options:
    Array<{
      value:
        string;

      label:
        string;
    }>;

  required?:
    boolean;

  onChange:
    (
      value:
        string,
    ) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="text-red-500">
            {" "}
            *
          </span>
        )}
      </span>

      <select
        value={
          value
        }
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
        className="h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100 sm:px-4"
      >
        {options.map(
          (
            option,
          ) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {
                option.label
              }
            </option>
          ),
        )}
      </select>
    </label>
  );
}

/* =========================================================
   TEXTAREA
========================================================= */

function TextAreaField({
  label,

  value,

  onChange,
}: {
  label:
    string;

  value:
    string;

  onChange:
    (
      value:
        string,
    ) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <textarea
        value={
          value
        }
        rows={5}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="w-full min-w-0 resize-none rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100 sm:px-4"
      />
    </label>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  label,

  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-800">
        {value}
      </p>
    </div>
  );
}