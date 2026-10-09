"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ChiHoiInfo = {
  _id: string;
  tenChiHoi?: string;
  maChiHoi?: string;
};

type GiaoDich = {
  _id: string;

  loai: "THU" | "CHI";

  phamVi:
    | "LIEN_CHI_HOI"
    | "CHI_HOI";

  chiHoiId?:
    | ChiHoiInfo
    | string
    | null;

  soTien: number;

  noiDung: string;

  ngayGiaoDich: string;

  ghiChu?: string;

  nguoiTaoTen: string;
};

type Summary = {
  tongThu: number;
  tongChi: number;
  soDu: number;

  soKhoanThu: number;
  soKhoanChi: number;

  tongGiaoDich: number;
};

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
    },
  ).format(value || 0);
}

function formatDate(
  value: string,
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "vi-VN",
  );
}

function getChiHoiName(
  value:
    | GiaoDich["chiHoiId"],
) {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string"
  ) {
    return "";
  }

  return (
    value.tenChiHoi ||
    value.maChiHoi ||
    ""
  );
}

function escapeCsv(
  value: unknown,
) {
  const text =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  return `"${text.replace(
    /"/g,
    '""',
  )}"`;
}

export default function BaoCaoTaiChinhPage() {
  const [data, setData] =
    useState<GiaoDich[]>([]);

  const [summary, setSummary] =
    useState<Summary>({
      tongThu: 0,
      tongChi: 0,
      soDu: 0,
      soKhoanThu: 0,
      soKhoanChi: 0,
      tongGiaoDich: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const [tuNgay, setTuNgay] =
    useState("");

  const [denNgay, setDenNgay] =
    useState("");

  const [loai, setLoai] =
    useState("");

  const [phamVi, setPhamVi] =
    useState("");

  const queryString =
    useMemo(() => {
      const query =
        new URLSearchParams();

      if (tuNgay) {
        query.set(
          "tuNgay",
          tuNgay,
        );
      }

      if (denNgay) {
        query.set(
          "denNgay",
          denNgay,
        );
      }

      if (loai) {
        query.set(
          "loai",
          loai,
        );
      }

      if (phamVi) {
        query.set(
          "phamVi",
          phamVi,
        );
      }

      return query.toString();
    }, [
      tuNgay,
      denNgay,
      loai,
      phamVi,
    ]);

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);
        setMessage("");
        setIsError(false);

        const url =
          queryString
            ? `/api/tai-chinh/bao-cao?${queryString}`
            : "/api/tai-chinh/bao-cao";

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
              "Không thể tải báo cáo",
          );
        }

        setData(
          Array.isArray(
            result.data,
          )
            ? result.data
            : [],
        );

        setSummary({
          tongThu:
            Number(
              result.summary
                ?.tongThu,
            ) || 0,

          tongChi:
            Number(
              result.summary
                ?.tongChi,
            ) || 0,

          soDu:
            Number(
              result.summary
                ?.soDu,
            ) || 0,

          soKhoanThu:
            Number(
              result.summary
                ?.soKhoanThu,
            ) || 0,

          soKhoanChi:
            Number(
              result.summary
                ?.soKhoanChi,
            ) || 0,

          tongGiaoDich:
            Number(
              result.summary
                ?.tongGiaoDich,
            ) || 0,
        });
      } catch (error) {
        setIsError(true);

        setMessage(
          error instanceof Error
            ? error.message
            : "Không thể tải báo cáo",
        );
      } finally {
        setLoading(false);
      }
    }, [queryString]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
    void loadData();
  }, [loadData]);

  function resetFilters() {
    setTuNgay("");
    setDenNgay("");
    setLoai("");
    setPhamVi("");
  }

  function exportCsv() {
    if (
      data.length === 0
    ) {
      setIsError(true);

      setMessage(
        "Không có dữ liệu để xuất",
      );

      return;
    }

    const headers = [
      "STT",
      "Ngày giao dịch",
      "Loại",
      "Phạm vi",
      "Chi hội",
      "Nội dung",
      "Số tiền",
      "Người tạo",
      "Ghi chú",
    ];

    const rows =
      data.map(
        (item, index) => [
          index + 1,

          formatDate(
            item.ngayGiaoDich,
          ),

          item.loai === "THU"
            ? "Thu"
            : "Chi",

          item.phamVi ===
          "CHI_HOI"
            ? "Chi hội"
            : "Liên Chi hội",

          getChiHoiName(
            item.chiHoiId,
          ),

          item.noiDung,

          item.soTien,

          item.nguoiTaoTen,

          item.ghiChu || "",
        ],
      );

    const csv = [
      headers.map(
        escapeCsv,
      ),
      ...rows.map((row) =>
        row.map(
          escapeCsv,
        ),
      ),
    ]
      .map((row) =>
        row.join(","),
      )
      .join("\r\n");

    /*
     * BOM UTF-8 giúp Excel
     * đọc tiếng Việt chính xác.
     */
    const blob =
      new Blob(
        [
          "\uFEFF",
          csv,
        ],
        {
          type:
            "text/csv;charset=utf-8;",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const anchor =
      document.createElement(
        "a",
      );

    anchor.href = url;

    anchor.download =
      `bao-cao-tai-chinh-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Báo cáo tài chính
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Thống kê, lọc và xuất
            dữ liệu thu chi.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href="/dashboard/tai-chinh"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Quay lại tài chính
          </Link>

          <button
            type="button"
            onClick={exportCsv}
            disabled={
              data.length === 0
            }
            className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Xuất Excel
          </button>
        </div>
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

      {/* FILTER */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="font-semibold text-slate-900">
            Bộ lọc báo cáo
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Từ ngày
            </label>

            <input
              type="date"
              value={tuNgay}
              onChange={(event) =>
                setTuNgay(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Đến ngày
            </label>

            <input
              type="date"
              value={denNgay}
              onChange={(event) =>
                setDenNgay(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Loại giao dịch
            </label>

            <select
              value={loai}
              onChange={(event) =>
                setLoai(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">
                Tất cả
              </option>

              <option value="THU">
                Thu
              </option>

              <option value="CHI">
                Chi
              </option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Phạm vi
            </label>

            <select
              value={phamVi}
              onChange={(event) =>
                setPhamVi(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">
                Tất cả
              </option>

              <option value="LIEN_CHI_HOI">
                Liên Chi hội
              </option>

              <option value="CHI_HOI">
                Chi hội
              </option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Đang lọc..."
              : "Áp dụng bộ lọc"}
          </button>

          <button
            type="button"
            onClick={
              resetFilters
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm text-slate-500">
            Tổng thu
          </p>

          <p className="mt-2 break-words text-xl font-bold text-green-600">
            {formatMoney(
              summary.tongThu,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {
              summary.soKhoanThu
            }{" "}
            giao dịch
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm text-slate-500">
            Tổng chi
          </p>

          <p className="mt-2 break-words text-xl font-bold text-red-600">
            {formatMoney(
              summary.tongChi,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {
              summary.soKhoanChi
            }{" "}
            giao dịch
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm text-slate-500">
            Chênh lệch
          </p>

          <p
            className={`mt-2 break-words text-xl font-bold ${
              summary.soDu >= 0
                ? "text-blue-600"
                : "text-red-600"
            }`}
          >
            {formatMoney(
              summary.soDu,
            )}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm text-slate-500">
            Tổng giao dịch
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900">
            {
              summary.tongGiaoDich
            }
          </p>
        </div>
      </div>

      {/* DATA */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900">
            Chi tiết báo cáo
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {data.length} giao dịch
            phù hợp.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Đang tải báo cáo...
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Không có dữ liệu phù hợp
            với bộ lọc.
          </div>
        ) : (
          <>
            {/* MOBILE */}
            <div className="divide-y md:hidden">
              {data.map(
                (item) => {
                  const isThu =
                    item.loai ===
                    "THU";

                  return (
                    <div
                      key={item._id}
                      className="space-y-3 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-medium text-slate-900">
                            {
                              item.noiDung
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(
                              item.ngayGiaoDich,
                            )}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isThu
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {isThu
                            ? "Thu"
                            : "Chi"}
                        </span>
                      </div>

                      <p
                        className={`text-lg font-bold ${
                          isThu
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {isThu
                          ? "+"
                          : "-"}
                        {formatMoney(
                          item.soTien,
                        )}
                      </p>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-400">
                            Phạm vi
                          </p>

                          <p className="mt-1 font-medium">
                            {item.phamVi ===
                            "CHI_HOI"
                              ? "Chi hội"
                              : "Liên Chi hội"}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">
                            Người tạo
                          </p>

                          <p className="mt-1 font-medium">
                            {
                              item.nguoiTaoTen
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            {/* DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[950px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Ngày
                    </th>

                    <th className="px-5 py-3">
                      Loại
                    </th>

                    <th className="px-5 py-3">
                      Nội dung
                    </th>

                    <th className="px-5 py-3">
                      Phạm vi
                    </th>

                    <th className="px-5 py-3">
                      Chi hội
                    </th>

                    <th className="px-5 py-3 text-right">
                      Số tiền
                    </th>

                    <th className="px-5 py-3">
                      Người tạo
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.map(
                    (item) => {
                      const isThu =
                        item.loai ===
                        "THU";

                      return (
                        <tr
                          key={
                            item._id
                          }
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            {formatDate(
                              item.ngayGiaoDich,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isThu
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {isThu
                                ? "Thu"
                                : "Chi"}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-medium">
                            {
                              item.noiDung
                            }
                          </td>

                          <td className="px-5 py-4">
                            {item.phamVi ===
                            "CHI_HOI"
                              ? "Chi hội"
                              : "Liên Chi hội"}
                          </td>

                          <td className="px-5 py-4">
                            {getChiHoiName(
                              item.chiHoiId,
                            ) || "-"}
                          </td>

                          <td
                            className={`whitespace-nowrap px-5 py-4 text-right font-semibold ${
                              isThu
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatMoney(
                              item.soTien,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {
                              item.nguoiTaoTen
                            }
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}