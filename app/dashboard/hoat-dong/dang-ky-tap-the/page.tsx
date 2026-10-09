"use client";

import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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

type HoatDong = {
  _id?: string;
  id?: string;

  maHoatDong: string;
  tenHoatDong: string;

  phamVi:
    | "LIEN_CHI_HOI"
    | "CHI_HOI";

  diaDiem?: string;

  thoiGianBatDau: string;
  thoiGianKetThuc: string;

  hanDangKy?: string;

  soLuongToiDa?:
    | number
    | null;

  trangThai:
    | "CHO_PHE_DUYET"
    | "DA_DUYET"
    | "SAP_DIEN_RA"
    | "DANG_TRIEN_KHAI"
    | "DA_KET_THUC"
    | "DA_HUY";
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

  trangThai:
    | "DANG_HOAT_DONG"
    | "TAM_NGUNG";
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

  nguoiGuiTen: string;

  trangThai:
    | "DA_GUI"
    | "DA_TIEP_NHAN";

  nguoiTiepNhanTen?: string;

  ngayTiepNhan?: string;

  ghiChu?: string;

  createdAt: string;
};

function getId(
  value:
    | string
    | {
        _id?: string;
        id?: string;
      }
    | null
    | undefined,
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
    value._id ||
    value.id ||
    ""
  );
}

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

function statusLabel(
  value:
    DangKyTapThe["trangThai"],
) {
  return value ===
    "DA_TIEP_NHAN"
    ? "Đã tiếp nhận"
    : "Đã gửi";
}

