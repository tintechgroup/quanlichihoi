"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
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

  soTien: number;

  noiDung: string;

  ngayGiaoDich: string;

  nguoiTaoTen: string;

  ghiChu?: string;

  phamVi:
    | "LIEN_CHI_HOI"
    | "CHI_HOI";

  chiHoiId?:
    | ChiHoiInfo
    | string
    | null;
};

type TongQuan = {
  tongThu: number;
  tongChi: number;
  soDu: number;
  soKhoanThu: number;
  soKhoanChi: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value || 0);
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
  ).format(date);
}

function getChiHoiName(
  chiHoiId: GiaoDich["chiHoiId"],
) {
  if (!chiHoiId) {
    return "";
  }

  if (typeof chiHoiId === "string") {
    return "";
  }

  return (
    chiHoiId.tenChiHoi ||
    chiHoiId.maChiHoi ||
    ""
  );
}

export default function TaiChinhPage() {
  const [giaoDich, setGiaoDich] =
    useState<GiaoDich[]>([]);

  const [tongQuan, setTongQuan] =
    useState<TongQuan>({
      tongThu: 0,
      tongChi: 0,
      soDu: 0,
      soKhoanThu: 0,
      soKhoanChi: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const [loai, setLoai] =
    useState<"THU" | "CHI">("THU");

  const [soTien, setSoTien] =
    useState("");

  const [noiDung, setNoiDung] =
    useState("");

  const [ghiChu, setGhiChu] =
    useState("");

  const [
    ngayGiaoDich,
    setNgayGiaoDich,
  ] = useState(() =>
    new Date()
      .toISOString()
      .slice(0, 10),
  );

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);
        setIsError(false);

        const [
          giaoDichResponse,
          tongQuanResponse,
        ] = await Promise.all([
          fetch("/api/tai-chinh", {
            method: "GET",
            cache: "no-store",
          }),

          fetch(
            "/api/tai-chinh/tong-quan",
            {
              method: "GET",
              cache: "no-store",
            },
          ),
        ]);

        const giaoDichResult =
          await giaoDichResponse.json();

        const tongQuanResult =
          await tongQuanResponse.json();

        if (
          !giaoDichResponse.ok ||
          !giaoDichResult.success
        ) {
          throw new Error(
            giaoDichResult.message ||
              "Không thể tải danh sách giao dịch",
          );
        }

        if (
          !tongQuanResponse.ok ||
          !tongQuanResult.success
        ) {
          throw new Error(
            tongQuanResult.message ||
              "Không thể tải tổng quan tài chính",
          );
        }

        setGiaoDich(
          Array.isArray(
            giaoDichResult.data,
          )
            ? giaoDichResult.data
            : [],
        );

        setTongQuan({
          tongThu:
            Number(
              tongQuanResult.data
                ?.tongThu,
            ) || 0,

          tongChi:
            Number(
              tongQuanResult.data
                ?.tongChi,
            ) || 0,

          soDu:
            Number(
              tongQuanResult.data
                ?.soDu,
            ) || 0,

          soKhoanThu:
            Number(
              tongQuanResult.data
                ?.soKhoanThu,
            ) || 0,

          soKhoanChi:
            Number(
              tongQuanResult.data
                ?.soKhoanChi,
            ) || 0,
        });
      } catch (error) {
        console.error(
          "Lỗi tải dữ liệu tài chính:",
          error,
        );

        setIsError(true);

        setMessage(
          error instanceof Error
            ? error.message
            : "Không thể tải dữ liệu tài chính",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
    void loadData();
  }, [loadData]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setIsError(false);

      const amount =
        Number(soTien);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        throw new Error(
          "Số tiền phải lớn hơn 0",
        );
      }

      if (!noiDung.trim()) {
        throw new Error(
          "Vui lòng nhập nội dung giao dịch",
        );
      }

      if (!ngayGiaoDich) {
        throw new Error(
          "Vui lòng chọn ngày giao dịch",
        );
      }

      const response =
        await fetch(
          "/api/tai-chinh",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              loai,
              soTien: amount,
              noiDung:
                noiDung.trim(),
              ghiChu:
                ghiChu.trim(),
              ngayGiaoDich,
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
            "Không thể lưu giao dịch",
        );
      }

      setMessage(
        result.message ||
          "Thêm giao dịch thành công",
      );

      setSoTien("");
      setNoiDung("");
      setGhiChu("");

      setNgayGiaoDich(
        new Date()
          .toISOString()
          .slice(0, 10),
      );

      await loadData();
    } catch (error) {
      console.error(
        "Lỗi thêm giao dịch:",
        error,
      );

      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể lưu giao dịch",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Quản lý tài chính
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Theo dõi thu, chi, hội phí,
            nộp quỹ và báo cáo tài chính.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex">
          <Link
            href="/dashboard/tai-chinh/nop-quy"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Nộp quỹ Chi hội
          </Link>

          <Link
            href="/dashboard/tai-chinh/hoi-phi"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Quản lý hội phí
          </Link>

          <Link
            href="/dashboard/tai-chinh/bao-cao"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100 sm:col-span-2 xl:col-span-1"
          >
            Báo cáo tài chính
          </Link>
        </div>
      </div>

      {/* THÔNG BÁO */}
      {message && (
        <div
          className={`rounded-xl border p-3 text-sm sm:p-4 ${
            isError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* DASHBOARD */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {/* Tổng thu */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">
                Tổng thu
              </p>

              <p className="mt-2 break-words text-xl font-bold text-green-600 sm:text-2xl">
                {formatMoney(
                  tongQuan.tongThu,
                )}
              </p>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 font-bold text-green-600 sm:h-10 sm:w-10">
              +
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            {tongQuan.soKhoanThu} khoản
            thu
          </p>
        </div>

        {/* Tổng chi */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">
                Tổng chi
              </p>

              <p className="mt-2 break-words text-xl font-bold text-red-600 sm:text-2xl">
                {formatMoney(
                  tongQuan.tongChi,
                )}
              </p>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 font-bold text-red-600 sm:h-10 sm:w-10">
              −
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            {tongQuan.soKhoanChi} khoản
            chi
          </p>
        </div>

        {/* Số dư */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">
                Số dư hiện tại
              </p>

              <p
                className={`mt-2 break-words text-xl font-bold sm:text-2xl ${
                  tongQuan.soDu >= 0
                    ? "text-blue-600"
                    : "text-red-600"
                }`}
              >
                {formatMoney(
                  tongQuan.soDu,
                )}
              </p>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-600 sm:h-10 sm:w-10">
              ₫
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Tổng thu trừ tổng chi
          </p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)] xl:gap-6">
        {/* ADD TRANSACTION */}
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              Thêm giao dịch
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ghi nhận khoản thu hoặc
              chi mới.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="loai"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Loại giao dịch
              </label>

              <select
                id="loai"
                value={loai}
                onChange={(event) =>
                  setLoai(
                    event.target
                      .value as
                      | "THU"
                      | "CHI",
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="THU">
                  Khoản thu
                </option>

                <option value="CHI">
                  Khoản chi
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="soTien"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Số tiền
              </label>

              <input
                id="soTien"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={soTien}
                onChange={(event) =>
                  setSoTien(
                    event.target.value,
                  )
                }
                placeholder="Ví dụ: 500000"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              {soTien &&
                Number(soTien) > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    {formatMoney(
                      Number(soTien),
                    )}
                  </p>
                )}
            </div>

            <div>
              <label
                htmlFor="noiDung"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Nội dung
              </label>

              <input
                id="noiDung"
                type="text"
                value={noiDung}
                onChange={(event) =>
                  setNoiDung(
                    event.target.value,
                  )
                }
                placeholder={
                  loai === "THU"
                    ? "Ví dụ: Thu hội phí"
                    : "Ví dụ: Chi tổ chức hoạt động"
                }
                required
                maxLength={255}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="ngayGiaoDich"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Ngày giao dịch
              </label>

              <input
                id="ngayGiaoDich"
                type="date"
                value={ngayGiaoDich}
                onChange={(event) =>
                  setNgayGiaoDich(
                    event.target.value,
                  )
                }
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="ghiChu"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Ghi chú
              </label>

              <textarea
                id="ghiChu"
                value={ghiChu}
                onChange={(event) =>
                  setGhiChu(
                    event.target.value,
                  )
                }
                rows={3}
                maxLength={500}
                placeholder="Thông tin bổ sung nếu có..."
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                loai === "THU"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {saving
                ? "Đang lưu..."
                : loai === "THU"
                  ? "Thêm khoản thu"
                  : "Thêm khoản chi"}
            </button>
          </div>
        </form>

        {/* HISTORY */}
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Lịch sử giao dịch
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Danh sách các khoản thu,
                chi đã ghi nhận.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadData()
              }
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
            >
              {loading
                ? "Đang tải..."
                : "Làm mới"}
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Đang tải dữ liệu tài
              chính...
            </div>
          ) : giaoDich.length === 0 ? (
            <div className="p-8 text-center sm:p-10">
              <p className="font-medium text-slate-700">
                Chưa có giao dịch
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Hãy thêm khoản thu
                hoặc chi đầu tiên.
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE */}
              <div className="divide-y divide-slate-100 md:hidden">
                {giaoDich.map(
                  (item) => {
                    const isThu =
                      item.loai ===
                      "THU";

                    const chiHoiName =
                      getChiHoiName(
                        item.chiHoiId,
                      );

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

                            <p className="mt-1 font-medium text-slate-700">
                              {item.phamVi ===
                              "CHI_HOI"
                                ? chiHoiName ||
                                  "Chi hội"
                                : "Liên Chi hội"}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">
                              Người tạo
                            </p>

                            <p className="mt-1 font-medium text-slate-700">
                              {item.nguoiTaoTen ||
                                "-"}
                            </p>
                          </div>
                        </div>

                        {item.ghiChu && (
                          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                            {item.ghiChu}
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>

              {/* DESKTOP */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px] text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
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

                      <th className="px-5 py-3 text-right">
                        Số tiền
                      </th>

                      <th className="px-5 py-3">
                        Người tạo
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {giaoDich.map(
                      (item) => {
                        const isThu =
                          item.loai ===
                          "THU";

                        const chiHoiName =
                          getChiHoiName(
                            item.chiHoiId,
                          );

                        return (
                          <tr
                            key={
                              item._id
                            }
                            className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                          >
                            <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                              {formatDate(
                                item.ngayGiaoDich,
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
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

                            <td className="px-5 py-4">
                              <div className="max-w-[320px]">
                                <p className="font-medium text-slate-800">
                                  {
                                    item.noiDung
                                  }
                                </p>

                                {item.ghiChu && (
                                  <p className="mt-1 truncate text-xs text-slate-400">
                                    {
                                      item.ghiChu
                                    }
                                  </p>
                                )}
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                              {item.phamVi ===
                              "CHI_HOI"
                                ? chiHoiName ||
                                  "Chi hội"
                                : "Liên Chi hội"}
                            </td>

                            <td
                              className={`whitespace-nowrap px-5 py-4 text-right font-semibold ${
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
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                              {item.nguoiTaoTen ||
                                "-"}
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

          {!loading &&
            giaoDich.length > 0 && (
              <div className="border-t border-slate-200 px-4 py-4 text-sm text-slate-500 sm:px-6">
                Tổng cộng{" "}
                <span className="font-semibold text-slate-700">
                  {giaoDich.length}
                </span>{" "}
                giao dịch
              </div>
            )}
        </div>
      </div>
    </div>
  );
}