"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  MessageSquare,
  Star,
} from "lucide-react";

type NhomDanhGia =
  | "GIAO_DIEN"
  | "TINH_NANG"
  | "HIEU_NANG"
  | "DE_XUAT"
  | "KHAC";

type TrangThai =
  | "MOI"
  | "DA_XEM"
  | "DA_GHI_NHAN";

type DanhGia = {
  _id: string;

  nguoiDanhGiaTen: string;

  soSao: number;

  nhom: NhomDanhGia;

  noiDung: string;

  trangThai: TrangThai;

  phanHoiQuanTri?: string;

  nguoiPhanHoiTen?: string;

  ngayPhanHoi?: string;

  createdAt: string;
};

type Summary = {
  tongDanhGia: number;

  diemTrungBinh: number;

  motSao: number;

  haiSao: number;

  baSao: number;

  bonSao: number;

  namSao: number;
};

function formatDateTime(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function groupLabel(
  value: NhomDanhGia,
) {
  switch (value) {
    case "GIAO_DIEN":
      return "Giao diện";

    case "TINH_NANG":
      return "Tính năng";

    case "HIEU_NANG":
      return "Hiệu năng";

    case "DE_XUAT":
      return "Đề xuất";

    default:
      return "Khác";
  }
}

function statusLabel(
  value: TrangThai,
) {
  switch (value) {
    case "MOI":
      return "Mới";

    case "DA_XEM":
      return "Đã xem";

    case "DA_GHI_NHAN":
      return "Đã ghi nhận";

    default:
      return value;
  }
}

function StarRating({
  value,
  onChange,
}: {
  value: number;

  onChange:
    (value: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(
        (star) => (
          <button
            key={star}
            type="button"
            onClick={() =>
              onChange(star)
            }
            className="rounded-lg p-1 transition hover:scale-110"
            aria-label={`${star} sao`}
          >
            <Star
              size={28}
              className={
                star <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300"
              }
            />
          </button>
        ),
      )}
    </div>
  );
}

export default function DanhGiaHeThongPage() {
  const [items, setItems] =
    useState<DanhGia[]>([]);

  const [summary, setSummary] =
    useState<Summary>({
      tongDanhGia: 0,
      diemTrungBinh: 0,
      motSao: 0,
      haiSao: 0,
      baSao: 0,
      bonSao: 0,
      namSao: 0,
    });

  const [canManage, setCanManage] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    processingId,
    setProcessingId,
  ] =
    useState<string | null>(
      null,
    );

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const [soSao, setSoSao] =
    useState(5);

  const [nhom, setNhom] =
    useState<NhomDanhGia>(
      "TINH_NANG",
    );

  const [noiDung, setNoiDung] =
    useState("");

  const [
    filterStar,
    setFilterStar,
  ] = useState("");

  const [
    filterStatus,
    setFilterStatus,
  ] = useState("");

  const [
    responseTexts,
    setResponseTexts,
  ] = useState<
    Record<string, string>
  >({});

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);

        setIsError(false);

        const query =
          new URLSearchParams();

        if (filterStar) {
          query.set(
            "soSao",
            filterStar,
          );
        }

        if (filterStatus) {
          query.set(
            "trangThai",
            filterStatus,
          );
        }

        const url =
          query.toString()
            ? `/api/danh-gia-he-thong?${query.toString()}`
            : "/api/danh-gia-he-thong";

        const response =
          await fetch(url, {
            cache: "no-store",
          });

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Không thể tải đánh giá",
          );
        }

        setItems(
          Array.isArray(
            result.data,
          )
            ? result.data
            : [],
        );

        setSummary({
          tongDanhGia:
            Number(
              result.summary
                ?.tongDanhGia,
            ) || 0,

          diemTrungBinh:
            Number(
              result.summary
                ?.diemTrungBinh,
            ) || 0,

          motSao:
            Number(
              result.summary
                ?.motSao,
            ) || 0,

          haiSao:
            Number(
              result.summary
                ?.haiSao,
            ) || 0,

          baSao:
            Number(
              result.summary
                ?.baSao,
            ) || 0,

          bonSao:
            Number(
              result.summary
                ?.bonSao,
            ) || 0,

          namSao:
            Number(
              result.summary
                ?.namSao,
            ) || 0,
        });

        setCanManage(
          Boolean(
            result.permissions
              ?.canManage,
          ),
        );
      } catch (error) {
        setIsError(true);

        setMessage(
          error instanceof Error
            ? error.message
            : "Không thể tải đánh giá",
        );
      } finally {
        setLoading(false);
      }
    }, [
      filterStar,
      filterStatus,
    ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
    void loadData();
  }, [loadData]);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setSaving(true);

      setMessage("");

      setIsError(false);

      if (!noiDung.trim()) {
        throw new Error(
          "Vui lòng nhập nội dung đánh giá",
        );
      }

      const response =
        await fetch(
          "/api/danh-gia-he-thong",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              soSao,
              nhom,
              noiDung:
                noiDung.trim(),
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
            "Không thể gửi đánh giá",
        );
      }

      setMessage(
        result.message,
      );

      setSoSao(5);

      setNhom(
        "TINH_NANG",
      );

      setNoiDung("");

      await loadData();
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể gửi đánh giá",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateItem(
    id: string,

    trangThai: TrangThai,
  ) {
    try {
      setProcessingId(id);

      setMessage("");

      setIsError(false);

      const response =
        await fetch(
          `/api/danh-gia-he-thong/${id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              trangThai,

              phanHoi:
                responseTexts[id] ||
                "",
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
            "Không thể cập nhật đánh giá",
        );
      }

      setMessage(
        result.message,
      );

      await loadData();
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật",
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
      {/* HEADER */}

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#12345B]">
          Phản hồi hệ thống
        </p>

        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Đánh giá hệ thống
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Gửi đánh giá và đề xuất để
          cải thiện hệ thống quản lý.
        </p>
      </div>

      {/* MESSAGE */}

      {message && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            isError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* SUMMARY */}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Tổng đánh giá
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary.tongDanhGia}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Điểm trung bình
          </p>

          <div className="mt-2 flex items-center gap-2">
            <p className="text-2xl font-bold text-amber-500">
              {summary.diemTrungBinh}
            </p>

            <Star
              size={22}
              className="fill-amber-400 text-amber-400"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Đánh giá 5 sao
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {summary.namSao}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Cần cải thiện
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {summary.motSao +
              summary.haiSao}
          </p>
        </div>
      </div>

      {/* CONTENT */}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* FORM */}

        <form
          onSubmit={
            handleSubmit
          }
          className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Gửi đánh giá
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Chia sẻ trải nghiệm của
            bạn khi sử dụng hệ thống.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Mức độ hài lòng
              </label>

              <StarRating
                value={soSao}
                onChange={
                  setSoSao
                }
              />

              <p className="mt-1 text-xs text-slate-500">
                {soSao}/5 sao
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Nhóm đánh giá
              </label>

              <select
                value={nhom}
                onChange={(
                  event,
                ) =>
                  setNhom(
                    event.target
                      .value as NhomDanhGia,
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="GIAO_DIEN">
                  Giao diện
                </option>

                <option value="TINH_NANG">
                  Tính năng
                </option>

                <option value="HIEU_NANG">
                  Hiệu năng
                </option>

                <option value="DE_XUAT">
                  Đề xuất
                </option>

                <option value="KHAC">
                  Khác
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Nội dung đánh giá
              </label>

              <textarea
                value={noiDung}
                onChange={(
                  event,
                ) =>
                  setNoiDung(
                    event.target.value,
                  )
                }
                rows={7}
                maxLength={3000}
                required
                placeholder="Nhập đánh giá, góp ý hoặc đề xuất..."
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {noiDung.length}/3000
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-[#123b68] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d3158] disabled:opacity-50"
            >
              {saving
                ? "Đang gửi..."
                : "Gửi đánh giá"}
            </button>
          </div>
        </form>

        {/* LIST */}

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {canManage
                    ? "Đánh giá từ người dùng"
                    : "Đánh giá của tôi"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {items.length} đánh
                  giá
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={
                    filterStar
                  }
                  onChange={(
                    event,
                  ) =>
                    setFilterStar(
                      event.target
                        .value,
                    )
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">
                    Tất cả số sao
                  </option>

                  <option value="5">
                    5 sao
                  </option>

                  <option value="4">
                    4 sao
                  </option>

                  <option value="3">
                    3 sao
                  </option>

                  <option value="2">
                    2 sao
                  </option>

                  <option value="1">
                    1 sao
                  </option>
                </select>

                {canManage && (
                  <select
                    value={
                      filterStatus
                    }
                    onChange={(
                      event,
                    ) =>
                      setFilterStatus(
                        event.target
                          .value,
                      )
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">
                      Tất cả trạng thái
                    </option>

                    <option value="MOI">
                      Mới
                    </option>

                    <option value="DA_XEM">
                      Đã xem
                    </option>

                    <option value="DA_GHI_NHAN">
                      Đã ghi nhận
                    </option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Đang tải đánh giá...
            </div>
          ) : items.length ===
            0 ? (
            <div className="p-10 text-center">
              <MessageSquare
                size={35}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm text-slate-500">
                Chưa có đánh giá.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map(
                (item) => (
                  <div
                    key={item._id}
                    className="p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {
                              item.nguoiDanhGiaTen
                            }
                          </p>

                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                            {groupLabel(
                              item.nhom,
                            )}
                          </span>

                          {canManage && (
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                              {statusLabel(
                                item.trangThai,
                              )}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDateTime(
                            item.createdAt,
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0">
                        {[
                          1, 2, 3, 4,
                          5,
                        ].map(
                          (star) => (
                            <Star
                              key={
                                star
                              }
                              size={
                                17
                              }
                              className={
                                star <=
                                item.soSao
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-200"
                              }
                            />
                          ),
                        )}
                      </div>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {item.noiDung}
                    </p>

                    {item.phanHoiQuanTri && (
                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-semibold uppercase text-blue-700">
                          Phản hồi quản
                          trị
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {
                            item.phanHoiQuanTri
                          }
                        </p>

                        {item.nguoiPhanHoiTen && (
                          <p className="mt-2 text-xs text-slate-500">
                            {
                              item.nguoiPhanHoiTen
                            }
                          </p>
                        )}
                      </div>
                    )}

                    {canManage && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <textarea
                          rows={3}
                          value={
                            responseTexts[
                              item._id
                            ] ??
                            item.phanHoiQuanTri ??
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            setResponseTexts(
                              (
                                current,
                              ) => ({
                                ...current,

                                [item._id]:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                          placeholder="Nhập phản hồi cho người dùng..."
                          className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                        />

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            disabled={
                              processingId ===
                              item._id
                            }
                            onClick={() =>
                              void updateItem(
                                item._id,
                                "DA_XEM",
                              )
                            }
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Đánh dấu đã xem
                          </button>

                          <button
                            type="button"
                            disabled={
                              processingId ===
                              item._id
                            }
                            onClick={() =>
                              void updateItem(
                                item._id,
                                "DA_GHI_NHAN",
                              )
                            }
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Ghi nhận & phản hồi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}