"use client";

import {
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

type CapTaiKhoanHoiVienModalProps = {
  hoiVienId: string;
  maHoiVien: string;
  hoTen: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

const inputClassName =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/10";

function createDefaultUsername(maHoiVien: string) {
  return maHoiVien
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "");
}

export default function CapTaiKhoanHoiVienModal({
  hoiVienId,
  maHoiVien,
  hoTen,
  onClose,
  onSuccess,
}: CapTaiKhoanHoiVienModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset editable modal state when the selected record or open state changes.
    setUsername(createDefaultUsername(maHoiVien));
  }, [maHoiVien]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedUsername = username.trim().toLowerCase();

    if (!normalizedUsername) {
      setError("Vui lòng nhập tên đăng nhập");
      return;
    }

    if (normalizedUsername.length < 4) {
      setError("Tên đăng nhập phải có ít nhất 4 ký tự");
      return;
    }

    if (!/^[a-z0-9._]+$/.test(normalizedUsername)) {
      setError(
        "Tên đăng nhập chỉ được chứa chữ thường không dấu, số, dấu chấm và dấu gạch dưới",
      );
      return;
    }

    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(
        `/api/hoi-vien/${hoiVienId}/cap-tai-khoan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: normalizedUsername,
            password,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Không thể cấp tài khoản Hội viên",
        );
      }

      await onSuccess();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể kết nối đến hệ thống",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cap-tai-khoan-title"
    >
      <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#12345B]">
              <KeyRound size={21} />
            </div>

            <div className="min-w-0">
              <h2
                id="cap-tai-khoan-title"
                className="text-lg font-bold text-slate-900"
              >
                Cấp tài khoản Hội viên
              </h2>

              <p className="mt-1 break-words text-sm text-slate-500">
                {maHoiVien} - {hoTen}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng cửa sổ"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={21} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-4 py-5 sm:px-6">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
              Tài khoản được cấp sẽ có vai trò Hội viên và thuộc
              Chi hội hiện tại của Hội viên.
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Tên đăng nhập{" "}
                <span className="text-red-600">*</span>
              </span>

              <input
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                      .toLowerCase()
                      .replace(/\s/g, ""),
                  )
                }
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
                disabled={isSubmitting}
                maxLength={50}
                className={inputClassName}
              />

              <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                Chỉ sử dụng chữ thường không dấu, số, dấu chấm
                và dấu gạch dưới.
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Mật khẩu <span className="text-red-600">*</span>
              </span>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Nhập mật khẩu"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  maxLength={100}
                  className={`${inputClassName} pr-11`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword
                      ? "Ẩn mật khẩu"
                      : "Hiện mật khẩu"
                  }
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover hover:bg-slate-100 hover:text-slate-800"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              <span className="mt-1.5 block text-xs text-slate-500">
                Mật khẩu phải có ít nhất 6 ký tự.
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Xác nhận mật khẩu{" "}
                <span className="text-red-600">*</span>
              </span>

              <div className="relative">
                <input
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  maxLength={100}
                  className={`${inputClassName} pr-11`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current,
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Ẩn mật khẩu xác nhận"
                      : "Hiện mật khẩu xác nhận"
                  }
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </label>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#12345B] px-5 text-sm font-semibold text-white transition hover:bg-[#0C2949] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <LoaderCircle size={18} className="animate-spin" />
              )}

              {isSubmitting
                ? "Đang cấp tài khoản..."
                : "Cấp tài khoản"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}