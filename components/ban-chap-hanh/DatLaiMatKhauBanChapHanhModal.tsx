"use client";

import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type TaiKhoanRef = {
  _id: string;
  username: string;
  role?: string;
  isActive?: boolean;
};

type HoiVienRef = {
  _id: string;
  maHoiVien?: string;
  hoTen?: string;
  taiKhoanId?: TaiKhoanRef | string | null;
};

export type BanChapHanhResetPassword = {
  _id: string;
  maBanChapHanh?: string;
  chucVu?: string;
  hoiVienId?: HoiVienRef | string | null;
  taiKhoanId?: TaiKhoanRef | string | null;
};

type Props = {
  isOpen: boolean;
  banChapHanh: BanChapHanhResetPassword | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

type ResetResult = {
  username: string;
  password: string;
  fullName: string;
};

function getHoiVien(
  banChapHanh: BanChapHanhResetPassword | null
) {
  if (
    banChapHanh?.hoiVienId &&
    typeof banChapHanh.hoiVienId === "object"
  ) {
    return banChapHanh.hoiVienId;
  }

  return null;
}

function getTaiKhoan(
  banChapHanh: BanChapHanhResetPassword | null
) {
  if (
    banChapHanh?.taiKhoanId &&
    typeof banChapHanh.taiKhoanId === "object"
  ) {
    return banChapHanh.taiKhoanId;
  }

  const hoiVien = getHoiVien(banChapHanh);

  if (
    hoiVien?.taiKhoanId &&
    typeof hoiVien.taiKhoanId === "object"
  ) {
    return hoiVien.taiKhoanId;
  }

  return null;
}

function generateRandomPassword() {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "@#$%";
  const allCharacters =
    uppercase + lowercase + numbers + symbols;

  const randomIndex = (length: number) => {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % length;
  };

  const characters = [
    uppercase[randomIndex(uppercase.length)],
    lowercase[randomIndex(lowercase.length)],
    numbers[randomIndex(numbers.length)],
    symbols[randomIndex(symbols.length)],
  ];

  while (characters.length < 12) {
    characters.push(
      allCharacters[randomIndex(allCharacters.length)]
    );
  }

  for (let index = characters.length - 1; index > 0; index--) {
    const targetIndex = randomIndex(index + 1);

    [characters[index], characters[targetIndex]] = [
      characters[targetIndex],
      characters[index],
    ];
  }

  return characters.join("");
}

export default function DatLaiMatKhauBanChapHanhModal({
  isOpen,
  banChapHanh,
  onClose,
  onSuccess,
}: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<ResetResult | null>(
    null
  );

  const hoiVien = useMemo(
    () => getHoiVien(banChapHanh),
    [banChapHanh]
  );

  const taiKhoan = useMemo(
    () => getTaiKhoan(banChapHanh),
    [banChapHanh]
  );

  useEffect(() => {
    if (!isOpen) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset editable modal state when the selected record or open state changes.
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setSubmitting(false);
    setCopied(false);
    setErrorMessage("");
    setResult(null);
  }, [isOpen, banChapHanh?._id]);

  if (!isOpen || !banChapHanh) {
    return null;
  }

  function handleGeneratePassword() {
    const generatedPassword = generateRandomPassword();

    setPassword(generatedPassword);
    setConfirmPassword(generatedPassword);
    setShowPassword(true);
    setErrorMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    if (!banChapHanh) return;
    event.preventDefault();

    if (!taiKhoan) {
      setErrorMessage(
        "Thành viên Ban Chấp hành chưa được cấp tài khoản"
      );
      return;
    }

    if (!password) {
      setErrorMessage("Vui lòng nhập mật khẩu mới");
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "Mật khẩu mới phải có ít nhất 6 ký tự"
      );
      return;
    }

    if (password.length > 100) {
      setErrorMessage(
        "Mật khẩu mới không được vượt quá 100 ký tự"
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn đặt lại mật khẩu cho tài khoản "${taiKhoan.username}" không?`
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setErrorMessage("");

      const response = await fetch(
        `/api/ban-chap-hanh/${banChapHanh._id}/dat-lai-mat-khau`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
            confirmPassword,
          }),
        }
      );

      const responseData = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
            "Không thể đặt lại mật khẩu"
        );
      }

      const username =
        responseData?.data?.username ||
        taiKhoan.username;

      const fullName =
        responseData?.data?.fullName ||
        hoiVien?.hoTen ||
        "Thành viên Ban Chấp hành";

      setResult({
        username,
        password,
        fullName,
      });

      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);

      onSuccess?.(
        responseData?.message ||
          "Đặt lại mật khẩu Ban Chấp hành thành công"
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi đặt lại mật khẩu"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyAccount() {
    if (!result) return;

    const content = [
      "THÔNG TIN TÀI KHOẢN BAN CHẤP HÀNH",
      `Họ và tên: ${result.fullName}`,
      `Tên đăng nhập: ${result.username}`,
      `Mật khẩu mới: ${result.password}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setErrorMessage(
        "Không thể tự động sao chép. Vui lòng sao chép thủ công."
      );
    }
  }

  function handleClose() {
    if (submitting) return;

    if (result) {
      const confirmed = window.confirm(
        "Mật khẩu mới chỉ hiển thị một lần. Bạn đã sao chép hoặc bàn giao thông tin tài khoản chưa?"
      );

      if (!confirmed) return;
    }

    setResult(null);
    setPassword("");
    setConfirmPassword("");
    setErrorMessage("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-bch-password-title"
    >
      <div className="max-h-[96vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <KeyRound size={21} />
            </div>

            <div className="min-w-0">
              <h2
                id="reset-bch-password-title"
                className="text-lg font-bold text-slate-950"
              >
                Đặt lại mật khẩu
              </h2>

              <p className="mt-1 truncate text-sm text-slate-500">
                {banChapHanh.maBanChapHanh || "Ban Chấp hành"}
                {" - "}
                {hoiVien?.hoTen || "Không xác định"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Đóng"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {result ? (
          <div className="p-5 sm:p-6">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={19} />
                </div>

                <div>
                  <h3 className="font-bold text-emerald-900">
                    Đặt lại mật khẩu thành công
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    Hãy sao chép và bàn giao thông tin này cho
                    thành viên Ban Chấp hành.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              <AccountRow
                label="Họ và tên"
                value={result.fullName}
              />

              <AccountRow
                label="Tên đăng nhập"
                value={result.username}
              />

              <AccountRow
                label="Mật khẩu mới"
                value={result.password}
                important
              />
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <ShieldAlert
                size={20}
                className="mt-0.5 shrink-0"
              />

              <p>
                Mật khẩu này chỉ hiển thị một lần. Sau khi đóng
                cửa sổ, hệ thống không thể xem lại mật khẩu hiện
                tại vì mật khẩu đã được mã hóa.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hoàn tất
              </button>

              <button
                type="button"
                onClick={() => void handleCopyAccount()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#153b66] px-5 text-sm font-semibold text-white transition hover:bg-[#0f2f53]"
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    Đã sao chép
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Sao chép tài khoản
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <InformationItem
                  label="Họ và tên"
                  value={hoiVien?.hoTen || "Không xác định"}
                />

                <InformationItem
                  label="Chức vụ"
                  value={
                    banChapHanh.chucVu || "Không xác định"
                  }
                />

                <InformationItem
                  label="Tên đăng nhập"
                  value={taiKhoan?.username || "Chưa cấp"}
                />

                <InformationItem
                  label="Trạng thái tài khoản"
                  value={
                    taiKhoan
                      ? taiKhoan.isActive === false
                        ? "Đang bị khóa"
                        : "Đang hoạt động"
                      : "Chưa có tài khoản"
                  }
                />
              </div>

              {!taiKhoan ? (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  <ShieldAlert
                    size={20}
                    className="mt-0.5 shrink-0"
                  />

                  <p>
                    Thành viên này chưa được cấp tài khoản. Hãy
                    sử dụng nút <strong>Cấp tài khoản</strong>{" "}
                    trước khi đặt lại mật khẩu.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label
                        htmlFor="bch-new-password"
                        className="text-sm font-semibold text-slate-700"
                      >
                        Mật khẩu mới
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#173d67] hover:underline"
                      >
                        <RefreshCw size={14} />
                        Tạo mật khẩu
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        id="bch-new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setErrorMessage("");
                        }}
                        autoComplete="new-password"
                        placeholder="Nhập mật khẩu mới"
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#173d67] focus:ring-2 focus:ring-[#173d67]/10"
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    <p className="mt-1.5 text-xs text-slate-500">
                      Mật khẩu phải có ít nhất 6 ký tự.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="bch-confirm-password"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Xác nhận mật khẩu
                      <span className="ml-1 text-red-600">*</span>
                    </label>

                    <div className="relative">
                      <input
                        id="bch-confirm-password"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          setErrorMessage("");
                        }}
                        autoComplete="new-password"
                        placeholder="Nhập lại mật khẩu mới"
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#173d67] focus:ring-2 focus:ring-[#173d67]/10"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (current) => !current
                          )
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Ẩn mật khẩu xác nhận"
                            : "Hiện mật khẩu xác nhận"
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Đóng
              </button>

              <button
                type="submit"
                disabled={submitting || !taiKhoan}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#153b66] px-5 text-sm font-semibold text-white transition hover:bg-[#0f2f53] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <KeyRound size={18} />
                    Đặt lại mật khẩu
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function InformationItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function AccountRow({
  label,
  value,
  important = false,
}: {
  label: string;
  value: string;
  important?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:grid-cols-[150px_1fr] sm:items-center">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`break-all font-semibold ${
          important
            ? "font-mono text-base text-red-700"
            : "text-sm text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}