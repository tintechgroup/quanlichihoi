"use client";

import {
  AlertCircle,
  CheckCircle2,
  Database,
  DatabaseBackup,
  Download,
  FileCheck2,
  FileJson,
  HardDrive,
  Loader2,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  useRouter,
} from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type CurrentUser = {
  id: string;

  username: string;

  fullName: string;

  role: UserRole;
};

type CollectionInfo = {
  name: string;

  count: number;
};

type BackupInfo = {
  database: string;

  totalCollections: number;

  totalDocuments: number;

  collections: CollectionInfo[];
};

type RestoreCollection = {
  name: string;

  count: number;

  currentCount: number;
};

type RestorePreview = {
  fileName: string;

  format: string;

  version: number;

  createdAt?: string | null;

  sourceDatabase?: string | null;

  targetDatabase?: string | null;

  createdBy?: {
    userId?: string;

    username?: string;

    fullName?: string;

    role?: string;
  } | null;

  summary: {
    totalCollections: number;

    totalDocuments: number;

    currentTotalDocuments: number;
  };

  collections: RestoreCollection[];

  confirmText: string;

  warning: string;
};

type ApiResponse = {
  success: boolean;

  message?: string;

  user?: CurrentUser;

  data?: unknown;
};

type MessageState = {
  type:
    | "success"
    | "error";

  text: string;
};

/* =========================================================
   HELPERS
========================================================= */

async function parseJson(
  response: Response,
): Promise<ApiResponse> {
  const text =
    await response.text();

  if (
    !text.trim()
  ) {
    return {
      success: false,

      message:
        `Máy chủ không trả dữ liệu. HTTP ${response.status}`,
    };
  }

  try {
    return JSON.parse(
      text,
    ) as ApiResponse;
  } catch {
    console.error(
      "Response không phải JSON:",
      {
        url:
          response.url,

        status:
          response.status,

        body:
          text.slice(
            0,
            500,
          ),
      },
    );

    return {
      success: false,

      message:
        `API trả dữ liệu không hợp lệ. HTTP ${response.status}`,
    };
  }
}

function getId(
  value: unknown,
) {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    typeof value ===
    "object"
  ) {
    const item =
      value as Record<
        string,
        unknown
      >;

    return String(
      item.id ??
        item._id ??
        item.userId ??
        "",
    );
  }

  return String(
    value,
  );
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "vi-VN",
  ).format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatDateTime(
  value?:
    string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}

function formatFileSize(
  bytes: number,
) {
  if (
    bytes <=
    0
  ) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index =
    Math.min(
      Math.floor(
        Math.log(
          bytes,
        ) /
          Math.log(
            1024,
          ),
      ),
      units.length -
        1,
    );

  const value =
    bytes /
    Math.pow(
      1024,
      index,
    );

  return `${value.toFixed(
    index ===
      0
      ? 0
      : 2,
  )} ${units[index]}`;
}

