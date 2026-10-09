"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type TrangThaiDangKy =
  | "DA_DANG_KY"
  | "DA_THAM_GIA"
  | "VANG_MAT"
  | "DA_HUY";

type HoatDongInfo = {
  _id?: string;

  id?: string;

  maHoatDong: string;

  tenHoatDong: string;

  diaDiem?: string;

  thoiGianBatDau?: string;

  thoiGianKetThuc?: string;

  hanDangKy?: string;

  soLuongToiDa?:
    | number
    | null;
};

type DangKyInfo = {
  _id?: string;

  trangThai:
    TrangThaiDangKy;

  thoiGianDangKy?: string;

  thoiGianHuy?: string;

  lyDoHuy?: string;

  ghiChu?: string;
};

type HoiVienItem = {
  _id: string;

  maHoiVien: string;

  hoTen: string;

  gioiTinh?: string;

  email?: string;

  soDienThoai?: string;

  lop?: string;

  khoaHoc?: string;

  trangThai?: string;

  dangKy?:
    | DangKyInfo
    | null;

  daDangKy:
    boolean;
};

type ThongKe = {
  tongHoiVien: number;

  daDangKy: number;

  chuaDangKy: number;

  tongNguoiDangKyHoatDong:
    number;

  soLuongToiDa?:
    | number
    | null;

  soChoConLai?:
    | number
    | null;
};

type ResponseData = {
  hoatDong:
    HoatDongInfo;

  chiHoiId:
    string;

  danhSach:
    HoiVienItem[];

  thongKe:
    ThongKe;

  moDangKy:
    boolean;

  lyDoDongDangKy?:
    string;
};

type ApiResponse = {
  success:
    boolean;

  message?:
    string;

  data?:
    ResponseData;
};

type Props = {
  open:
    boolean;

  hoatDongId:
    string;

  onClose:
    () => void;

  onSuccess?:
    () => void;
};

/* =========================================================
   HELPERS
========================================================= */

async function readResponse(
  response:
    Response,
): Promise<ApiResponse> {
  const text =
    await response.text();

  if (!text) {
    return {
      success:
        false,

      message:
        "Máy chủ không trả về dữ liệu",
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
        "Dữ liệu máy chủ trả về không hợp lệ",
    };
  }
}

