"use client";

import {
  LoaderCircle,
  Power,
  RotateCcw,
  X,
} from "lucide-react";
import { useState } from "react";

type TrangThaiHoiVien =
  | "DANG_HOAT_DONG"
  | "TAM_NGUNG";

type TrangThaiHoiVienActionProps = {
  hoiVienId: string;
  maHoiVien: string;
  hoTen: string;
  trangThai: TrangThaiHoiVien;
  daCoTaiKhoan: boolean;
  onSuccess: (
    message: string,
  ) => void | Promise<void>;
  compact?: boolean;
};

export default function TrangThaiHoiVienAction({
  hoiVienId,
  maHoiVien,
  hoTen,
  trangThai,
  daCoTaiKhoan,
  onSuccess,
  compact = false,
}: TrangThaiHoiVienActionProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const dangHoatDong = trangThai === "DANG_HOAT_DONG";

  const trangThaiMoi: TrangThaiHoiVien = dangHoatDong
    ? "TAM_NGUNG"
    : "DANG_HOAT_DONG";

  function openConfirmModal() {
    setError("");
    setShowConfirm(true);
  }

  function closeConfirmModal() {
    if (isSubmitting) {
      return;
    }

    setError("");
    setShowConfirm(false);
  }

  async function handleUpdateTrangThai() {
    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(
        `/api/hoi-vien/${hoiVienId}/trang-thai`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trangThai: trangThaiMoi,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Không thể cập nhật trạng thái Hội viên",
        );
      }

      setShowConfirm(false);
      await onSuccess(result.message);
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
    <>
      {compact ? (
        <button
          type="button"
          onClick={openConfirmModal}
          title={
            dangHoatDong
              ? "Ngừng hoạt động Hội viên"
              : "Mở lại hoạt động Hội viên"
          }
          aria-label={
            dangHoatDong
              ? `Ngừng hoạt động Hội viên ${hoTen}`
              : `Mở lại hoạt động Hội viên ${hoTen}`
          }
          className={
            dangHoatDong
              ? "rounded-lg p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-700"
              : "rounded-lg p-2 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
          }
        >
          {dangHoatDong ? (
            <Power size={18} />
          ) : (
            <RotateCcw size={18} />
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={openConfirmModal}
          className={
            dangHoatDong
              ? "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 sm:w-auto"
              : "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 sm:w-auto"
          }
        >
          {dangHoatDong ? (
            <>
              <Power size={17} />
              Ngừng hoạt động
            </>
          ) : (
            <>
              <RotateCcw size={17} />
              Mở lại hoạt động
            </>
          )}
        </button>
      )}

      {showConfirm && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trang-thai-hoi-vien-title"
        >
          <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={
                    dangHoatDong
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700"
                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"
                  }
                >
                  {dangHoatDong ? (
                    <Power size={20} />
                  ) : (
                    <RotateCcw size={20} />
                  )}
                </div>

                <div className="min-w-0">
                  <h2
                    id="trang-thai-hoi-vien-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    {dangHoatDong
                      ? "Ngừng hoạt động Hội viên"
                      : "Mở lại hoạt động Hội viên"}
                  </h2>

                  <p className="mt-1 break-words text-sm text-slate-500">
                    {maHoiVien} - {hoTen}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={isSubmitting}
                aria-label="Đóng"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={21} />
              </button>
            </div>

            <div className="space-y-4 px-4 py-5 sm:px-6">
              {dangHoatDong ? (
                <>
                  <p className="text-sm leading-6 text-slate-700">
                    Bạn có chắc chắn muốn ngừng hoạt động Hội viên{" "}
                    <strong>{hoTen}</strong>?
                  </p>

                  {daCoTaiKhoan ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                      Tài khoản đăng nhập của Hội viên sẽ bị khóa.
                      Hội viên sẽ không thể đăng nhập cho đến khi
                      được mở lại hoạt động.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
                      Hội viên chưa được cấp tài khoản. Hệ thống chỉ
                      cập nhật trạng thái hồ sơ thành tạm ngừng.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm leading-6 text-slate-700">
                    Bạn có chắc chắn muốn mở lại hoạt động cho Hội
                    viên <strong>{hoTen}</strong>?
                  </p>

                  {daCoTaiKhoan ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                      Tài khoản đăng nhập sẽ được kích hoạt lại. Hội
                      viên có thể tiếp tục đăng nhập vào hệ thống.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-700">
                      Hồ sơ Hội viên sẽ được chuyển sang trạng thái
                      đang hoạt động.
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={isSubmitting}
                className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() => void handleUpdateTrangThai()}
                disabled={isSubmitting}
                className={
                  dangHoatDong
                    ? "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                    : "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                }
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                    Đang xử lý...
                  </>
                ) : dangHoatDong ? (
                  <>
                    <Power size={17} />
                    Ngừng hoạt động
                  </>
                ) : (
                  <>
                    <RotateCcw size={17} />
                    Mở lại hoạt động
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}