function getDownloadFileName(
  disposition:
    string | null,
) {
  if (
    !disposition
  ) {
    return "";
  }

  const utf8Match =
    disposition.match(
      /filename\*=UTF-8''([^;]+)/i,
    );

  if (
    utf8Match?.[1]
  ) {
    try {
      return decodeURIComponent(
        utf8Match[1]
          .replace(
            /["']/g,
            "",
          )
          .trim(),
      );
    } catch {
      return utf8Match[1]
        .replace(
          /["']/g,
          "",
        )
        .trim();
    }
  }

  const normalMatch =
    disposition.match(
      /filename="?([^"]+)"?/i,
    );

  return (
    normalMatch?.[1]
      ?.trim() ||
    ""
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function SaoLuuPage() {
  const router =
    useRouter();

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null,
    );

  const [
    backupInfo,
    setBackupInfo,
  ] =
    useState<BackupInfo | null>(
      null,
    );

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    preview,
    setPreview,
  ] =
    useState<RestorePreview | null>(
      null,
    );

  const [
    confirmText,
    setConfirmText,
  ] =
    useState(
      "",
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false,
    );

  const [
    backupLoading,
    setBackupLoading,
  ] =
    useState(
      false,
    );

  const [
    previewLoading,
    setPreviewLoading,
  ] =
    useState(
      false,
    );

  const [
    restoreLoading,
    setRestoreLoading,
  ] =
    useState(
      false,
    );

  const [
    showRestoreConfirm,
    setShowRestoreConfirm,
  ] =
    useState(
      false,
    );

  const [
    message,
    setMessage,
  ] =
    useState<MessageState | null>(
      null,
    );

  /* =======================================================
     CURRENT USER
  ======================================================= */

  const loadCurrentUser =
    useCallback(
      async () => {
        const response =
          await fetch(
            "/api/auth/me",
            {
              credentials:
                "include",

              cache:
                "no-store",
            },
          );

        const result =
          await parseJson(
            response,
          );

        if (
          response.status ===
            401 ||
          !result.success
        ) {
          router.replace(
            "/login",
          );

          return null;
        }

        let user =
          result.user;

        if (
          !user &&
          result.data &&
          typeof result.data ===
            "object"
        ) {
          const raw =
            result.data as Record<
              string,
              unknown
            >;

          const source =
            raw.user &&
            typeof raw.user ===
              "object"
              ? raw.user as Record<
                  string,
                  unknown
                >
              : raw;

          user = {
            id:
              getId(
                source.id ??
                  source._id ??
                  source.userId,
              ),

            username:
              String(
                source.username ??
                  "",
              ),

            fullName:
              String(
                source.fullName ??
                  source.hoTen ??
                  source.username ??
                  "",
              ),

            role:
              String(
                source.role ??
                  "",
              ) as UserRole,
          };
        }

        if (
          !user ||
          user.role !==
            "ADMIN"
        ) {
          router.replace(
            "/dashboard",
          );

          return null;
        }

        setCurrentUser(
          user,
        );

        return user;
      },
      [
        router,
      ],
    );

  /* =======================================================
     BACKUP INFO
  ======================================================= */

  const loadBackupInfo =
    useCallback(
      async (
        showRefresh =
          false,
      ) => {
        try {
          if (
            showRefresh
          ) {
            setRefreshing(
              true,
            );
          }

          const response =
            await fetch(
              "/api/sao-luu",
              {
                credentials:
                  "include",

                cache:
                  "no-store",
              },
            );

          const result =
            await parseJson(
              response,
            );

          if (
            response.status ===
              401
          ) {
            router.replace(
              "/login",
            );

            return;
          }

          if (
            response.status ===
              403
          ) {
            router.replace(
              "/dashboard",
            );

            return;
          }

          if (
            !response.ok ||
            !result.success ||
            !result.data
          ) {
            throw new Error(
              result.message ||
                "Không thể lấy thông tin sao lưu",
            );
          }

          setBackupInfo(
            result.data as BackupInfo,
          );
        } catch (
          error
        ) {
          setMessage({
            type:
              "error",

            text:
              error instanceof
                Error
                ? error.message
                : "Không thể lấy thông tin sao lưu",
          });
        } finally {
          setRefreshing(
            false,
          );
        }
      },
      [
        router,
      ],
    );

  /* =======================================================
     INITIAL
  ======================================================= */

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            void (
              async () => {
                try {
                  setLoading(
                    true,
                  );

                  const user =
                    await loadCurrentUser();

                  if (!user) {
                    return;
                  }

                  await loadBackupInfo();
                } finally {
                  setLoading(
                    false,
                  );
                }
              }
            )();
          },
          0,
        );

      return () => {
        window.clearTimeout(
          timer,
        );
      };
    },
    [
      loadBackupInfo,
      loadCurrentUser,
    ],
  );

  /* =======================================================
     MESSAGE
  ======================================================= */

  function showMessage(
    type:
      MessageState["type"],

    text:
      string,
  ) {
    setMessage({
      type,
      text,
    });

    window.scrollTo({
      top: 0,

      behavior:
        "smooth",
    });
  }

  /* =======================================================
     CREATE BACKUP
  ======================================================= */

  async function handleCreateBackup() {
    try {
      setBackupLoading(
        true,
      );

      setMessage(
        null,
      );

      const response =
        await fetch(
          "/api/sao-luu",
          {
            method:
              "POST",

            credentials:
              "include",

            cache:
              "no-store",
          },
        );

      if (
        response.status ===
          401
      ) {
        router.replace(
          "/login",
        );

        return;
      }

      if (
        response.status ===
          403
      ) {
        router.replace(
          "/dashboard",
        );

        return;
      }

      if (
        !response.ok
      ) {
        const result =
          await parseJson(
            response,
          );

        throw new Error(
          result.message ||
            "Không thể tạo bản sao lưu",
        );
      }

      const blob =
        await response.blob();

      const headerFileName =
        response.headers.get(
          "x-backup-file",
        );

      const dispositionName =
        getDownloadFileName(
          response.headers.get(
            "content-disposition",
          ),
        );

      const fileName =
        headerFileName ||
        dispositionName ||
        `lch-backup-${Date.now()}.json`;

      const url =
        URL.createObjectURL(
          blob,
        );

      const anchor =
        document.createElement(
          "a",
        );

      anchor.href =
        url;

      anchor.download =
        fileName;

      document.body.appendChild(
        anchor,
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        url,
      );

      showMessage(
        "success",
        `Đã tạo bản sao lưu "${fileName}" thành công.`,
      );

      await loadBackupInfo();
    } catch (
      error
    ) {
      showMessage(
        "error",

        error instanceof
          Error
          ? error.message
          : "Không thể tạo bản sao lưu",
      );
    } finally {
      setBackupLoading(
        false,
      );
    }
  }

  /* =======================================================
     FILE SELECT
  ======================================================= */

  function resetRestore() {
    setSelectedFile(
      null,
    );

    setPreview(
      null,
    );

    setConfirmText(
      "",
    );

    setShowRestoreConfirm(
      false,
    );

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] ??
      null;

    setMessage(
      null,
    );

    setPreview(
      null,
    );

    setConfirmText(
      "",
    );

    if (!file) {
      setSelectedFile(
        null,
      );

      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(
          ".json",
        )
    ) {
      showMessage(
        "error",
        "Chỉ chấp nhận file sao lưu định dạng .json",
      );

      event.target.value =
        "";

      return;
    }

    if (
      file.size >
      100 *
        1024 *
        1024
    ) {
      showMessage(
        "error",
        "File sao lưu vượt quá giới hạn 100 MB",
      );

      event.target.value =
        "";

      return;
    }

    setSelectedFile(
      file,
    );
  }

  /* =======================================================
     PREVIEW RESTORE
  ======================================================= */

  async function handlePreview() {
    if (
      !selectedFile
    ) {
      showMessage(
        "error",
        "Vui lòng chọn file sao lưu trước.",
      );

      return;
    }

    try {
      setPreviewLoading(
        true,
      );

      setMessage(
        null,
      );

      setPreview(
        null,
      );

      setConfirmText(
        "",
      );

      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile,
      );

      const response =
        await fetch(
          "/api/sao-luu/phuc-hoi",
          {
            method:
              "POST",

            credentials:
              "include",

            body:
              formData,
          },
        );

      const result =
        await parseJson(
          response,
        );

      if (
        response.status ===
          401
      ) {
        router.replace(
          "/login",
        );

        return;
      }

      if (
        response.status ===
          403
      ) {
        router.replace(
          "/dashboard",
        );

        return;
      }

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.message ||
            "Không thể kiểm tra file sao lưu",
        );
      }

      setPreview(
        result.data as RestorePreview,
      );

      showMessage(
        "success",
        "File sao lưu hợp lệ. Hãy kiểm tra thông tin trước khi phục hồi.",
      );
    } catch (
      error
    ) {
      showMessage(
        "error",

        error instanceof
          Error
          ? error.message
          : "Không thể kiểm tra file sao lưu",
      );
    } finally {
      setPreviewLoading(
        false,
      );
    }
  }

  /* =======================================================
     RESTORE
  ======================================================= */

  function requestRestore() {
    if (
      !selectedFile ||
      !preview
    ) {
      showMessage(
        "error",
        "Bạn phải kiểm tra file sao lưu trước khi phục hồi.",
      );

      return;
    }

    if (
      confirmText !==
      preview.confirmText
    ) {
      showMessage(
        "error",
        `Vui lòng nhập chính xác "${preview.confirmText}" để xác nhận.`,
      );

      return;
    }

    setShowRestoreConfirm(
      true,
    );
  }

  async function handleRestore() {
    if (
      !selectedFile ||
      !preview
    ) {
      return;
    }

    try {
      setRestoreLoading(
        true,
      );

      setMessage(
        null,
      );

      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile,
      );

      formData.append(
        "confirm",
        confirmText,
      );

      const response =
        await fetch(
          "/api/sao-luu/phuc-hoi",
          {
            method:
              "PUT",

            credentials:
              "include",

            body:
              formData,
          },
        );

      const result =
        await parseJson(
          response,
        );

      if (
        response.status ===
          401
      ) {
        router.replace(
          "/login",
        );

        return;
      }

      if (
        response.status ===
          403
      ) {
        router.replace(
          "/dashboard",
        );

        return;
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể phục hồi dữ liệu",
        );
      }

      setShowRestoreConfirm(
        false,
      );

      resetRestore();

      showMessage(
        "success",
        result.message ||
          "Phục hồi dữ liệu thành công.",
      );

      /*
       * Sau restore, tài khoản/session có thể
       * đã bị thay đổi nếu collection users
       * nằm trong file backup.
       *
       * Kiểm tra lại quyền hiện tại.
       */
      const user =
        await loadCurrentUser();

      if (!user) {
        return;
      }

      await loadBackupInfo(
        true,
      );
    } catch (
      error
    ) {
      setShowRestoreConfirm(
        false,
      );

      showMessage(
        "error",

        error instanceof
          Error
          ? error.message
          : "Không thể phục hồi dữ liệu",
      );
    } finally {
      setRestoreLoading(
        false,
      );
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2
          size={36}
          className="animate-spin text-[#123b68]"
        />
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-full bg-[#f4f7fb] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1600px]">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123b68]">
              Quản trị hệ thống
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Sao lưu và phục hồi dữ liệu
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Tạo bản sao lưu toàn bộ dữ liệu hệ thống và phục hồi khi cần thiết.
              Chức năng chỉ dành cho Quản trị viên.
            </p>

            {currentUser && (
              <p className="mt-1 text-xs text-slate-400">
                Đang thao tác với tài khoản{" "}
                <strong>
                  {currentUser.fullName ||
                    currentUser.username}
                </strong>
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={
              refreshing
            }
            onClick={() =>
              void loadBackupInfo(
                true,
              )
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Làm mới
          </button>
        </div>

        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (
          <div
            className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              message.type ===
              "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-start gap-2">
              {message.type ===
              "success" ? (
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              ) : (
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              )}

              <span>
                {message.text}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setMessage(
                  null,
                )
              }
              className="shrink-0"
            >
              <X
                size={17}
              />
            </button>
          </div>
        )}

        {/* =================================================
            SUMMARY
        ================================================= */}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Cơ sở dữ liệu"
            value={
              backupInfo?.database ||
              "—"
            }
            icon={
              <Database
                size={21}
              />
            }
          />

          <StatCard
            label="Tổng collection"
            value={formatNumber(
              backupInfo?.totalCollections ??
                0,
            )}
            icon={
              <Server
                size={21}
              />
            }
          />

          <StatCard
            label="Tổng bản ghi"
            value={formatNumber(
              backupInfo?.totalDocuments ??
                0,
            )}
            icon={
              <HardDrive
                size={21}
              />
            }
          />

          <StatCard
            label="Trạng thái"
            value={
              backupInfo
                ? "Sẵn sàng"
                : "Chưa xác định"
            }
            icon={
              <ShieldCheck
                size={21}
              />
            }
          />
        </section>

        {/* =================================================
            BACKUP + RESTORE
        ================================================= */}

        <section className="grid gap-5 xl:grid-cols-2">
          {/* ===============================================
              BACKUP
          =============================================== */}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#123b68]">
                  <DatabaseBackup
                    size={23}
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950">
                    Tạo bản sao lưu
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Xuất toàn bộ collection hiện có thành một file JSON có thể sử
                    dụng để phục hồi sau này.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-start gap-3">
                  <FileJson
                    size={20}
                    className="mt-0.5 shrink-0 text-blue-700"
                  />

                  <div className="text-sm leading-6 text-blue-900">
                    <p className="font-semibold">
                      File backup bảo toàn kiểu dữ liệu MongoDB
                    </p>

                    <p className="mt-1 text-blue-700">
                      ObjectId, Date và các kiểu BSON được giữ nguyên bằng Extended
                      JSON để phục vụ quá trình khôi phục.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <SmallInfo
                  label="Collection"
                  value={formatNumber(
                    backupInfo?.totalCollections ??
                      0,
                  )}
                />

                <SmallInfo
                  label="Bản ghi"
                  value={formatNumber(
                    backupInfo?.totalDocuments ??
                      0,
                  )}
                />
              </div>

              <button
                type="button"
                disabled={
                  backupLoading ||
                  !backupInfo
                }
                onClick={() =>
                  void handleCreateBackup()
                }
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#123b68] px-5 text-sm font-semibold text-white transition hover:bg-[#0e3158] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {backupLoading ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Download
                    size={18}
                  />
                )}

                {backupLoading
                  ? "Đang tạo bản sao lưu..."
                  : "Tạo và tải bản sao lưu"}
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                Sau khi tạo thành công, thao tác sẽ được ghi vào Nhật ký hệ thống.
              </p>
            </div>
          </div>

          {/* ===============================================
              RESTORE
          =============================================== */}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <RotateCcw
                    size={23}
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950">
                    Phục hồi dữ liệu
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Chọn file backup, kiểm tra nội dung trước và chỉ phục hồi sau khi
                    xác nhận.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept=".json,application/json"
                onChange={
                  handleFileChange
                }
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex min-h-[150px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-[#123b68] hover:bg-blue-50/30"
              >
                <Upload
                  size={30}
                  className="text-[#123b68]"
                />

                <p className="mt-3 text-sm font-semibold text-slate-800">
                  Chọn file sao lưu JSON
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Tối đa 100 MB
                </p>
              </button>

              {selectedFile && (
                <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <FileCheck2
                      size={21}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {selectedFile.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatFileSize(
                          selectedFile.size,
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      resetRestore
                    }
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                  >
                    <X
                      size={17}
                    />
                  </button>
                </div>
              )}

              <button
                type="button"
                disabled={
                  !selectedFile ||
                  previewLoading
                }
                onClick={() =>
                  void handlePreview()
                }
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#123b68] bg-white px-4 text-sm font-semibold text-[#123b68] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {previewLoading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <FileCheck2
                    size={17}
                  />
                )}

                {previewLoading
                  ? "Đang kiểm tra..."
                  : "Kiểm tra file trước khi phục hồi"}
              </button>
            </div>
          </div>
        </section>

        {/* =================================================
            CURRENT COLLECTIONS
        ================================================= */}

        {backupInfo && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-950">
                Dữ liệu hiện tại
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {formatNumber(
                  backupInfo.totalCollections,
                )}{" "}
                collection với{" "}
                {formatNumber(
                  backupInfo.totalDocuments,
                )}{" "}
                bản ghi.
              </p>
            </div>

            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      STT
                    </th>

                    <th className="px-5 py-3">
                      Collection
                    </th>

                    <th className="px-5 py-3 text-right">
                      Số bản ghi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {backupInfo.collections.map(
                    (
                      item,
                      index,
                    ) => (
                      <tr
                        key={
                          item.name
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-3 text-slate-400">
                          {index +
                            1}
                        </td>

                        <td className="px-5 py-3 font-mono text-sm font-medium text-slate-700">
                          {item.name}
                        </td>

                        <td className="px-5 py-3 text-right font-semibold text-slate-900">
                          {formatNumber(
                            item.count,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* =================================================
            RESTORE PREVIEW
        ================================================= */}

        {preview && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={22}
                  className="mt-0.5 shrink-0 text-amber-700"
                />

                <div>
                  <h2 className="font-bold text-amber-950">
                    Xem trước dữ liệu phục hồi
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    {preview.warning}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SmallInfo
                  label="File"
                  value={
                    preview.fileName
                  }
                />

                <SmallInfo
                  label="Phiên bản"
                  value={`v${preview.version}`}
                />

                <SmallInfo
                  label="Ngày tạo"
                  value={formatDateTime(
                    preview.createdAt,
                  )}
                />

                <SmallInfo
                  label="Database nguồn"
                  value={
                    preview.sourceDatabase ||
                    "—"
                  }
                />

                <SmallInfo
                  label="Database đích"
                  value={
                    preview.targetDatabase ||
                    "—"
                  }
                />

                <SmallInfo
                  label="Collection"
                  value={formatNumber(
                    preview.summary
                      .totalCollections,
                  )}
                />

                <SmallInfo
                  label="Bản ghi trong backup"
                  value={formatNumber(
                    preview.summary
                      .totalDocuments,
                  )}
                />

                <SmallInfo
                  label="Bản ghi hiện tại"
                  value={formatNumber(
                    preview.summary
                      .currentTotalDocuments,
                  )}
                />
              </div>

              {preview.createdBy && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Bản sao lưu được tạo bởi{" "}
                  <strong className="text-slate-800">
                    {preview.createdBy
                      .fullName ||
                      preview.createdBy
                        .username ||
                      "Không xác định"}
                  </strong>
                  {preview.createdBy
                    .username
                    ? ` (@${preview.createdBy.username})`
                    : ""}
                  .
                </div>
              )}

              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">
                          Collection
                        </th>

                        <th className="px-4 py-3 text-right">
                          Hiện tại
                        </th>

                        <th className="px-4 py-3 text-right">
                          Sau phục hồi
                        </th>

                        <th className="px-4 py-3 text-right">
                          Thay đổi
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {preview.collections.map(
                        (
                          item,
                        ) => {
                          const difference =
                            item.count -
                            item.currentCount;

                          return (
                            <tr
                              key={
                                item.name
                              }
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 font-mono font-medium text-slate-700">
                                {item.name}
                              </td>

                              <td className="px-4 py-3 text-right">
                                {formatNumber(
                                  item.currentCount,
                                )}
                              </td>

                              <td className="px-4 py-3 text-right font-semibold">
                                {formatNumber(
                                  item.count,
                                )}
                              </td>

                              <td
                                className={`px-4 py-3 text-right font-semibold ${
                                  difference >
                                  0
                                    ? "text-emerald-600"
                                    : difference <
                                        0
                                      ? "text-red-600"
                                      : "text-slate-400"
                                }`}
                              >
                                {difference >
                                0
                                  ? "+"
                                  : ""}
                                {formatNumber(
                                  difference,
                                )}
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ===========================================
                  CONFIRM TEXT
              =========================================== */}

              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert
                    size={21}
                    className="mt-0.5 shrink-0 text-red-600"
                  />

                  <div className="flex-1">
                    <p className="font-semibold text-red-800">
                      Xác nhận thao tác nguy hiểm
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-700">
                      Dữ liệu hiện tại của các collection trong file sẽ bị thay thế.
                      Nhập chính xác{" "}
                      <strong>
                        {preview.confirmText}
                      </strong>{" "}
                      để mở khóa nút phục hồi.
                    </p>

                    <input
                      value={
                        confirmText
                      }
                      onChange={(
                        event,
                      ) =>
                        setConfirmText(
                          event.target.value,
                        )
                      }
                      autoComplete="off"
                      placeholder={preview.confirmText}
                      className="mt-3 h-11 w-full max-w-md rounded-lg border border-red-300 bg-white px-3 font-mono text-sm font-semibold outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={
                    restoreLoading
                  }
                  onClick={
                    resetRestore
                  }
                  className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Hủy phục hồi
                </button>

                <button
                  type="button"
                  disabled={
                    restoreLoading ||
                    confirmText !==
                      preview.confirmText
                  }
                  onClick={
                    requestRestore
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw
                    size={17}
                  />

                  Phục hồi dữ liệu
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ===================================================
          FINAL CONFIRM MODAL
      =================================================== */}

      {showRestoreConfirm &&
        preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="p-5 sm:p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <ShieldAlert
                    size={26}
                  />
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-950">
                  Xác nhận phục hồi dữ liệu
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Bạn đang chuẩn bị thay thế dữ liệu của{" "}
                  <strong>
                    {formatNumber(
                      preview.summary
                        .totalCollections,
                    )}{" "}
                    collection
                  </strong>{" "}
                  bằng{" "}
                  <strong>
                    {formatNumber(
                      preview.summary
                        .totalDocuments,
                    )}{" "}
                    bản ghi
                  </strong>{" "}
                  từ file{" "}
                  <strong>
                    {preview.fileName}
                  </strong>
                  .
                </p>

                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  Không đóng trình duyệt hoặc tắt server trong quá trình phục hồi.
                  Nếu có lỗi, backend sẽ cố rollback các collection đã thay đổi.
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={
                    restoreLoading
                  }
                  onClick={() =>
                    setShowRestoreConfirm(
                      false,
                    )
                  }
                  className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 disabled:opacity-50"
                >
                  Quay lại
                </button>

                <button
                  type="button"
                  disabled={
                    restoreLoading
                  }
                  onClick={() =>
                    void handleRestore()
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {restoreLoading ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <RotateCcw
                      size={17}
                    />
                  )}

                  {restoreLoading
                    ? "Đang phục hồi..."
                    : "Xác nhận phục hồi"}
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;

  value:
    string | number;

  icon: ReactNode;
}) {
  return (
    <div className="flex min-h-[105px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">
          {label}
        </p>

        <p className="mt-2 truncate text-xl font-bold text-slate-950">
          {value}
        </p>
      </div>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#123b68]">
        {icon}
      </div>
    </div>
  );
}

function SmallInfo({
  label,
  value,
}: {
  label: string;

  value:
    string | number;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}