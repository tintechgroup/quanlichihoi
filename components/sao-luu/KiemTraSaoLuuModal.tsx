"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileCheck2,
  HardDrive,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

/* =========================================================
 * TYPES
 * ======================================================= */

type CollectionInfo = {
  tenCollection: string;
  soBanGhi: number;
  dungLuong: number;
};

type KiemTraData = {
  hopLe: boolean;

  checksum: {
    hopLe: boolean;
    daLuu: string | null;
    hienTai: string;
  };

  dungLuong: {
    hopLe: boolean;
    metadata: number;
    thucTe: number;
  };

  metadata: {
    hopLe: boolean;
    phienBanMetadata: string;
    phienBanFile: string | null;
    tongBanGhiMetadata: number;
    tongBanGhiFile: number | null;
  };

  file: {
    tenTep: string;
    gridFsFileId: string;
    uploadDate: string;
    dungLuong: number;
  };

  noiDung: {
    dinhDang: string | null;
    tenCoSoDuLieu: string | null;
    thoiGianTao: string | null;
    tongSoCollection: number | null;
    tongSoBanGhi: number | null;
    danhSachCollection: CollectionInfo[];
  };

  canhBao: string[];
  thoiGianKiemTra: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: KiemTraData;
};

type Props = {
  backupId: string;
  maSaoLuu: string;
  onClose: () => void;
};

/* =========================================================
 * HELPERS
 * ======================================================= */

function formatNumber(value: unknown) {
  const number = Number(value);

  return new Intl.NumberFormat("vi-VN").format(
    Number.isFinite(number) ? number : 0,
  );
}

function formatBytes(value: unknown) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(
    bytes / Math.pow(1024, index)
  ).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).format(date);
}

async function readJson(
  response: Response,
): Promise<ApiResponse> {
  const contentType =
    response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    throw new Error(
      text || "Máy chủ trả về dữ liệu không hợp lệ",
    );
  }

  return (await response.json()) as ApiResponse;
}

/* =========================================================
 * CHECK ROW
 * ======================================================= */

function CheckRow({
  title,
  valid,
  description,
}: {
  title: string;
  valid: boolean;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <div>
        <p className="font-semibold text-slate-800">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      {valid ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          <CheckCircle2 size={14} />
          Hợp lệ
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
          <XCircle size={14} />
          Không hợp lệ
        </span>
      )}
    </div>
  );
}

/* =========================================================
 * COMPONENT
 * ======================================================= */

