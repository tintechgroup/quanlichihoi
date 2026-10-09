"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

import {
  FormEvent,
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

type TrangThaiDiemDanh =
  | "CO_MAT"
  | "VANG_MAT"
  | "CO_PHEP";

type CurrentUser = {
  id: string;

  username: string;

  fullName: string;

  role: UserRole;
};

type ChiHoi = {
  _id: string;

  maChiHoi: string;

  tenChiHoi: string;
};

type HoiVien = {
  _id: string;

  maHoiVien: string;

  hoTen: string;

  lop?: string;

  email?: string;

  soDienThoai?: string;
};

type HoatDong = {
  _id?: string;

  id?: string;

  maHoatDong: string;

  tenHoatDong: string;

  diaDiem?: string;

  thoiGianBatDau: string;

  thoiGianKetThuc: string;

  trangThai?: string;
};

type DangKyTapThe = {
  _id: string;

  hoatDongId:
    | HoatDong
    | string;

  chiHoiId:
    | ChiHoi
    | string;

  hoiVienIds:
    | HoiVien[]
    | string[];

  trangThai:
    | "DA_GUI"
    | "DA_TIEP_NHAN";

  daDiemDanh?: boolean;

  createdAt?: string;
};

type ChiTietDiemDanh = {
  hoiVienId:
    | HoiVien
    | string;

  trangThai:
    TrangThaiDiemDanh;

  ghiChu?: string;
};

type LichSuDiemDanh = {
  _id: string;

  hoatDongId:
    | HoatDong
    | string;

  chiHoiId:
    | ChiHoi
    | string;

  chiTiet:
    ChiTietDiemDanh[];

  nguoiDiemDanhTen: string;

  ngayDiemDanh: string;

  ghiChu?: string;
};

type AttendanceForm = Record<
  string,
  {
    trangThai:
      | TrangThaiDiemDanh
      | "";

    ghiChu: string;
  }
>;

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
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}



function getActivity(
  item:
    | DangKyTapThe
    | LichSuDiemDanh,
): HoatDong | null {
  return typeof item.hoatDongId ===
    "object"
    ? item.hoatDongId
    : null;
}

function getBranch(
  item:
    | DangKyTapThe
    | LichSuDiemDanh,
): ChiHoi | null {
  return typeof item.chiHoiId ===
    "object"
    ? item.chiHoiId
    : null;
}

/* =========================================================
   PAGE
========================================================= */

