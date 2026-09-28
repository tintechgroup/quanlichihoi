"use client";

import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type TaiKhoanInfo = {
  _id: string;
  username: string;
  role?: string;
  isActive?: boolean;
};

type BanChapHanhAccountInfo = {
  _id: string;
  maBanChapHanh: string;
  hoTen: string;
  chucVu: string;
  nhiemKy: string;
  taiKhoan: TaiKhoanInfo | null;
};

type CapTaiKhoanBanChapHanhModalProps = {
  open: boolean;
  member: BanChapHanhAccountInfo | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export default function CapTaiKhoanBanChapHanhModal({
  open,
  member,
  onClose,
  onSuccess,
}: CapTaiKhoanBanChapHanhModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [createdNewAccount, setCreatedNewAccount] =
    useState(false);
  const [resultUsername, setResultUsername] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && member) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset editable modal state when the selected record or open state changes.
      setUsername(
        member.taiKhoan?.username ||
          member.maBanChapHanh.toLowerCase(),
      );
      setPassword("");
      setShowPassword(false);
      setSubmitting(false);
      setCompleted(false);
      setCreatedNewAccount(false);
      setResultUsername("");
      setCopied(false);
      setError("");
    }
  }, [open, member]);

  if (!open || !member) {
    return null;
  }

  const hasExistingAccount = Boolean(member.taiKhoan);

  function handleClose() {
    if (submitting) return;

    setPassword("");
    setShowPassword(false);
    setCompleted(false);
    setCreatedNewAccount(false);
    setCopied(false);
    setError("");

    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!member) return;
    event.preventDefault();

    if (!hasExistingAccount) {
      const normalizedUsername = username.trim().toLowerCase();

      if (!normalizedUsername) {
        setError("Tên đăng nhập không được để trống");
        return;
      }

      if (!/^[a-z0-9._-]+$/.test(normalizedUsername)) {
        setError(
          "Tên đăng nhập chỉ được chứa chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang",
        );
        return;
      }

      if (
        normalizedUsername.length < 3 ||
        normalizedUsername.length > 50
      ) {
        setError(
          "Tên đăng nhập phải có từ 3 đến 50 ký tự",
        );
        return;
      }

      if (!password) {
        setError("Mật khẩu không được để trống");
        return;
      }

      if (password.length < 6) {
        setError("Mật khẩu phải có ít nhất 6 ký tự");
        return;
      }

      if (password.length > 100) {
        setError(
          "Mật khẩu không được vượt quá 100 ký tự",
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      setError("");
      setCopied(false);

      const response = await fetch(
        `/api/ban-chap-hanh/${member._id}/cap-tai-khoan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim().toLowerCase(),
            password,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Không thể cấp tài khoản Ban Chấp hành",
        );
      }

      const accountCreated =
        result.data?.createdNewAccount === true;

      setCreatedNewAccount(accountCreated);
      setResultUsername(
        result.data?.username ||
          member.taiKhoan?.username ||
          username.trim().toLowerCase(),
      );
      setCompleted(true);

      onSuccess(
        result.message ||
          "Cấp tài khoản Ban Chấp hành thành công",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Đã xảy ra lỗi khi cấp tài khoản Ban Chấp hành",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!member) return;
    const lines = [
      `Họ và tên: ${member.hoTen}`,
      `Chức vụ: ${member.chucVu}`,
      `Tên đăng nhập: ${resultUsername}`,
    ];

    if (createdNewAccount) {
      lines.push(`Mật khẩu: ${password}`);
    } else {
      lines.push("Mật khẩu: Giữ nguyên mật khẩu hiện tại");
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError(
        "Không thể sao chép tự động. Vui lòng sao chép thông tin thủ công.",
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bch-account-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#12345B]">
              <ShieldCheck size={22} />
            </div>

            <div className="min-w-0">
              <h2
                id="bch-account-title"
                className="text-lg font-semibold text-slate-900"
              >
                {hasExistingAccount
                  ? "Cấp quyền Ban Chấp hành"
                  : "Cấp tài khoản Ban Chấp hành"}
              </h2>

              <p className="mt-1 truncate text-sm text-slate-600">
                {member.maBanChapHanh} - {member.hoTen}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {!completed ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Chức vụ
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {member.chucVu}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Nhiệm kỳ
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {member.nhiemKy}
                  </p>
                </div>
              </div>

              {hasExistingAccount ? (
                <>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <KeyRound
                        size={19}
                        className="mt-0.5 shrink-0 text-[#12345B]"
                      />

                      <div>
                        <p className="text-sm font-semibold text-[#12345B]">
                          Hội viên đã có tài khoản
                        </p>

                        <p className="mt-1 text-sm leading-6 text-blue-800">
                          Hệ thống sẽ giữ nguyên tên đăng nhập và mật
                          khẩu, chỉ cấp thêm quyền Ban Chấp hành.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">
                      Tên đăng nhập
                    </p>

                    <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                      {member.taiKhoan?.username}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="bch-username"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Tên đăng nhập
                      <span className="ml-1 text-red-600">*</span>
                    </label>

                    <input
                      id="bch-username"
                      required
                      minLength={3}
                      maxLength={50}
                      value={username}
                      onChange={(event) => {
                        setUsername(
                          event.target.value.toLowerCase(),
                        );
                        setError("");
                      }}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/10"
                      placeholder="Nhập tên đăng nhập"
                      autoComplete="username"
                    />

                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                      Chỉ sử dụng chữ thường, số, dấu chấm, gạch dưới
                      hoặc gạch ngang.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="bch-password"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Mật khẩu
                      <span className="ml-1 text-red-600">*</span>
                    </label>

                    <div className="relative">
                      <input
                        id="bch-password"
                        required
                        minLength={6}
                        maxLength={100}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setError("");
                        }}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/10"
                        placeholder="Nhập mật khẩu từ 6 ký tự"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (current) => !current,
                          )
                        }
                        className="absolute right-1 top-1/2 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-[#12345B]"
                        aria-label={
                          showPassword
                            ? "Ẩn mật khẩu"
                            : "Hiện mật khẩu"
                        }
                        title={
                          showPassword
                            ? "Ẩn mật khẩu"
                            : "Hiện mật khẩu"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Tài khoản được cấp quyền Ban Chấp hành có thể sử dụng
                các chức năng tương ứng với vai trò được phân quyền.
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                disabled={submitting}
                onClick={handleClose}
                className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="h-11 rounded-lg bg-[#12345B] px-5 text-sm font-semibold text-white transition hover:bg-[#0D2947] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Đang xử lý..."
                  : hasExistingAccount
                    ? "Cấp quyền Ban Chấp hành"
                    : "Tạo và cấp tài khoản"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-700"
                />

                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Cấp quyền Ban Chấp hành thành công
                  </p>

                  <p className="mt-1 text-sm leading-6 text-emerald-700">
                    Tài khoản đã được gán vai trò Ban Chấp hành.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <AccountRow
                  label="Họ và tên"
                  value={member.hoTen}
                />

                <AccountRow
                  label="Chức vụ"
                  value={member.chucVu}
                />

                <AccountRow
                  label="Tên đăng nhập"
                  value={resultUsername}
                />

                <AccountRow
                  label="Mật khẩu"
                  value={
                    createdNewAccount
                      ? password
                      : "Giữ nguyên mật khẩu hiện tại"
                  }
                  last
                />
              </div>

              <p className="text-xs leading-5 text-slate-500">
                {createdNewAccount
                  ? "Mật khẩu chỉ hiển thị trong lần cấp tài khoản này. Hãy sao chép trước khi đóng cửa sổ."
                  : "Tài khoản sử dụng tên đăng nhập và mật khẩu Hội viên hiện tại."}
              </p>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={handleClose}
                className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#12345B] px-5 text-sm font-semibold text-white transition hover:bg-[#0D2947]"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied
                  ? "Đã sao chép"
                  : "Sao chép thông tin"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AccountRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[130px_minmax(0,1fr)] ${
        last ? "" : "border-b border-slate-200"
      }`}
    >
      <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
        {label}
      </div>

      <div className="break-all px-4 py-3 text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}