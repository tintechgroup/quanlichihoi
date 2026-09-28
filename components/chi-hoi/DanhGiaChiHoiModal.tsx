"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  Award,
  CheckCircle2,
  LoaderCircle,
  X,
} from "lucide-react";

type XepLoai =
  | ""
  | "XUAT_SAC"
  | "TOT"
  | "KHA"
  | "TRUNG_BINH"
  | "YEU";

type ChiHoi = {
  _id: string;
  maChiHoi: string;
  tenChiHoi: string;
};

type NguoiDanhGia = {
  _id: string;
  fullName: string;
  username: string;
};

type DanhGia = {
  _id: string;
  chiHoiId: string;
  xepLoai: Exclude<XepLoai, "">;
  nhanXet: string;
  nguoiDanhGiaId?: NguoiDanhGia;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  chiHoi: ChiHoi;
  onClose: () => void;
  onSaved: () => void;
};

const ratingOptions = [
  {
    value: "XUAT_SAC",
    label: "Xuất sắc",
  },
  {
    value: "TOT",
    label: "Tốt",
  },
  {
    value: "KHA",
    label: "Khá",
  },
  {
    value: "TRUNG_BINH",
    label: "Trung bình",
  },
  {
    value: "YEU",
    label: "Yếu",
  },
];

export default function DanhGiaChiHoiModal({
  chiHoi,
  onClose,
  onSaved,
}: Props) {
  const [xepLoai, setXepLoai] = useState<XepLoai>("");
  const [nhanXet, setNhanXet] = useState("");

  const [currentEvaluation, setCurrentEvaluation] =
    useState<DanhGia | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEvaluation() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/chi-hoi/${chiHoi._id}/danh-gia`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setError(
            result.message ||
              "Không thể tải đánh giá Chi hội"
          );
          return;
        }

        if (result.data) {
          const evaluation: DanhGia = result.data;

          setCurrentEvaluation(evaluation);
          setXepLoai(evaluation.xepLoai);
          setNhanXet(evaluation.nhanXet || "");
        }
      } catch {
        if (!cancelled) {
          setError("Không thể kết nối đến hệ thống");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadEvaluation();

    return () => {
      cancelled = true;
    };
  }, [chiHoi._id]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!xepLoai) {
      setError("Vui lòng chọn mức xếp loại");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `/api/chi-hoi/${chiHoi._id}/danh-gia`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            xepLoai,
            nhanXet: nhanXet.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Không thể lưu đánh giá Chi hội"
        );
        return;
      }

      setCurrentEvaluation(result.data);
      setSuccess("Đánh giá Chi hội thành công");
      onSaved();
    } catch {
      setError("Không thể kết nối đến hệ thống");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(value?: string) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Đóng biểu mẫu đánh giá"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-2xl sm:max-w-xl sm:rounded-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
              <Award size={21} />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">
                Đánh giá Chi hội
              </h2>

              <p className="mt-1 break-words text-sm text-slate-500">
                {chiHoi.maChiHoi} – {chiHoi.tenChiHoi}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            disabled={submitting}
            className="shrink-0 rounded-md p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center p-6">
            <div className="text-center">
              <LoaderCircle
                size={30}
                className="mx-auto animate-spin text-[#12345B]"
              />

              <p className="mt-3 text-sm text-slate-500">
                Đang tải đánh giá...
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 p-5 sm:p-6"
          >
            {currentEvaluation && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">
                  Đánh giá hiện tại
                </p>

                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-slate-500">
                      Người đánh giá
                    </p>

                    <p className="mt-1 font-medium text-slate-800">
                      {currentEvaluation.nguoiDanhGiaId
                        ?.fullName || "Quản trị viên"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">
                      Cập nhật gần nhất
                    </p>

                    <p className="mt-1 font-medium text-slate-800">
                      {formatDate(currentEvaluation.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="xepLoai"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Xếp loại
                <span className="ml-1 text-red-600">*</span>
              </label>

              <select
                id="xepLoai"
                value={xepLoai}
                onChange={(event) =>
                  setXepLoai(event.target.value as XepLoai)
                }
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/15"
                required
              >
                <option value="">Chọn mức xếp loại</option>

                {ratingOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="nhanXet"
                  className="text-sm font-semibold text-slate-800"
                >
                  Nhận xét
                </label>

                <span className="text-xs text-slate-500">
                  {nhanXet.length}/1000
                </span>
              </div>

              <textarea
                id="nhanXet"
                value={nhanXet}
                onChange={(event) =>
                  setNhanXet(event.target.value)
                }
                placeholder="Nhập nội dung nhận xét"
                rows={5}
                maxLength={1000}
                className="w-full resize-none rounded-md border border-slate-300 px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/15"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <span>{success}</span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="h-11 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Đóng
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#12345B] px-5 text-sm font-semibold text-white hover:bg-[#0C2949] disabled:opacity-50"
              >
                {submitting && (
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                )}

                {submitting
                  ? "Đang lưu..."
                  : currentEvaluation
                    ? "Cập nhật đánh giá"
                    : "Lưu đánh giá"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}