"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
  UserCircle2,
} from "lucide-react";

import {
  FormEvent,
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

type ProfileUser = {
  id: string;

  username: string;

  fullName: string;

  email: string;

  phone: string;

  role: UserRole;

  chiHoiId:
    | string
    | null;
};

type ApiResponse = {
  success: boolean;

  message?: string;

  user?: ProfileUser;

  data?: unknown;
};

type NoticeState = {
  type:
    | "success"
    | "error";

  message: string;
};

/* =========================================================
   HELPERS
========================================================= */

function getRoleLabel(
  role: UserRole,
) {
  switch (
    role
  ) {
    case "ADMIN":
      return "Quản trị viên";

    case "BAN_CHAP_HANH":
      return "Ban Chấp hành";

    case "CHI_HOI_TRUONG":
      return "Chi hội trưởng";

    case "HOI_VIEN":
      return "Hội viên";

    default:
      return role;
  }
}

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

function normalizeUser(
  value: unknown,
): ProfileUser | null {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  const raw =
    value as Record<
      string,
      unknown
    >;

  const role =
    String(
      raw.role ??
        "",
    ) as UserRole;

  const validRoles:
    UserRole[] = [
    "ADMIN",
    "BAN_CHAP_HANH",
    "CHI_HOI_TRUONG",
    "HOI_VIEN",
  ];

  if (
    !validRoles.includes(
      role,
    )
  ) {
    return null;
  }

  return {
    id:
      getId(
        raw.id ??
          raw._id ??
          raw.userId,
      ),

    username:
      String(
        raw.username ??
          "",
      ),

    fullName:
      String(
        raw.fullName ??
          raw.hoTen ??
          "",
      ),

    email:
      String(
        raw.email ??
          "",
      ),

    phone:
      String(
        raw.phone ??
          raw.soDienThoai ??
          "",
      ),

    role,

    chiHoiId:
      raw.chiHoiId
        ? getId(
            raw.chiHoiId,
          )
        : null,
  };
}

async function parseApiResponse(
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
      "API response không hợp lệ:",
      {
        status:
          response.status,

        url:
          response.url,

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
        `Dữ liệu máy chủ trả về không hợp lệ. HTTP ${response.status}`,
    };
  }
}

