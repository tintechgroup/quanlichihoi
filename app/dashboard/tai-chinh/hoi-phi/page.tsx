"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type ChiHoi = {
  _id: string;
  tenChiHoi?: string;
  maChiHoi?: string;
};

type HoiPhiItem = {
  hoiVienId: string;
  hoTen: string;
  maSinhVien: string;
  namHoc: string;
  soTien: number;
  trangThai:
    | "CHUA_NOP"
    | "DA_NOP";
  ngayNop: string | null;
  ghiChu: string;
};

type Summary = {
  tongHoiVien: number;
  daNop: number;
  chuaNop: number;
  tongDaThu: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
    },
  ).format(value);
}

export default function HoiPhiPage() {
  const [chiHoiList, setChiHoiList] =
    useState<ChiHoi[]>([]);

  const [chiHoiId, setChiHoiId] =
    useState("");

  const [namHoc, setNamHoc] =
    useState("2026-2027");

  const [mucHoiPhi, setMucHoiPhi] =
    useState("50000");

  const [items, setItems] =
    useState<HoiPhiItem[]>([]);

  const [summary, setSummary] =
    useState<Summary>({
      tongHoiVien: 0,
      daNop: 0,
      chuaNop: 0,
      tongDaThu: 0,
    });

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const [savingId, setSavingId] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadChiHoi() {
      try {
        const response = await fetch(
          "/api/chi-hoi",
          {
            cache: "no-store",
          },
        );

        const result =
          await response.json();

        if (!response.ok) {
          return;
        }

        const data =
          result.data ??
          result.chiHoi ??
          result;

        if (Array.isArray(data)) {
          setChiHoiList(data);

          if (
            data.length > 0 &&
            !chiHoiId
          ) {
            setChiHoiId(
              data[0]._id,
            );
          }
        }
      } catch (error) {
        console.error(error);
      }
    }

    void loadChiHoi();
  }, [chiHoiId]);

  const loadHoiPhi =
    useCallback(async () => {
      if (!chiHoiId || !namHoc) {
        return;
      }

      try {
        setLoading(true);
        setMessage("");
        setIsError(false);

        const query =
          new URLSearchParams({
            chiHoiId,
            namHoc,
          });

        const response = await fetch(
          `/api/hoi-phi?${query.toString()}`,
          {
            cache: "no-store",
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
              "Không thể tải hội phí",
          );
        }

        setItems(result.data || []);

        setSummary(
          result.summary || {
            tongHoiVien: 0,
            daNop: 0,
            chuaNop: 0,
            tongDaThu: 0,
          },
        );
      } catch (error) {
        setIsError(true);

        setMessage(
          error instanceof Error
            ? error.message
            : "Không thể tải hội phí",
        );
      } finally {
        setLoading(false);
      }
    }, [chiHoiId, namHoc]);

  useEffect(() => {
    if (chiHoiId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
      void loadHoiPhi();
    }
  }, [chiHoiId, namHoc, loadHoiPhi]);

  async function updateHoiPhi(
    item: HoiPhiItem,
    trangThai:
      | "DA_NOP"
      | "CHUA_NOP",
  ) {
    try {
      setSavingId(
        item.hoiVienId,
      );

      setMessage("");
      setIsError(false);

      const response = await fetch(
        `/api/hoi-phi/${item.hoiVienId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            namHoc,

            soTien:
              item.soTien > 0
                ? item.soTien
                : Number(mucHoiPhi),

            trangThai,

            ghiChu:
              item.ghiChu || "",
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
            "Không thể cập nhật hội phí",
        );
      }

      setMessage(result.message);

      await loadHoiPhi();
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật hội phí",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Quản lý hội phí
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Theo dõi tình trạng nộp hội phí
          của Hội viên theo năm học.
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border bg-white p-5 shadow-sm md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Chi hội
          </label>

          <select
            value={chiHoiId}
            onChange={(event) =>
              setChiHoiId(
                event.target.value,
              )
            }
            className="w-full rounded-lg border px-3 py-2.5"
          >
            <option value="">
              Chọn Chi hội
            </option>

            {chiHoiList.map(
              (chiHoi) => (
                <option
                  key={chiHoi._id}
                  value={chiHoi._id}
                >
                  {chiHoi.tenChiHoi ||
                    chiHoi.maChiHoi ||
                    chiHoi._id}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Năm học
          </label>

          <input
            value={namHoc}
            onChange={(event) =>
              setNamHoc(
                event.target.value,
              )
            }
            placeholder="2026-2027"
            className="w-full rounded-lg border px-3 py-2.5"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Mức hội phí mặc định
          </label>

          <input
            type="number"
            min="0"
            value={mucHoiPhi}
            onChange={(event) =>
              setMucHoiPhi(
                event.target.value,
              )
            }
            className="w-full rounded-lg border px-3 py-2.5"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Tổng Hội viên
          </p>

          <p className="mt-2 text-2xl font-bold">
            {summary.tongHoiVien}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Đã nộp
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {summary.daNop}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Chưa nộp
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {summary.chuaNop}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Tổng đã thu
          </p>

          <p className="mt-2 text-2xl font-bold text-blue-600">
            {formatMoney(
              summary.tongDaThu,
            )}
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${
            isError
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Danh sách Hội viên
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">
            Đang tải...
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">
            Không có Hội viên.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="px-3 py-3">
                    STT
                  </th>

                  <th className="px-3 py-3">
                    MSSV
                  </th>

                  <th className="px-3 py-3">
                    Họ tên
                  </th>

                  <th className="px-3 py-3">
                    Số tiền
                  </th>

                  <th className="px-3 py-3">
                    Trạng thái
                  </th>

                  <th className="px-3 py-3">
                    Ngày nộp
                  </th>

                  <th className="px-3 py-3 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map(
                  (item, index) => (
                    <tr
                      key={
                        item.hoiVienId
                      }
                      className="border-b last:border-0"
                    >
                      <td className="px-3 py-3">
                        {index + 1}
                      </td>

                      <td className="px-3 py-3">
                        {item.maSinhVien ||
                          "-"}
                      </td>

                      <td className="px-3 py-3 font-medium">
                        {item.hoTen ||
                          "Chưa có tên"}
                      </td>

                      <td className="px-3 py-3">
                        {formatMoney(
                          item.soTien ||
                            Number(
                              mucHoiPhi,
                            ) ||
                            0,
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {item.trangThai ===
                        "DA_NOP" ? (
                          <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                            Đã nộp
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                            Chưa nộp
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {item.ngayNop
                          ? new Date(
                              item.ngayNop,
                            ).toLocaleDateString(
                              "vi-VN",
                            )
                          : "-"}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {item.trangThai ===
                        "DA_NOP" ? (
                          <button
                            type="button"
                            disabled={
                              savingId ===
                              item.hoiVienId
                            }
                            onClick={() =>
                              updateHoiPhi(
                                item,
                                "CHUA_NOP",
                              )
                            }
                            className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                          >
                            Hủy xác nhận
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              savingId ===
                              item.hoiVienId
                            }
                            onClick={() =>
                              updateHoiPhi(
                                item,
                                "DA_NOP",
                              )
                            }
                            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Xác nhận đã nộp
                          </button>
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}