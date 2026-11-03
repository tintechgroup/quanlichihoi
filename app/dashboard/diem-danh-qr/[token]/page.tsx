"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  QrCode,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  useParams,
} from "next/navigation";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type HoatDong = {
  _id?: string;

  maHoatDong?: string;

  tenHoatDong?: string;

  diaDiem?: string;

  thoiGianBatDau?: string;

  thoiGianKetThuc?: string;

  trangThai?: string;
};

type ChiHoi = {
  _id?: string;

  maChiHoi?: string;

  tenChiHoi?: string;
};

type PhienQR = {
  _id: string;

  token: string;

  hoatDongId:
    | HoatDong
    | string;

  chiHoiId?:
    | ChiHoi
    | string
    | null;

  thoiGianBatDau: string;

  thoiGianHetHan: string;

  trangThai:
    | "DANG_MO"
    | "DA_DONG";
};

type HoiVien = {
  id: string;

  maHoiVien: string;

  hoTen: string;
};

type PageData = {
  phien: PhienQR;

  hoiVien: HoiVien;

  daHetHan: boolean;

  daDiemDanh: boolean;

  thoiGianDiemDanh?:
    string | null;
};

type CheckInData = {
  id?: string;

  hoiVien?: HoiVien;

  hoatDong?: {
    id: string;

    maHoatDong: string;

    tenHoatDong: string;

    diaDiem?: string;
  };

  thoiGianDiemDanh?: string;
};

type ApiResponse = {
  success: boolean;

  message?: string;

  alreadyCheckedIn?:
    boolean;

  data?:
    PageData |
    CheckInData;
};

/* =========================================================
   HELPERS
========================================================= */