export default function KiemTraSaoLuuModal({
  backupId,
  maSaoLuu,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] =
    useState<KiemTraData | null>(null);

  const checkBackup = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      setResult(null);

      const response = await fetch(
        `/api/sao-luu/${backupId}/kiem-tra`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const data = await readJson(response);

      /*
       * API có thể trả status 200 nhưng hopLe = false.
       * Chỉ coi là lỗi request khi không có data.
       */
      if (!response.ok && !data.data) {
        throw new Error(
          data.message ||
            "Không thể kiểm tra bản sao lưu",
        );
      }

      if (!data.data) {
        throw new Error(
          data.message ||
            "Không nhận được kết quả kiểm tra",
        );
      }

      setResult(data.data);
      setMessage(data.message ?? "");
    } catch (checkError) {
      setError(
        checkError instanceof Error
          ? checkError.message
          : "Không thể kiểm tra bản sao lưu",
      );
    } finally {
      setLoading(false);
    }
  }, [backupId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the request and its loading state together when effect dependencies change.
    void checkBackup();
  }, [checkBackup]);

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <FileCheck2 size={22} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Kiểm tra bản sao lưu
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {maSaoLuu}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="overflow-y-auto p-6">
          {loading && (
            <div className="flex min-h-96 flex-col items-center justify-center">
              <LoaderCircle
                size={42}
                className="animate-spin text-blue-700"
              />

              <p className="mt-4 font-semibold text-slate-700">
                Đang kiểm tra bản sao lưu...
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Hệ thống đang đọc file và kiểm tra
                checksum.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <XCircle size={32} />
              </div>

              <p className="mt-4 text-lg font-bold text-red-700">
                Không thể kiểm tra
              </p>

              <p className="mt-2 max-w-lg text-sm leading-6 text-red-600">
                {error}
              </p>

              <button
                type="button"
                onClick={() => void checkBackup()}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-800 px-5 text-sm font-semibold text-white hover:bg-blue-900"
              >
                <RefreshCw size={17} />
                Kiểm tra lại
              </button>
            </div>
          )}

          {!loading && result && (
            <>
              {/* RESULT HEADER */}
              <div
                className={`rounded-2xl border p-5 ${
                  result.hopLe
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      result.hopLe
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {result.hopLe ? (
                      <ShieldCheck size={25} />
                    ) : (
                      <ShieldAlertIcon />
                    )}
                  </div>

                  <div>
                    <h3
                      className={`text-lg font-bold ${
                        result.hopLe
                          ? "text-emerald-900"
                          : "text-red-900"
                      }`}
                    >
                      {result.hopLe
                        ? "Bản sao lưu hợp lệ"
                        : "Bản sao lưu không hợp lệ"}
                    </h3>

                    <p
                      className={`mt-1 text-sm leading-6 ${
                        result.hopLe
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {message ||
                        (result.hopLe
                          ? "File đã vượt qua tất cả kiểm tra."
                          : "File không vượt qua kiểm tra toàn vẹn.")}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Kiểm tra lúc:{" "}
                      {formatDateTime(
                        result.thoiGianKiemTra,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* CHECK ITEMS */}
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <CheckRow
                  title="Checksum SHA-256"
                  valid={result.checksum.hopLe}
                  description={
                    result.checksum.hopLe
                      ? "Nội dung file không bị thay đổi."
                      : "Checksum hiện tại không khớp checksum đã lưu."
                  }
                />

                <CheckRow
                  title="Dung lượng file"
                  valid={result.dungLuong.hopLe}
                  description={`${formatBytes(
                    result.dungLuong.thucTe,
                  )} / ${formatBytes(
                    result.dungLuong.metadata,
                  )}`}
                />

                <CheckRow
                  title="Thông tin metadata"
                  valid={result.metadata.hopLe}
                  description={`Phiên bản ${
                    result.metadata.phienBanFile ??
                    "không xác định"
                  }`}
                />
              </div>

              {/* SUMMARY */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Database size={17} />

                    <span className="text-xs font-bold uppercase">
                      Database
                    </span>
                  </div>

                  <p className="mt-2 truncate font-bold text-slate-900">
                    {result.noiDung
                      .tenCoSoDuLieu || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <HardDrive size={17} />

                    <span className="text-xs font-bold uppercase">
                      Collection
                    </span>
                  </div>

                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {formatNumber(
                      result.noiDung
                        .tongSoCollection,
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <FileCheck2 size={17} />

                    <span className="text-xs font-bold uppercase">
                      Bản ghi
                    </span>
                  </div>

                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {formatNumber(
                      result.noiDung.tongSoBanGhi,
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CheckCircle2 size={17} />

                    <span className="text-xs font-bold uppercase">
                      Dung lượng
                    </span>
                  </div>

                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {formatBytes(
                      result.file.dungLuong,
                    )}
                  </p>
                </div>
              </div>

              {/* CHECKSUM */}
              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                <p className="font-bold text-slate-800">
                  Checksum SHA-256
                </p>

                <div className="mt-3 space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">
                      Checksum đã lưu
                    </p>

                    <p className="break-all rounded-lg bg-slate-950 p-3 font-mono text-xs leading-6 text-slate-200">
                      {result.checksum.daLuu ||
                        "Không có"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">
                      Checksum hiện tại
                    </p>

                    <p className="break-all rounded-lg bg-slate-950 p-3 font-mono text-xs leading-6 text-emerald-300">
                      {result.checksum.hienTai}
                    </p>
                  </div>
                </div>
              </div>

              {/* WARNINGS */}
              {result.canhBao.length > 0 && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={20}
                      className="mt-0.5 shrink-0 text-amber-700"
                    />

                    <div>
                      <p className="font-bold text-amber-900">
                        Cảnh báo
                      </p>

                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-800">
                        {result.canhBao.map(
                          (warning, index) => (
                            <li
                              key={`warning-${index}`}
                            >
                              {warning}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* COLLECTIONS */}
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="font-bold text-slate-800">
                    Collection trong bản sao lưu
                  </p>
                </div>

                <div className="max-h-72 overflow-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 text-left">
                        <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                          Collection
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                          Bản ghi
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                          Dung lượng
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {result.noiDung.danhSachCollection.map(
                        (collection, index) => (
                          <tr
                            key={`${collection.tenCollection}-${index}`}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-4 py-3 font-mono text-sm text-slate-700">
                              {
                                collection.tenCollection
                              }
                            </td>

                            <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                              {formatNumber(
                                collection.soBanGhi,
                              )}
                            </td>

                            <td className="px-4 py-3 text-right text-sm text-slate-500">
                              {formatBytes(
                                collection.dungLuong,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          {!loading && (
            <button
              type="button"
              onClick={() => void checkBackup()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw size={17} />
              Kiểm tra lại
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/*
 * Icon tách riêng để tránh xung đột tên.
 */
function ShieldAlertIcon() {
  return <XCircle size={25} />;
}