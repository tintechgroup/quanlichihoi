"use client";

import { Award, LoaderCircle, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type XepLoai =
  | "XUAT_SAC"
  | "TOT"
  | "KHA"
  | "TRUNG_BINH"
  | "YEU";

type DanhGiaHoiVien = {
  _id: string;
  hoiVienId: string;
  xepLoai: XepLoai;
  nhanXet?: string;
  nguoiDanhGiaId: string;
  createdAt: string;
  updatedAt: string;
};

type DanhGiaHoiVienModalProps = {
  hoiVienId: string;
  maHoiVien: string;
  hoTen: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

const inputClassName =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/10";

export default function DanhGiaHoiVienModal({
  hoiVienId,
  maHoiVien,
  hoTen,
  onClose,
  onSuccess,
}: DanhGiaHoiVienModalProps) {
  const [xepLoai, setXepLoai] = useState<XepLoai>("XUAT_SAC");
  const [nhanXet, setNhanXet] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDanhGia() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(
          `/api/hoi-vien/${hoiVienId}/danh-gia`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Không thể lấy đánh giá Hội viên",
          );
        }

        const danhGia = result.data as DanhGiaHoiVien | null;

        if (isMounted && danhGia) {
          setXepLoai(danhGia.xepLoai);
          setNhanXet(danhGia.nhanXet || "");
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể kết nối đến hệ thống",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDanhGia();

    return () => {
      isMounted = false;
    };
  }, [hoiVienId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!xepLoai) {
      setError("Vui lòng chọn xếp loại Hội viên");
      return;
    }

    if (nhanXet.trim().length > 1000) {
      setError("Nội dung nhận xét không được vượt quá 1000 ký tự");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(
        `/api/hoi-vien/${hoiVienId}/danh-gia`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            xepLoai,
            nhanXet: nhanXet.trim(),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Không thể lưu đánh giá Hội viên",
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
      aria-labelledby="danh-gia-hoi-vien-title"
    >
      <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Award size={21} />
            </div>

            <div className="min-w-0">
              <h2
                id="danh-gia-hoi-vien-title"
                className="text-lg font-bold text-slate-900"
              >
                Đánh giá Hội viên
              </h2>

              <p className="mt-1 truncate text-sm text-slate-500">
                {maHoiVien} - {hoTen}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng cửa sổ đánh giá"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={21} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 py-10">
            <LoaderCircle
              size={28}
              className="animate-spin text-[#12345B]"
            />
            <p className="text-sm text-slate-500">
              Đang tải thông tin đánh giá...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 px-4 py-5 sm:px-6">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">
                  Xếp loại <span className="text-red-600">*</span>
                </span>

                <select
                  value={xepLoai}
                  onChange={(event) =>
                    setXepLoai(event.target.value as XepLoai)
                  }
                  className={inputClassName}
                  disabled={isSubmitting}
                >
                  <option value="XUAT_SAC">Xuất sắc</option>
                  <option value="TOT">Tốt</option>
                  <option value="KHA">Khá</option>
                  <option value="TRUNG_BINH">Trung bình</option>
                  <option value="YEU">Yếu</option>
                </select>
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-800">
                    Nhận xét
                  </span>

                  <span
                    className={
                      nhanXet.length > 1000
                        ? "text-xs font-medium text-red-600"
                        : "text-xs text-slate-500"
                    }
                  >
                    {nhanXet.length}/1000
                  </span>
                </div>

                <textarea
                  value={nhanXet}
                  onChange={(event) => setNhanXet(event.target.value)}
                  placeholder="Nhập nội dung nhận xét về Hội viên"
                  rows={6}
                  maxLength={1000}
                  disabled={isSubmitting}
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/10 disabled:bg-slate-100"
                />
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
                Đóng
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#12345B] px-5 text-sm font-semibold text-white transition hover:bg-[#0C2949] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && (
                  <LoaderCircle size={17} className="animate-spin" />
                )}

                {isSubmitting ? "Đang lưu..." : "Lưu đánh giá"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}