"use client";

import {
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  QrCode,
  RefreshCw,
  Search,
  StopCircle,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

import QRCode from "qrcode";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type CurrentUser = {
  id:
    string;

  username:
    string;

  fullName:
    string;

  role:
    UserRole;
};

type HoatDong = {
  id?:
    string;

  _id?:
    string;

  maHoatDong:
    string;

  tenHoatDong:
    string;

  diaDiem?:
    string;

  thoiGianBatDau:
    string;

  thoiGianKetThuc:
    string;

  trangThai:
    string;
};

type ChiHoi = {
  _id?:
    string;

  id?:
    string;

  maChiHoi?:
    string;

  tenChiHoi?:
    string;
};

type PhienQR = {
  _id:
    string;

  token:
    string;

  hoatDongId:
    | HoatDong
    | string;

  chiHoiId?:
    | ChiHoi
    | string
    | null;

  nguoiTaoTen:
    string;

  thoiGianBatDau:
    string;

  thoiGianHetHan:
    string;

  trangThai:
    | "DANG_MO"
    | "DA_DONG";

  daHetHan?:
    boolean;

  dangMo?:
    boolean;

  soLuotDiemDanh?:
    number;

  createdAt?:
    string;
};

type MemberCheckIn = {
  hoiVienId:
    string;

  maHoiVien:
    string;

  hoTen:
    string;

  lop:
    string;

  chiHoi:
    | {
        id:
          string;

        maChiHoi:
          string;

        tenChiHoi:
          string;
      }
    | null;

  daDiemDanh:
    boolean;

  thoiGianDiemDanh:
    string | null;
};

type DetailStats = {
  tongDangKy:
    number;

  daDiemDanh:
    number;

  chuaDiemDanh:
    number;

  tyLeDiemDanh:
    number;
};

type SessionDetail = {
  phien:
    PhienQR;

  thongKe:
    DetailStats;

  danhSach:
    MemberCheckIn[];
};

type Message = {
  type:
    | "success"
    | "error";

  text:
    string;
};

type ApiResponse = {
  success:
    boolean;

  message?:
    string;

  data?:
    unknown;

  user?:
    CurrentUser;

  activities?:
    HoatDong[];
};

/* =========================================================
   HELPERS
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
    return {
      success:
        false,

      message:
        `Dữ liệu máy chủ không hợp lệ. HTTP ${response.status}`,
    };
  }
}

function getId(
  item:
    HoatDong,
) {
  return (
    item._id ||
    item.id ||
    ""
  );
}

function getActivity(
  item:
    PhienQR,
):
  HoatDong | null {
  return typeof item
    .hoatDongId ===
    "object"
    ? item.hoatDongId
    : null;
}

function getBranch(
  item:
    PhienQR,
):
  ChiHoi | null {
  return item.chiHoiId &&
    typeof item.chiHoiId ===
      "object"
    ? item.chiHoiId
    : null;
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

function getActivities(
  result:
    ApiResponse,
) {
  if (
    Array.isArray(
      result.activities,
    )
  ) {
    return result.activities;
  }

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
    const raw =
      result.data as {
        activities?:
          HoatDong[];

        data?:
          HoatDong[];
      };

    if (
      Array.isArray(
        raw.activities,
      )
    ) {
      return raw.activities;
    }

    if (
      Array.isArray(
        raw.data,
      )
    ) {
      return raw.data;
    }
  }

  return [];
}

/* =========================================================
   PAGE
========================================================= */

export default function QuanLyDiemDanhQRPage() {
  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<
      CurrentUser | null
    >(
      null,
    );

  const [
    activities,
    setActivities,
  ] =
    useState<
      HoatDong[]
    >([]);

  const [
    sessions,
    setSessions,
  ] =
    useState<
      PhienQR[]
    >([]);

  const [
    selectedActivityId,
    setSelectedActivityId,
  ] =
    useState(
      "",
    );

  const [
    minutes,
    setMinutes,
  ] =
    useState(
      15,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    creating,
    setCreating,
  ] =
    useState(
      false,
    );

  const [
    processingId,
    setProcessingId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    selectedSession,
    setSelectedSession,
  ] =
    useState<
      PhienQR | null
    >(
      null,
    );

  const [
    sessionDetail,
    setSessionDetail,
  ] =
    useState<
      SessionDetail | null
    >(
      null,
    );

  const [
    loadingDetail,
    setLoadingDetail,
  ] =
    useState(
      false,
    );

  const [
    qrImage,
    setQrImage,
  ] =
    useState(
      "",
    );

  const [
    searchMember,
    setSearchMember,
  ] =
    useState(
      "",
    );

  const [
    memberFilter,
    setMemberFilter,
  ] =
    useState<
      | "ALL"
      | "CHECKED"
      | "PENDING"
    >(
      "ALL",
    );

  const [
    message,
    setMessage,
  ] =
    useState<
      Message | null
    >(
      null,
    );

  /* =======================================================
     LOAD PAGE
  ======================================================= */

  const loadData =
    useCallback(
      async () => {
        try {
          setLoading(
            true,
          );

          const [
            userResponse,
            activityResponse,
            qrResponse,
          ] =
            await Promise.all([
              fetch(
                "/api/auth/me",
                {
                  credentials:
                    "include",

                  cache:
                    "no-store",
                },
              ),

              fetch(
                "/api/hoat-dong",
                {
                  credentials:
                    "include",

                  cache:
                    "no-store",
                },
              ),

              fetch(
                "/api/diem-danh-qr",
                {
                  credentials:
                    "include",

                  cache:
                    "no-store",
                },
              ),
            ]);

          const [
            userResult,
            activityResult,
            qrResult,
          ] =
            await Promise.all([
              parseResponse(
                userResponse,
              ),

              parseResponse(
                activityResponse,
              ),

              parseResponse(
                qrResponse,
              ),
            ]);

          if (
            !userResponse.ok ||
            !userResult.success
          ) {
            throw new Error(
              userResult.message ||
                "Không thể tải tài khoản",
            );
          }

          const rawUser =
            userResult.user ??
            (
              userResult.data &&
              typeof userResult.data ===
                "object"
                ? (
                    userResult.data as {
                      user?:
                        CurrentUser;
                    }
                  ).user
                : null
            );

          if (!rawUser) {
            throw new Error(
              "Không tìm thấy thông tin tài khoản",
            );
          }

          if (
            rawUser.role ===
            "HOI_VIEN"
          ) {
            throw new Error(
              "Trang quản lý QR chỉ dành cho Ban quản lý",
            );
          }

          setCurrentUser(
            rawUser,
          );

          setActivities(
            activityResponse.ok &&
            activityResult.success
              ? getActivities(
                  activityResult,
                )
              : [],
          );

          if (
            !qrResponse.ok ||
            !qrResult.success
          ) {
            throw new Error(
              qrResult.message ||
                "Không thể tải phiên QR",
            );
          }

          setSessions(
            Array.isArray(
              qrResult.data,
            )
              ? qrResult.data as
                  PhienQR[]
              : [],
          );
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
                : "Không thể tải dữ liệu",
          });
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      const timeoutId =
        window.setTimeout(
          () => {
            void loadData();
          },
          0,
        );

      return () => {
        window.clearTimeout(
          timeoutId,
        );
      };
    },
    [
      loadData,
    ],
  );

  /* =======================================================
     RUNNING ACTIVITIES
  ======================================================= */

  const runningActivities =
    useMemo(
      () =>
        activities.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "DANG_DIEN_RA",
        ),
      [
        activities,
      ],
    );

  /* =======================================================
     DETAIL
  ======================================================= */

  const loadSessionDetail =
    useCallback(
      async (
        sessionId:
          string,

        silent =
          false,
      ) => {
        try {
          if (!silent) {
            setLoadingDetail(
              true,
            );
          }

          const response =
            await fetch(
              `/api/diem-danh-qr/${sessionId}/chi-tiet`,
              {
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
                "Không thể tải danh sách điểm danh",
            );
          }

          const detail =
            result.data as
              SessionDetail;

          setSessionDetail(
            detail,
          );

          /*
           * Đồng bộ số lượt ngoài danh sách phiên.
           */
          setSessions(
            (
              current,
            ) =>
              current.map(
                (
                  item,
                ) =>
                  item._id ===
                  sessionId
                    ? {
                        ...item,

                        soLuotDiemDanh:
                          detail.thongKe
                            .daDiemDanh,

                        daHetHan:
                          detail.phien
                            .daHetHan,

                        dangMo:
                          detail.phien
                            .dangMo,
                      }
                    : item,
              ),
          );

          setSelectedSession(
            (
              current,
            ) =>
              current &&
              current._id ===
                sessionId
                ? {
                    ...current,

                    soLuotDiemDanh:
                      detail.thongKe
                        .daDiemDanh,

                    daHetHan:
                      detail.phien
                        .daHetHan,

                    dangMo:
                      detail.phien
                        .dangMo,

                    trangThai:
                      detail.phien
                        .trangThai,
                  }
                : current,
          );
        } catch (
          error
        ) {
          if (!silent) {
            setMessage({
              type:
                "error",

              text:
                error instanceof
                  Error
                  ? error.message
                  : "Không thể tải chi tiết QR",
            });
          }
        } finally {
          if (!silent) {
            setLoadingDetail(
              false,
            );
          }
        }
      },
      [],
    );

  /*
   * Khi modal đang mở, tự làm mới
   * danh sách quét sau mỗi 5 giây.
   *
   * setState nằm trong callback timer,
   * không vi phạm react-hooks/set-state-in-effect.
   */
  useEffect(
    () => {
      if (
        !selectedSession
      ) {
        return;
      }

      const sessionId =
        selectedSession._id;

      const intervalId =
        window.setInterval(
          () => {
            void loadSessionDetail(
              sessionId,
              true,
            );
          },
          5000,
        );

      return () => {
        window.clearInterval(
          intervalId,
        );
      };
    },
    [
      loadSessionDetail,
      selectedSession,
    ],
  );

  /* =======================================================
     CREATE
  ======================================================= */

  async function createQR() {
    if (
      !selectedActivityId
    ) {
      setMessage({
        type:
          "error",

        text:
          "Vui lòng chọn hoạt động",
      });

      return;
    }

    try {
      setCreating(
        true,
      );

      setMessage(
        null,
      );

      const response =
        await fetch(
          "/api/diem-danh-qr",
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
                hoatDongId:
                  selectedActivityId,

                soPhut:
                  minutes,
              }),
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
            "Không thể tạo QR",
        );
      }

      setMessage({
        type:
          "success",

        text:
          result.message ||
          "Đã tạo phiên QR",
      });

      const created =
        result.data &&
        typeof result.data ===
          "object"
          ? result.data as
              PhienQR
          : null;

      await loadData();

      if (created) {
        await openSession(
          created,
        );
      }
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
            : "Không thể tạo QR",
      });
    } finally {
      setCreating(
        false,
      );
    }
  }

  /* =======================================================
     OPEN SESSION
  ======================================================= */

  async function openSession(
    item:
      PhienQR,
  ) {
    setSelectedSession(
      item,
    );

    setSessionDetail(
      null,
    );

    setQrImage(
      "",
    );

    setSearchMember(
      "",
    );

    setMemberFilter(
      "ALL",
    );

    try {
      const url =
        `${window.location.origin}/dashboard/diem-danh-qr/${item.token}`;

      const [
        dataUrl,
      ] =
        await Promise.all([
          QRCode.toDataURL(
            url,
            {
              width:
                420,

              margin:
                2,

              errorCorrectionLevel:
                "M",
            },
          ),

          loadSessionDetail(
            item._id,
          ),
        ]);

      setQrImage(
        dataUrl,
      );
    } catch (
      error
    ) {
      console.error(
        error,
      );

      setMessage({
        type:
          "error",

        text:
          "Không thể mở phiên QR",
      });
    }
  }

  /* =======================================================
     COPY
  ======================================================= */

  async function copyLink(
    item:
      PhienQR,
  ) {
    try {
      const url =
        `${window.location.origin}/dashboard/diem-danh-qr/${item.token}`;

      await navigator
        .clipboard
        .writeText(
          url,
        );

      setMessage({
        type:
          "success",

        text:
          "Đã sao chép đường dẫn điểm danh",
      });
    } catch {
      setMessage({
        type:
          "error",

        text:
          "Không thể sao chép đường dẫn",
      });
    }
  }

  /* =======================================================
     CLOSE
  ======================================================= */

  async function closeSession(
    id:
      string,
  ) {
    try {
      setProcessingId(
        id,
      );

      const response =
        await fetch(
          "/api/diem-danh-qr",
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
                id,

                action:
                  "DONG",
              }),
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
            "Không thể đóng phiên QR",
        );
      }

      setMessage({
        type:
          "success",

        text:
          result.message ||
          "Đã đóng phiên QR",
      });

      await loadData();

      if (
        selectedSession?._id ===
        id
      ) {
        await loadSessionDetail(
          id,
        );
      }
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
            : "Không thể đóng phiên QR",
      });
    } finally {
      setProcessingId(
        null,
      );
    }
  }

  /* =======================================================
     FILTER MEMBERS
  ======================================================= */

  const filteredMembers =
    useMemo(
      () => {
        const source =
          sessionDetail
            ?.danhSach ||
          [];

        const keyword =
          searchMember
            .trim()
            .toLocaleLowerCase(
              "vi",
            );

        return source.filter(
          (
            item,
          ) => {
            if (
              memberFilter ===
                "CHECKED" &&
              !item.daDiemDanh
            ) {
              return false;
            }

            if (
              memberFilter ===
                "PENDING" &&
              item.daDiemDanh
            ) {
              return false;
            }

            if (!keyword) {
              return true;
            }

            const text =
              [
                item.maHoiVien,
                item.hoTen,
                item.lop,
                item.chiHoi
                  ?.maChiHoi,
                item.chiHoi
                  ?.tenChiHoi,
              ]
                .filter(
                  Boolean,
                )
                .join(
                  " ",
                )
                .toLocaleLowerCase(
                  "vi",
                );

            return text.includes(
              keyword,
            );
          },
        );
      },
      [
        memberFilter,
        searchMember,
        sessionDetail,
      ],
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-full bg-[#f3f7fb] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#12345B]">
              Điểm danh hoạt động
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Quản lý điểm danh QR
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Tạo QR và theo dõi Hội viên điểm danh theo thời gian thực.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            disabled={
              loading
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Làm mới
          </button>
        </div>

        {message && (
          <div
            className={`mb-5 flex items-center justify-between rounded-xl border p-4 text-sm ${
              message.type ===
              "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <span>
              {message.text}
            </span>

            <button
              type="button"
              onClick={() =>
                setMessage(
                  null,
                )
              }
            >
              <X
                size={16}
              />
            </button>
          </div>
        )}

        <section className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-bold">
            Mở phiên điểm danh
          </h2>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_180px_auto]">
            <select
              value={
                selectedActivityId
              }
              onChange={(
                event,
              ) =>
                setSelectedActivityId(
                  event.target.value,
                )
              }
              className="h-11 rounded-xl border px-3 text-sm"
            >
              <option value="">
                Chọn hoạt động đang diễn ra
              </option>

              {runningActivities.map(
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
                    {item.maHoatDong}
                    {" - "}
                    {item.tenHoatDong}
                  </option>
                ),
              )}
            </select>

            <select
              value={
                minutes
              }
              onChange={(
                event,
              ) =>
                setMinutes(
                  Number(
                    event.target.value,
                  ),
                )
              }
              className="h-11 rounded-xl border px-3 text-sm"
            >
              <option value={5}>
                5 phút
              </option>

              <option value={10}>
                10 phút
              </option>

              <option value={15}>
                15 phút
              </option>

              <option value={30}>
                30 phút
              </option>

              <option value={60}>
                60 phút
              </option>
            </select>

            <button
              type="button"
              onClick={() =>
                void createQR()
              }
              disabled={
                creating ||
                !selectedActivityId
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#12345B] px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {creating ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <QrCode
                  size={17}
                />
              )}

              Tạo QR
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-bold">
              Các phiên điểm danh
            </h2>

            {currentUser && (
              <p className="mt-1 text-xs text-slate-500">
                {currentUser.fullName}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="animate-spin" />
            </div>
          ) : sessions.length ===
            0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Chưa có phiên QR.
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map(
                (
                  item,
                ) => {
                  const activity =
                    getActivity(
                      item,
                    );

                  const branch =
                    getBranch(
                      item,
                    );

                  const active =
                    item.dangMo ??
                    (
                      item.trangThai ===
                        "DANG_MO" &&
                      !item.daHetHan
                    );

                  return (
                    <article
                      key={
                        item._id
                      }
                      className="p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#12345B]">
                              {activity
                                ?.maHoatDong ||
                                "Hoạt động"}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                active
                                  ? "bg-green-50 text-green-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {active
                                ? "Đang mở"
                                : item.daHetHan
                                  ? "Đã hết hạn"
                                  : "Đã đóng"}
                            </span>
                          </div>

                          <h3 className="mt-2 font-bold">
                            {activity
                              ?.tenHoatDong ||
                              "—"}
                          </h3>

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <Clock3
                                size={15}
                              />

                              {formatDateTime(
                                item.thoiGianHetHan,
                              )}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <MapPin
                                size={15}
                              />

                              {activity
                                ?.diaDiem ||
                                "—"}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <UserCheck
                                size={15}
                              />

                              {item.soLuotDiemDanh ||
                                0}{" "}
                              đã quét
                            </span>
                          </div>

                          {branch && (
                            <p className="mt-2 text-xs text-slate-400">
                              {branch.maChiHoi}
                              {" - "}
                              {branch.tenChiHoi}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void openSession(
                                item,
                              )
                            }
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#12345B] px-4 text-sm font-semibold text-white"
                          >
                            <QrCode
                              size={16}
                            />

                            QR & danh sách
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void copyLink(
                                item,
                              )
                            }
                            className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold"
                          >
                            <Copy
                              size={16}
                            />

                            Sao chép
                          </button>

                          {active && (
                            <button
                              type="button"
                              onClick={() =>
                                void closeSession(
                                  item._id,
                                )
                              }
                              disabled={
                                processingId ===
                                item._id
                              }
                              className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 disabled:opacity-50"
                            >
                              <StopCircle
                                size={16}
                              />

                              Đóng
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 p-0 sm:p-4">
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden bg-white sm:h-[94vh] sm:rounded-2xl">
            <div className="flex items-start justify-between border-b p-4 sm:p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#12345B]">
                  Điểm danh trực tiếp
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {getActivity(
                    selectedSession,
                  )?.tenHoatDong ||
                    "Phiên QR"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedSession(
                    null,
                  );

                  setSessionDetail(
                    null,
                  );

                  setQrImage(
                    "",
                  );
                }}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div>
                  <div className="rounded-2xl border p-4">
                    <div className="mx-auto flex min-h-[290px] items-center justify-center">
                      {qrImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            qrImage
                          }
                          alt="QR điểm danh"
                          className="w-full max-w-[320px]"
                        />
                      ) : (
                        <Loader2 className="animate-spin" />
                      )}
                    </div>

                    <p className="mt-3 text-center text-xs text-slate-500">
                      Tự cập nhật danh sách mỗi 5 giây
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void copyLink(
                            selectedSession,
                          )
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-semibold"
                      >
                        <Copy
                          size={15}
                        />

                        Sao chép
                      </button>

                      <a
                        href={`/dashboard/diem-danh-qr/${selectedSession.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#12345B] text-sm font-semibold text-white"
                      >
                        <ExternalLink
                          size={15}
                        />

                        Mở trang
                      </a>
                    </div>
                  </div>

                  {sessionDetail && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <StatCard
                        label="Đăng ký"
                        value={
                          sessionDetail
                            .thongKe
                            .tongDangKy
                        }
                      />

                      <StatCard
                        label="Đã điểm danh"
                        value={
                          sessionDetail
                            .thongKe
                            .daDiemDanh
                        }
                      />

                      <StatCard
                        label="Chưa điểm danh"
                        value={
                          sessionDetail
                            .thongKe
                            .chuaDiemDanh
                        }
                      />

                      <StatCard
                        label="Tỷ lệ"
                        value={`${sessionDetail.thongKe.tyLeDiemDanh}%`}
                      />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        value={
                          searchMember
                        }
                        onChange={(
                          event,
                        ) =>
                          setSearchMember(
                            event.target.value,
                          )
                        }
                        placeholder="Tìm mã, họ tên, lớp..."
                        className="h-10 w-full rounded-lg border pl-9 pr-3 text-sm"
                      />
                    </div>

                    <select
                      value={
                        memberFilter
                      }
                      onChange={(
                        event,
                      ) =>
                        setMemberFilter(
                          event.target.value as
                            | "ALL"
                            | "CHECKED"
                            | "PENDING",
                        )
                      }
                      className="h-10 rounded-lg border px-3 text-sm"
                    >
                      <option value="ALL">
                        Tất cả
                      </option>

                      <option value="CHECKED">
                        Đã điểm danh
                      </option>

                      <option value="PENDING">
                        Chưa điểm danh
                      </option>
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        void loadSessionDetail(
                          selectedSession._id,
                        )
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold"
                    >
                      <RefreshCw
                        size={15}
                        className={
                          loadingDetail
                            ? "animate-spin"
                            : ""
                        }
                      />

                      Làm mới
                    </button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border">
                    {loadingDetail &&
                    !sessionDetail ? (
                      <div className="flex min-h-64 items-center justify-center">
                        <Loader2 className="animate-spin" />
                      </div>
                    ) : filteredMembers.length ===
                      0 ? (
                      <div className="py-14 text-center text-sm text-slate-500">
                        Không có Hội viên phù hợp.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-4 py-3">
                                Hội viên
                              </th>

                              <th className="px-4 py-3">
                                Lớp
                              </th>

                              <th className="px-4 py-3">
                                Trạng thái
                              </th>

                              <th className="px-4 py-3">
                                Thời gian
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y">
                            {filteredMembers.map(
                              (
                                item,
                              ) => (
                                <tr
                                  key={
                                    item.hoiVienId
                                  }
                                >
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-slate-900">
                                      {item.hoTen}
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-400">
                                      {item.maHoiVien}
                                    </p>
                                  </td>

                                  <td className="px-4 py-3 text-slate-600">
                                    {item.lop ||
                                      "—"}
                                  </td>

                                  <td className="px-4 py-3">
                                    {item.daDiemDanh ? (
                                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                                        <CheckCircle2
                                          size={13}
                                        />

                                        Đã điểm danh
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                        <XCircle
                                          size={13}
                                        />

                                        Chưa điểm danh
                                      </span>
                                    )}
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                                    {formatDateTime(
                                      item.thoiGianDiemDanh,
                                    )}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t p-4">
              <p className="text-xs text-slate-400">
                Dữ liệu được tự động làm mới khi cửa sổ này đang mở.
              </p>

              {(
                selectedSession.dangMo ??
                (
                  selectedSession.trangThai ===
                    "DANG_MO" &&
                  !selectedSession.daHetHan
                )
              ) && (
                <button
                  type="button"
                  onClick={() =>
                    void closeSession(
                      selectedSession._id,
                    )
                  }
                  disabled={
                    processingId ===
                    selectedSession._id
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <StopCircle
                    size={16}
                  />

                  Đóng phiên QR
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
}: {
  label:
    string;

  value:
    number | string;
}) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}