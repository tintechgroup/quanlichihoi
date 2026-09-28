"use client";

import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type HoiVienResetInfo = {
  _id: string;
  maHoiVien: string;
  hoTen: string;
  username: string;
};
type ResetMatKhauHoiVienModalProps = {
  open: boolean;
  hoiVien: HoiVienResetInfo | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

export default function ResetMatKhauHoiVienModal({
  open,
  hoiVien,
  onClose,
  onSuccess,
}: ResetMatKhauHoiVienModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset editable modal state when the selected record or open state changes.
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setSubmitting(false);
      setCompleted(false);
      setCopied(false);
      setError("");
    }
  }, [open, hoiVien?._id]);

  if (!open || !hoiVien) {
    return null;
  }

  function handleClose() {
    if (submitting) return;

    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setCompleted(false);
    setCopied(false);
    setError("");

    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!hoiVien) return;
    event.preventDefault();

    if (!password) {
      setError("Mật khẩu mới không được để trống");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (password.length > 100) {
      setError("Mật khẩu mới không được vượt quá 100 ký tự");
      return;
    }

    if (!confirmPassword) {
      setError("Vui lòng nhập lại mật khẩu mới");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setCopied(false);

      const response = await fetch(
        `/api/hoi-vien/${hoiVien._id}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
            confirmPassword,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể đặt lại mật khẩu Hội viên",
        );
      }

      setCompleted(true);

      onSuccess?.(
        result.message || "Đặt lại mật khẩu Hội viên thành công",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Đã xảy ra lỗi khi đặt lại mật khẩu Hội viên",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!hoiVien) return;
    const accountText = [
      `Họ và tên: ${hoiVien.hoTen}`,
      `Mã Hội viên: ${hoiVien.maHoiVien}`,
      `Tên đăng nhập: ${hoiVien.username}`,
      `Mật khẩu mới: ${password}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(accountText);
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
      aria-labelledby="reset-password-title"
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
              <KeyRound size={21} />
            </div>

            <div className="min-w-0">
              <h2
                id="reset-password-title"
                className="text-lg font-semibold text-slate-900"
              >
                Đặt lại mật khẩu
              </h2>

              <p className="mt-1 truncate text-sm text-slate-600">
                {hoiVien.maHoiVien} - {hoiVien.hoTen}
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
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tên đăng nhập
                </p>

                <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                  {hoiVien.username}
                </p>
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Mật khẩu mới
                  <span className="ml-1 text-red-600">*</span>
                </label>

                <div className="relative">
                  <input
                    id="new-password"
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
                    placeholder="Nhập mật khẩu mới từ 6 ký tự"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-1 top-1/2 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-[#12345B]"
                    aria-label={
                      showPassword
                        ? "Ẩn mật khẩu mới"
                        : "Hiển thị mật khẩu mới"
                    }
                    title={
                      showPassword
                        ? "Ẩn mật khẩu mới"
                        : "Hiển thị mật khẩu mới"
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

              <div>
                <label
                  htmlFor="confirm-new-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Nhập lại mật khẩu mới
                  <span className="ml-1 text-red-600">*</span>
                </label>

                <div className="relative">
                  <input
                    id="confirm-new-password"
                    required
                    minLength={6}
                    maxLength={100}
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setError("");
                    }}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/10"
                    placeholder="Nhập lại mật khẩu mới"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    className="absolute right-1 top-1/2 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-[#12345B]"
                    aria-label={
                      showConfirmPassword
                        ? "Ẩn mật khẩu xác nhận"
                        : "Hiển thị mật khẩu xác nhận"
                    }
                    title={
                      showConfirmPassword
                        ? "Ẩn mật khẩu xác nhận"
                        : "Hiển thị mật khẩu xác nhận"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Mật khẩu cũ sẽ không còn sử dụng được sau khi đặt lại. Nếu Hội
                viên đang ở trạng thái tạm ngừng, tài khoản vẫn chưa thể đăng
                nhập cho đến khi được kích hoạt lại.
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
                {submitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="px-5 py-5 sm:px-6">
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-700"
                />

                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Đặt lại mật khẩu thành công
                  </p>

                  <p className="mt-1 text-sm leading-6 text-emerald-700">
                    Hãy sao chép và bàn giao thông tin đăng nhập cho Hội viên
                    trước khi đóng cửa sổ.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[130px_minmax(0,1fr)] border-b border-slate-200">
                  <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                    Họ và tên
                  </div>

                  <div className="break-words px-4 py-3 text-sm font-medium text-slate-900">
                    {hoiVien.hoTen}
                  </div>
                </div>

                <div className="grid grid-cols-[130px_minmax(0,1fr)] border-b border-slate-200">
                  <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                    Tên đăng nhập
                  </div>

                  <div className="break-all px-4 py-3 text-sm font-semibold text-[#12345B]">
                    {hoiVien.username}
                  </div>
                </div>

                <div className="grid grid-cols-[130px_minmax(0,1fr)]">
                  <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                    Mật khẩu mới
                  </div>

                  <div className="break-all px-4 py-3 text-sm font-semibold text-slate-900">
                    {password}
                  </div>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Mật khẩu này chỉ hiển thị trong lần đặt lại hiện tại. Sau khi
                đóng cửa sổ, hệ thống không thể đọc lại mật khẩu đã mã hóa.
              </p>
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
                {copied ? "Đã sao chép" : "Sao chép tài khoản"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}