async function parseResponse(
  response: Response,
): Promise<ApiResponse> {
  const text =
    await response.text();

  if (!text.trim()) {
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
    return {
      success: false,

      message:
        "Dữ liệu máy chủ không hợp lệ",
    };
  }
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

function getActivity(
  data:
    PageData | null,
): HoatDong | null {
  if (
    !data ||
    typeof data.phien
      .hoatDongId !==
      "object"
  ) {
    return null;
  }

  return data.phien
    .hoatDongId;
}

function getBranch(
  data:
    PageData | null,
): ChiHoi | null {
  if (
    !data ||
    !data.phien
      .chiHoiId ||
    typeof data.phien
      .chiHoiId !==
      "object"
  ) {
    return null;
  }

  return data.phien
    .chiHoiId;
}

/* =========================================================
   PAGE
========================================================= */

export default function XacNhanDiemDanhQRPage() {
  const params =
    useParams<{
      token: string;
    }>();

  const token =
    typeof params.token ===
    "string"
      ? params.token
      : "";

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
    data,
    setData,
  ] =
    useState<
      PageData | null
    >(
      null,
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
    unauthorized,
    setUnauthorized,
  ] =
    useState(
      false,
    );

  /* =======================================================
     LOAD
  ======================================================= */

  const loadData =
    useCallback(
      async () => {
        if (!token) {
          setLoading(
            false,
          );

          setError(
            "Mã QR không hợp lệ",
          );

          return;
        }

        try {
          setLoading(
            true,
          );

          setError(
            "",
          );

          setUnauthorized(
            false,
          );

          const response =
            await fetch(
              `/api/diem-danh-qr/${encodeURIComponent(
                token,
              )}`,
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
            response.status ===
            401
          ) {
            setUnauthorized(
              true,
            );

            throw new Error(
              result.message ||
                "Bạn cần đăng nhập trước khi điểm danh",
            );
          }

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ||
                "Không thể tải thông tin QR",
            );
          }

          const pageData =
            result.data as
              PageData;

          setData(
            pageData,
          );

          if (
            pageData.daDiemDanh
          ) {
            setSuccess(
              `Bạn đã điểm danh lúc ${formatDateTime(
                pageData.thoiGianDiemDanh,
              )}`,
            );
          } else {
            setSuccess(
              "",
            );
          }
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Không thể tải dữ liệu",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        token,
      ],
    );

  /*
   * Không gọi loadData() trực tiếp trong effect body
   * để tránh react-hooks/set-state-in-effect.
   */
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
     CHECK IN
  ======================================================= */

  async function confirmCheckIn() {
    if (!token) {
      return;
    }

    try {
      setSubmitting(
        true,
      );

      setError(
        "",
      );

      const response =
        await fetch(
          `/api/diem-danh-qr/${encodeURIComponent(
            token,
          )}`,
          {
            method:
              "POST",

            credentials:
              "include",
          },
        );

      const result =
        await parseResponse(
          response,
        );

      if (
        response.status ===
        401
      ) {
        setUnauthorized(
          true,
        );

        throw new Error(
          result.message ||
            "Bạn cần đăng nhập",
        );
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể điểm danh",
        );
      }

      const checkIn =
        result.data as
          CheckInData;

      const time =
        checkIn
          .thoiGianDiemDanh ||
        new Date()
          .toISOString();

      setSuccess(
        result.message ||
          "Điểm danh QR thành công",
      );

      setData(
        (
          current,
        ) =>
          current
            ? {
                ...current,

                daDiemDanh:
                  true,

                thoiGianDiemDanh:
                  time,
              }
            : current,
      );
    } catch (
      checkInError
    ) {
      setError(
        checkInError instanceof
          Error
          ? checkInError.message
          : "Không thể điểm danh",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     UI DATA
  ======================================================= */

  const activity =
    getActivity(
      data,
    );

  const branch =
    getBranch(
      data,
    );

  const disabled =
    !data ||
    data.daHetHan ||
    data.daDiemDanh ||
    data.phien
      .trangThai !==
      "DANG_MO" ||
    submitting;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#f3f7fb] px-4 py-8">
      <div className="mx-auto max-w-xl">
        {/* HEADER */}

        <div className="mb-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#12345B] text-white shadow-lg">
            <QrCode
              size={30}
            />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-950">
            Điểm danh hoạt động
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Hệ thống quản lý Liên Chi hội Khoa Sư phạm
          </p>
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-2xl border bg-white shadow-sm">
            <div className="text-center">
              <Loader2
                size={34}
                className="mx-auto animate-spin text-[#12345B]"
              />

              <p className="mt-3 text-sm text-slate-500">
                Đang kiểm tra mã QR...
              </p>
            </div>
          </div>
        ) : unauthorized ? (
          /* LOGIN REQUIRED */

          <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
            <ShieldCheck
              size={46}
              className="mx-auto text-[#12345B]"
            />

            <h2 className="mt-4 text-xl font-bold">
              Cần đăng nhập
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Bạn cần đăng nhập bằng tài khoản Hội viên trước khi xác nhận điểm danh.
            </p>

            <a
              href="/login"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#12345B] px-6 text-sm font-bold text-white"
            >
              Đăng nhập
            </a>

            <p className="mt-4 text-xs leading-5 text-slate-400">
              Sau khi đăng nhập, quét lại mã QR hoặc mở lại đường dẫn điểm danh.
            </p>
          </div>
        ) : error &&
          !data ? (
          /* FATAL ERROR */

          <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
            <XCircle
              size={48}
              className="mx-auto text-red-500"
            />

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Không thể điểm danh
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadData()
              }
              className="mt-5 h-10 rounded-xl border px-5 text-sm font-semibold text-slate-700"
            >
              Thử lại
            </button>
          </div>
        ) : data ? (
          /* CHECK IN CARD */

          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="bg-gradient-to-r from-[#12345B] to-[#245a91] p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
                {activity
                  ?.maHoatDong ||
                  "Hoạt động"}
              </p>

              <h2 className="mt-2 text-xl font-bold">
                {activity
                  ?.tenHoatDong ||
                  "Điểm danh hoạt động"}
              </h2>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {/* ACTIVITY INFO */}

              <div className="grid gap-3 text-sm">
                <InfoRow
                  icon={
                    <CalendarDays
                      size={17}
                    />
                  }
                  label="Thời gian bắt đầu"
                  value={formatDateTime(
                    activity
                      ?.thoiGianBatDau,
                  )}
                />

                <InfoRow
                  icon={
                    <MapPin
                      size={17}
                    />
                  }
                  label="Địa điểm"
                  value={
                    activity
                      ?.diaDiem ||
                    "Chưa cập nhật"
                  }
                />

                <InfoRow
                  icon={
                    <Clock3
                      size={17}
                    />
                  }
                  label="QR hết hạn"
                  value={formatDateTime(
                    data.phien
                      .thoiGianHetHan,
                  )}
                />

                {branch && (
                  <InfoRow
                    icon={
                      <ShieldCheck
                        size={17}
                      />
                    }
                    label="Chi hội"
                    value={
                      [
                        branch.maChiHoi,
                        branch.tenChiHoi,
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(
                          " - ",
                        ) ||
                      "—"
                    }
                  />
                )}
              </div>

              {/* MEMBER */}

              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Hội viên xác nhận
                </p>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {data.hoiVien
                    .hoTen}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Mã Hội viên:{" "}
                  <span className="font-semibold text-slate-700">
                    {data.hoiVien
                      .maHoiVien}
                  </span>
                </p>
              </div>

              {/* EXPIRED */}

              {data.daHetHan && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-700">
                  Mã QR này đã hết hạn. Vui lòng liên hệ người phụ trách hoạt động để được hỗ trợ.
                </div>
              )}

              {/* CLOSED */}

              {!data.daHetHan &&
                data.phien
                  .trangThai ===
                  "DA_DONG" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Phiên điểm danh này đã được người phụ trách đóng.
                  </div>
                )}

              {/* ERROR */}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  {error}
                </div>
              )}

              {/* SUCCESS */}

              {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex gap-3">
                    <CheckCircle2
                      size={22}
                      className="shrink-0 text-green-600"
                    />

                    <div>
                      <p className="font-bold text-green-700">
                        Đã ghi nhận điểm danh
                      </p>

                      <p className="mt-1 text-sm text-green-700">
                        {success}
                      </p>

                      {data.thoiGianDiemDanh && (
                        <p className="mt-1 text-xs text-green-600">
                          Thời gian:{" "}
                          {formatDateTime(
                            data.thoiGianDiemDanh,
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BUTTON */}

              <button
                type="button"
                disabled={
                  disabled
                }
                onClick={() =>
                  void confirmCheckIn()
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#12345B] text-sm font-bold text-white shadow-sm transition hover:bg-[#0c2d50] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    Đang xác nhận...
                  </>
                ) : data.daDiemDanh ? (
                  <>
                    <CheckCircle2
                      size={18}
                    />

                    Đã điểm danh
                  </>
                ) : data.daHetHan ? (
                  <>
                    <XCircle
                      size={18}
                    />

                    QR đã hết hạn
                  </>
                ) : data.phien
                    .trangThai ===
                  "DA_DONG" ? (
                  <>
                    <XCircle
                      size={18}
                    />

                    Phiên đã đóng
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={18}
                    />

                    Xác nhận điểm danh
                  </>
                )}
              </button>

              {!data.daDiemDanh &&
                !data.daHetHan &&
                data.phien
                  .trangThai ===
                  "DANG_MO" && (
                  <p className="text-center text-xs leading-5 text-slate-400">
                    Chỉ xác nhận khi bạn đang có mặt tại hoạt động. Hệ thống sẽ lưu tài khoản và thời gian điểm danh của bạn.
                  </p>
                )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;

  label: string;

  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border p-3">
      <div className="mt-0.5 shrink-0 text-[#12345B]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words font-semibold text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}