function getPasswordChecks(
  password: string,
) {
  return {
    length:
      password.length >=
      8,

    lowercase:
      /[a-z]/.test(
        password,
      ),

    uppercase:
      /[A-Z]/.test(
        password,
      ),

    number:
      /[0-9]/.test(
        password,
      ),
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function HoSoPage() {
  const router =
    useRouter();

  const [
    user,
    setUser,
  ] =
    useState<ProfileUser | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    savingProfile,
    setSavingProfile,
  ] =
    useState(
      false,
    );

  const [
    changingPassword,
    setChangingPassword,
  ] =
    useState(
      false,
    );

  const [
    profileNotice,
    setProfileNotice,
  ] =
    useState<NoticeState | null>(
      null,
    );

  const [
    passwordNotice,
    setPasswordNotice,
  ] =
    useState<NoticeState | null>(
      null,
    );

  /* =======================================================
     PROFILE FORM
  ======================================================= */

  const [
    fullName,
    setFullName,
  ] =
    useState(
      "",
    );

  const [
    email,
    setEmail,
  ] =
    useState(
      "",
    );

  const [
    phone,
    setPhone,
  ] =
    useState(
      "",
    );

  /* =======================================================
     PASSWORD FORM
  ======================================================= */

  const [
    currentPassword,
    setCurrentPassword,
  ] =
    useState(
      "",
    );

  const [
    newPassword,
    setNewPassword,
  ] =
    useState(
      "",
    );

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState(
      "",
    );

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] =
    useState(
      false,
    );

  const [
    showNewPassword,
    setShowNewPassword,
  ] =
    useState(
      false,
    );

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(
      false,
    );

  /* =======================================================
     PASSWORD STRENGTH
  ======================================================= */

  const passwordChecks =
    useMemo(
      () =>
        getPasswordChecks(
          newPassword,
        ),
      [
        newPassword,
      ],
    );

  const passwordValid =
    passwordChecks.length &&
    passwordChecks.lowercase &&
    passwordChecks.uppercase &&
    passwordChecks.number;

  const confirmMatched =
    confirmPassword.length >
      0 &&
    newPassword ===
      confirmPassword;

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  const loadProfile =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/profile",
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
                "Không thể tải hồ sơ",
            );
          }

          let profileUser =
            normalizeUser(
              result.user,
            );

          if (
            !profileUser &&
            result.data
          ) {
            if (
              typeof result.data ===
              "object"
            ) {
              const rawData =
                result.data as Record<
                  string,
                  unknown
                >;

              profileUser =
                normalizeUser(
                  rawData.user ??
                    rawData,
                );
            }
          }

          if (
            !profileUser
          ) {
            throw new Error(
              "Không tìm thấy thông tin tài khoản",
            );
          }

          setUser(
            profileUser,
          );

          setFullName(
            profileUser.fullName ??
              "",
          );

          setEmail(
            profileUser.email ??
              "",
          );

          setPhone(
            profileUser.phone ??
              "",
          );
        } catch (
          error
        ) {
          console.error(
            "Load profile:",
            error,
          );

          setProfileNotice({
            type:
              "error",

            message:
              error instanceof
                Error
                ? error.message
                : "Không thể tải hồ sơ",
          });
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
                try {
                  setLoading(
                    true,
                  );

                  await loadProfile();
                } finally {
                  setLoading(
                    false,
                  );
                }
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
      loadProfile,
    ],
  );

  /* =======================================================
     UPDATE PROFILE
  ======================================================= */

  async function handleUpdateProfile(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setProfileNotice(
      null,
    );

    const normalizedFullName =
      fullName.trim();

    const normalizedEmail =
      email.trim();

    const normalizedPhone =
      phone.trim();

    if (
      !normalizedFullName
    ) {
      setProfileNotice({
        type:
          "error",

        message:
          "Họ và tên không được để trống",
      });

      return;
    }

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail,
      )
    ) {
      setProfileNotice({
        type:
          "error",

        message:
          "Địa chỉ email không hợp lệ",
      });

      return;
    }

    try {
      setSavingProfile(
        true,
      );

      const response =
        await fetch(
          "/api/profile",
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
                fullName:
                  normalizedFullName,

                email:
                  normalizedEmail,

                phone:
                  normalizedPhone,
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
            "Không thể cập nhật hồ sơ",
        );
      }

      const updatedUser =
        normalizeUser(
          result.user,
        ) ??
        (
          result.data &&
          typeof result.data ===
            "object"
            ? normalizeUser(
                (
                  result.data as Record<
                    string,
                    unknown
                  >
                ).user ??
                  result.data,
              )
            : null
        );

      if (
        updatedUser
      ) {
        setUser(
          updatedUser,
        );

        setFullName(
          updatedUser.fullName,
        );

        setEmail(
          updatedUser.email,
        );

        setPhone(
          updatedUser.phone,
        );
      } else {
        /*
         * API cũ có thể chỉ trả success/message.
         * Khi đó tải lại profile để đồng bộ.
         */
        await loadProfile();
      }

      setProfileNotice({
        type:
          "success",

        message:
          result.message ||
          "Cập nhật hồ sơ thành công",
      });
    } catch (
      error
    ) {
      setProfileNotice({
        type:
          "error",

        message:
          error instanceof
            Error
            ? error.message
            : "Không thể cập nhật hồ sơ",
      });
    } finally {
      setSavingProfile(
        false,
      );
    }
  }

  /* =======================================================
     CHANGE PASSWORD
  ======================================================= */

  async function handleChangePassword(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPasswordNotice(
      null,
    );

    if (
      !currentPassword
    ) {
      setPasswordNotice({
        type:
          "error",

        message:
          "Vui lòng nhập mật khẩu hiện tại",
      });

      return;
    }

    if (
      !newPassword
    ) {
      setPasswordNotice({
        type:
          "error",

        message:
          "Vui lòng nhập mật khẩu mới",
      });

      return;
    }

    if (
      !passwordValid
    ) {
      setPasswordNotice({
        type:
          "error",

        message:
          "Mật khẩu mới chưa đáp ứng yêu cầu bảo mật",
      });

      return;
    }

    if (
      newPassword ===
      currentPassword
    ) {
      setPasswordNotice({
        type:
          "error",

        message:
          "Mật khẩu mới không được trùng với mật khẩu hiện tại",
      });

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordNotice({
        type:
          "error",

        message:
          "Mật khẩu xác nhận không trùng khớp",
      });

      return;
    }

    try {
      setChangingPassword(
        true,
      );

      const response =
        await fetch(
          "/api/auth/change-password",
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
                currentPassword,

                newPassword,

                confirmPassword,
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
            "Không thể đổi mật khẩu",
        );
      }

      setCurrentPassword(
        "",
      );

      setNewPassword(
        "",
      );

      setConfirmPassword(
        "",
      );

      setShowCurrentPassword(
        false,
      );

      setShowNewPassword(
        false,
      );

      setShowConfirmPassword(
        false,
      );

      setPasswordNotice({
        type:
          "success",

        message:
          result.message ||
          "Đổi mật khẩu thành công",
      });
    } catch (
      error
    ) {
      setPasswordNotice({
        type:
          "error",

        message:
          error instanceof
            Error
            ? error.message
            : "Không thể đổi mật khẩu",
      });
    } finally {
      setChangingPassword(
        false,
      );
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={36}
            className="mx-auto animate-spin text-[#123b68]"
          />

          <p className="mt-3 text-sm text-slate-500">
            Đang tải hồ sơ...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    !user
  ) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={21}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Không thể tải hồ sơ
              </p>

              <p className="mt-1 text-sm">
                {profileNotice?.message ||
                  "Không thể tải thông tin tài khoản"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-full bg-[#f4f7fb] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123b68]">
            Tài khoản
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
            Hồ sơ cá nhân
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Quản lý thông tin cá nhân và bảo mật tài khoản của bạn.
          </p>
        </div>

        {/* =================================================
            USER SUMMARY
        ================================================= */}

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#123b68] text-white">
              <UserCircle2
                size={34}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold text-slate-950">
                {user.fullName}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                @{user.username}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#123b68]">
                  {getRoleLabel(
                    user.role,
                  )}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <ShieldCheck
                    size={13}
                  />

                  Tài khoản đang hoạt động
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          {/* ===============================================
              PROFILE
          =============================================== */}

          <form
            onSubmit={
              handleUpdateProfile
            }
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#123b68]">
                  <User
                    size={22}
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950">
                    Thông tin tài khoản
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Cập nhật thông tin liên hệ cá nhân.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tên đăng nhập
                </label>

                <input
                  value={
                    user.username
                  }
                  disabled
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Tên đăng nhập không thể tự thay đổi.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Vai trò
                </label>

                <input
                  value={getRoleLabel(
                    user.role,
                  )}
                  disabled
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Họ và tên
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">
                  <User
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={
                      fullName
                    }
                    onChange={(
                      event,
                    ) =>
                      setFullName(
                        event.target.value,
                      )
                    }
                    required
                    maxLength={
                      100
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none transition focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    value={
                      email
                    }
                    onChange={(
                      event,
                    ) =>
                      setEmail(
                        event.target.value,
                      )
                    }
                    maxLength={
                      150
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none transition focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
                    placeholder="example@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Số điện thoại
                </label>

                <div className="relative">
                  <Phone
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={
                      phone
                    }
                    onChange={(
                      event,
                    ) =>
                      setPhone(
                        event.target.value,
                      )
                    }
                    maxLength={
                      20
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none transition focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
                    placeholder="Nhập số điện thoại"
                  />
                </div>
              </div>

              {profileNotice && (
                <Notice
                  notice={
                    profileNotice
                  }
                />
              )}

              <button
                type="submit"
                disabled={
                  savingProfile
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#123b68] px-5 text-sm font-semibold text-white transition hover:bg-[#0e3158] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProfile ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Save
                    size={17}
                  />
                )}

                {savingProfile
                  ? "Đang lưu..."
                  : "Cập nhật thông tin"}
              </button>
            </div>
          </form>

          {/* ===============================================
              PASSWORD
          =============================================== */}

          <form
            onSubmit={
              handleChangePassword
            }
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <KeyRound
                    size={22}
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950">
                    Đổi mật khẩu
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Thay đổi mật khẩu định kỳ giúp bảo vệ tài khoản tốt hơn.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {/* CURRENT PASSWORD */}

              <PasswordInput
                label="Mật khẩu hiện tại"
                value={
                  currentPassword
                }
                show={
                  showCurrentPassword
                }
                onToggle={() =>
                  setShowCurrentPassword(
                    (
                      previous,
                    ) =>
                      !previous,
                  )
                }
                onChange={
                  setCurrentPassword
                }
                autoComplete="current-password"
              />

              {/* NEW PASSWORD */}

              <PasswordInput
                label="Mật khẩu mới"
                value={
                  newPassword
                }
                show={
                  showNewPassword
                }
                onToggle={() =>
                  setShowNewPassword(
                    (
                      previous,
                    ) =>
                      !previous,
                  )
                }
                onChange={
                  setNewPassword
                }
                autoComplete="new-password"
              />

              {/* PASSWORD RULES */}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Yêu cầu mật khẩu
                </p>

                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <PasswordRule
                    valid={
                      passwordChecks.length
                    }
                    label="Ít nhất 8 ký tự"
                  />

                  <PasswordRule
                    valid={
                      passwordChecks.uppercase
                    }
                    label="Có chữ hoa"
                  />

                  <PasswordRule
                    valid={
                      passwordChecks.lowercase
                    }
                    label="Có chữ thường"
                  />

                  <PasswordRule
                    valid={
                      passwordChecks.number
                    }
                    label="Có chữ số"
                  />
                </div>
              </div>

              {/* CONFIRM PASSWORD */}

              <PasswordInput
                label="Xác nhận mật khẩu mới"
                value={
                  confirmPassword
                }
                show={
                  showConfirmPassword
                }
                onToggle={() =>
                  setShowConfirmPassword(
                    (
                      previous,
                    ) =>
                      !previous,
                  )
                }
                onChange={
                  setConfirmPassword
                }
                autoComplete="new-password"
              />

              {confirmPassword && (
                <div
                  className={`flex items-center gap-2 text-xs font-medium ${
                    confirmMatched
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {confirmMatched ? (
                    <CheckCircle2
                      size={15}
                    />
                  ) : (
                    <AlertCircle
                      size={15}
                    />
                  )}

                  {confirmMatched
                    ? "Mật khẩu xác nhận trùng khớp"
                    : "Mật khẩu xác nhận chưa trùng khớp"}
                </div>
              )}

              {passwordNotice && (
                <Notice
                  notice={
                    passwordNotice
                  }
                />
              )}

              <button
                type="submit"
                disabled={
                  changingPassword
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {changingPassword ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <LockKeyhole
                    size={17}
                  />
                )}

                {changingPassword
                  ? "Đang đổi mật khẩu..."
                  : "Đổi mật khẩu"}
              </button>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={19}
                    className="mt-0.5 shrink-0 text-[#123b68]"
                  />

                  <p className="text-xs leading-5 text-blue-800">
                    Mật khẩu không được hiển thị hoặc gửi trở lại trình duyệt từ
                    cơ sở dữ liệu. Sau khi đổi thành công, mật khẩu mới được lưu
                    dưới dạng mã hóa bcrypt.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   NOTICE
========================================================= */

function Notice({
  notice,
}: {
  notice:
    NoticeState;
}) {
  const success =
    notice.type ===
    "success";

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
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

      <span>
        {notice.message}
      </span>
    </div>
  );
}

/* =========================================================
   PASSWORD INPUT
========================================================= */

function PasswordInput({
  label,
  value,
  show,
  onToggle,
  onChange,
  autoComplete,
}: {
  label: string;

  value: string;

  show: boolean;

  onToggle:
    () => void;

  onChange:
    (
      value: string,
    ) => void;

  autoComplete:
    string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}

        <span className="ml-1 text-red-500">
          *
        </span>
      </label>

      <div className="relative">
        <LockKeyhole
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type={
            show
              ? "text"
              : "password"
          }
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
          required
          autoComplete={
            autoComplete
          }
          className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-11 text-sm outline-none transition focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
        />

        <button
          type="button"
          onClick={
            onToggle
          }
          tabIndex={
            -1
          }
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={
            show
              ? "Ẩn mật khẩu"
              : "Hiện mật khẩu"
          }
        >
          {show ? (
            <EyeOff
              size={17}
            />
          ) : (
            <Eye
              size={17}
            />
          )}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   PASSWORD RULE
========================================================= */

function PasswordRule({
  valid,
  label,
}: {
  valid: boolean;

  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        valid
          ? "text-emerald-600"
          : "text-slate-400"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          valid
            ? "bg-emerald-100"
            : "bg-slate-200"
        }`}
      >
        <Check
          size={12}
        />
      </span>

      {label}
    </div>
  );
}