export default function DiemDanhPage() {
  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null,
    );

  const [
    registrations,
    setRegistrations,
  ] =
    useState<DangKyTapThe[]>(
      [],
    );

  const [
    history,
    setHistory,
  ] =
    useState<
      LichSuDiemDanh[]
    >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

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
    selectedRegistration,
    setSelectedRegistration,
  ] =
    useState<DangKyTapThe | null>(
      null,
    );

  const [
    attendance,
    setAttendance,
  ] =
    useState<AttendanceForm>(
      {},
    );

  const [
    generalNote,
    setGeneralNote,
  ] = useState("");

  const [
    detail,
    setDetail,
  ] =
    useState<LichSuDiemDanh | null>(
      null,
    );

  const isLeader =
    currentUser?.role ===
    "CHI_HOI_TRUONG";

  /* =======================================================
     LOAD
  ======================================================= */

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);

        const [
          userResponse,
          attendanceResponse,
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
              "/api/diem-danh-hoat-dong",
              {
                credentials:
                  "include",

                cache:
                  "no-store",
              },
            ),
          ]);

        const userResult =
          await userResponse.json();

        const attendanceResult =
          await attendanceResponse.json();

        if (
          !userResponse.ok ||
          !userResult.success
        ) {
          throw new Error(
            userResult.message ||
              "Không thể tải thông tin tài khoản",
          );
        }

        if (
          !attendanceResponse.ok ||
          !attendanceResult.success
        ) {
          throw new Error(
            attendanceResult.message ||
              "Không thể tải dữ liệu điểm danh",
          );
        }

        const rawUser =
          userResult.user ??
          userResult.data?.user ??
          userResult.data;

        setCurrentUser({
          id: String(
            rawUser.id ??
              rawUser._id ??
              rawUser.userId ??
              "",
          ),

          username:
            String(
              rawUser.username ||
                "",
            ),

          fullName:
            String(
              rawUser.fullName ||
                "",
            ),

          role:
            rawUser.role,
        });

        setRegistrations(
          Array.isArray(
            attendanceResult
              .data
              ?.dangKy,
          )
            ? attendanceResult
                .data
                .dangKy
            : [],
        );

        setHistory(
          Array.isArray(
            attendanceResult
              .data
              ?.lichSu,
          )
            ? attendanceResult
                .data
                .lichSu
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
    }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
    void loadData();
  }, [loadData]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredHistory =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return history;
      }

      return history.filter(
        (item) => {
          const activity =
            getActivity(item);

          const branch =
            getBranch(item);

          return [
            activity?.maHoatDong,
            activity?.tenHoatDong,
            branch?.maChiHoi,
            branch?.tenChiHoi,
            item.nguoiDiemDanhTen,
          ]
            .join(" ")
            .toLowerCase()
            .includes(
              keyword,
            );
        },
      );
    }, [
      history,
      search,
    ]);

  /* =======================================================
     OPEN ATTENDANCE
  ======================================================= */

  function openAttendance(
    registration:
      DangKyTapThe,
  ) {
    if (
      registration.daDiemDanh
    ) {
      setMessage({
        type: "error",

        text:
          "Danh sách này đã được điểm danh",
      });

      return;
    }

    const members =
      Array.isArray(
        registration.hoiVienIds,
      )
        ? registration.hoiVienIds.filter(
            (
              value,
            ): value is HoiVien =>
              typeof value ===
              "object",
          )
        : [];

    const initial:
      AttendanceForm =
        {};

    members.forEach(
      (member) => {
        initial[
          member._id
        ] = {
          trangThai: "",

          ghiChu: "",
        };
      },
    );

    setAttendance(
      initial,
    );

    setGeneralNote("");

    setSelectedRegistration(
      registration,
    );
  }

  /* =======================================================
     UPDATE
  ======================================================= */

  function updateStatus(
    memberId: string,
    status:
      TrangThaiDiemDanh,
  ) {
    setAttendance(
      (current) => ({
        ...current,

        [memberId]: {
          ...current[
            memberId
          ],

          trangThai:
            status,
        },
      }),
    );
  }

  function updateNote(
    memberId: string,
    value: string,
  ) {
    setAttendance(
      (current) => ({
        ...current,

        [memberId]: {
          ...current[
            memberId
          ],

          ghiChu:
            value,
        },
      }),
    );
  }

  /*
   * Điểm danh nhanh toàn bộ
   * là Có mặt.
   */
  function markAllPresent() {
    setAttendance(
      (current) => {
        const next = {
          ...current,
        };

        Object.keys(
          next,
        ).forEach(
          (memberId) => {
            next[
              memberId
            ] = {
              ...next[
                memberId
              ],

              trangThai:
                "CO_MAT",
            };
          },
        );

        return next;
      },
    );
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function saveAttendance(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedRegistration
    ) {
      return;
    }

    const entries =
      Object.entries(
        attendance,
      );

    const incomplete =
      entries.some(
        ([, value]) =>
          !value.trangThai,
      );

    if (incomplete) {
      setMessage({
        type: "error",

        text:
          "Vui lòng hoàn thành điểm danh cho tất cả Hội viên trước khi lưu",
      });

      return;
    }

    try {
      setSubmitting(true);

      const response =
        await fetch(
          "/api/diem-danh-hoat-dong",
          {
            method: "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                dangKyTapTheId:
                  selectedRegistration._id,

                ghiChu:
                  generalNote.trim(),

                chiTiet:
                  entries.map(
                    ([
                      hoiVienId,
                      value,
                    ]) => ({
                      hoiVienId,

                      trangThai:
                        value.trangThai,

                      ghiChu:
                        value.ghiChu.trim(),
                    }),
                  ),
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
            "Không thể lưu điểm danh",
        );
      }

      setSelectedRegistration(
        null,
      );

      setAttendance(
        {},
      );

      setMessage({
        type: "success",

        text:
          result.message ||
          "Điểm danh thành công",
      });

      await loadData();
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể lưu điểm danh",
      });
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#f3f7fb]">
      <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#12345B]">
              Quản lý hoạt động
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Điểm danh & xác nhận
              tham gia
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {isLeader
                ? "Điểm danh Hội viên đã đăng ký tham gia hoạt động của Chi hội và lưu kết quả gửi lên hệ thống."
                : "Theo dõi lịch sử điểm danh và kết quả tham gia hoạt động của các Chi hội."}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700"
          >
            <RefreshCw
              size={17}
            />

            Làm mới
          </button>
        </div>

        {message && (
          <div
            className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
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

        {/* REGISTRATIONS */}

        {isLeader && (
          <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 sm:p-5">
              <h2 className="font-bold text-slate-900">
                Danh sách chờ điểm
                danh
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Các danh sách đăng ký
                đã được BCH tiếp nhận.
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-52 items-center justify-center">
                <Loader2
                  size={28}
                  className="animate-spin text-[#12345B]"
                />
              </div>
            ) : registrations.length ===
              0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Chưa có danh sách
                đăng ký để điểm danh.
              </div>
            ) : (
              <div className="grid gap-3 p-3 sm:p-5 lg:grid-cols-2">
                {registrations.map(
                  (registration) => {
                    const activity =
                      getActivity(
                        registration,
                      );

                    const members =
                      Array.isArray(
                        registration.hoiVienIds,
                      )
                        ? registration.hoiVienIds.filter(
                            (
                              member,
                            ) =>
                              typeof member ===
                              "object",
                          )
                        : [];

                    return (
                      <article
                        key={
                          registration._id
                        }
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#12345B]">
                              {activity
                                ?.maHoatDong ||
                                "Hoạt động"}
                            </span>

                            <h3 className="mt-3 font-bold text-slate-900">
                              {activity
                                ?.tenHoatDong ||
                                "Chưa xác định"}
                            </h3>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              registration.daDiemDanh
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {registration.daDiemDanh
                              ? "Đã điểm danh"
                              : "Chờ điểm danh"}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                          <p className="flex gap-2">
                            <CalendarDays
                              size={
                                16
                              }
                              className="mt-0.5 shrink-0"
                            />

                            {formatDateTime(
                              activity?.thoiGianBatDau,
                            )}
                          </p>

                          <p className="flex gap-2">
                            <MapPin
                              size={
                                16
                              }
                              className="mt-0.5 shrink-0"
                            />

                            {activity?.diaDiem ||
                              "Chưa cập nhật"}
                          </p>

                          <p className="flex gap-2">
                            <Users
                              size={
                                16
                              }
                              className="mt-0.5 shrink-0"
                            />

                            {
                              members.length
                            }{" "}
                            Hội viên đăng ký
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={
                            registration.daDiemDanh
                          }
                          onClick={() =>
                            openAttendance(
                              registration,
                            )
                          }
                          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#12345B] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          <UserCheck
                            size={
                              17
                            }
                          />

                          {registration.daDiemDanh
                            ? "Đã hoàn thành"
                            : "Mở điểm danh"}
                        </button>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </section>
        )}

        {/* HISTORY */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <h2 className="font-bold text-slate-900">
              Lịch sử điểm danh
            </h2>
          </div>

          <div className="border-b border-slate-200 p-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="Tìm hoạt động, Chi hội, người điểm danh..."
                className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-52 items-center justify-center">
              <Loader2
                size={28}
                className="animate-spin text-[#12345B]"
              />
            </div>
          ) : filteredHistory.length ===
            0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Chưa có lịch sử điểm
              danh.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredHistory.map(
                (item) => {
                  const activity =
                    getActivity(
                      item,
                    );

                  const branch =
                    getBranch(
                      item,
                    );

                  const present =
                    item.chiTiet.filter(
                      (detail) =>
                        detail.trangThai ===
                        "CO_MAT",
                    ).length;

                  const absent =
                    item.chiTiet.filter(
                      (detail) =>
                        detail.trangThai ===
                        "VANG_MAT",
                    ).length;

                  const excused =
                    item.chiTiet.filter(
                      (detail) =>
                        detail.trangThai ===
                        "CO_PHEP",
                    ).length;

                  return (
                    <article
                      key={
                        item._id
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {activity
                              ? `${activity.maHoatDong} - ${activity.tenHoatDong}`
                              : "Hoạt động"}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {branch
                              ? `${branch.maChiHoi} - ${branch.tenChiHoi}`
                              : ""}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Điểm danh bởi{" "}
                            {
                              item.nguoiDiemDanhTen
                            }{" "}
                            •{" "}
                            {formatDateTime(
                              item.ngayDiemDanh,
                            )}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                              Có mặt:{" "}
                              {
                                present
                              }
                            </span>

                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                              Vắng:{" "}
                              {
                                absent
                              }
                            </span>

                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              Có phép:{" "}
                              {
                                excused
                              }
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setDetail(
                              item,
                            )
                          }
                          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700"
                        >
                          <Eye
                            size={
                              16
                            }
                          />

                          Xem kết quả
                        </button>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>

      {/* ===================================================
          ATTENDANCE MODAL
      =================================================== */}

      {selectedRegistration && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4">
          <form
            onSubmit={
              saveAttendance
            }
            className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Điểm danh Hội viên
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {getActivity(
                    selectedRegistration,
                  )?.maHoatDong ||
                    ""}{" "}
                  -{" "}
                  {getActivity(
                    selectedRegistration,
                  )?.tenHoatDong ||
                    ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRegistration(
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
              <div className="mb-4 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-blue-800">
                  Hãy chọn trạng thái
                  cho toàn bộ Hội viên
                  trước khi lưu.
                </p>

                <button
                  type="button"
                  onClick={
                    markAllPresent
                  }
                  className="h-9 rounded-lg bg-white px-3 text-xs font-semibold text-[#12345B] shadow-sm"
                >
                  Đánh dấu tất cả Có
                  mặt
                </button>
              </div>

              <div className="space-y-3">
                {Array.isArray(
                  selectedRegistration.hoiVienIds,
                ) &&
                  selectedRegistration.hoiVienIds.map(
                    (
                      raw,
                      index,
                    ) => {
                      if (
                        typeof raw ===
                        "string"
                      ) {
                        return null;
                      }

                      const value =
                        attendance[
                          raw._id
                        ];

                      return (
                        <div
                          key={
                            raw._id
                          }
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {index +
                                1}
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900">
                                {
                                  raw.hoTen
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  raw.maHoiVien
                                }
                                {raw.lop
                                  ? ` • ${raw.lop}`
                                  : ""}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <StatusButton
                              active={
                                value?.trangThai ===
                                "CO_MAT"
                              }
                              type="present"
                              onClick={() =>
                                updateStatus(
                                  raw._id,
                                  "CO_MAT",
                                )
                              }
                            >
                              Có mặt
                            </StatusButton>

                            <StatusButton
                              active={
                                value?.trangThai ===
                                "VANG_MAT"
                              }
                              type="absent"
                              onClick={() =>
                                updateStatus(
                                  raw._id,
                                  "VANG_MAT",
                                )
                              }
                            >
                              Vắng mặt
                            </StatusButton>

                            <StatusButton
                              active={
                                value?.trangThai ===
                                "CO_PHEP"
                              }
                              type="excused"
                              onClick={() =>
                                updateStatus(
                                  raw._id,
                                  "CO_PHEP",
                                )
                              }
                            >
                              Có phép
                            </StatusButton>
                          </div>

                          {(value?.trangThai ===
                            "VANG_MAT" ||
                            value?.trangThai ===
                              "CO_PHEP") && (
                            <input
                              value={
                                value?.ghiChu ||
                                ""
                              }
                              onChange={(
                                event,
                              ) =>
                                updateNote(
                                  raw._id,
                                  event
                                    .target
                                    .value,
                                )
                              }
                              maxLength={
                                500
                              }
                              placeholder={
                                value.trangThai ===
                                "CO_PHEP"
                                  ? "Nhập lý do..."
                                  : "Ghi chú nếu có..."
                              }
                              className="mt-3 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                            />
                          )}
                        </div>
                      );
                    },
                  )}
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Ghi chú chung
                </span>

                <textarea
                  value={
                    generalNote
                  }
                  onChange={(
                    event,
                  ) =>
                    setGeneralNote(
                      event.target
                        .value,
                    )
                  }
                  maxLength={
                    1000
                  }
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm"
                  placeholder="Ghi chú cho buổi điểm danh nếu cần"
                />
              </label>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={() =>
                  setSelectedRegistration(
                    null,
                  )
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
                {submitting ? (
                  <Loader2
                    size={
                      17
                    }
                    className="animate-spin"
                  />
                ) : (
                  <CheckCircle2
                    size={
                      17
                    }
                  />
                )}

                Lưu điểm danh
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================
          HISTORY DETAIL
      =================================================== */}

      {detail && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Kết quả điểm danh
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {getActivity(
                    detail,
                  )?.maHoatDong ||
                    ""}{" "}
                  -{" "}
                  {getActivity(
                    detail,
                  )?.tenHoatDong ||
                    ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetail(
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

            <div className="space-y-2 p-4 sm:p-6">
              {detail.chiTiet.map(
                (
                  item,
                  index,
                ) => {
                  const member =
                    typeof item.hoiVienId ===
                    "object"
                      ? item.hoiVienId
                      : null;

                  return (
                    <div
                      key={
                        member?._id ||
                        index
                      }
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">
                        {index +
                          1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">
                          {member?.hoTen ||
                            "Hội viên"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {member?.maHoiVien ||
                            ""}
                          {member?.lop
                            ? ` • ${member.lop}`
                            : ""}
                        </p>

                        {item.ghiChu && (
                          <p className="mt-1 text-xs text-slate-500">
                            Ghi chú:{" "}
                            {
                              item.ghiChu
                            }
                          </p>
                        )}
                      </div>

                      <AttendanceBadge
                        status={
                          item.trangThai
                        }
                      />
                    </div>
                  );
                },
              )}

              {detail.ghiChu && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  <strong>
                    Ghi chú chung:
                  </strong>{" "}
                  {detail.ghiChu}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function StatusButton({
  active,
  type,
  onClick,
  children,
}: {
  active: boolean;

  type:
    | "present"
    | "absent"
    | "excused";

  onClick: () => void;

  children:
    React.ReactNode;
}) {
  let classes =
    "border-slate-300 bg-white text-slate-600";

  if (active) {
    if (
      type === "present"
    ) {
      classes =
        "border-green-600 bg-green-600 text-white";
    }

    if (
      type === "absent"
    ) {
      classes =
        "border-red-600 bg-red-600 text-white";
    }

    if (
      type === "excused"
    ) {
      classes =
        "border-amber-500 bg-amber-500 text-white";
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-lg border px-2 text-xs font-semibold transition sm:text-sm ${classes}`}
    >
      {children}
    </button>
  );
}

function AttendanceBadge({
  status,
}: {
  status:
    TrangThaiDiemDanh;
}) {
  if (
    status === "CO_MAT"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
        <CheckCircle2
          size={14}
        />

        Có mặt
      </span>
    );
  }

  if (
    status === "CO_PHEP"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
        <Clock3
          size={14}
        />

        Có phép
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
      <XCircle
        size={14}
      />

      Vắng mặt
    </span>
  );
}