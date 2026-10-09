"use client";

import {
  Activity,
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Award,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,

  TrendingUp,
  UserCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

import * as XLSX from "xlsx";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type LoaiThongKe =
  | "TONG_QUAN"
  | "CHI_HOI"
  | "HOI_VIEN"
  | "HOAT_DONG"
  | "TAI_CHINH";

type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
};

type ChiHoiRef = {
  id?: string;
  _id?: string;
  maChiHoi?: string;
  tenChiHoi?: string;
};

type XepLoaiRenLuyen = {
  xuatSac: number;
  tot: number;
  kha: number;
  trungBinh: number;
  yeu: number;
};

type PhanBoDiemRenLuyen = {
  tu90Den100: number;
  tu80DenDuoi90: number;
  tu65DenDuoi80: number;
  tu50DenDuoi65: number;
  duoi50: number;
};

type DiemRenLuyenTongQuan = {
  tongKetQua: number;
  diemTrungBinh: number;
  xepLoai: XepLoaiRenLuyen;
  phanBoDiem: PhanBoDiemRenLuyen;
};

type TongQuan = {
  tongChiHoi: number;
  tongHoiVien: number;
  hoiVienDangHoatDong: number;
  tongHoatDong: number;
  hoatDongDaKetThuc: number;
  tongLuotDangKy: number;
  choDiemDanh: number;
  daThamGia: number;
  vangMat: number;
  vangCoLyDo: number;
  daHuy: number;
  daCoKetQua: number;
  tyLeThamGia: number;
  soKetQuaRenLuyen: number;
  diemRenLuyenTrungBinh: number;
  thongKeXepLoaiRenLuyen: XepLoaiRenLuyen;
};

type ChiHoiStat = {
  id: string;
  _id: string;
  maChiHoi: string;
  tenChiHoi: string;
  tongHoiVien: number;
  hoiVienDangHoatDong: number;
  tongLuotDangKy: number;
  daThamGia: number;
  vang: number;
  tyLeThamGia: number;
  soKetQuaRenLuyen: number;
  diemRenLuyenTrungBinh: number;
  xepLoaiRenLuyen?: XepLoaiRenLuyen;
};

type DiemRenLuyenMoiNhat = {
  diem: number;
  xepLoai: string;
  hocKy: string;
  namHoc: string;
};

type HoiVienStat = {
  id: string;
  _id: string;
  maHoiVien: string;
  hoTen: string;
  lop?: string;
  khoaHoc?: string;
  trangThai?: string;

  chiHoi?:
    | ChiHoiRef
    | string
    | null;

  tongDangKy: number;
  daThamGia: number;
  vangMat: number;
  vangCoLyDo: number;
  daHuy: number;
  tyLeThamGia: number;

  soKetQuaRenLuyen: number;
  diemRenLuyenTrungBinh: number;

  diemRenLuyenMoiNhat?:
    | DiemRenLuyenMoiNhat
    | null;
};

type HoatDongStat = {
  id: string;
  _id: string;

  maHoatDong: string;
  tenHoatDong: string;

  phamVi: string;

  chiHoi?:
    | ChiHoiRef
    | string
    | null;

  diaDiem?: string;

  thoiGianBatDau?: string;
  thoiGianKetThuc?: string;

  trangThai?: string;

  tongDangKy: number;
  choDiemDanh: number;
  daThamGia: number;
  vangMat: number;
  vangCoLyDo: number;
  daHuy: number;
  tyLeThamGia: number;
};

type TheoThang = {
  thang: string;
  soHoatDong: number;
  tongDangKy: number;
  daThamGia: number;
};

type TaiChinhTongQuan = {
  tongThu: number;
  tongChi: number;
  soDu: number;
  soGiaoDich: number;
  soKhoanThu: number;
  soKhoanChi: number;
};

type TaiChinhRow = {
  id: string;
  _id: string;

  loai:
    | "THU"
    | "CHI";

  phamVi: string;

  chiHoi?:
    | ChiHoiRef
    | string
    | null;

  soTien: number;

  noiDung: string;

  ngayGiaoDich?: string;

  ghiChu?: string;

  nguoiTaoTen?: string;

  chungTuUrl?: string;
};

type TaiChinhTheoThang = {
  thang: string;
  tongThu: number;
  tongChi: number;
  soDu: number;
  soGiaoDich: number;
};

type TaiChinhTheoChiHoi = {
  id: string;
  maChiHoi: string;
  tenChiHoi: string;
  tongThu: number;
  tongChi: number;
  soDu: number;
  soGiaoDich: number;
};

type FilterResponse = {
  tuNgay?: string | null;
  denNgay?: string | null;
  chiHoiId?: string | null;
  trangThai?: string | null;
  phamVi?: string | null;
  search?: string | null;
  loaiGiaoDich?: string | null;
  hocKy?: string | null;
  namHoc?: string | null;
};

type ThongKeData = {
  loai: LoaiThongKe;

  boLoc?: FilterResponse;

  tongQuan: TongQuan;

  topChiHoi: ChiHoiStat[];

  theoThang: TheoThang[];

  diemRenLuyenTongQuan:
    DiemRenLuyenTongQuan;

  taiChinhTongQuan:
    TaiChinhTongQuan;

  taiChinhTheoThang:
    TaiChinhTheoThang[];

  taiChinhTheoChiHoi:
    TaiChinhTheoChiHoi[];

  ketQua?: unknown;

  chiHoi?: ChiHoiStat[];

  hoiVien?: HoiVienStat[];

  hoatDong?: HoatDongStat[];

  taiChinh?: TaiChinhRow[];
};

type ApiResponse = {
  success: boolean;
  message?: string;
  user?: SessionUser;
  data?: unknown;
};

type Filters = {
  tuNgay: string;
  denNgay: string;
  chiHoiId: string;
  trangThai: string;
  phamVi: string;
  search: string;
  loaiGiaoDich: string;
  hocKy: string;
  namHoc: string;
};

type ReportCell =
  | string
  | number;

type ReportSection = {
  title: string;

  headers: string[];

  rows:
    ReportCell[][];
};

type ReportPreviewData = {
  title: string;

  subtitle: string;

  generatedAt: string;

  generatedBy: string;

  filters: Array<{
    label: string;
    value: string;
  }>;

  summary: Array<{
    label: string;
    value:
      | string
      | number;
  }>;

  sections:
    ReportSection[];
};

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_FILTERS: Filters = {
  tuNgay: "",
  denNgay: "",
  chiHoiId: "",
  trangThai: "",
  phamVi: "",
  search: "",
  loaiGiaoDich: "",
  hocKy: "",
  namHoc: "",
};

const ACTIVITY_STATUS_LABEL:
  Record<string, string> = {
  CHO_DUYET:
    "Chờ duyệt",

  DA_DUYET:
    "Đã duyệt",

  TU_CHOI:
    "Từ chối",

  SAP_DIEN_RA:
    "Sắp diễn ra",

  DANG_DIEN_RA:
    "Đang diễn ra",

  DA_KET_THUC:
    "Đã kết thúc",

  DA_HUY:
    "Đã hủy",
};

const MEMBER_STATUS_LABEL:
  Record<string, string> = {
  DANG_HOAT_DONG:
    "Đang hoạt động",

  TAM_NGUNG:
    "Tạm ngừng",
};

const REN_LUYEN_LABEL:
  Record<string, string> = {
  XUAT_SAC:
    "Xuất sắc",

  TOT:
    "Tốt",

  KHA:
    "Khá",

  TRUNG_BINH:
    "Trung bình",

  YEU:
    "Yếu",
};

const TYPE_LABEL:
  Record<LoaiThongKe, string> = {
  TONG_QUAN:
    "Tổng quan",

  CHI_HOI:
    "Chi hội",

  HOI_VIEN:
    "Hội viên",

  HOAT_DONG:
    "Hoạt động",

  TAI_CHINH:
    "Tài chính",
};

/* =========================================================
   BASIC HELPERS
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

function getChiHoi(
  value:
    | ChiHoiRef
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

function formatChiHoi(
  value:
    | ChiHoiRef
    | string
    | null
    | undefined,
) {
  const chiHoi =
    getChiHoi(
      value,
    );

  if (!chiHoi) {
    return "—";
  }

  if (
    chiHoi.maChiHoi &&
    chiHoi.tenChiHoi
  ) {
    return `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`;
  }

  return (
    chiHoi.tenChiHoi ||
    chiHoi.maChiHoi ||
    "—"
  );
}

function safeNumber(
  value: unknown,
) {
  const number =
    Number(
      value,
    );

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "vi-VN",
  ).format(
    safeNumber(
      value,
    ),
  );
}

function formatDate(
  value?: string,
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

function formatDateTime(
  value?: string,
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

function formatMonth(
  value: string,
) {
  const [
    year,
    month,
  ] =
    value.split(
      "-",
    );

  if (
    !year ||
    !month
  ) {
    return value;
  }

  return `Tháng ${Number(
    month,
  )}/${year}`;
}

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    "vi-VN",
    {
      style:
        "currency",

      currency:
        "VND",

      maximumFractionDigits:
        0,
    },
  ).format(
    safeNumber(
      value,
    ),
  );
}

function percentClass(
  value: number,
) {
  if (
    value >=
    80
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value >=
    50
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function diemClass(
  value: number,
) {
  if (
    value >=
    90
  ) {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  if (
    value >=
    80
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value >=
    65
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    value >=
    50
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
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

function escapeHtml(
  value: unknown,
) {
  return String(
    value ??
      "",
  )
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      '"',
      "&quot;",
    )
    .replaceAll(
      "'",
      "&#039;",
    );
}

/* =========================================================
   EXCEL HELPERS
========================================================= */

function createExcelSheet(
  rows:
    unknown[][],
) {
  const worksheet =
    XLSX.utils.aoa_to_sheet(
      rows,
    );

  const widths:
    {
      wch: number;
    }[] = [];

  for (
    const row of
    rows
  ) {
    row.forEach(
      (
        cell,
        index,
      ) => {
        const length =
          Math.min(
            String(
              cell ??
                "",
            ).length +
              2,
            60,
          );

        if (
          !widths[index]
        ) {
          widths[index] = {
            wch:
              Math.max(
                10,
                length,
              ),
          };
        } else {
          widths[index].wch =
            Math.max(
              widths[index]
                .wch,
              length,
            );
        }
      },
    );
  }

  worksheet["!cols"] =
    widths;

  return worksheet;
}