function normalizeText(
  value?:
    string
    | null,
) {
  return (
    value || ""
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

function registrationLabel(
  value?:
    TrangThaiDangKy,
) {
  switch (
    value
  ) {
    case "DA_DANG_KY":
      return "Đã đăng ký";

    case "DA_THAM_GIA":
      return "Đã tham gia";

    case "VANG_MAT":
      return "Vắng mặt";

    case "DA_HUY":
      return "Đã hủy";

    default:
      return "Chưa đăng ký";
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export default function DangKyTapTheModal({
  open,

  hoatDongId,

  onClose,

  onSuccess,
}: Props) {
  const [
    data,
    setData,
  ] =
    useState<ResponseData | null>(
      null,
    );

  const [
    loading,
    setLoading,
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
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState<
      Set<string>
    >(
      new Set(),
    );

  /* =======================================================
     LOAD
  ======================================================= */

  const loadData =
    useCallback(
      async () => {
        if (
          !hoatDongId
        ) {
          return;
        }

        try {
          setLoading(
            true,
          );

          setError(
            "",
          );

          setSuccess(
            "",
          );

          const response =
            await fetch(
              `/api/hoat-dong/${hoatDongId}/dang-ky-tap-the`,

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
            await readResponse(
              response,
            );

          if (
            !response.ok ||
            !result.success ||
            !result.data
          ) {
            throw new Error(
              result.message ||
                "Không thể tải danh sách Hội viên",
            );
          }

          setData(
            result.data,
          );

          /*
           * Không tự tích những người
           * đã đăng ký.
           *
           * Chỉ những người CHT chọn
           * trong lần thao tác này
           * mới nằm trong selectedIds.
           */
          setSelectedIds(
            new Set(),
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Không thể tải danh sách Hội viên",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        hoatDongId,
      ],
    );

  useEffect(
    () => {
      if (!open) {
        return;
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
      void loadData();
    },
    [
      open,
      loadData,
    ],
  );

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredMembers =
    useMemo(
      () => {
        if (!data) {
          return [];
        }

        const keyword =
          normalizeText(
            search,
          );

        if (
          !keyword
        ) {
          return data.danhSach;
        }

        return data.danhSach.filter(
          (
            member,
          ) => {
            const content =
              normalizeText(
                [
                  member.maHoiVien,

                  member.hoTen,

                  member.email,

                  member.soDienThoai,

                  member.lop,

                  member.khoaHoc,
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    " ",
                  ),
              );

            return content.includes(
              keyword,
            );
          },
        );
      },
      [
        data,
        search,
      ],
    );

  /*
   * Chỉ người chưa đăng ký
   * mới được chọn.
   *
   * DA_HUY được phép đăng ký lại.
   */
  const selectableMembers =
    useMemo(
      () =>
        filteredMembers.filter(
          (
            member,
          ) =>
            !member.daDangKy &&
            member.dangKy
              ?.trangThai !==
              "VANG_MAT",
        ),
      [
        filteredMembers,
      ],
    );

  const allVisibleSelected =
    selectableMembers.length >
      0 &&
    selectableMembers.every(
      (
        member,
      ) =>
        selectedIds.has(
          member._id,
        ),
    );

  /* =======================================================
     CAPACITY
  ======================================================= */

  const remainingSlots =
    data?.thongKe
      .soChoConLai;

  const exceedsCapacity =
    remainingSlots !==
      null &&
    remainingSlots !==
      undefined &&
    selectedIds.size >
      remainingSlots;

  /* =======================================================
     SELECT
  ======================================================= */

  function toggleMember(
    member:
      HoiVienItem,
  ) {
    if (
      member.daDangKy ||
      member.dangKy
        ?.trangThai ===
        "VANG_MAT"
    ) {
      return;
    }

    setSelectedIds(
      (
        current,
      ) => {
        const next =
          new Set(
            current,
          );

        if (
          next.has(
            member._id,
          )
        ) {
          next.delete(
            member._id,
          );
        } else {
          next.add(
            member._id,
          );
        }

        return next;
      },
    );
  }

  function toggleSelectAll() {
    setSelectedIds(
      (
        current,
      ) => {
        const next =
          new Set(
            current,
          );

        if (
          allVisibleSelected
        ) {
          selectableMembers.forEach(
            (
              member,
            ) => {
              next.delete(
                member._id,
              );
            },
          );
        } else {
          selectableMembers.forEach(
            (
              member,
            ) => {
              next.add(
                member._id,
              );
            },
          );
        }

        return next;
      },
    );
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit() {
    if (
      selectedIds.size ===
      0
    ) {
      setError(
        "Vui lòng chọn ít nhất một Hội viên",
      );

      return;
    }

    if (
      exceedsCapacity
    ) {
      setError(
        `Hoạt động chỉ còn ${remainingSlots} chỗ nhưng bạn đang chọn ${selectedIds.size} Hội viên`,
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

      setSuccess(
        "",
      );

      const response =
        await fetch(
          `/api/hoat-dong/${hoatDongId}/dang-ky-tap-the`,

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
                hoiVienIds:
                  Array.from(
                    selectedIds,
                  ),
              }),
          },
        );

      const result =
        await readResponse(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể đăng ký tập thể",
        );
      }

      setSuccess(
        result.message ||
          "Đăng ký tập thể thành công",
      );

      setSelectedIds(
        new Set(),
      );

      await loadData();

      onSuccess?.();
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Không thể đăng ký tập thể",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     CLOSED
  ======================================================= */

  if (!open) {
    return null;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* HEADER */}

        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <Users
                size={20}
                className="text-[#123b68]"
              />

              <h2 className="text-lg font-bold text-slate-950">
                Đăng ký tập thể
              </h2>
            </div>

            {data && (
              <p className="mt-1 text-sm text-slate-500">
                {
                  data.hoatDong
                    .maHoatDong
                }{" "}
                -{" "}
                {
                  data.hoatDong
                    .tenHoatDong
                }
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={
              submitting
            }
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

        {/* BODY */}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2
                size={30}
                className="animate-spin text-[#123b68]"
              />
            </div>
          ) : !data ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <AlertCircle
                size={38}
                className="text-red-400"
              />

              <p className="mt-3 text-sm text-slate-600">
                {error ||
                  "Không thể tải dữ liệu"}
              </p>
            </div>
          ) : (
            <>
              {/* ACTIVITY */}

              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-blue-600">
                      Thời gian
                    </p>

                    <p className="mt-1 font-medium text-blue-950">
                      {formatDateTime(
                        data.hoatDong
                          .thoiGianBatDau,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-blue-600">
                      Hạn đăng ký
                    </p>

                    <p className="mt-1 font-medium text-blue-950">
                      {formatDateTime(
                        data.hoatDong
                          .hanDangKy,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-blue-600">
                      Địa điểm
                    </p>

                    <p className="mt-1 font-medium text-blue-950">
                      {data.hoatDong
                        .diaDiem ||
                        "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* CLOSED WARNING */}

              {!data.moDangKy && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <Clock3
                    size={19}
                    className="mt-0.5 shrink-0"
                  />

                  <div>
                    <p className="font-semibold">
                      Hoạt động không còn nhận đăng ký
                    </p>

                    <p className="mt-1">
                      {data.lyDoDongDangKy ||
                        "Cổng đăng ký đã đóng."}
                    </p>
                  </div>
                </div>
              )}

              {/* MESSAGES */}

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  {success}
                </div>
              )}

              {/* STATS */}

              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <MiniStat
                  label="Hội viên"
                  value={
                    data.thongKe
                      .tongHoiVien
                  }
                />

                <MiniStat
                  label="Đã đăng ký"
                  value={
                    data.thongKe
                      .daDangKy
                  }
                />

                <MiniStat
                  label="Chưa đăng ký"
                  value={
                    data.thongKe
                      .chuaDangKy
                  }
                />

                <MiniStat
                  label="Toàn hoạt động"
                  value={
                    data.thongKe
                      .tongNguoiDangKyHoatDong
                  }
                />

                <MiniStat
                  label="Chỗ còn lại"
                  value={
                    data.thongKe
                      .soChoConLai ??
                    "Không giới hạn"
                  }
                />
              </div>

              {/* SEARCH */}

              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-lg">
                  <Search
                    size={17}
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
                        event.target
                          .value,
                      )
                    }
                    placeholder="Tìm mã Hội viên, họ tên, lớp, email..."
                    className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-[#123b68]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                    Đang chọn:{" "}

                    <strong>
                      {
                        selectedIds.size
                      }
                    </strong>
                  </span>

                  {data.moDangKy &&
                    selectableMembers.length >
                      0 && (
                      <button
                        type="button"
                        onClick={
                          toggleSelectAll
                        }
                        className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {allVisibleSelected
                          ? "Bỏ chọn hiển thị"
                          : "Chọn tất cả hiển thị"}
                      </button>
                    )}
                </div>
              </div>

              {/* CAPACITY WARNING */}

              {exceedsCapacity && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  Bạn đang chọn{" "}
                  {
                    selectedIds.size
                  }{" "}
                  Hội viên nhưng hoạt động chỉ còn{" "}
                  {
                    remainingSlots
                  }{" "}
                  chỗ.
                </div>
              )}

              {/* DESKTOP TABLE */}

              <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="w-14 px-4 py-3 text-center">
                          Chọn
                        </th>

                        <th className="px-4 py-3">
                          Hội viên
                        </th>

                        <th className="px-4 py-3">
                          Lớp
                        </th>

                        <th className="px-4 py-3">
                          Liên hệ
                        </th>

                        <th className="px-4 py-3">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {filteredMembers.map(
                        (
                          member,
                        ) => {
                          const selectable =
                            data.moDangKy &&
                            !member.daDangKy &&
                            member.dangKy
                              ?.trangThai !==
                              "VANG_MAT";

                          const selected =
                            selectedIds.has(
                              member._id,
                            );

                          return (
                            <tr
                              key={
                                member._id
                              }
                              className={
                                selected
                                  ? "bg-blue-50"
                                  : "bg-white"
                              }
                            >
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  disabled={
                                    !selectable ||
                                    submitting
                                  }
                                  onClick={() =>
                                    toggleMember(
                                      member,
                                    )
                                  }
                                  className={`mx-auto flex h-6 w-6 items-center justify-center rounded border ${
                                    selected
                                      ? "border-[#123b68] bg-[#123b68] text-white"
                                      : selectable
                                        ? "border-slate-300 bg-white"
                                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                                  }`}
                                >
                                  {selected && (
                                    <Check
                                      size={15}
                                    />
                                  )}
                                </button>
                              </td>

                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-900">
                                  {
                                    member.hoTen
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-slate-500">
                                  {
                                    member.maHoiVien
                                  }
                                </p>
                              </td>

                              <td className="px-4 py-3 text-slate-600">
                                {member.lop ||
                                  "—"}
                              </td>

                              <td className="px-4 py-3 text-slate-600">
                                <p>
                                  {member.soDienThoai ||
                                    "—"}
                                </p>

                                <p className="mt-0.5 text-xs">
                                  {member.email ||
                                    ""}
                                </p>
                              </td>

                              <td className="px-4 py-3">
                                <RegistrationBadge
                                  member={
                                    member
                                  }
                                />
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE */}

              <div className="space-y-3 md:hidden">
                {filteredMembers.map(
                  (
                    member,
                  ) => {
                    const selectable =
                      data.moDangKy &&
                      !member.daDangKy &&
                      member.dangKy
                        ?.trangThai !==
                        "VANG_MAT";

                    const selected =
                      selectedIds.has(
                        member._id,
                      );

                    return (
                      <button
                        type="button"
                        key={
                          member._id
                        }
                        disabled={
                          !selectable ||
                          submitting
                        }
                        onClick={() =>
                          toggleMember(
                            member,
                          )
                        }
                        className={`w-full rounded-xl border p-4 text-left ${
                          selected
                            ? "border-[#123b68] bg-blue-50"
                            : "border-slate-200 bg-white"
                        } ${
                          !selectable
                            ? "cursor-default opacity-75"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border ${
                              selected
                                ? "border-[#123b68] bg-[#123b68] text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {selected && (
                              <Check
                                size={15}
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900">
                              {
                                member.hoTen
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                member.maHoiVien
                              }{" "}

                              •{" "}

                              {member.lop ||
                                "Chưa có lớp"}
                            </p>

                            <div className="mt-3">
                              <RegistrationBadge
                                member={
                                  member
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>

              {filteredMembers.length ===
                0 && (
                <div className="py-14 text-center text-sm text-slate-500">
                  Không tìm thấy Hội viên phù hợp.
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-sm text-slate-500">
            {data?.moDangKy &&
              selectedIds.size >
                0 && (
                <>
                  Sẽ đăng ký{" "}

                  <strong className="text-slate-900">
                    {
                      selectedIds.size
                    }
                  </strong>{" "}

                  Hội viên.
                </>
              )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              disabled={
                submitting
              }
              onClick={
                onClose
              }
              className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-700"
            >
              Đóng
            </button>

            <button
              type="button"
              disabled={
                submitting ||
                loading ||
                !data?.moDangKy ||
                selectedIds.size ===
                  0 ||
                exceedsCapacity
              }
              onClick={() =>
                void handleSubmit()
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#123b68] px-5 text-sm font-semibold text-white hover:bg-[#0e3158] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <UserCheck
                  size={17}
                />
              )}

              Xác nhận đăng ký
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MINI STAT
========================================================= */

function MiniStat({
  label,

  value,
}: {
  label:
    string;

  value:
    number
    | string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   REGISTRATION BADGE
========================================================= */

function RegistrationBadge({
  member,
}: {
  member:
    HoiVienItem;
}) {
  if (
    !member.dangKy
  ) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
        Chưa đăng ký
      </span>
    );
  }

  switch (
    member.dangKy
      .trangThai
  ) {
    case "DA_DANG_KY":
      return (
        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          Đã đăng ký
        </span>
      );

    case "DA_THAM_GIA":
      return (
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Đã tham gia
        </span>
      );

    case "VANG_MAT":
      return (
        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
          Vắng mặt
        </span>
      );

    case "DA_HUY":
      return (
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          Đã hủy - có thể đăng ký lại
        </span>
      );

    default:
      return (
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {registrationLabel(
            member.dangKy
              .trangThai,
          )}
        </span>
      );
  }
}