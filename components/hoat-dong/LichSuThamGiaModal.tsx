"use client";

import {
  Activity,
  AlertCircle,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  GraduationCap,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Star,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type TrangThaiDangKy =
  | "DA_DANG_KY"
  | "DA_THAM_GIA"
  | "VANG_MAT"
  | "VANG_CO_LY_DO"
  | "DA_HUY";

type TabType =
  | "HOAT_DONG"
  | "REN_LUYEN";

type ChiHoi = {
  _id?: string;

  id?: string;

  maChiHoi?: string;

  tenChiHoi?: string;
};

type HoatDong = {
  _id?: string;

  id?: string;

  maHoatDong?: string;

  tenHoatDong?: string;

  phamVi?: string;

  chiHoiId?:
    | ChiHoi
    | string
    | null;

  diaDiem?: string;

  thoiGianBatDau?: string;

  thoiGianKetThuc?: string;

  hanDangKy?: string;

  trangThai?: string;

  moTa?: string;
};

type LichSuItem = {
  id: string;

  _id: string;

  hoatDong:
    | HoatDong
    | null;

  hoatDongId?:
    | HoatDong
    | null;

  trangThai:
    TrangThaiDangKy;

  thoiGianDangKy?: string;

  thoiGianHuy?: string | null;

  thoiGianDiemDanh?: string | null;

  lyDoHuy?: string;

  lyDoVang?: string;

  ghiChu?: string;
};

type DiemRenLuyen = {
  id: string;

  _id: string;

  hocKy: string;

  namHoc: string;

  diem: number;

  xepLoai: string;

  nhanXet?: string;

  ngayDuyet?: string | null;
};

type ActivityStats = {
  tongSo: number;

  daDangKy: number;

  daThamGia: number;

  vangMat: number;

  vangCoLyDo: number;

  daHuy: number;

  tyLeThamGia: number;
};

type TrainingStats = {
  tongSo: number;

  diemTrungBinh: number;

  moiNhat:
    | DiemRenLuyen
    | null;
};

type ApiResponse = {
  success: boolean;

  message?: string;

  data?: {
    danhSach?:
      LichSuItem[];

    dangKy?:
      LichSuItem[];

    registrations?:
      LichSuItem[];

    thongKe?:
      ActivityStats;

    diemRenLuyen?: {
      danhSach?:
        DiemRenLuyen[];

      thongKe?:
        TrainingStats;
    };
  };
};

type Props = {
  isOpen?: boolean;

  open?: boolean;

  onClose:
    () => void;
};

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_ACTIVITY_STATS:
  ActivityStats = {
  tongSo: 0,

  daDangKy: 0,

  daThamGia: 0,

  vangMat: 0,

  vangCoLyDo: 0,

  daHuy: 0,

  tyLeThamGia: 0,
};

const EMPTY_TRAINING_STATS:
  TrainingStats = {
  tongSo: 0,

  diemTrungBinh: 0,

  moiNhat: null,
};

const STATUS_OPTIONS: Array<{
  value: "" | TrangThaiDangKy;

  label: string;
}> = [
  {
    value: "",

    label:
      "Tất cả trạng thái",
  },

  {
    value:
      "DA_DANG_KY",

    label:
      "Đã đăng ký",
  },

  {
    value:
      "DA_THAM_GIA",

    label:
      "Đã tham gia",
  },

  {
    value:
      "VANG_MAT",

    label:
      "Vắng mặt",
  },

  {
    value:
      "VANG_CO_LY_DO",

    label:
      "Vắng có lý do",
  },

  {
    value:
      "DA_HUY",

    label:
      "Đã hủy",
  },
];

const TRAINING_LABELS:
  Record<
    string,
    string
  > = {
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

/* =========================================================
   HELPERS
========================================================= */

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

function getActivity(
  item:
    LichSuItem,
) {
  return (
    item.hoatDong ||
    item.hoatDongId ||
    null
  );
}

function getChiHoi(
  activity:
    HoatDong | null,
) {
  if (
    activity?.chiHoiId &&
    typeof activity.chiHoiId ===
      "object"
  ) {
    return activity.chiHoiId;
  }

  return null;
}



function formatDateTime(
  value?:
    string | null,
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

function normalizeSearch(
  value: unknown,
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
  value:
    TrangThaiDangKy,
) {
  return (
    STATUS_OPTIONS.find(
      (
        item,
      ) =>
        item.value ===
        value,
    )?.label ||
    value
  );
}

function getTrainingLabel(
  value:
    string,
) {
  return (
    TRAINING_LABELS[
      value
    ] ||
    value
  );
}

/* =========================================================
   PARSER
========================================================= */

async function parseResponse(
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
    ) as ApiResponse;
  } catch {
    console.error(
      "API /api/hoat-dong/cua-toi không trả JSON:",
      {
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
        `Dữ liệu máy chủ không hợp lệ. HTTP ${response.status}`,
    };
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export default function LichSuThamGiaModal({
  isOpen = true,

  open = true,

  onClose,
}: Props) {
  const visible =
    isOpen &&
    open;

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<TabType>(
      "HOAT_DONG",
    );

  const [
    danhSach,
    setDanhSach,
  ] =
    useState<
      LichSuItem[]
    >([]);

  const [
    diemRenLuyen,
    setDiemRenLuyen,
  ] =
    useState<
      DiemRenLuyen[]
    >([]);

  const [
    activityStats,
    setActivityStats,
  ] =
    useState<ActivityStats>({
      ...EMPTY_ACTIVITY_STATS,
    });

  const [
    trainingStats,
    setTrainingStats,
  ] =
    useState<TrainingStats>({
      ...EMPTY_TRAINING_STATS,
    });

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
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      "" | TrangThaiDangKy
    >(
      "",
    );

  const [
    tuNgay,
    setTuNgay,
  ] =
    useState(
      "",
    );

  const [
    denNgay,
    setDenNgay,
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

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData =
    useCallback(
      async (
        refresh =
          false,
      ) => {
        if (
          !visible
        ) {
          return;
        }

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
            await parseResponse(
              response,
            );

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ||
                "Không thể tải lịch sử tham gia",
            );
          }

          const data =
            result.data;

          const history =
            data?.danhSach ??
            data?.dangKy ??
            data?.registrations ??
            [];

          setDanhSach(
            Array.isArray(
              history,
            )
              ? history
              : [],
          );

          setActivityStats(
            data?.thongKe ??
              {
                ...EMPTY_ACTIVITY_STATS,
              },
          );

          setDiemRenLuyen(
            Array.isArray(
              data?.diemRenLuyen
                ?.danhSach,
            )
              ? data?.diemRenLuyen
                  ?.danhSach ??
                  []
              : [],
          );

          setTrainingStats(
            data?.diemRenLuyen
              ?.thongKe ??
              {
                ...EMPTY_TRAINING_STATS,
              },
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Không thể tải lịch sử tham gia",
          );

          setDanhSach(
            [],
          );

          setDiemRenLuyen(
            [],
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
        visible,
      ],
    );

  useEffect(
    () => {
      if (
        !visible
      ) {
        return;
      }

      const timer =
        window.setTimeout(
          () => {
            void loadData();
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
      loadData,
      visible,
    ],
  );

  /* =======================================================
     FILTER ACTIVITIES
  ======================================================= */

  const filteredActivities =
    useMemo(
      () => {
        const keyword =
          normalizeSearch(
            search,
          );

        return danhSach.filter(
          (
            item,
          ) => {
            const activity =
              getActivity(
                item,
              );

            if (
              statusFilter &&
              item.trangThai !==
                statusFilter
            ) {
              return false;
            }

            if (
              tuNgay ||
              denNgay
            ) {
              const date =
                activity
                  ?.thoiGianBatDau
                  ? new Date(
                      activity.thoiGianBatDau,
                    )
                  : null;

              if (
                !date ||
                Number.isNaN(
                  date.getTime(),
                )
              ) {
                return false;
              }

              if (
                tuNgay
              ) {
                const start =
                  new Date(
                    `${tuNgay}T00:00:00`,
                  );

                if (
                  date <
                  start
                ) {
                  return false;
                }
              }

              if (
                denNgay
              ) {
                const end =
                  new Date(
                    `${denNgay}T23:59:59`,
                  );

                if (
                  date >
                  end
                ) {
                  return false;
                }
              }
            }

            if (
              !keyword
            ) {
              return true;
            }

            const chiHoi =
              getChiHoi(
                activity,
              );

            const content =
              [
                activity?.maHoatDong,
                activity?.tenHoatDong,
                activity?.diaDiem,
                activity?.phamVi,
                chiHoi?.maChiHoi,
                chiHoi?.tenChiHoi,
                getStatusLabel(
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
        denNgay,
        search,
        statusFilter,
        tuNgay,
      ],
    );

  /* =======================================================
     FILTER TRAINING
  ======================================================= */

  const filteredTraining =
    useMemo(
      () => {
        return diemRenLuyen.filter(
          (
            item,
          ) => {
            if (
              hocKyFilter &&
              item.hocKy !==
                hocKyFilter
            ) {
              return false;
            }

            if (
              namHocFilter.trim() &&
              !normalizeSearch(
                item.namHoc,
              ).includes(
                normalizeSearch(
                  namHocFilter,
                ),
              )
            ) {
              return false;
            }

            return true;
          },
        );
      },
      [
        diemRenLuyen,
        hocKyFilter,
        namHocFilter,
      ],
    );

  /* =======================================================
     RESET
  ======================================================= */

  function resetActivityFilters() {
    setSearch(
      "",
    );

    setStatusFilter(
      "",
    );

    setTuNgay(
      "",
    );

    setDenNgay(
      "",
    );
  }

  function resetTrainingFilters() {
    setHocKyFilter(
      "",
    );

    setNamHocFilter(
      "",
    );
  }

  if (
    !visible
  ) {
    return null;
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-2 sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:rounded-2xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#123b68]">
              Hội viên
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Lịch sử tham gia
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Theo dõi hoạt động đã đăng ký, kết quả tham gia và điểm rèn luyện.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadData(
                  true,
                )
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="hidden sm:inline">
                Làm mới
              </span>
            </button>

            <button
              type="button"
              onClick={
                onClose
              }
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Đóng"
            >
              <X
                size={21}
              />
            </button>
          </div>
        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <div className="overflow-y-auto">
          {error && (
            <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />

              {error}
            </div>
          )}

          {/* =================================================
              TABS
          ================================================= */}

          <div className="px-4 pt-4 sm:px-6">
            <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
              <TabButton
                active={
                  activeTab ===
                  "HOAT_DONG"
                }
                icon={
                  <Activity
                    size={17}
                  />
                }
                onClick={() =>
                  setActiveTab(
                    "HOAT_DONG",
                  )
                }
              >
                Lịch sử hoạt động
              </TabButton>

              <TabButton
                active={
                  activeTab ===
                  "REN_LUYEN"
                }
                icon={
                  <Award
                    size={17}
                  />
                }
                onClick={() =>
                  setActiveTab(
                    "REN_LUYEN",
                  )
                }
              >
                Điểm rèn luyện
              </TabButton>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[440px] items-center justify-center">
              <Loader2
                size={34}
                className="animate-spin text-[#123b68]"
              />
            </div>
          ) : (
            <>
              {/* =================================================
                  ACTIVITY TAB
              ================================================= */}

              {activeTab ===
                "HOAT_DONG" && (
                <div className="p-4 sm:p-6">
                  {/* STATS */}

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                    <StatCard
                      label="Tổng lịch sử"
                      value={
                        activityStats.tongSo
                      }
                      icon={
                        <CalendarDays
                          size={19}
                        />
                      }
                    />

                    <StatCard
                      label="Đã đăng ký"
                      value={
                        activityStats.daDangKy
                      }
                      icon={
                        <Clock3
                          size={19}
                        />
                      }
                    />

                    <StatCard
                      label="Có mặt"
                      value={
                        activityStats.daThamGia
                      }
                      icon={
                        <CheckCircle2
                          size={19}
                        />
                      }
                    />

                    <StatCard
                      label="Vắng"
                      value={
                        activityStats.vangMat
                      }
                      icon={
                        <XCircle
                          size={19}
                        />
                      }
                    />

                    <StatCard
                      label="Có lý do"
                      value={
                        activityStats.vangCoLyDo
                      }
                      icon={
                        <AlertCircle
                          size={19}
                        />
                      }
                    />

                    <StatCard
                      label="Đã hủy"
                      value={
                        activityStats.daHuy
                      }
                      icon={
                        <X
                          size={19}
                        />
                      }
                    />

                    <StatCard
                      label="Tỷ lệ tham gia"
                      value={`${safeNumber(
                        activityStats.tyLeThamGia,
                      ).toFixed(1)}%`}
                      icon={
                        <UserCheck
                          size={19}
                        />
                      }
                    />
                  </div>

                  {/* FILTER */}

                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Filter
                        size={17}
                        className="text-[#123b68]"
                      />

                      <h3 className="text-sm font-bold text-slate-800">
                        Lọc lịch sử
                      </h3>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                          placeholder="Tên, mã hoạt động..."
                          className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#123b68]"
                        />
                      </div>

                      <select
                        value={
                          statusFilter
                        }
                        onChange={(
                          event,
                        ) =>
                          setStatusFilter(
                            event.target.value as
                              | ""
                              | TrangThaiDangKy,
                          )
                        }
                        className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                      >
                        {STATUS_OPTIONS.map(
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

                      <input
                        type="date"
                        value={
                          tuNgay
                        }
                        onChange={(
                          event,
                        ) =>
                          setTuNgay(
                            event.target.value,
                          )
                        }
                        className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                      />

                      <input
                        type="date"
                        value={
                          denNgay
                        }
                        onChange={(
                          event,
                        ) =>
                          setDenNgay(
                            event.target.value,
                          )
                        }
                        className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                      />

                      <button
                        type="button"
                        onClick={
                          resetActivityFilters
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <RefreshCw
                          size={15}
                        />

                        Đặt lại
                      </button>
                    </div>
                  </div>

                  {/* LIST */}

                  {filteredActivities.length ===
                  0 ? (
                    <EmptyState
                      icon={
                        <CalendarDays
                          size={43}
                        />
                      }
                      title="Chưa có lịch sử tham gia"
                      description="Các hoạt động bạn đã đăng ký hoặc tham gia sẽ xuất hiện tại đây."
                    />
                  ) : (
                    <div className="mt-5 space-y-3">
                      {filteredActivities.map(
                        (
                          item,
                        ) => (
                          <ActivityHistoryCard
                            key={
                              item.id ||
                              item._id
                            }
                            item={
                              item
                            }
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* =================================================
                  TRAINING TAB
              ================================================= */}

              {activeTab ===
                "REN_LUYEN" && (
                <div className="p-4 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard
                      label="Kết quả đã duyệt"
                      value={
                        trainingStats.tongSo
                      }
                      icon={
                        <GraduationCap
                          size={19}
                        />
                      }
                    />

                    <StatCard
                      label="Điểm trung bình"
                      value={
                        safeNumber(
                          trainingStats.diemTrungBinh,
                        ).toFixed(
                          2,
                        )
                      }
                      icon={
                        <Star
                          size={19}
                        />
                      }
                    />

                    <StatCard
                      label="Điểm gần nhất"
                      value={
                        trainingStats.moiNhat
                          ? trainingStats
                              .moiNhat
                              .diem
                          : "—"
                      }
                      icon={
                        <Award
                          size={19}
                        />
                      }
                    />
                  </div>

                  {/* FILTER */}

                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
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
                        className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
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
                        placeholder="Năm học, VD: 2026-2027"
                        className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68]"
                      />

                      <button
                        type="button"
                        onClick={
                          resetTrainingFilters
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <RefreshCw
                          size={15}
                        />

                        Đặt lại
                      </button>
                    </div>
                  </div>

                  {filteredTraining.length ===
                  0 ? (
                    <EmptyState
                      icon={
                        <Award
                          size={43}
                        />
                      }
                      title="Chưa có điểm rèn luyện"
                      description="Kết quả đã được BCH hoặc Quản trị viên duyệt sẽ xuất hiện tại đây."
                    />
                  ) : (
                    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-sm">
                          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-4 py-3">
                                Học kỳ
                              </th>

                              <th className="px-4 py-3">
                                Năm học
                              </th>

                              <th className="px-4 py-3 text-center">
                                Điểm
                              </th>

                              <th className="px-4 py-3">
                                Xếp loại
                              </th>

                              <th className="px-4 py-3">
                                Nhận xét
                              </th>

                              <th className="px-4 py-3">
                                Ngày duyệt
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {filteredTraining.map(
                              (
                                item,
                              ) => (
                                <tr
                                  key={
                                    item.id ||
                                    item._id
                                  }
                                  className="hover:bg-slate-50/70"
                                >
                                  <td className="px-4 py-4 font-semibold text-slate-900">
                                    {
                                      item.hocKy
                                    }
                                  </td>

                                  <td className="px-4 py-4 text-slate-600">
                                    {
                                      item.namHoc
                                    }
                                  </td>

                                  <td className="px-4 py-4 text-center">
                                    <ScoreBadge
                                      value={
                                        item.diem
                                      }
                                    />
                                  </td>

                                  <td className="px-4 py-4">
                                    <TrainingBadge
                                      value={
                                        item.xepLoai
                                      }
                                    />
                                  </td>

                                  <td className="max-w-[340px] px-4 py-4 text-slate-600">
                                    {item.nhanXet ||
                                      "—"}
                                  </td>

                                  <td className="px-4 py-4 text-slate-500">
                                    {formatDateTime(
                                      item.ngayDuyet,
                                    )}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={
              onClose
            }
            className="h-10 rounded-lg bg-[#123b68] px-5 text-sm font-semibold text-white hover:bg-[#0e3158]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ACTIVITY CARD
========================================================= */

function ActivityHistoryCard({
  item,
}: {
  item:
    LichSuItem;
}) {
  const activity =
    getActivity(
      item,
    );

  const chiHoi =
    getChiHoi(
      activity,
    );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-slate-950">
              {activity?.tenHoatDong ||
                "Hoạt động không còn tồn tại"}
            </p>

            <RegistrationBadge
              value={
                item.trangThai
              }
            />
          </div>

          {activity?.maHoatDong && (
            <p className="mt-1 text-xs font-medium text-[#123b68]">
              {
                activity.maHoatDong
              }
            </p>
          )}

          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
            <InfoLine
              icon={
                <CalendarDays
                  size={15}
                />
              }
            >
              {formatDateTime(
                activity?.thoiGianBatDau,
              )}
            </InfoLine>

            <InfoLine
              icon={
                <MapPin
                  size={15}
                />
              }
            >
              {activity?.diaDiem ||
                "Chưa cập nhật địa điểm"}
            </InfoLine>

            <InfoLine
              icon={
                <Activity
                  size={15}
                />
              }
            >
              {activity?.phamVi ===
              "LIEN_CHI_HOI"
                ? "Liên Chi hội"
                : chiHoi
                  ? `${chiHoi.maChiHoi || ""}${chiHoi.maChiHoi && chiHoi.tenChiHoi ? " - " : ""}${chiHoi.tenChiHoi || ""}`
                  : "Chi hội"}
            </InfoLine>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SmallInfo
              label="Đăng ký"
              value={formatDateTime(
                item.thoiGianDangKy,
              )}
            />

            <SmallInfo
              label="Điểm danh"
              value={formatDateTime(
                item.thoiGianDiemDanh,
              )}
            />

            {item.trangThai ===
              "VANG_CO_LY_DO" && (
              <SmallInfo
                label="Lý do vắng"
                value={
                  item.lyDoVang ||
                  "Chưa ghi nhận"
                }
              />
            )}

            {item.trangThai ===
              "DA_HUY" && (
              <SmallInfo
                label="Lý do hủy"
                value={
                  item.lyDoHuy ||
                  "Không có"
                }
              />
            )}
          </div>

          {item.ghiChu && (
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <strong>
                Ghi chú:
              </strong>{" "}
              {item.ghiChu}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TAB
========================================================= */

function TabButton({
  active,

  icon,

  children,

  onClick,
}: {
  active:
    boolean;

  icon:
    ReactNode;

  children:
    ReactNode;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
        active
          ? "bg-white text-[#123b68] shadow-sm"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {icon}

      {children}
    </button>
  );
}

/* =========================================================
   STAT
========================================================= */

function StatCard({
  label,

  value,

  icon,
}: {
  label:
    string;

  value:
    string | number;

  icon:
    ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-lg font-bold text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#123b68]">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   INFO
========================================================= */

function InfoLine({
  icon,

  children,
}: {
  icon:
    ReactNode;

  children:
    ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-slate-400">
        {icon}
      </span>

      <span className="min-w-0 truncate">
        {children}
      </span>
    </div>
  );
}

function SmallInfo({
  label,

  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-700">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   REGISTRATION STATUS
========================================================= */

function RegistrationBadge({
  value,
}: {
  value:
    TrangThaiDangKy;
}) {
  let className =
    "border-slate-200 bg-slate-50 text-slate-600";

  if (
    value ===
    "DA_DANG_KY"
  ) {
    className =
      "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    value ===
    "DA_THAM_GIA"
  ) {
    className =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value ===
    "VANG_MAT"
  ) {
    className =
      "border-red-200 bg-red-50 text-red-700";
  }

  if (
    value ===
    "VANG_CO_LY_DO"
  ) {
    className =
      "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    value ===
    "DA_HUY"
  ) {
    className =
      "border-slate-300 bg-slate-100 text-slate-600";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {getStatusLabel(
        value,
      )}
    </span>
  );
}

/* =========================================================
   TRAINING BADGE
========================================================= */

function TrainingBadge({
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {getTrainingLabel(
        value,
      )}
    </span>
  );
}

/* =========================================================
   SCORE
========================================================= */

function ScoreBadge({
  value,
}: {
  value:
    number;
}) {
  const score =
    safeNumber(
      value,
    );

  let className =
    "border-red-200 bg-red-50 text-red-700";

  if (
    score >=
    90
  ) {
    className =
      "border-purple-200 bg-purple-50 text-purple-700";
  } else if (
    score >=
    80
  ) {
    className =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  } else if (
    score >=
    65
  ) {
    className =
      "border-blue-200 bg-blue-50 text-blue-700";
  } else if (
    score >=
    50
  ) {
    className =
      "border-amber-200 bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={`inline-flex min-w-[55px] justify-center rounded-full border px-2.5 py-1 text-sm font-bold ${className}`}
    >
      {score}
    </span>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState({
  icon,

  title,

  description,
}: {
  icon:
    ReactNode;

  title:
    string;

  description:
    string;
}) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
        {icon}
      </div>

      <p className="mt-4 font-semibold text-slate-700">
        {title}
      </p>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}