function downloadExcel(
  fileName: string,

  sheets: {
    name: string;

    rows:
      unknown[][];
  }[],
) {
  const workbook =
    XLSX.utils.book_new();

  for (
    const sheet of
    sheets
  ) {
    XLSX.utils.book_append_sheet(
      workbook,

      createExcelSheet(
        sheet.rows,
      ),

      sheet.name.slice(
        0,
        31,
      ),
    );
  }

  XLSX.writeFile(
    workbook,
    fileName,
  );
}

/* =========================================================
   API HELPERS
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
      "API trả về dữ liệu không phải JSON:",
      {
        url:
          response.url,

        status:
          response.status,

        response:
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
        `API trả dữ liệu không hợp lệ. HTTP ${response.status}`,
    };
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function ThongKePage() {
  const router =
    useRouter();

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<SessionUser | null>(
      null,
    );

  const [
    loai,
    setLoai,
  ] =
    useState<LoaiThongKe>(
      "TONG_QUAN",
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
    data,
    setData,
  ] =
    useState<ThongKeData | null>(
      null,
    );

  const [
    chiHoiOptions,
    setChiHoiOptions,
  ] =
    useState<
      ChiHoiRef[]
    >(
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
    error,
    setError,
  ] =
    useState(
      "",
    );

  const [
    success,
    setSuccess,
  ] =
    useState(
      "",
    );

  const [
    showReportPreview,
    setShowReportPreview,
  ] =
    useState(
      false,
    );

  const isCHT =
    currentUser?.role ===
    "CHI_HOI_TRUONG";

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
              ) as UserRole,
          };
        }

        if (
          !user ||
          ![
            "ADMIN",
            "BAN_CHAP_HANH",
            "CHI_HOI_TRUONG",
          ].includes(
            user.role,
          )
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
     LOAD CHI HOI OPTIONS
  ======================================================= */

  const loadChiHoiOptions =
    useCallback(
      async (
        user:
          SessionUser,
      ) => {
        if (
          user.role ===
          "CHI_HOI_TRUONG"
        ) {
          setChiHoiOptions(
            [],
          );

          return;
        }

        try {
          const response =
            await fetch(
              "/api/chi-hoi",
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
            !result.success
          ) {
            return;
          }

          if (
            Array.isArray(
              result.data,
            )
          ) {
            setChiHoiOptions(
              result.data as
                ChiHoiRef[],
            );

            return;
          }

          if (
            result.data &&
            typeof result.data ===
              "object"
          ) {
            const object =
              result.data as Record<
                string,
                unknown
              >;

            const list =
              object.danhSach ??
              object.data ??
              object.items;

            if (
              Array.isArray(
                list,
              )
            ) {
              setChiHoiOptions(
                list as
                  ChiHoiRef[],
              );
            }
          }
        } catch (
          loadError
        ) {
          console.error(
            "Không tải được danh sách Chi hội:",
            loadError,
          );
        }
      },
      [],
    );

  /* =======================================================
     LOAD STATISTICS
  ======================================================= */

  const loadStatistics =
    useCallback(
      async (
        targetType:
          LoaiThongKe,

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

          setSuccess(
            "",
          );

          const params =
            new URLSearchParams();

          params.set(
            "loai",
            targetType,
          );

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

          if (
            targetFilters.chiHoiId
          ) {
            params.set(
              "chiHoiId",
              targetFilters.chiHoiId,
            );
          }

          if (
            targetFilters.trangThai
          ) {
            params.set(
              "trangThai",
              targetFilters.trangThai,
            );
          }

          if (
            targetFilters.phamVi
          ) {
            params.set(
              "phamVi",
              targetFilters.phamVi,
            );
          }

          if (
            targetFilters.search.trim()
          ) {
            params.set(
              "search",
              targetFilters.search.trim(),
            );
          }

          if (
            targetFilters.loaiGiaoDich
          ) {
            params.set(
              "loaiGiaoDich",
              targetFilters.loaiGiaoDich,
            );
          }

          if (
            targetFilters.hocKy
          ) {
            params.set(
              "hocKy",
              targetFilters.hocKy,
            );
          }

          if (
            targetFilters.namHoc.trim()
          ) {
            params.set(
              "namHoc",
              targetFilters.namHoc.trim(),
            );
          }

          const response =
            await fetch(
              `/api/thong-ke?${params.toString()}`,
              {
                credentials:
                  "include",

                cache:
                  "no-store",
              },
            );

          const result =
            (
              await parseJson(
                response,
              )
            ) as {
              success:
                boolean;

              message?:
                string;

              data?:
                ThongKeData;
            };

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
                "Không thể tải dữ liệu thống kê",
            );
          }

          setData(
            result.data,
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
              : "Không thể tải dữ liệu thống kê",
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
     INITIAL LOAD
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
                  loadChiHoiOptions(
                    user,
                  ),

                  loadStatistics(
                    "TONG_QUAN",
                    {
                      ...EMPTY_FILTERS,
                    },
                  ),
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
      loadChiHoiOptions,
      loadCurrentUser,
      loadStatistics,
    ],
  );

  /* =======================================================
     DATA LISTS
  ======================================================= */

  const chiHoiList = useMemo(() => data?.chiHoi ?? [], [data?.chiHoi]);

  const hoiVienList = useMemo(() => data?.hoiVien ?? [], [data?.hoiVien]);

  const hoatDongList = useMemo(() => data?.hoatDong ?? [], [data?.hoatDong]);

  const taiChinhList = useMemo(() => data?.taiChinh ?? [], [data?.taiChinh]);

  /* =======================================================
     TAB CHANGE
  ======================================================= */

  function changeType(
    value:
      LoaiThongKe,
  ) {
    setLoai(
      value,
    );

    setShowReportPreview(
      false,
    );

    setError(
      "",
    );

    setSuccess(
      "",
    );

    const next:
      Filters = {
      ...filters,

      search:
        "",

      trangThai:
        "",

      phamVi:
        "",

      loaiGiaoDich:
        "",
    };

    setFilters(
      next,
    );

    setAppliedFilters(
      next,
    );

    void loadStatistics(
      value,
      next,
      true,
    );
  }

  /* =======================================================
     APPLY FILTERS
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

    setError(
      "",
    );

    setSuccess(
      "",
    );

    setShowReportPreview(
      false,
    );

    const next = {
      ...filters,
    };

    setAppliedFilters(
      next,
    );

    void loadStatistics(
      loai,
      next,
      true,
    );
  }

  /* =======================================================
     RESET FILTERS
  ======================================================= */

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

    setShowReportPreview(
      false,
    );

    setError(
      "",
    );

    setSuccess(
      "",
    );

    void loadStatistics(
      loai,
      next,
      true,
    );
  }

  /* =======================================================
     REFRESH
  ======================================================= */

  function refreshData() {
    setShowReportPreview(
      false,
    );

    setSuccess(
      "",
    );

    void loadStatistics(
      loai,
      appliedFilters,
      true,
    );
  }

  /* =======================================================
     MAX VALUES
  ======================================================= */

  const maxActivity =
    useMemo(
      () =>
        Math.max(
          1,

          ...(
            data?.theoThang ??
            []
          ).map(
            (
              item,
            ) =>
              item.soHoatDong,
          ),
        ),
      [
        data,
      ],
    );

  const maxFinanceMonth =
    useMemo(
      () =>
        Math.max(
          1,

          ...(
            data?.taiChinhTheoThang ??
            []
          ).map(
            (
              item,
            ) =>
              Math.max(
                item.tongThu,
                item.tongChi,
              ),
          ),
        ),
      [
        data,
      ],
    );

  /* =======================================================
     REPORT FILTERS
  ======================================================= */

  const reportFilters =
    useMemo(
      () => {
        const rows: Array<{
          label: string;
          value: string;
        }> = [];

        rows.push({
          label:
            "Loại báo cáo",

          value:
            TYPE_LABEL[
              loai
            ],
        });

        rows.push({
          label:
            "Từ ngày",

          value:
            appliedFilters.tuNgay ||
            "Tất cả",
        });

        rows.push({
          label:
            "Đến ngày",

          value:
            appliedFilters.denNgay ||
            "Tất cả",
        });

        if (
          isCHT
        ) {
          rows.push({
            label:
              "Chi hội",

            value:
              "Chi hội đang phụ trách",
          });
        } else if (
          appliedFilters.chiHoiId
        ) {
          const selected =
            chiHoiOptions.find(
              (
                item,
              ) =>
                getId(
                  item,
                ) ===
                appliedFilters
                  .chiHoiId,
            );

          rows.push({
            label:
              "Chi hội",

            value:
              selected
                ? formatChiHoi(
                    selected,
                  )
                : appliedFilters
                    .chiHoiId,
          });
        } else {
          rows.push({
            label:
              "Chi hội",

            value:
              "Tất cả",
          });
        }

        if (
          appliedFilters.hocKy
        ) {
          rows.push({
            label:
              "Học kỳ",

            value:
              appliedFilters.hocKy,
          });
        }

        if (
          appliedFilters.namHoc
        ) {
          rows.push({
            label:
              "Năm học",

            value:
              appliedFilters.namHoc,
          });
        }

        if (
          appliedFilters.trangThai
        ) {
          rows.push({
            label:
              "Trạng thái",

            value:
              loai ===
              "HOAT_DONG"
                ? (
                    ACTIVITY_STATUS_LABEL[
                      appliedFilters
                        .trangThai
                    ] ||
                    appliedFilters
                      .trangThai
                  )
                : (
                    MEMBER_STATUS_LABEL[
                      appliedFilters
                        .trangThai
                    ] ||
                    appliedFilters
                      .trangThai
                  ),
          });
        }

        if (
          appliedFilters.phamVi
        ) {
          rows.push({
            label:
              "Phạm vi",

            value:
              appliedFilters.phamVi ===
              "LIEN_CHI_HOI"
                ? "Liên Chi hội"
                : "Chi hội",
          });
        }

        if (
          appliedFilters.loaiGiaoDich
        ) {
          rows.push({
            label:
              "Loại giao dịch",

            value:
              appliedFilters.loaiGiaoDich ===
              "THU"
                ? "Thu"
                : "Chi",
          });
        }

        if (
          appliedFilters.search
        ) {
          rows.push({
            label:
              "Từ khóa",

            value:
              appliedFilters.search,
          });
        }

        return rows;
      },
      [
        appliedFilters,
        chiHoiOptions,
        isCHT,
        loai,
      ],
    );

  /* =======================================================
     REPORT DATA
  ======================================================= */

  const reportData =
    useMemo<ReportPreviewData | null>(
      () => {
        if (
          !data ||
          !currentUser
        ) {
          return null;
        }

        const generatedAt =
          new Date()
            .toISOString();

        const generatedBy =
          currentUser.fullName ||
          currentUser.username;

        /* ===============================================
           TONG QUAN
        =============================================== */

        if (
          loai ===
          "TONG_QUAN"
        ) {
          return {
            title:
              "BÁO CÁO TỔNG QUAN HỆ THỐNG",

            subtitle:
              "Tổng hợp tình hình Chi hội, Hội viên, hoạt động và điểm rèn luyện.",

            generatedAt,

            generatedBy,

            filters:
              reportFilters,

            summary: [
              {
                label:
                  "Tổng Chi hội",

                value:
                  data.tongQuan
                    .tongChiHoi,
              },

              {
                label:
                  "Tổng Hội viên",

                value:
                  data.tongQuan
                    .tongHoiVien,
              },

              {
                label:
                  "Hội viên đang hoạt động",

                value:
                  data.tongQuan
                    .hoiVienDangHoatDong,
              },

              {
                label:
                  "Tổng hoạt động",

                value:
                  data.tongQuan
                    .tongHoatDong,
              },

              {
                label:
                  "Hoạt động đã kết thúc",

                value:
                  data.tongQuan
                    .hoatDongDaKetThuc,
              },

              {
                label:
                  "Lượt đăng ký",

                value:
                  data.tongQuan
                    .tongLuotDangKy,
              },

              {
                label:
                  "Đã tham gia",

                value:
                  data.tongQuan
                    .daThamGia,
              },

              {
                label:
                  "Tỷ lệ tham gia",

                value:
                  `${data.tongQuan.tyLeThamGia}%`,
              },

              {
                label:
                  "Điểm rèn luyện TB",

                value:
                  data.tongQuan
                    .diemRenLuyenTrungBinh,
              },
            ],

            sections: [
              {
                title:
                  "Thống kê Chi hội",

                headers: [
                  "Mã Chi hội",
                  "Tên Chi hội",
                  "Hội viên",
                  "Đang hoạt động",
                  "Đã tham gia",
                  "Tỷ lệ tham gia",
                  "Điểm rèn luyện TB",
                ],

                rows:
                  data.topChiHoi.map(
                    (
                      item,
                    ) => [
                      item.maChiHoi,

                      item.tenChiHoi,

                      item.tongHoiVien,

                      item.hoiVienDangHoatDong,

                      item.daThamGia,

                      `${item.tyLeThamGia}%`,

                      item.diemRenLuyenTrungBinh,
                    ],
                  ),
              },

              {
                title:
                  "Hoạt động theo tháng",

                headers: [
                  "Tháng",
                  "Số hoạt động",
                  "Lượt đăng ký",
                  "Đã tham gia",
                ],

                rows:
                  data.theoThang.map(
                    (
                      item,
                    ) => [
                      formatMonth(
                        item.thang,
                      ),

                      item.soHoatDong,

                      item.tongDangKy,

                      item.daThamGia,
                    ],
                  ),
              },
            ],
          };
        }

        /* ===============================================
           CHI HOI
        =============================================== */

        if (
          loai ===
          "CHI_HOI"
        ) {
          return {
            title:
              "BÁO CÁO TÌNH HÌNH CHI HỘI",

            subtitle:
              "Tổng hợp số lượng Hội viên, tỷ lệ tham gia và điểm rèn luyện theo Chi hội.",

            generatedAt,

            generatedBy,

            filters:
              reportFilters,

            summary: [
              {
                label:
                  "Số Chi hội",

                value:
                  chiHoiList.length,
              },

              {
                label:
                  "Tổng Hội viên",

                value:
                  chiHoiList.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.tongHoiVien,
                    0,
                  ),
              },

              {
                label:
                  "Hội viên hoạt động",

                value:
                  chiHoiList.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.hoiVienDangHoatDong,
                    0,
                  ),
              },

              {
                label:
                  "Lượt tham gia",

                value:
                  chiHoiList.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.daThamGia,
                    0,
                  ),
              },
            ],

            sections: [
              {
                title:
                  "Danh sách Chi hội",

                headers: [
                  "STT",
                  "Mã Chi hội",
                  "Tên Chi hội",
                  "Hội viên",
                  "Đang hoạt động",
                  "Lượt đăng ký",
                  "Đã tham gia",
                  "Vắng",
                  "Tỷ lệ",
                  "Kết quả rèn luyện",
                  "Điểm TB",
                ],

                rows:
                  chiHoiList.map(
                    (
                      item,
                      index,
                    ) => [
                      index +
                        1,

                      item.maChiHoi,

                      item.tenChiHoi,

                      item.tongHoiVien,

                      item.hoiVienDangHoatDong,

                      item.tongLuotDangKy,

                      item.daThamGia,

                      item.vang,

                      `${item.tyLeThamGia}%`,

                      item.soKetQuaRenLuyen,

                      item.diemRenLuyenTrungBinh,
                    ],
                  ),
              },
            ],
          };
        }

        /* ===============================================
           HOI VIEN
        =============================================== */

        if (
          loai ===
          "HOI_VIEN"
        ) {
          return {
            title:
              "BÁO CÁO HỘI VIÊN",

            subtitle:
              "Tổng hợp tình hình tham gia hoạt động và kết quả rèn luyện của Hội viên.",

            generatedAt,

            generatedBy,

            filters:
              reportFilters,

            summary: [
              {
                label:
                  "Số Hội viên",

                value:
                  hoiVienList.length,
              },

              {
                label:
                  "Lượt đăng ký",

                value:
                  hoiVienList.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.tongDangKy,
                    0,
                  ),
              },

              {
                label:
                  "Lượt tham gia",

                value:
                  hoiVienList.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.daThamGia,
                    0,
                  ),
              },

              {
                label:
                  "Kết quả rèn luyện",

                value:
                  hoiVienList.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.soKetQuaRenLuyen,
                    0,
                  ),
              },
            ],

            sections: [
              {
                title:
                  "Danh sách Hội viên",

                headers: [
                  "STT",
                  "Mã Hội viên",
                  "Họ tên",
                  "Chi hội",
                  "Lớp",
                  "Khóa",
                  "Trạng thái",
                  "Đăng ký",
                  "Tham gia",
                  "Vắng",
                  "Có lý do",
                  "Đã hủy",
                  "Tỷ lệ",
                  "Điểm TB",
                  "Điểm gần nhất",
                  "Xếp loại",
                ],

                rows:
                  hoiVienList.map(
                    (
                      item,
                      index,
                    ) => [
                      index +
                        1,

                      item.maHoiVien,

                      item.hoTen,

                      formatChiHoi(
                        item.chiHoi,
                      ),

                      item.lop ||
                        "—",

                      item.khoaHoc ||
                        "—",

                      MEMBER_STATUS_LABEL[
                        item.trangThai ||
                          ""
                      ] ||
                        item.trangThai ||
                        "—",

                      item.tongDangKy,

                      item.daThamGia,

                      item.vangMat,

                      item.vangCoLyDo,

                      item.daHuy,

                      `${item.tyLeThamGia}%`,

                      item.diemRenLuyenTrungBinh,

                      item.diemRenLuyenMoiNhat
                        ?.diem ??
                        "—",

                      item.diemRenLuyenMoiNhat
                        ? (
                            REN_LUYEN_LABEL[
                              item
                                .diemRenLuyenMoiNhat
                                .xepLoai
                            ] ||
                            item
                              .diemRenLuyenMoiNhat
                              .xepLoai
                          )
                        : "—",
                    ],
                  ),
              },
            ],
          };
        }

        /* ===============================================
           HOAT DONG
        =============================================== */

        if (
          loai ===
          "HOAT_DONG"
        ) {
          return {
            title:
              "BÁO CÁO HOẠT ĐỘNG",

            subtitle:
              "Tổng hợp hoạt động, lượt đăng ký, điểm danh và tỷ lệ tham gia.",

            generatedAt,

            generatedBy,

            filters:
              reportFilters,

            summary: [
              {
                label:
                  "Số hoạt động",

                value:
                  hoatDongList.length,
              },

              {
                label:
                  "Lượt đăng ký",

                value:
                  hoatDongList.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.tongDangKy,
                    0,
                  ),
              },

              {
                label:
                  "Đã tham gia",

                value:
                  hoatDongList.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.daThamGia,
                    0,
                  ),
              },

              {
                label:
                  "Vắng",

                value:
                  hoatDongList.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.vangMat +
                      item.vangCoLyDo,
                    0,
                  ),
              },
            ],

            sections: [
              {
                title:
                  "Danh sách hoạt động",

                headers: [
                  "STT",
                  "Mã",
                  "Tên hoạt động",
                  "Phạm vi",
                  "Chi hội",
                  "Địa điểm",
                  "Bắt đầu",
                  "Kết thúc",
                  "Trạng thái",
                  "Đăng ký",
                  "Chờ điểm danh",
                  "Tham gia",
                  "Vắng",
                  "Có lý do",
                  "Đã hủy",
                  "Tỷ lệ",
                ],

                rows:
                  hoatDongList.map(
                    (
                      item,
                      index,
                    ) => [
                      index +
                        1,

                      item.maHoatDong,

                      item.tenHoatDong,

                      item.phamVi ===
                      "LIEN_CHI_HOI"
                        ? "Liên Chi hội"
                        : "Chi hội",

                      formatChiHoi(
                        item.chiHoi,
                      ),

                      item.diaDiem ||
                        "—",

                      formatDate(
                        item.thoiGianBatDau,
                      ),

                      formatDate(
                        item.thoiGianKetThuc,
                      ),

                      ACTIVITY_STATUS_LABEL[
                        item.trangThai ||
                          ""
                      ] ||
                        item.trangThai ||
                        "—",

                      item.tongDangKy,

                      item.choDiemDanh,

                      item.daThamGia,

                      item.vangMat,

                      item.vangCoLyDo,

                      item.daHuy,

                      `${item.tyLeThamGia}%`,
                    ],
                  ),
              },
            ],
          };
        }

        /* ===============================================
           TAI CHINH
        =============================================== */

        return {
          title:
            "BÁO CÁO TÀI CHÍNH",

          subtitle:
            "Tổng hợp nguồn thu, khoản chi, số dư và giao dịch tài chính.",

          generatedAt,

          generatedBy,

          filters:
            reportFilters,

          summary: [
            {
              label:
                "Tổng thu",

              value:
                formatMoney(
                  data.taiChinhTongQuan
                    .tongThu,
                ),
            },

            {
              label:
                "Tổng chi",

              value:
                formatMoney(
                  data.taiChinhTongQuan
                    .tongChi,
                ),
            },

            {
              label:
                "Số dư",

              value:
                formatMoney(
                  data.taiChinhTongQuan
                    .soDu,
                ),
            },

            {
              label:
                "Số giao dịch",

              value:
                data.taiChinhTongQuan
                  .soGiaoDich,
            },
          ],

          sections: [
            {
              title:
                "Danh sách giao dịch",

              headers: [
                "STT",
                "Ngày",
                "Nội dung",
                "Phạm vi",
                "Chi hội",
                "Loại",
                "Số tiền",
                "Người tạo",
                "Ghi chú",
              ],

              rows:
                taiChinhList.map(
                  (
                    item,
                    index,
                  ) => [
                    index +
                      1,

                    formatDate(
                      item.ngayGiaoDich,
                    ),

                    item.noiDung,

                    item.phamVi ===
                    "LIEN_CHI_HOI"
                      ? "Liên Chi hội"
                      : "Chi hội",

                    formatChiHoi(
                      item.chiHoi,
                    ),

                    item.loai ===
                    "THU"
                      ? "Thu"
                      : "Chi",

                    formatMoney(
                      item.soTien,
                    ),

                    item.nguoiTaoTen ||
                      "—",

                    item.ghiChu ||
                      "",
                  ],
                ),
            },

            {
              title:
                "Tổng hợp theo tháng",

              headers: [
                "Tháng",
                "Tổng thu",
                "Tổng chi",
                "Số dư",
                "Giao dịch",
              ],

              rows:
                data.taiChinhTheoThang.map(
                  (
                    item,
                  ) => [
                    formatMonth(
                      item.thang,
                    ),

                    formatMoney(
                      item.tongThu,
                    ),

                    formatMoney(
                      item.tongChi,
                    ),

                    formatMoney(
                      item.soDu,
                    ),

                    item.soGiaoDich,
                  ],
                ),
            },

            {
              title:
                "Tổng hợp theo Chi hội",

              headers: [
                "Mã Chi hội",
                "Tên Chi hội",
                "Tổng thu",
                "Tổng chi",
                "Số dư",
                "Giao dịch",
              ],

              rows:
                data.taiChinhTheoChiHoi.map(
                  (
                    item,
                  ) => [
                    item.maChiHoi,

                    item.tenChiHoi,

                    formatMoney(
                      item.tongThu,
                    ),

                    formatMoney(
                      item.tongChi,
                    ),

                    formatMoney(
                      item.soDu,
                    ),

                    item.soGiaoDich,
                  ],
                ),
            },
          ],
        };
      },
      [
        chiHoiList,
        currentUser,
        data,
        hoatDongList,
        hoiVienList,
        loai,
        reportFilters,
        taiChinhList,
      ],
    );

  /* =======================================================
     REPORT HAS DATA
  ======================================================= */

  function reportHasData() {
    if (!data) {
      return false;
    }

    if (
      loai ===
      "TONG_QUAN"
    ) {
      return (
        data.tongQuan
          .tongChiHoi >
          0 ||
        data.tongQuan
          .tongHoiVien >
          0 ||
        data.tongQuan
          .tongHoatDong >
          0 ||
        data.taiChinhTongQuan
          .soGiaoDich >
          0
      );
    }

    if (
      loai ===
      "CHI_HOI"
    ) {
      return (
        chiHoiList.length >
        0
      );
    }

    if (
      loai ===
      "HOI_VIEN"
    ) {
      return (
        hoiVienList.length >
        0
      );
    }

    if (
      loai ===
      "HOAT_DONG"
    ) {
      return (
        hoatDongList.length >
        0
      );
    }

    return (
      taiChinhList.length >
        0 ||
      data.taiChinhTongQuan
        .soGiaoDich >
        0
    );
  }

  /* =======================================================
     CREATE REPORT
  ======================================================= */

  function handleCreateReport() {
    setError(
      "",
    );

    setSuccess(
      "",
    );

    if (!data) {
      setError(
        "Chưa có dữ liệu thống kê để tạo báo cáo.",
      );

      return;
    }

    if (
      !reportHasData()
    ) {
      setError(
        "Không có dữ liệu để tạo báo cáo.",
      );

      return;
    }

    setShowReportPreview(
      true,
    );

    setSuccess(
      "Đã tạo báo cáo từ dữ liệu thống kê hiện tại.",
    );

    window.setTimeout(
      () => {
        document
          .getElementById(
            "report-preview",
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
      },
      100,
    );
  }

  /* =======================================================
     EXPORT REPORT EXCEL
  ======================================================= */

  function exportReportExcel() {
    if (
      !reportData
    ) {
      setError(
        "Chưa có báo cáo để xuất.",
      );

      return;
    }

    setError(
      "",
    );

    const sheets: {
      name: string;

      rows:
        unknown[][];
    }[] = [];

    const overviewRows:
      unknown[][] = [
      [
        reportData.title,
      ],

      [
        reportData.subtitle,
      ],

      [],

      [
        "Người lập",
        reportData.generatedBy,
      ],

      [
        "Thời gian tạo",
        formatDateTime(
          reportData.generatedAt,
        ),
      ],

      [],

      [
        "BỘ LỌC",
      ],
    ];

    reportData.filters.forEach(
      (
        item,
      ) => {
        overviewRows.push([
          item.label,
          item.value,
        ]);
      },
    );

    overviewRows.push(
      [],
    );

    overviewRows.push([
      "TỔNG HỢP",
    ]);

    reportData.summary.forEach(
      (
        item,
      ) => {
        overviewRows.push([
          item.label,
          item.value,
        ]);
      },
    );

    sheets.push({
      name:
        "Tổng hợp",

      rows:
        overviewRows,
    });

    reportData.sections.forEach(
      (
        section,
        index,
      ) => {
        sheets.push({
          name:
            section.title ||
            `Chi tiết ${index + 1}`,

          rows: [
            [
              section.title,
            ],

            [],

            section.headers,

            ...section.rows,
          ],
        });
      },
    );

    downloadExcel(
      `bao-cao-${loai
        .toLowerCase()
        .replaceAll(
          "_",
          "-",
        )}-${fileDate()}.xlsx`,
      sheets,
    );

    setSuccess(
      "Xuất báo cáo Excel thành công.",
    );
  }

  /* =======================================================
     EXPORT PDF / PRINT
  ======================================================= */

  function exportReportPdf() {
    if (
      !reportData
    ) {
      setError(
        "Chưa có báo cáo để xuất.",
      );

      return;
    }

    setError(
      "",
    );

    const filterHtml =
      reportData.filters
        .map(
          (
            item,
          ) => `
            <div class="meta">
              <span>${escapeHtml(
                item.label,
              )}</span>
              <strong>${escapeHtml(
                item.value,
              )}</strong>
            </div>
          `,
        )
        .join(
          "",
        );

    const summaryHtml =
      reportData.summary
        .map(
          (
            item,
          ) => `
            <div class="summary">
              <span>${escapeHtml(
                item.label,
              )}</span>
              <strong>${escapeHtml(
                item.value,
              )}</strong>
            </div>
          `,
        )
        .join(
          "",
        );

    const sectionsHtml =
      reportData.sections
        .map(
          (
            section,
          ) => {
            const headers =
              section.headers
                .map(
                  (
                    header,
                  ) =>
                    `<th>${escapeHtml(
                      header,
                    )}</th>`,
                )
                .join(
                  "",
                );

            const rows =
              section.rows
                .map(
                  (
                    row,
                  ) =>
                    `<tr>${row
                      .map(
                        (
                          cell,
                        ) =>
                          `<td>${escapeHtml(
                            cell,
                          )}</td>`,
                      )
                      .join(
                        "",
                      )}</tr>`,
                )
                .join(
                  "",
                );

            return `
              <section>
                <h2>${escapeHtml(
                  section.title,
                )}</h2>

                ${
                  section.rows
                    .length >
                  0
                    ? `
                    <table>
                      <thead>
                        <tr>
                          ${headers}
                        </tr>
                      </thead>

                      <tbody>
                        ${rows}
                      </tbody>
                    </table>
                  `
                    : `
                    <div class="empty">
                      Không có dữ liệu.
                    </div>
                  `
                }
              </section>
            `;
          },
        )
        .join(
          "",
        );

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1200,height=800",
      );

    if (
      !printWindow
    ) {
      setError(
        "Trình duyệt đang chặn cửa sổ in. Hãy cho phép popup và thử lại.",
      );

      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>

      <html lang="vi">
        <head>
          <meta charset="UTF-8" />

          <title>
            ${escapeHtml(
              reportData.title,
            )}
          </title>

          <style>
            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #0f172a;
              font-size: 11px;
              line-height: 1.5;
            }

            .header {
              text-align: center;
              margin-bottom: 20px;
            }

            .header h1 {
              margin: 0;
              font-size: 21px;
            }

            .header p {
              color: #475569;
              margin: 6px 0;
            }

            .info {
              margin-top: 10px;
              font-size: 10px;
              color: #64748b;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin: 16px 0;
            }

            .meta,
            .summary {
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 8px;
            }

            .meta span,
            .summary span {
              display: block;
              color: #64748b;
              font-size: 9px;
            }

            .meta strong,
            .summary strong {
              display: block;
              margin-top: 3px;
            }

            .summary strong {
              font-size: 15px;
            }

            section {
              margin-top: 20px;
            }

            section h2 {
              font-size: 14px;
              margin: 0 0 8px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 8.5px;
            }

            th,
            td {
              border: 1px solid #cbd5e1;
              padding: 5px;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #f1f5f9;
              font-weight: bold;
            }

            tr {
              page-break-inside: avoid;
            }

            .empty {
              border: 1px dashed #cbd5e1;
              padding: 12px;
              color: #64748b;
            }

            .footer {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #e2e8f0;
              font-size: 9px;
              color: #64748b;
              text-align: center;
            }
          </style>
        </head>

        <body>
          <div class="header">
            <h1>
              ${escapeHtml(
                reportData.title,
              )}
            </h1>

            <p>
              ${escapeHtml(
                reportData.subtitle,
              )}
            </p>

            <div class="info">
              Người lập:
              <strong>
                ${escapeHtml(
                  reportData.generatedBy,
                )}
              </strong>

              ·

              Thời gian:
              ${escapeHtml(
                formatDateTime(
                  reportData.generatedAt,
                ),
              )}
            </div>
          </div>

          <div class="grid">
            ${filterHtml}
          </div>

          <div class="grid">
            ${summaryHtml}
          </div>

          ${sectionsHtml}

          <div class="footer">
            Hệ thống quản lý Liên Chi hội Khoa Sư phạm
          </div>

          <script>
            window.addEventListener(
              "load",
              function () {
                window.print();
              }
            );
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();

    setSuccess(
      "Đã mở bản in báo cáo. Chọn Save as PDF để lưu PDF.",
    );
  }

  /* =======================================================
     QUICK EXCEL - CURRENT TAB
  ======================================================= */

  function exportCurrentExcel() {
    if (!data) {
      setError(
        "Không có dữ liệu để xuất.",
      );

      return;
    }

    if (
      !reportHasData()
    ) {
      setError(
        "Không có dữ liệu phù hợp để xuất.",
      );

      return;
    }

    /*
     * Sử dụng cùng dữ liệu báo cáo
     * để tránh Excel nhanh và Báo cáo
     * cho kết quả khác nhau.
     */
    exportReportExcel();
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={36}
            className="mx-auto animate-spin text-[#123b68]"
          />

          <p className="mt-3 text-sm text-slate-500">
            Đang tổng hợp dữ liệu thống kê...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-full bg-[#f4f7fb] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1700px]">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123b68]">
              Thống kê & báo cáo
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Thống kê dữ liệu
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {isCHT
                ? "Theo dõi Hội viên, hoạt động, điểm rèn luyện và tài chính của Chi hội bạn phụ trách."
                : "Tổng hợp Chi hội, Hội viên, hoạt động, điểm rèn luyện và tài chính trong hệ thống."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={
                handleCreateReport
              }
              disabled={
                refreshing ||
                !data
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#123b68] px-4 text-sm font-semibold text-white hover:bg-[#0e3158] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText
                size={17}
              />

              Tạo báo cáo
            </button>

            <button
              type="button"
              onClick={
                exportCurrentExcel
              }
              disabled={
                refreshing ||
                !data
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              <FileSpreadsheet
                size={17}
              />

              Xuất Excel
            </button>

            <button
              type="button"
              onClick={
                refreshData
              }
              disabled={
                refreshing
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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

        {/* =================================================
            MESSAGE
        ================================================= */}

        {error && (
          <MessageBox
            type="error"
            message={
              error
            }
            onClose={() =>
              setError(
                "",
              )
            }
          />
        )}

        {success && (
          <MessageBox
            type="success"
            message={
              success
            }
            onClose={() =>
              setSuccess(
                "",
              )
            }
          />
        )}

        {/* =================================================
            TYPE TABS
        ================================================= */}

        <section className="mb-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-2">
            <TypeTab
              active={
                loai ===
                "TONG_QUAN"
              }
              icon={
                <BarChart3
                  size={17}
                />
              }
              label="Tổng quan"
              onClick={() =>
                changeType(
                  "TONG_QUAN",
                )
              }
            />

            <TypeTab
              active={
                loai ===
                "CHI_HOI"
              }
              icon={
                <Building2
                  size={17}
                />
              }
              label="Chi hội"
              onClick={() =>
                changeType(
                  "CHI_HOI",
                )
              }
            />

            <TypeTab
              active={
                loai ===
                "HOI_VIEN"
              }
              icon={
                <Users
                  size={17}
                />
              }
              label="Hội viên"
              onClick={() =>
                changeType(
                  "HOI_VIEN",
                )
              }
            />

            <TypeTab
              active={
                loai ===
                "HOAT_DONG"
              }
              icon={
                <CalendarDays
                  size={17}
                />
              }
              label="Hoạt động"
              onClick={() =>
                changeType(
                  "HOAT_DONG",
                )
              }
            />

            <TypeTab
              active={
                loai ===
                "TAI_CHINH"
              }
              icon={
                <WalletCards
                  size={17}
                />
              }
              label="Tài chính"
              onClick={() =>
                changeType(
                  "TAI_CHINH",
                )
              }
            />
          </div>
        </section>

        {/* =================================================
            FILTERS
        ================================================= */}

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Filter
                size={18}
                className="text-[#123b68]"
              />

              <h2 className="font-bold text-slate-900">
                Bộ lọc thống kê
              </h2>
            </div>
          </div>

          <div className="p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

              {/* DATE FROM */}

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
                        previous,
                      ) => ({
                        ...previous,

                        tuNgay:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68]"
                />
              </FilterField>

              {/* DATE TO */}

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
                        previous,
                      ) => ({
                        ...previous,

                        denNgay:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68]"
                />
              </FilterField>

              {/* CHI HOI */}

              {!isCHT && (
                <FilterField
                  label="Chi hội"
                >
                  <select
                    value={
                      filters.chiHoiId
                    }
                    onChange={(
                      event,
                    ) =>
                      setFilters(
                        (
                          previous,
                        ) => ({
                          ...previous,

                          chiHoiId:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68]"
                  >
                    <option value="">
                      Tất cả Chi hội
                    </option>

                    {chiHoiOptions.map(
                      (
                        item,
                      ) => (
                        <option
                          key={
                            getId(
                              item,
                            )
                          }
                          value={
                            getId(
                              item,
                            )
                          }
                        >
                          {formatChiHoi(
                            item,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </FilterField>
              )}

              {/* HOC KY */}

              <FilterField
                label="Học kỳ"
              >
                <select
                  value={
                    filters.hocKy
                  }
                  onChange={(
                    event,
                  ) =>
                    setFilters(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        hocKy:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68]"
                >
                  <option value="">
                    Tất cả
                  </option>

                  <option value="HK1">
                    Học kỳ 1
                  </option>

                  <option value="HK2">
                    Học kỳ 2
                  </option>

                  <option value="HK_HE">
                    Học kỳ hè
                  </option>
                </select>
              </FilterField>

              {/* NAM HOC */}

              <FilterField
                label="Năm học"
              >
                <input
                  value={
                    filters.namHoc
                  }
                  onChange={(
                    event,
                  ) =>
                    setFilters(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        namHoc:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="VD: 2025-2026"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68]"
                />
              </FilterField>

              {/* HOI VIEN FILTERS */}

              {loai ===
                "HOI_VIEN" && (
                <>
                  <FilterField
                    label="Trạng thái Hội viên"
                  >
                    <select
                      value={
                        filters.trangThai
                      }
                      onChange={(
                        event,
                      ) =>
                        setFilters(
                          (
                            previous,
                          ) => ({
                            ...previous,

                            trangThai:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68]"
                    >
                      <option value="">
                        Tất cả
                      </option>

                      <option value="DANG_HOAT_DONG">
                        Đang hoạt động
                      </option>

                      <option value="TAM_NGUNG">
                        Tạm ngừng
                      </option>
                    </select>
                  </FilterField>

                  <FilterField
                    label="Tìm Hội viên"
                  >
                    <SearchInput
                      value={
                        filters.search
                      }
                      placeholder="Mã, tên, lớp, khóa..."
                      onChange={(
                        value,
                      ) =>
                        setFilters(
                          (
                            previous,
                          ) => ({
                            ...previous,

                            search:
                              value,
                          }),
                        )
                      }
                    />
                  </FilterField>
                </>
              )}

              {/* HOAT DONG FILTERS */}

              {loai ===
                "HOAT_DONG" && (
                <>
                  <FilterField
                    label="Phạm vi"
                  >
                    <select
                      value={
                        filters.phamVi
                      }
                      onChange={(
                        event,
                      ) =>
                        setFilters(
                          (
                            previous,
                          ) => ({
                            ...previous,

                            phamVi:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68]"
                    >
                      <option value="">
                        Tất cả
                      </option>

                      <option value="LIEN_CHI_HOI">
                        Liên Chi hội
                      </option>

                      <option value="CHI_HOI">
                        Chi hội
                      </option>
                    </select>
                  </FilterField>

                  <FilterField
                    label="Trạng thái"
                  >
                    <select
                      value={
                        filters.trangThai
                      }
                      onChange={(
                        event,
                      ) =>
                        setFilters(
                          (
                            previous,
                          ) => ({
                            ...previous,

                            trangThai:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68]"
                    >
                      <option value="">
                        Tất cả
                      </option>

                      {Object.entries(
                        ACTIVITY_STATUS_LABEL,
                      ).map(
                        (
                          [
                            value,
                            label,
                          ],
                        ) => (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
                          >
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </FilterField>

                  <FilterField
                    label="Tìm hoạt động"
                  >
                    <SearchInput
                      value={
                        filters.search
                      }
                      placeholder="Mã, tên, địa điểm..."
                      onChange={(
                        value,
                      ) =>
                        setFilters(
                          (
                            previous,
                          ) => ({
                            ...previous,

                            search:
                              value,
                          }),
                        )
                      }
                    />
                  </FilterField>
                </>
              )}

              {/* FINANCE FILTER */}

              {loai ===
                "TAI_CHINH" && (
                <>
                  <FilterField
                    label="Loại giao dịch"
                  >
                    <select
                      value={
                        filters.loaiGiaoDich
                      }
                      onChange={(
                        event,
                      ) =>
                        setFilters(
                          (
                            previous,
                          ) => ({
                            ...previous,

                            loaiGiaoDich:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68]"
                    >
                      <option value="">
                        Tất cả
                      </option>

                      <option value="THU">
                        Thu
                      </option>

                      <option value="CHI">
                        Chi
                      </option>
                    </select>
                  </FilterField>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  applyFilters
                }
                disabled={
                  refreshing
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#123b68] px-5 text-sm font-semibold text-white hover:bg-[#0e3158] disabled:opacity-50"
              >
                {refreshing ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Filter
                    size={17}
                  />
                )}

                Thống kê
              </button>

              <button
                type="button"
                onClick={
                  resetFilters
                }
                disabled={
                  refreshing
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RotateCcw
                  size={17}
                />

                Đặt lại
              </button>
            </div>
          </div>
        </section>

        {/* =================================================
            NO DATA
        ================================================= */}

        {!data && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <EmptyState
              text="Không có dữ liệu thống kê."
            />
          </section>
        )}

        {/* =================================================
            TONG QUAN
        ================================================= */}

        {data &&
          loai ===
            "TONG_QUAN" && (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Tổng Chi hội"
                  value={
                    data.tongQuan
                      .tongChiHoi
                  }
                  icon={
                    <Building2
                      size={22}
                    />
                  }
                />

                <StatCard
                  label="Tổng Hội viên"
                  value={
                    data.tongQuan
                      .tongHoiVien
                  }
                  icon={
                    <Users
                      size={22}
                    />
                  }
                />

                <StatCard
                  label="Tổng hoạt động"
                  value={
                    data.tongQuan
                      .tongHoatDong
                  }
                  icon={
                    <CalendarDays
                      size={22}
                    />
                  }
                />

                <StatCard
                  label="Tỷ lệ tham gia"
                  value={`${data.tongQuan.tyLeThamGia}%`}
                  icon={
                    <TrendingUp
                      size={22}
                    />
                  }
                />

                <StatCard
                  label="Đã tham gia"
                  value={
                    data.tongQuan
                      .daThamGia
                  }
                  icon={
                    <UserCheck
                      size={22}
                    />
                  }
                />

                <StatCard
                  label="Vắng mặt"
                  value={
                    data.tongQuan
                      .vangMat
                  }
                  icon={
                    <AlertCircle
                      size={22}
                    />
                  }
                />

                <StatCard
                  label="Kết quả rèn luyện"
                  value={
                    data.tongQuan
                      .soKetQuaRenLuyen
                  }
                  icon={
                    <GraduationCap
                      size={22}
                    />
                  }
                />

                <StatCard
                  label="Điểm rèn luyện TB"
                  value={
                    data.tongQuan
                      .diemRenLuyenTrungBinh
                  }
                  icon={
                    <Award
                      size={22}
                    />
                  }
                />
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-2">
                <Panel
                  title="Hoạt động theo tháng"
                  description="Số hoạt động phát sinh theo từng tháng."
                >
                  {data.theoThang
                    .length ===
                  0 ? (
                    <EmptyState
                      text="Chưa có dữ liệu hoạt động."
                    />
                  ) : (
                    <div className="space-y-3">
                      {data.theoThang.map(
                        (
                          item,
                        ) => (
                          <BarRow
                            key={
                              item.thang
                            }
                            label={formatMonth(
                              item.thang,
                            )}
                            value={
                              item.soHoatDong
                            }
                            max={
                              maxActivity
                            }
                          />
                        ),
                      )}
                    </div>
                  )}
                </Panel>

                <Panel
                  title="Xếp loại điểm rèn luyện"
                  description="Phân bố kết quả rèn luyện đã được duyệt."
                >
                  <div className="space-y-4">
                    <DistributionRow
                      label="Xuất sắc"
                      value={
                        data
                          .diemRenLuyenTongQuan
                          .xepLoai
                          .xuatSac
                      }
                      total={
                        data
                          .diemRenLuyenTongQuan
                          .tongKetQua
                      }
                    />

                    <DistributionRow
                      label="Tốt"
                      value={
                        data
                          .diemRenLuyenTongQuan
                          .xepLoai
                          .tot
                      }
                      total={
                        data
                          .diemRenLuyenTongQuan
                          .tongKetQua
                      }
                    />

                    <DistributionRow
                      label="Khá"
                      value={
                        data
                          .diemRenLuyenTongQuan
                          .xepLoai
                          .kha
                      }
                      total={
                        data
                          .diemRenLuyenTongQuan
                          .tongKetQua
                      }
                    />

                    <DistributionRow
                      label="Trung bình"
                      value={
                        data
                          .diemRenLuyenTongQuan
                          .xepLoai
                          .trungBinh
                      }
                      total={
                        data
                          .diemRenLuyenTongQuan
                          .tongKetQua
                      }
                    />

                    <DistributionRow
                      label="Yếu"
                      value={
                        data
                          .diemRenLuyenTongQuan
                          .xepLoai
                          .yeu
                      }
                      total={
                        data
                          .diemRenLuyenTongQuan
                          .tongKetQua
                      }
                    />
                  </div>
                </Panel>
              </section>

              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <SectionHeader
                  title="Thống kê theo Chi hội"
                  description="Tổng hợp Hội viên, tham gia hoạt động và điểm rèn luyện."
                />

                {data.topChiHoi
                  .length ===
                0 ? (
                  <EmptyState
                    text="Không có dữ liệu Chi hội."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">
                            Chi hội
                          </th>

                          <th className="px-4 py-3 text-center">
                            Hội viên
                          </th>

                          <th className="px-4 py-3 text-center">
                            Hoạt động
                          </th>

                          <th className="px-4 py-3 text-center">
                            Đã tham gia
                          </th>

                          <th className="px-4 py-3 text-center">
                            Tỷ lệ
                          </th>

                          <th className="px-4 py-3 text-center">
                            Điểm RL TB
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {data.topChiHoi.map(
                          (
                            item,
                          ) => (
                            <tr
                              key={
                                item.id ||
                                item._id
                              }
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 py-4">
                                <p className="font-semibold text-slate-900">
                                  {item.tenChiHoi}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  {item.maChiHoi}
                                </p>
                              </td>

                              <NumberCell
                                value={
                                  item.tongHoiVien
                                }
                              />

                              <NumberCell
                                value={
                                  item.tongLuotDangKy
                                }
                              />

                              <NumberCell
                                value={
                                  item.daThamGia
                                }
                              />

                              <td className="px-4 py-4 text-center">
                                <PercentBadge
                                  value={
                                    item.tyLeThamGia
                                  }
                                />
                              </td>

                              <td className="px-4 py-4 text-center">
                                <DiemBadge
                                  value={
                                    item.diemRenLuyenTrungBinh
                                  }
                                />
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

        {/* =================================================
            CHI HOI
        ================================================= */}

        {data &&
          loai ===
            "CHI_HOI" && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeader
                title="Thống kê Chi hội"
                description="Số Hội viên, tình hình tham gia hoạt động và điểm rèn luyện của từng Chi hội."
              />

              {chiHoiList.length ===
              0 ? (
                <EmptyState
                  text="Không có dữ liệu Chi hội phù hợp."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1250px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">
                          Chi hội
                        </th>

                        <th className="px-4 py-3 text-center">
                          Hội viên
                        </th>

                        <th className="px-4 py-3 text-center">
                          Đang hoạt động
                        </th>

                        <th className="px-4 py-3 text-center">
                          Đăng ký
                        </th>

                        <th className="px-4 py-3 text-center">
                          Tham gia
                        </th>

                        <th className="px-4 py-3 text-center">
                          Vắng
                        </th>

                        <th className="px-4 py-3 text-center">
                          Tỷ lệ
                        </th>

                        <th className="px-4 py-3 text-center">
                          KQ rèn luyện
                        </th>

                        <th className="px-4 py-3 text-center">
                          Điểm TB
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {chiHoiList.map(
                        (
                          item,
                        ) => (
                          <tr
                            key={
                              item.id ||
                              item._id
                            }
                            className="hover:bg-slate-50"
                          >
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900">
                                {item.tenChiHoi}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {item.maChiHoi}
                              </p>
                            </td>

                            <NumberCell
                              value={
                                item.tongHoiVien
                              }
                            />

                            <NumberCell
                              value={
                                item.hoiVienDangHoatDong
                              }
                            />

                            <NumberCell
                              value={
                                item.tongLuotDangKy
                              }
                            />

                            <NumberCell
                              value={
                                item.daThamGia
                              }
                            />

                            <NumberCell
                              value={
                                item.vang
                              }
                            />

                            <td className="px-4 py-4 text-center">
                              <PercentBadge
                                value={
                                  item.tyLeThamGia
                                }
                              />
                            </td>

                            <NumberCell
                              value={
                                item.soKetQuaRenLuyen
                              }
                            />

                            <td className="px-4 py-4 text-center">
                              <DiemBadge
                                value={
                                  item.diemRenLuyenTrungBinh
                                }
                              />
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

        {/* =================================================
            HOI VIEN
        ================================================= */}

        {data &&
          loai ===
            "HOI_VIEN" && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeader
                title="Thống kê Hội viên"
                description={`${formatNumber(
                  hoiVienList.length,
                )} Hội viên phù hợp với bộ lọc.`}
              />

              {hoiVienList.length ===
              0 ? (
                <EmptyState
                  text="Không có dữ liệu Hội viên phù hợp."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1550px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">
                          Hội viên
                        </th>

                        <th className="px-4 py-3">
                          Chi hội
                        </th>

                        <th className="px-4 py-3">
                          Lớp / Khóa
                        </th>

                        <th className="px-4 py-3">
                          Trạng thái
                        </th>

                        <th className="px-4 py-3 text-center">
                          Đăng ký
                        </th>

                        <th className="px-4 py-3 text-center">
                          Tham gia
                        </th>

                        <th className="px-4 py-3 text-center">
                          Vắng
                        </th>

                        <th className="px-4 py-3 text-center">
                          Có lý do
                        </th>

                        <th className="px-4 py-3 text-center">
                          Đã hủy
                        </th>

                        <th className="px-4 py-3 text-center">
                          Tỷ lệ
                        </th>

                        <th className="px-4 py-3 text-center">
                          Điểm TB
                        </th>

                        <th className="px-4 py-3">
                          Gần nhất
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {hoiVienList.map(
                        (
                          item,
                        ) => (
                          <tr
                            key={
                              item.id ||
                              item._id
                            }
                            className="hover:bg-slate-50"
                          >
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900">
                                {item.hoTen}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {item.maHoiVien}
                              </p>
                            </td>

                            <td className="px-4 py-4 text-slate-600">
                              {formatChiHoi(
                                item.chiHoi,
                              )}
                            </td>

                            <td className="px-4 py-4 text-slate-600">
                              <p>
                                {item.lop ||
                                  "—"}
                              </p>

                              <p className="text-xs text-slate-400">
                                {item.khoaHoc ||
                                  "—"}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <MemberStatusBadge
                                value={
                                  item.trangThai ||
                                  ""
                                }
                              />
                            </td>

                            <NumberCell
                              value={
                                item.tongDangKy
                              }
                            />

                            <NumberCell
                              value={
                                item.daThamGia
                              }
                            />

                            <NumberCell
                              value={
                                item.vangMat
                              }
                            />

                            <NumberCell
                              value={
                                item.vangCoLyDo
                              }
                            />

                            <NumberCell
                              value={
                                item.daHuy
                              }
                            />

                            <td className="px-4 py-4 text-center">
                              <PercentBadge
                                value={
                                  item.tyLeThamGia
                                }
                              />
                            </td>

                            <td className="px-4 py-4 text-center">
                              <DiemBadge
                                value={
                                  item.diemRenLuyenTrungBinh
                                }
                              />
                            </td>

                            <td className="px-4 py-4">
                              {item.diemRenLuyenMoiNhat ? (
                                <div>
                                  <div className="flex items-center gap-2">
                                    <DiemBadge
                                      value={
                                        item
                                          .diemRenLuyenMoiNhat
                                          .diem
                                      }
                                    />

                                    <RenLuyenBadge
                                      value={
                                        item
                                          .diemRenLuyenMoiNhat
                                          .xepLoai
                                      }
                                    />
                                  </div>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {
                                      item
                                        .diemRenLuyenMoiNhat
                                        .hocKy
                                    }
                                    {" · "}
                                    {
                                      item
                                        .diemRenLuyenMoiNhat
                                        .namHoc
                                    }
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-400">
                                  Chưa có
                                </span>
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

        {/* =================================================
            HOAT DONG
        ================================================= */}

        {data &&
          loai ===
            "HOAT_DONG" && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeader
                title="Thống kê hoạt động"
                description={`${formatNumber(
                  hoatDongList.length,
                )} hoạt động phù hợp với bộ lọc.`}
              />

              {hoatDongList.length ===
              0 ? (
                <EmptyState
                  text="Không có dữ liệu hoạt động phù hợp."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1650px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">
                          Hoạt động
                        </th>

                        <th className="px-4 py-3">
                          Phạm vi
                        </th>

                        <th className="px-4 py-3">
                          Chi hội
                        </th>

                        <th className="px-4 py-3">
                          Thời gian
                        </th>

                        <th className="px-4 py-3">
                          Trạng thái
                        </th>

                        <th className="px-4 py-3 text-center">
                          Đăng ký
                        </th>

                        <th className="px-4 py-3 text-center">
                          Chờ điểm danh
                        </th>

                        <th className="px-4 py-3 text-center">
                          Tham gia
                        </th>

                        <th className="px-4 py-3 text-center">
                          Vắng
                        </th>

                        <th className="px-4 py-3 text-center">
                          Có lý do
                        </th>

                        <th className="px-4 py-3 text-center">
                          Hủy
                        </th>

                        <th className="px-4 py-3 text-center">
                          Tỷ lệ
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {hoatDongList.map(
                        (
                          item,
                        ) => (
                          <tr
                            key={
                              item.id ||
                              item._id
                            }
                            className="hover:bg-slate-50"
                          >
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900">
                                {item.tenHoatDong}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {item.maHoatDong}
                              </p>

                              {item.diaDiem && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.diaDiem}
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-4 text-slate-600">
                              {item.phamVi ===
                              "LIEN_CHI_HOI"
                                ? "Liên Chi hội"
                                : "Chi hội"}
                            </td>

                            <td className="px-4 py-4 text-slate-600">
                              {formatChiHoi(
                                item.chiHoi,
                              )}
                            </td>

                            <td className="px-4 py-4 text-slate-600">
                              <p>
                                {formatDate(
                                  item.thoiGianBatDau,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                đến{" "}
                                {formatDate(
                                  item.thoiGianKetThuc,
                                )}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <ActivityStatusBadge
                                value={
                                  item.trangThai ||
                                  ""
                                }
                              />
                            </td>

                            <NumberCell
                              value={
                                item.tongDangKy
                              }
                            />

                            <NumberCell
                              value={
                                item.choDiemDanh
                              }
                            />

                            <NumberCell
                              value={
                                item.daThamGia
                              }
                            />

                            <NumberCell
                              value={
                                item.vangMat
                              }
                            />

                            <NumberCell
                              value={
                                item.vangCoLyDo
                              }
                            />

                            <NumberCell
                              value={
                                item.daHuy
                              }
                            />

                            <td className="px-4 py-4 text-center">
                              <PercentBadge
                                value={
                                  item.tyLeThamGia
                                }
                              />
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

        {/* =================================================
            TAI CHINH
        ================================================= */}

        {data &&
          loai ===
            "TAI_CHINH" && (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <FinanceCard
                  label="Tổng thu"
                  value={formatMoney(
                    data
                      .taiChinhTongQuan
                      .tongThu,
                  )}
                  icon={
                    <ArrowUpCircle
                      size={23}
                    />
                  }
                  type="income"
                />

                <FinanceCard
                  label="Tổng chi"
                  value={formatMoney(
                    data
                      .taiChinhTongQuan
                      .tongChi,
                  )}
                  icon={
                    <ArrowDownCircle
                      size={23}
                    />
                  }
                  type="expense"
                />

                <StatCard
                  label="Số dư"
                  value={formatMoney(
                    data
                      .taiChinhTongQuan
                      .soDu,
                  )}
                  icon={
                    <WalletCards
                      size={22}
                    />
                  }
                />

                <StatCard
                  label="Số giao dịch"
                  value={
                    data
                      .taiChinhTongQuan
                      .soGiaoDich
                  }
                  icon={
                    <Activity
                      size={22}
                    />
                  }
                />
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-2">
                <Panel
                  title="Thu chi theo tháng"
                  description="So sánh tổng thu và tổng chi theo thời gian."
                >
                  {data
                    .taiChinhTheoThang
                    .length ===
                  0 ? (
                    <EmptyState
                      text="Chưa có giao dịch tài chính."
                    />
                  ) : (
                    <div className="space-y-5">
                      {data.taiChinhTheoThang.map(
                        (
                          item,
                        ) => (
                          <div
                            key={
                              item.thang
                            }
                          >
                            <p className="mb-2 text-xs font-semibold text-slate-700">
                              {formatMonth(
                                item.thang,
                              )}
                            </p>

                            <MoneyBar
                              label="Thu"
                              value={
                                item.tongThu
                              }
                              max={
                                maxFinanceMonth
                              }
                              type="income"
                            />

                            <MoneyBar
                              label="Chi"
                              value={
                                item.tongChi
                              }
                              max={
                                maxFinanceMonth
                              }
                              type="expense"
                            />
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </Panel>

                <Panel
                  title="Tổng hợp theo Chi hội"
                  description="Số dư thu chi của từng Chi hội."
                >
                  {data
                    .taiChinhTheoChiHoi
                    .length ===
                  0 ? (
                    <EmptyState
                      text="Chưa có dữ liệu tài chính theo Chi hội."
                    />
                  ) : (
                    <div className="space-y-3">
                      {data.taiChinhTheoChiHoi.map(
                        (
                          item,
                        ) => (
                          <div
                            key={
                              item.id
                            }
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {item.tenChiHoi}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {item.maChiHoi}
                                </p>
                              </div>

                              <p
                                className={`font-bold ${
                                  item.soDu >=
                                  0
                                    ? "text-emerald-700"
                                    : "text-red-700"
                                }`}
                              >
                                {formatMoney(
                                  item.soDu,
                                )}
                              </p>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <MiniStat
                                label="Thu"
                                value={formatMoney(
                                  item.tongThu,
                                )}
                              />

                              <MiniStat
                                label="Chi"
                                value={formatMoney(
                                  item.tongChi,
                                )}
                              />

                              <MiniStat
                                label="Giao dịch"
                                value={
                                  item.soGiaoDich
                                }
                              />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </Panel>
              </section>

              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <SectionHeader
                  title="Danh sách giao dịch"
                  description={`${formatNumber(
                    taiChinhList.length,
                  )} giao dịch phù hợp với bộ lọc.`}
                />

                {taiChinhList.length ===
                0 ? (
                  <EmptyState
                    text="Không có dữ liệu tài chính phù hợp."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1250px] text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">
                            Ngày
                          </th>

                          <th className="px-4 py-3">
                            Nội dung
                          </th>

                          <th className="px-4 py-3">
                            Phạm vi
                          </th>

                          <th className="px-4 py-3">
                            Chi hội
                          </th>

                          <th className="px-4 py-3">
                            Loại
                          </th>

                          <th className="px-4 py-3 text-right">
                            Số tiền
                          </th>

                          <th className="px-4 py-3">
                            Người tạo
                          </th>

                          <th className="px-4 py-3">
                            Ghi chú
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {taiChinhList.map(
                          (
                            item,
                          ) => (
                            <tr
                              key={
                                item.id ||
                                item._id
                              }
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 py-4 whitespace-nowrap text-slate-600">
                                {formatDate(
                                  item.ngayGiaoDich,
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <p className="font-medium text-slate-900">
                                  {item.noiDung}
                                </p>
                              </td>

                              <td className="px-4 py-4 text-slate-600">
                                {item.phamVi ===
                                "LIEN_CHI_HOI"
                                  ? "Liên Chi hội"
                                  : "Chi hội"}
                              </td>

                              <td className="px-4 py-4 text-slate-600">
                                {formatChiHoi(
                                  item.chiHoi,
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <FinanceTypeBadge
                                  value={
                                    item.loai
                                  }
                                />
                              </td>

                              <td
                                className={`px-4 py-4 text-right font-bold ${
                                  item.loai ===
                                  "THU"
                                    ? "text-emerald-700"
                                    : "text-red-700"
                                }`}
                              >
                                {formatMoney(
                                  item.soTien,
                                )}
                              </td>

                              <td className="px-4 py-4 text-slate-600">
                                {item.nguoiTaoTen ||
                                  "—"}
                              </td>

                              <td className="px-4 py-4 text-slate-500">
                                {item.ghiChu ||
                                  "—"}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

        {/* =================================================
            REPORT PREVIEW
        ================================================= */}

        {showReportPreview &&
          reportData && (
            <section
              id="report-preview"
              className="mt-6 overflow-hidden rounded-2xl border border-[#123b68]/20 bg-white shadow-lg"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#123b68]">
                      Báo cáo đã tạo
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-950">
                      Xem trước báo cáo
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={
                        exportReportExcel
                      }
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      <Download
                        size={16}
                      />

                      Xuất Excel
                    </button>

                    <button
                      type="button"
                      onClick={
                        exportReportPdf
                      }
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      <Printer
                        size={16}
                      />

                      Xuất PDF
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowReportPreview(
                          false,
                        )
                      }
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <X
                        size={16}
                      />

                      Đóng
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                {/* REPORT HEADER */}

                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-950 sm:text-2xl">
                    {reportData.title}
                  </h3>

                  <p className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    {reportData.subtitle}
                  </p>

                  <p className="mt-3 text-xs text-slate-400">
                    Người lập:{" "}
                    <strong className="text-slate-600">
                      {reportData.generatedBy}
                    </strong>
                    {" · "}
                    {formatDateTime(
                      reportData.generatedAt,
                    )}
                  </p>
                </div>

                {/* FILTERS */}

                <div className="mt-6">
                  <h4 className="mb-3 text-sm font-bold text-slate-800">
                    Tiêu chí báo cáo
                  </h4>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {reportData.filters.map(
                      (
                        item,
                      ) => (
                        <ReportInfo
                          key={
                            item.label
                          }
                          label={
                            item.label
                          }
                          value={
                            item.value
                          }
                        />
                      ),
                    )}
                  </div>
                </div>

                {/* SUMMARY */}

                <div className="mt-6">
                  <h4 className="mb-3 text-sm font-bold text-slate-800">
                    Số liệu tổng hợp
                  </h4>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {reportData.summary.map(
                      (
                        item,
                      ) => (
                        <div
                          key={
                            item.label
                          }
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <p className="text-xs text-slate-500">
                            {item.label}
                          </p>

                          <p className="mt-2 break-words text-lg font-bold text-slate-950">
                            {item.value}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* REPORT TABLES */}

                {reportData.sections.map(
                  (
                    section,
                    sectionIndex,
                  ) => (
                    <div
                      key={`${section.title}-${sectionIndex}`}
                      className="mt-7"
                    >
                      <h4 className="mb-3 text-base font-bold text-slate-900">
                        {section.title}
                      </h4>

                      {section.rows.length ===
                      0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                          Không có dữ liệu trong mục này.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full min-w-[900px] text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                              <tr>
                                {section.headers.map(
                                  (
                                    header,
                                  ) => (
                                    <th
                                      key={
                                        header
                                      }
                                      className="px-3 py-3"
                                    >
                                      {header}
                                    </th>
                                  ),
                                )}
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                              {section.rows.map(
                                (
                                  row,
                                  rowIndex,
                                ) => (
                                  <tr
                                    key={
                                      rowIndex
                                    }
                                    className="hover:bg-slate-50"
                                  >
                                    {row.map(
                                      (
                                        cell,
                                        cellIndex,
                                      ) => (
                                        <td
                                          key={
                                            cellIndex
                                          }
                                          className="px-3 py-3 text-slate-700"
                                        >
                                          {cell}
                                        </td>
                                      ),
                                    )}
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ),
                )}

                <div className="mt-7 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                  Báo cáo này được tổng hợp trực tiếp từ dữ liệu
                  thống kê và bộ lọc hiện đang áp dụng. Khi chọn
                  Xuất PDF, trình duyệt sẽ mở hộp thoại in; chọn
                  <strong> Save as PDF</strong> để lưu tệp.
                </div>
              </div>
            </section>
          )}
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENT: TYPE TAB
========================================================= */

function TypeTab({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;

  label: string;

  icon: ReactNode;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
        active
          ? "bg-[#123b68] text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {icon}

      {label}
    </button>
  );
}

/* =========================================================
   COMPONENT: FILTER FIELD
========================================================= */

function FilterField({
  label,
  children,
}: {
  label: string;

  children:
    ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      {children}
    </div>
  );
}

/* =========================================================
   COMPONENT: SEARCH INPUT
========================================================= */

function SearchInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;

  placeholder: string;

  onChange:
    (
      value: string,
    ) => void;
}) {
  return (
    <div className="relative">
      <Search
        size={17}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={
          placeholder
        }
        className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#123b68]"
      />
    </div>
  );
}

/* =========================================================
   COMPONENT: MESSAGE
========================================================= */

function MessageBox({
  type,
  message,
  onClose,
}: {
  type:
    | "error"
    | "success";

  message: string;

  onClose:
    () => void;
}) {
  const isSuccess =
    type ===
    "success";

  return (
    <div
      className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {isSuccess ? (
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

        <span>
          {message}
        </span>
      </div>

      <button
        type="button"
        onClick={
          onClose
        }
        className="shrink-0"
        aria-label="Đóng thông báo"
      >
        <X
          size={17}
        />
      </button>
    </div>
  );
}

/* =========================================================
   COMPONENT: SECTION HEADER
========================================================= */

function SectionHeader({
  title,
  description,
}: {
  title: string;

  description:
    string;
}) {
  return (
    <div className="border-b border-slate-200 px-5 py-4">
      <h2 className="font-bold text-slate-950">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   COMPONENT: PANEL
========================================================= */

function Panel({
  title,
  description,
  children,
}: {
  title: string;

  description:
    string;

  children:
    ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <SectionHeader
        title={
          title
        }
        description={
          description
        }
      />

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   COMPONENT: STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;

  value:
    string
    | number;

  icon:
    ReactNode;
}) {
  return (
    <div className="flex min-h-[105px] items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="mt-2 break-words text-xl font-bold text-slate-950">
          {value}
        </p>
      </div>

      <div className="ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#123b68]">
        {icon}
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENT: FINANCE CARD
========================================================= */

function FinanceCard({
  label,
  value,
  icon,
  type,
}: {
  label: string;

  value:
    string;

  icon:
    ReactNode;

  type:
    | "income"
    | "expense";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            {label}
          </p>

          <p
            className={`mt-2 break-words text-lg font-bold ${
              type ===
              "income"
                ? "text-emerald-700"
                : "text-red-700"
            }`}
          >
            {value}
          </p>
        </div>

        <div
          className={
            type ===
            "income"
              ? "text-emerald-600"
              : "text-red-600"
          }
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENT: MINI STAT
========================================================= */

function MiniStat({
  label,
  value,
}: {
  label: string;

  value:
    string
    | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   COMPONENT: NUMBER CELL
========================================================= */

function NumberCell({
  value,
}: {
  value:
    number;
}) {
  return (
    <td className="px-4 py-4 text-center font-semibold text-slate-700">
      {safeNumber(
        value,
      )}
    </td>
  );
}

/* =========================================================
   COMPONENT: PERCENT BADGE
========================================================= */

function PercentBadge({
  value,
}: {
  value:
    number;
}) {
  const safe =
    safeNumber(
      value,
    );

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${percentClass(
        safe,
      )}`}
    >
      {safe.toFixed(
        1,
      )}
      %
    </span>
  );
}

/* =========================================================
   COMPONENT: DIEM BADGE
========================================================= */

function DiemBadge({
  value,
}: {
  value:
    number;
}) {
  const safe =
    safeNumber(
      value,
    );

  if (
    safe <=
    0
  ) {
    return (
      <span className="text-xs text-slate-400">
        Chưa có
      </span>
    );
  }

  return (
    <span
      className={`inline-flex min-w-[54px] justify-center rounded-full border px-2.5 py-1 text-xs font-bold ${diemClass(
        safe,
      )}`}
    >
      {safe.toFixed(
        2,
      )}
    </span>
  );
}

/* =========================================================
   COMPONENT: REN LUYEN BADGE
========================================================= */

function RenLuyenBadge({
  value,
}: {
  value:
    string;
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
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {REN_LUYEN_LABEL[
        value
      ] ||
        value}
    </span>
  );
}

/* =========================================================
   COMPONENT: MEMBER STATUS
========================================================= */

function MemberStatusBadge({
  value,
}: {
  value:
    string;
}) {
  if (
    value ===
    "DANG_HOAT_DONG"
  ) {
    return (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Đang hoạt động
      </span>
    );
  }

  if (
    value ===
    "TAM_NGUNG"
  ) {
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Tạm ngừng
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
      {MEMBER_STATUS_LABEL[
        value
      ] ||
        value ||
        "—"}
    </span>
  );
}

/* =========================================================
   COMPONENT: ACTIVITY STATUS
========================================================= */

function ActivityStatusBadge({
  value,
}: {
  value:
    string;
}) {
  let className =
    "border-slate-200 bg-slate-50 text-slate-600";

  if (
    value ===
    "DA_DUYET"
  ) {
    className =
      "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  if (
    value ===
    "SAP_DIEN_RA"
  ) {
    className =
      "border-cyan-200 bg-cyan-50 text-cyan-700";
  }

  if (
    value ===
    "DANG_DIEN_RA"
  ) {
    className =
      "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    value ===
    "DA_KET_THUC"
  ) {
    className =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value ===
    "CHO_DUYET"
  ) {
    className =
      "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    value ===
      "DA_HUY" ||
    value ===
      "TU_CHOI"
  ) {
    className =
      "border-red-200 bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {ACTIVITY_STATUS_LABEL[
        value
      ] ||
        value ||
        "—"}
    </span>
  );
}

/* =========================================================
   COMPONENT: FINANCE TYPE
========================================================= */

function FinanceTypeBadge({
  value,
}: {
  value:
    | "THU"
    | "CHI";
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
        value ===
        "THU"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {value ===
      "THU"
        ? "Thu"
        : "Chi"}
    </span>
  );
}

/* =========================================================
   COMPONENT: BAR ROW
========================================================= */

function BarRow({
  label,
  value,
  max,
}: {
  label:
    string;

  value:
    number;

  max:
    number;
}) {
  const safeValue =
    safeNumber(
      value,
    );

  const safeMax =
    Math.max(
      safeNumber(
        max,
      ),
      1,
    );

  const width =
    safeValue <=
    0
      ? 0
      : Math.max(
          4,

          Math.min(
            100,

            safeValue /
              safeMax *
              100,
          ),
        );

  return (
    <div className="grid grid-cols-[110px_1fr_50px] items-center gap-3">
      <span className="truncate text-xs text-slate-500">
        {label}
      </span>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#123b68]"
          style={{
            width:
              `${width}%`,
          }}
        />
      </div>

      <span className="text-right text-xs font-semibold text-slate-700">
        {safeValue}
      </span>
    </div>
  );
}

/* =========================================================
   COMPONENT: MONEY BAR
========================================================= */

function MoneyBar({
  label,
  value,
  max,
  type,
}: {
  label:
    string;

  value:
    number;

  max:
    number;

  type:
    | "income"
    | "expense";
}) {
  const safeValue =
    safeNumber(
      value,
    );

  const width =
    safeValue <=
    0
      ? 0
      : Math.max(
          3,

          Math.min(
            100,

            safeValue /
              Math.max(
                safeNumber(
                  max,
                ),
                1,
              ) *
              100,
          ),
        );

  return (
    <div className="grid grid-cols-[45px_1fr_125px] items-center gap-2">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            type ===
            "income"
              ? "bg-emerald-500"
              : "bg-red-500"
          }`}
          style={{
            width:
              `${width}%`,
          }}
        />
      </div>

      <span
        className={`text-right text-xs font-semibold ${
          type ===
          "income"
            ? "text-emerald-700"
            : "text-red-700"
        }`}
      >
        {formatMoney(
          safeValue,
        )}
      </span>
    </div>
  );
}

/* =========================================================
   COMPONENT: DISTRIBUTION ROW
========================================================= */

function DistributionRow({
  label,
  value,
  total,
}: {
  label:
    string;

  value:
    number;

  total:
    number;
}) {
  const safeValue =
    safeNumber(
      value,
    );

  const safeTotal =
    safeNumber(
      total,
    );

  const width =
    safeTotal >
    0
      ? safeValue /
        safeTotal *
        100
      : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-600">
          {label}
        </span>

        <span className="font-bold text-slate-800">
          {safeValue}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#123b68]"
          style={{
            width:
              `${Math.min(
                100,
                Math.max(
                  0,
                  width,
                ),
              )}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENT: REPORT INFO
========================================================= */

function ReportInfo({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   COMPONENT: EMPTY STATE
========================================================= */

function EmptyState({
  text,
}: {
  text:
    string;
}) {
  return (
    <div className="py-16 text-center">
      <BarChart3
        size={42}
        className="mx-auto text-slate-300"
      />

      <p className="mt-3 text-sm text-slate-500">
        {text}
      </p>
    </div>
  );
}