"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

type TrangThai =
  | "CHO_DUYET"
  | "DA_DUYET"
  | "TU_CHOI";

type PhieuNopQuy = {
  _id: string;

  tenChiHoiSnapshot: string;

  soTien: number;

  noiDung: string;

  ghiChu?: string;

  ngayNop: string;

  trangThai: TrangThai;

  nguoiTaoTen: string;

  nguoiDuyetTen?: string;

  ngayDuyet?: string | null;

  lyDoTuChoi?: string;
};

type Permissions = {
  canCreate: boolean;
  canApprove: boolean;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
    },
  ).format(value || 0);
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "vi-VN",
  );
}

function TrangThaiBadge({
  status,
}: {
  status: TrangThai;
}) {
  if (status === "DA_DUYET") {
    return (
      <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
        Đã duyệt
      </span>
    );
  }

  if (status === "TU_CHOI") {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        Từ chối
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      Chờ duyệt
    </span>
  );
}

export default function NopQuyPage() {
  const [items, setItems] =
    useState<PhieuNopQuy[]>([]);

  const [
    permissions,
    setPermissions,
  ] = useState<Permissions>({
    canCreate: false,
    canApprove: false,
  });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const [soTien, setSoTien] =
    useState("");

  const [noiDung, setNoiDung] =
    useState("Nộp quỹ Chi hội");

  const [ghiChu, setGhiChu] =
    useState("");

  const [ngayNop, setNgayNop] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10),
    );

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);
        setIsError(false);

        const response =
          await fetch(
            "/api/nop-quy",
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
              "Không thể tải dữ liệu",
          );
        }

        setItems(
          Array.isArray(result.data)
            ? result.data
            : [],
        );

        setPermissions(
          result.permissions || {
            canCreate: false,
            canApprove: false,
          },
        );
      } catch (error) {
        setIsError(true);

        setMessage(
          error instanceof Error
            ? error.message
            : "Không thể tải dữ liệu",
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

      const response =
        await fetch(
          "/api/nop-quy",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              soTien: amount,
              noiDung,
              ghiChu,
              ngayNop,
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
            "Không thể tạo phiếu",
        );
      }

      setMessage(result.message);

      setSoTien("");
      setGhiChu("");

      await loadData();
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tạo phiếu",
      );
    } finally {
      setSaving(false);
    }
  }

  async function processPhieu(
    id: string,
    action:
      | "APPROVE"
      | "REJECT",
  ) {
    let lyDoTuChoi = "";

    if (action === "REJECT") {
      lyDoTuChoi =
        window.prompt(
          "Nhập lý do từ chối:",
        )?.trim() || "";

      if (!lyDoTuChoi) {
        return;
      }
    }

    try {
      setProcessingId(id);

      setMessage("");
      setIsError(false);

      const response =
        await fetch(
          `/api/nop-quy/${id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              action,
              lyDoTuChoi,
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
            "Không thể xử lý phiếu",
        );
      }

      setMessage(result.message);

      await loadData();
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể xử lý phiếu",
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Nộp quỹ lên Liên Chi hội
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Theo dõi quá trình nộp và
          phê duyệt quỹ của các Chi hội.
        </p>
      </div>

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

      {permissions.canCreate && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            Tạo phiếu nộp quỹ
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Số tiền
              </label>

              <input
                type="number"
                min="1"
                value={soTien}
                onChange={(event) =>
                  setSoTien(
                    event.target.value,
                  )
                }
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Ngày nộp
              </label>

              <input
                type="date"
                value={ngayNop}
                onChange={(event) =>
                  setNgayNop(
                    event.target.value,
                  )
                }
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">
                Nội dung
              </label>

              <input
                value={noiDung}
                onChange={(event) =>
                  setNoiDung(
                    event.target.value,
                  )
                }
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">
                Ghi chú
              </label>

              <textarea
                rows={3}
                value={ghiChu}
                onChange={(event) =>
                  setGhiChu(
                    event.target.value,
                  )
                }
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            {saving
              ? "Đang gửi..."
              : "Gửi phiếu nộp quỹ"}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b p-4 sm:p-5">
          <div>
            <h2 className="font-semibold text-slate-900">
              Lịch sử nộp quỹ
            </h2>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              {items.length} phiếu
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            disabled={loading}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
          >
            Làm mới
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Đang tải...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Chưa có phiếu nộp quỹ.
          </div>
        ) : (
          <>
            {/* MOBILE */}
            <div className="divide-y md:hidden">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="space-y-3 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {
                          item.tenChiHoiSnapshot
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(
                          item.ngayNop,
                        )}
                      </p>
                    </div>

                    <TrangThaiBadge
                      status={
                        item.trangThai
                      }
                    />
                  </div>

                  <p className="text-lg font-bold text-blue-600">
                    {formatMoney(
                      item.soTien,
                    )}
                  </p>

                  <p className="text-sm text-slate-700">
                    {item.noiDung}
                  </p>

                  <p className="text-xs text-slate-500">
                    Người tạo:{" "}
                    {item.nguoiTaoTen}
                  </p>

                  {item.lyDoTuChoi && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      Lý do:{" "}
                      {
                        item.lyDoTuChoi
                      }
                    </div>
                  )}

                  {permissions.canApprove &&
                    item.trangThai ===
                      "CHO_DUYET" && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={
                            processingId ===
                            item._id
                          }
                          onClick={() =>
                            void processPhieu(
                              item._id,
                              "APPROVE",
                            )
                          }
                          className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white"
                        >
                          Duyệt
                        </button>

                        <button
                          type="button"
                          disabled={
                            processingId ===
                            item._id
                          }
                          onClick={() =>
                            void processPhieu(
                              item._id,
                              "REJECT",
                            )
                          }
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>

            {/* DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Chi hội
                    </th>

                    <th className="px-5 py-3">
                      Ngày
                    </th>

                    <th className="px-5 py-3">
                      Nội dung
                    </th>

                    <th className="px-5 py-3 text-right">
                      Số tiền
                    </th>

                    <th className="px-5 py-3">
                      Trạng thái
                    </th>

                    <th className="px-5 py-3">
                      Người tạo
                    </th>

                    <th className="px-5 py-3 text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map(
                    (item) => (
                      <tr
                        key={item._id}
                        className="border-t"
                      >
                        <td className="px-5 py-4 font-medium">
                          {
                            item.tenChiHoiSnapshot
                          }
                        </td>

                        <td className="px-5 py-4">
                          {formatDate(
                            item.ngayNop,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {item.noiDung}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold">
                          {formatMoney(
                            item.soTien,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <TrangThaiBadge
                            status={
                              item.trangThai
                            }
                          />
                        </td>

                        <td className="px-5 py-4">
                          {
                            item.nguoiTaoTen
                          }
                        </td>

                        <td className="px-5 py-4 text-right">
                          {permissions.canApprove &&
                          item.trangThai ===
                            "CHO_DUYET" ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={
                                  processingId ===
                                  item._id
                                }
                                onClick={() =>
                                  void processPhieu(
                                    item._id,
                                    "APPROVE",
                                  )
                                }
                                className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white"
                              >
                                Duyệt
                              </button>

                              <button
                                type="button"
                                disabled={
                                  processingId ===
                                  item._id
                                }
                                onClick={() =>
                                  void processPhieu(
                                    item._id,
                                    "REJECT",
                                  )
                                }
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ),
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