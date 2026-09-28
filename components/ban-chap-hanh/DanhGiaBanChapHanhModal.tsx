"use client";

import {
  Award,
  CheckCircle2,
  Loader2,
  UserCog,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";

type HoiVienRef = {
  _id: string;
  maHoiVien?: string;
  hoTen?: string;
};

type DanhGiaRef = {
  _id?: string;
  xepLoai?: string;
  nhanXet?: string;
};

type BanChapHanhRef = {
  _id: string;
  maBanChapHanh?: string;
  chucVu?: string;
  nhiemKy?: string;
  hoiVienId?: HoiVienRef | string | null;
  danhGia?: DanhGiaRef | null;
};

type Props = {
  isOpen: boolean;
  banChapHanh: BanChapHanhRef | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

type RatingValue =
  | "XUAT_SAC"
  | "TOT"
  | "KHA"
  | "TRUNG_BINH"
  | "YEU";

type RatingOption = {
  value: RatingValue;
  label: string;
  description: string;
  color: string;
};

const RATING_OPTIONS: RatingOption[] = [
  {
    value: "XUAT_SAC",
    label: "Xuất sắc",
    description:
      "Hoàn thành xuất sắc nhiệm vụ và có đóng góp nổi bật.",
    color:
      "border-violet-200 bg-violet-50 text-violet-700",
  },
  {
    value: "TOT",
    label: "Tốt",
    description:
      "Hoàn thành tốt nhiệm vụ và tham gia tích cực.",
    color:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    value: "KHA",
    label: "Khá",
    description:
      "Hoàn thành phần lớn các nhiệm vụ được giao.",
    color:
      "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    value: "TRUNG_BINH",
    label: "Trung bình",
    description:
      "Hoàn thành nhiệm vụ ở mức cơ bản.",
    color:
      "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    value: "YEU",
    label: "Yếu",
    description:
      "Chưa hoàn thành đầy đủ nhiệm vụ được giao.",
    color:
      "border-red-200 bg-red-50 text-red-700",
  },
];

function getHoiVien(
  banChapHanh: BanChapHanhRef | null
) {
  if (
    banChapHanh?.hoiVienId &&
    typeof banChapHanh.hoiVienId === "object"
  ) {
    return banChapHanh.hoiVienId;
  }

  return null;
}

function normalizeRating(
  value?: string
): RatingValue | "" {
  if (!value) {
    return "";
  }

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[\s-]+/g, "_")
    .toUpperCase()
    .trim();

  if (
    normalized === "XUAT_SAC" ||
    normalized === "XUATSAC"
  ) {
    return "XUAT_SAC";
  }

  if (normalized === "TOT") {
    return "TOT";
  }

  if (normalized === "KHA") {
    return "KHA";
  }

  if (
    normalized === "TRUNG_BINH" ||
    normalized === "TRUNGBINH"
  ) {
    return "TRUNG_BINH";
  }

  if (normalized === "YEU") {
    return "YEU";
  }

  return "";
}

export default function DanhGiaBanChapHanhModal({
  isOpen,
  banChapHanh,
  onClose,
  onSuccess,
}: Props) {
  const [xepLoai, setXepLoai] =
    useState<RatingValue | "">("");

  const [nhanXet, setNhanXet] = useState("");
  const [loadingDetail, setLoadingDetail] =
    useState(false);
  const [submitting, setSubmitting] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  const hoiVien = useMemo(
    () => getHoiVien(banChapHanh),
    [banChapHanh]
  );

  const selectedRating = useMemo(
    () =>
      RATING_OPTIONS.find(
        (option) => option.value === xepLoai
      ) || null,
    [xepLoai]
  );

  useEffect(() => {
    if (!isOpen || !banChapHanh) {
      return;
    }

    const controller = new AbortController();
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset editable modal state when the selected record or open state changes.
    setXepLoai(
      normalizeRating(
        banChapHanh.danhGia?.xepLoai
      )
    );

    setNhanXet(
      banChapHanh.danhGia?.nhanXet || ""
    );

    setErrorMessage("");
    setSubmitting(false);

    async function loadExistingEvaluation() {
      if (!banChapHanh) return;
      try {
        setLoadingDetail(true);

        const response = await fetch(
          `/api/ban-chap-hanh/${banChapHanh._id}/danh-gia`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response
          .json()
          .catch(() => null);

        if (response.status === 404) {
          return;
        }

        if (!response.ok) {
          throw new Error(
            result?.message ||
              "Không thể tải thông tin đánh giá"
          );
        }

        const evaluation =
          result?.data?.danhGia ||
          result?.data ||
          null;

        if (evaluation) {
          setXepLoai(
            normalizeRating(
              evaluation.xepLoai
            )
          );

          setNhanXet(
            typeof evaluation.nhanXet ===
              "string"
              ? evaluation.nhanXet
              : ""
          );
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không thể tải thông tin đánh giá"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingDetail(false);
        }
      }
    }

    void loadExistingEvaluation();

    return () => {
      controller.abort();

      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen, banChapHanh]);

  if (!isOpen || !banChapHanh) {
    return null;
  }

  function handleClose() {
    if (submitting) {
      return;
    }

    setErrorMessage("");
    onClose();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    if (!banChapHanh) return;
    event.preventDefault();

    if (!xepLoai) {
      setErrorMessage(
        "Vui lòng chọn mức xếp loại"
      );
      return;
    }

    if (nhanXet.trim().length > 1000) {
      setErrorMessage(
        "Nhận xét không được vượt quá 1.000 ký tự"
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const response = await fetch(
        `/api/ban-chap-hanh/${banChapHanh._id}/danh-gia`,
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

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Không thể lưu đánh giá Ban Chấp hành"
        );
      }

      onSuccess?.(
        result?.message ||
          "Đánh giá Ban Chấp hành thành công"
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi lưu đánh giá"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="danh-gia-bch-title"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          handleClose();
        }
      }}
    >
      <div
        className="max-h-[96vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-4xl sm:rounded-xl"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <Award size={22} />
            </div>

            <div className="min-w-0">
              <h2
                id="danh-gia-bch-title"
                className="text-lg font-bold text-slate-950"
              >
                {banChapHanh.danhGia
                  ? "Cập nhật đánh giá Ban Chấp hành"
                  : "Đánh giá Ban Chấp hành"}
              </h2>

              <p className="mt-1 truncate text-sm text-slate-500">
                Đánh giá hiệu quả công tác và mức độ
                hoàn thành nhiệm vụ.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Đóng cửa sổ"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r lg:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#173d67] text-white">
                  <UserCog size={23} />
                </div>

                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">
                    {hoiVien?.hoTen ||
                      "Không xác định"}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {hoiVien?.maHoiVien ||
                      "Chưa có mã Hội viên"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
                <InformationItem
                  label="Mã Ban Chấp hành"
                  value={
                    banChapHanh.maBanChapHanh ||
                    "Không xác định"
                  }
                />

                <InformationItem
                  label="Chức vụ"
                  value={
                    banChapHanh.chucVu ||
                    "Không xác định"
                  }
                />

                <InformationItem
                  label="Nhiệm kỳ"
                  value={
                    banChapHanh.nhiemKy ||
                    "Không xác định"
                  }
                />

                <InformationItem
                  label="Đánh giá hiện tại"
                  value={
                    banChapHanh.danhGia?.xepLoai
                      ? RATING_OPTIONS.find(
                          (option) =>
                            option.value ===
                            normalizeRating(
                              banChapHanh.danhGia
                                ?.xepLoai
                            )
                        )?.label ||
                        banChapHanh.danhGia
                          .xepLoai
                      : "Chưa đánh giá"
                  }
                />
              </div>
            </aside>

            <section className="p-5 sm:p-6">
              {loadingDetail ? (
                <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-slate-600">
                  <Loader2
                    size={20}
                    className="animate-spin text-[#173d67]"
                  />
                  Đang tải thông tin đánh giá...
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="xep-loai-bch"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Xếp loại
                      <span className="ml-1 text-red-600">
                        *
                      </span>
                    </label>

                    <select
                      id="xep-loai-bch"
                      value={xepLoai}
                      onChange={(event) => {
                        setXepLoai(
                          event.target
                            .value as RatingValue | ""
                        );

                        setErrorMessage("");
                      }}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#173d67] focus:ring-2 focus:ring-[#173d67]/10"
                    >
                      <option value="">
                        Chọn mức xếp loại
                      </option>

                      {RATING_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>

                    {selectedRating && (
                      <div
                        className={`mt-3 flex items-start gap-3 rounded-lg border px-4 py-3 ${selectedRating.color}`}
                      >
                        <CheckCircle2
                          size={19}
                          className="mt-0.5 shrink-0"
                        />

                        <div>
                          <p className="text-sm font-bold">
                            {selectedRating.label}
                          </p>

                          <p className="mt-1 text-xs leading-5 opacity-90">
                            {
                              selectedRating.description
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label
                        htmlFor="nhan-xet-bch"
                        className="text-sm font-semibold text-slate-700"
                      >
                        Nhận xét
                      </label>

                      <span
                        className={`text-xs ${
                          nhanXet.length > 1000
                            ? "font-semibold text-red-600"
                            : "text-slate-500"
                        }`}
                      >
                        {nhanXet.length}/1000
                      </span>
                    </div>

                    <textarea
                      id="nhan-xet-bch"
                      value={nhanXet}
                      onChange={(event) => {
                        setNhanXet(
                          event.target.value
                        );

                        setErrorMessage("");
                      }}
                      rows={7}
                      maxLength={1000}
                      placeholder="Nhập nhận xét về hiệu quả công tác, tinh thần trách nhiệm và mức độ hoàn thành nhiệm vụ..."
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#173d67] focus:ring-2 focus:ring-[#173d67]/10"
                    />
                  </div>

                  {errorMessage && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                    >
                      {errorMessage}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="h-11 rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Đóng
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingDetail ||
                !xepLoai
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#153b66] px-6 text-sm font-semibold text-white transition hover:bg-[#0f2f53] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Award size={18} />
                  Lưu đánh giá
                </>
              )}
            </button>
          </div>
        </form>
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
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-semibold leading-5 text-slate-900">
        {value}
      </p>
    </div>
  );
}