export default function DangKyTapThePage() {
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
    useState<HoatDong[]>([]);

  const [
    members,
    setMembers,
  ] =
    useState<HoiVien[]>([]);

  const [
    registrations,
    setRegistrations,
  ] =
    useState<
      DangKyTapThe[]
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
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    selectedActivity,
    setSelectedActivity,
  ] =
    useState<HoatDong | null>(
      null,
    );

  const [
    selectedMembers,
    setSelectedMembers,
  ] =
    useState<string[]>([]);

  const [
    memberSearch,
    setMemberSearch,
  ] = useState("");

  const [
    note,
    setNote,
  ] = useState("");

  const [
    detail,
    setDetail,
  ] =
    useState<DangKyTapThe | null>(
      null,
    );

  const isLeader =
    currentUser?.role ===
    "CHI_HOI_TRUONG";

  const canReceive =
    currentUser?.role ===
      "ADMIN" ||
    currentUser?.role ===
      "BAN_CHAP_HANH";

  /* =======================================================
     LOAD USER
  ======================================================= */

  const loadUser =
    useCallback(async () => {
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
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể tải thông tin tài khoản",
        );
      }

      const raw =
        result.user ??
        result.data?.user ??
        result.data;

      if (!raw) {
        throw new Error(
          "Không xác định được tài khoản",
        );
      }

      const user: CurrentUser = {
        id: String(
          raw.id ??
            raw._id ??
            raw.userId ??
            "",
        ),

        username:
          String(
            raw.username ||
              "",
          ),

        fullName:
          String(
            raw.fullName ||
              "",
          ),

        role:
          raw.role,
      };

      setCurrentUser(
        user,
      );

      return user;
    }, []);

  /* =======================================================
     LOAD
  ======================================================= */

  const loadAll =
    useCallback(async () => {
      try {
        setLoading(true);

        const user =
          await loadUser();

        const registrationResponse =
          await fetch(
            "/api/dang-ky-tap-the",
            {
              cache:
                "no-store",

              credentials:
                "include",
            },
          );

        const registrationResult =
          await registrationResponse.json();

        if (
          !registrationResponse.ok ||
          !registrationResult.success
        ) {
          throw new Error(
            registrationResult.message ||
              "Không thể tải danh sách đăng ký",
          );
        }

        setRegistrations(
          Array.isArray(
            registrationResult.data,
          )
            ? registrationResult.data
            : [],
        );

        /*
         * Chỉ Chi hội trưởng cần:
         * - danh sách hoạt động
         * - danh sách Hội viên
         */
        if (
          user.role ===
          "CHI_HOI_TRUONG"
        ) {
          const [
            activityResponse,
            memberResponse,
          ] =
            await Promise.all([
              fetch(
                "/api/hoat-dong",
                {
                  cache:
                    "no-store",

                  credentials:
                    "include",
                },
              ),

              fetch(
                "/api/hoi-vien",
                {
                  cache:
                    "no-store",

                  credentials:
                    "include",
                },
              ),
            ]);

          const activityResult =
            await activityResponse.json();

          const memberResult =
            await memberResponse.json();

          if (
            !activityResponse.ok ||
            !activityResult.success
          ) {
            throw new Error(
              activityResult.message ||
                "Không thể tải hoạt động",
            );
          }

          if (
            !memberResponse.ok ||
            !memberResult.success
          ) {
            throw new Error(
              memberResult.message ||
                "Không thể tải Hội viên",
            );
          }

          const rawActivities =
            Array.isArray(
              activityResult.data,
            )
              ? activityResult.data
              : Array.isArray(
                    activityResult
                      .data
                      ?.danhSach,
                  )
                ? activityResult
                    .data
                    .danhSach
                : activityResult.activities ||
                  [];

          setActivities(
            rawActivities.filter(
              (
                activity:
                  HoatDong,
              ) =>
                activity.phamVi ===
                  "LIEN_CHI_HOI" &&
                (activity.trangThai ===
                  "DA_DUYET" ||
                  activity.trangThai ===
                    "SAP_DIEN_RA"),
            ),
          );

          setMembers(
            (
              Array.isArray(
                memberResult.data,
              )
                ? memberResult.data
                : []
            ).filter(
              (
                member:
                  HoiVien,
              ) =>
                member.trangThai ===
                "DANG_HOAT_DONG",
            ),
          );
        }
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
    }, [loadUser]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
    void loadAll();
  }, [loadAll]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredRegistrations =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return registrations.filter(
        (item) => {
          const activity =
            typeof item.hoatDongId ===
            "object"
              ? item.hoatDongId
              : null;

          const branch =
            typeof item.chiHoiId ===
            "object"
              ? item.chiHoiId
              : null;

          const text = [
            activity?.maHoatDong,
            activity?.tenHoatDong,
            branch?.maChiHoi,
            branch?.tenChiHoi,
            item.nguoiGuiTen,
          ]
            .join(" ")
            .toLowerCase();

          return (
            (!keyword ||
              text.includes(
                keyword,
              )) &&
            (!statusFilter ||
              item.trangThai ===
                statusFilter)
          );
        },
      );
    }, [
      registrations,
      search,
      statusFilter,
    ]);

  const filteredMembers =
    useMemo(() => {
      const keyword =
        memberSearch
          .trim()
          .toLowerCase();

      if (!keyword) {
        return members;
      }

      return members.filter(
        (member) =>
          [
            member.maHoiVien,
            member.hoTen,
            member.lop,
            member.email,
            member.soDienThoai,
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword),
      );
    }, [
      members,
      memberSearch,
    ]);

  /* =======================================================
     ACTIVITY
  ======================================================= */

  function activityAlreadyRegistered(
    activity: HoatDong,
  ) {
    const id =
      getId(activity);

    return registrations.some(
      (item) =>
        getId(
          item.hoatDongId,
        ) === id,
    );
  }

  function activityClosed(
    activity: HoatDong,
  ) {
    if (
      !activity.hanDangKy
    ) {
      return false;
    }

    const deadline =
      new Date(
        activity.hanDangKy,
      );

    return (
      !Number.isNaN(
        deadline.getTime(),
      ) &&
      deadline.getTime() <
        // eslint-disable-next-line react-hooks/purity -- Keep deadline checks based on the current time on every render.
        Date.now()
    );
  }

  function openRegistration(
    activity: HoatDong,
  ) {
    if (
      activityAlreadyRegistered(
        activity,
      )
    ) {
      setMessage({
        type: "error",

        text:
          "Chi hội đã gửi danh sách cho hoạt động này",
      });

      return;
    }

    if (
      activityClosed(
        activity,
      )
    ) {
      setMessage({
        type: "error",

        text:
          "Hoạt động đã đóng cổng đăng ký",
      });

      return;
    }

    setSelectedActivity(
      activity,
    );

    setSelectedMembers(
      [],
    );

    setMemberSearch("");

    setNote("");
  }

  function toggleMember(
    id: string,
  ) {
    setSelectedMembers(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) =>
                item !== id,
            )
          : [
              ...current,
              id,
            ],
    );
  }

  function selectAllVisible() {
    const visibleIds =
      filteredMembers.map(
        (member) =>
          member._id,
      );

    const allSelected =
      visibleIds.every(
        (id) =>
          selectedMembers.includes(
            id,
          ),
      );

    if (allSelected) {
      setSelectedMembers(
        (current) =>
          current.filter(
            (id) =>
              !visibleIds.includes(
                id,
              ),
          ),
      );
    } else {
      setSelectedMembers(
        (current) =>
          Array.from(
            new Set([
              ...current,
              ...visibleIds,
            ]),
          ),
      );
    }
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function submitRegistration(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedActivity
    ) {
      return;
    }

    if (
      selectedMembers.length ===
      0
    ) {
      setMessage({
        type: "error",

        text:
          "Vui lòng chọn ít nhất một Hội viên",
      });

      return;
    }

    if (
      selectedActivity
        .soLuongToiDa &&
      selectedMembers.length >
        selectedActivity
          .soLuongToiDa
    ) {
      setMessage({
        type: "error",

        text:
          `Hoạt động giới hạn tối đa ${selectedActivity.soLuongToiDa} người.`,
      });

      return;
    }

    try {
      setSubmitting(true);

      const response =
        await fetch(
          "/api/dang-ky-tap-the",
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
                hoatDongId:
                  getId(
                    selectedActivity,
                  ),

                hoiVienIds:
                  selectedMembers,

                ghiChu:
                  note.trim(),
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
            "Không thể gửi danh sách",
        );
      }

      setSelectedActivity(
        null,
      );

      setSelectedMembers(
        [],
      );

      setMessage({
        type: "success",

        text:
          result.message ||
          "Gửi danh sách đăng ký thành công",
      });

      await loadAll();
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể gửi danh sách",
      });
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     RECEIVE
  ======================================================= */

  async function receiveRegistration(
    item: DangKyTapThe,
  ) {
    if (!canReceive) {
      return;
    }

    const confirmed =
      window.confirm(
        "Xác nhận tiếp nhận danh sách đăng ký này?",
      );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);

      const response =
        await fetch(
          `/api/dang-ky-tap-the/${item._id}`,
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
                action:
                  "RECEIVE",
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
            "Không thể tiếp nhận danh sách",
        );
      }

      setMessage({
        type: "success",

        text:
          result.message,
      });

      await loadAll();
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể tiếp nhận danh sách",
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
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#12345B]">
              Quản lý hoạt động
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Đăng ký tham gia cấp
              Liên Chi
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {isLeader
                ? "Lập danh sách Hội viên trong Chi hội đăng ký tham gia các hoạt động do BCH Liên Chi hội phát động."
                : "Theo dõi và tiếp nhận danh sách Hội viên đăng ký tập thể từ các Chi hội."}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadAll()
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
            {message.text}
          </div>
        )}

        {/* LEADER: ACTIVITIES */}

        {isLeader && (
          <section className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 sm:p-5">
              <h2 className="font-bold text-slate-900">
                Hoạt động đang mở
                đăng ký
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Chọn hoạt động để
                lập danh sách Hội
                viên tham gia.
              </p>
            </div>

            <div className="grid gap-3 p-3 sm:p-5 lg:grid-cols-2">
              {activities.length ===
              0 ? (
                <div className="col-span-full py-12 text-center text-sm text-slate-500">
                  Chưa có hoạt động
                  cấp Liên Chi đang
                  mở đăng ký.
                </div>
              ) : (
                activities.map(
                  (activity) => {
                    const registered =
                      activityAlreadyRegistered(
                        activity,
                      );

                    const closed =
                      activityClosed(
                        activity,
                      );

                    return (
                      <article
                        key={getId(
                          activity,
                        )}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#12345B]">
                              {
                                activity.maHoatDong
                              }
                            </span>

                            <h3 className="mt-3 font-bold text-slate-900">
                              {
                                activity.tenHoatDong
                              }
                            </h3>
                          </div>

                          {registered && (
                            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                              Đã gửi
                            </span>
                          )}
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
                              activity.thoiGianBatDau,
                            )}
                          </p>

                          <p className="flex gap-2">
                            <MapPin
                              size={
                                16
                              }
                              className="mt-0.5 shrink-0"
                            />

                            {activity.diaDiem ||
                              "Chưa cập nhật"}
                          </p>

                          <p className="flex gap-2">
                            <Clock3
                              size={
                                16
                              }
                              className="mt-0.5 shrink-0"
                            />

                            Hạn đăng ký:{" "}
                            {formatDateTime(
                              activity.hanDangKy,
                            )}
                          </p>

                          {activity.soLuongToiDa ? (
                            <p>
                              Giới hạn:{" "}
                              <strong>
                                {
                                  activity.soLuongToiDa
                                }{" "}
                                người
                              </strong>
                            </p>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          disabled={
                            registered ||
                            closed
                          }
                          onClick={() =>
                            openRegistration(
                              activity,
                            )
                          }
                          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#12345B] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          <Users
                            size={
                              17
                            }
                          />

                          {registered
                            ? "Đã gửi danh sách"
                            : closed
                              ? "Đã đóng đăng ký"
                              : "Lập danh sách"}
                        </button>
                      </article>
                    );
                  },
                )
              )}
            </div>
          </section>
        )}

        {/* REGISTRATION HISTORY */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <h2 className="font-bold text-slate-900">
              Danh sách đăng ký tập
              thể
            </h2>
          </div>

          <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_220px]">
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
                placeholder="Tìm hoạt động, Chi hội..."
                className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm"
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
                  event.target
                    .value,
                )
              }
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">
                Tất cả trạng thái
              </option>

              <option value="DA_GUI">
                Đã gửi
              </option>

              <option value="DA_TIEP_NHAN">
                Đã tiếp nhận
              </option>
            </select>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2
                size={30}
                className="animate-spin text-[#12345B]"
              />
            </div>
          ) : filteredRegistrations.length ===
            0 ? (
            <div className="py-14 text-center text-sm text-slate-500">
              Chưa có danh sách đăng
              ký tập thể.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredRegistrations.map(
                (item) => {
                  const activity =
                    typeof item.hoatDongId ===
                    "object"
                      ? item.hoatDongId
                      : null;

                  const branch =
                    typeof item.chiHoiId ===
                    "object"
                      ? item.chiHoiId
                      : null;

                  const list =
                    Array.isArray(
                      item.hoiVienIds,
                    )
                      ? item.hoiVienIds.filter(
                          (
                            member,
                          ): member is HoiVien =>
                            typeof member ===
                            "object",
                        )
                      : [];

                  return (
                    <article
                      key={
                        item._id
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                item.trangThai ===
                                "DA_TIEP_NHAN"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {statusLabel(
                                item.trangThai,
                              )}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {
                                list.length
                              }{" "}
                              Hội viên
                            </span>
                          </div>

                          <h3 className="mt-3 font-bold text-slate-900">
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
                            Gửi bởi{" "}
                            {
                              item.nguoiGuiTen
                            }{" "}
                            •{" "}
                            {formatDateTime(
                              item.createdAt,
                            )}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
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

                            Xem danh sách
                          </button>

                          {canReceive &&
                            item.trangThai ===
                              "DA_GUI" && (
                              <button
                                type="button"
                                disabled={
                                  submitting
                                }
                                onClick={() =>
                                  void receiveRegistration(
                                    item,
                                  )
                                }
                                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white"
                              >
                                <CheckCircle2
                                  size={
                                    16
                                  }
                                />

                                Tiếp nhận
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

      {/* SELECT MEMBERS */}

      {selectedActivity && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4">
          <form
            onSubmit={
              submitRegistration
            }
            className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 p-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Lập danh sách đăng
                  ký
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    selectedActivity.maHoatDong
                  }{" "}
                  -{" "}
                  {
                    selectedActivity.tenHoatDong
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedActivity(
                    null,
                  )
                }
              >
                <X
                  size={20}
                />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                Đã chọn{" "}
                <strong>
                  {
                    selectedMembers.length
                  }
                </strong>{" "}
                Hội viên
                {selectedActivity.soLuongToiDa
                  ? ` / giới hạn ${selectedActivity.soLuongToiDa}`
                  : ""}
                .
              </div>

              <div className="relative mb-3">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={
                    memberSearch
                  }
                  onChange={(
                    event,
                  ) =>
                    setMemberSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Tìm Hội viên..."
                  className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm"
                />
              </div>

              <button
                type="button"
                onClick={
                  selectAllVisible
                }
                className="mb-4 text-sm font-semibold text-[#12345B]"
              >
                Chọn / bỏ chọn tất cả
                kết quả đang hiển thị
              </button>

              <div className="space-y-2">
                {filteredMembers.map(
                  (member) => {
                    const selected =
                      selectedMembers.includes(
                        member._id,
                      );

                    return (
                      <button
                        key={
                          member._id
                        }
                        type="button"
                        onClick={() =>
                          toggleMember(
                            member._id,
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                          selected
                            ? "border-blue-400 bg-blue-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            selected
                              ? "border-[#12345B] bg-[#12345B] text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {selected && (
                            <Check
                              size={
                                14
                              }
                            />
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">
                            {
                              member.hoTen
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              member.maHoiVien
                            }
                            {member.lop
                              ? ` • ${member.lop}`
                              : ""}
                          </p>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Ghi chú
                </span>

                <textarea
                  value={note}
                  onChange={(
                    event,
                  ) =>
                    setNote(
                      event.target
                        .value,
                    )
                  }
                  rows={3}
                  maxLength={
                    1000
                  }
                  className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm"
                  placeholder="Ghi chú thêm nếu cần"
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
                  setSelectedActivity(
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
                  submitting ||
                  selectedMembers.length ===
                    0
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
                  <Send
                    size={
                      17
                    }
                  />
                )}

                Gửi danh sách đăng ký
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DETAIL */}

      {detail && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold">
                  Danh sách Hội viên
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    Array.isArray(
                      detail.hoiVienIds,
                    )
                      ? detail.hoiVienIds
                          .length
                      : 0
                  }{" "}
                  Hội viên
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetail(
                    null,
                  )
                }
              >
                <X
                  size={20}
                />
              </button>
            </div>

            <div className="space-y-2 p-4 sm:p-6">
              {Array.isArray(
                detail.hoiVienIds,
              ) &&
                detail.hoiVienIds.map(
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

                    return (
                      <div
                        key={
                          raw._id
                        }
                        className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">
                          {index +
                            1}
                        </span>

                        <div>
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
                    );
                  },
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}