"use client";

import {
  CircleDot,
  Clock3,
  ExternalLink,
  FileText,
  Filter,
  Inbox,
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type Role =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type TrangThai =
  | "MOI"
  | "DA_TIEP_NHAN"
  | "DANG_XU_LY"
  | "CHO_BO_SUNG"
  | "DA_XU_LY"
  | "DONG";

type LoaiHoTro =
  | "TAI_KHOAN"
  | "HOI_VIEN"
  | "HOAT_DONG"
  | "HOI_PHI"
  | "TAI_CHINH"
  | "VAN_KIEN"
  | "KHAC";

type MucDo =
  | "THAP"
  | "TRUNG_BINH"
  | "CAO";

type HanhDongXuLy =
  | "TAO_YEU_CAU"
  | "TIEP_NHAN"
  | "PHAN_HOI"
  | "CAP_NHAT_TRANG_THAI"
  | "DONG_YEU_CAU"
  | "MO_LAI";

type Attachment = {
  tenTep:
    string;

  duongDan:
    string;

  pathname?:
    string;

  mimeType?:
    string;

  kichThuoc?:
    number;
};

type PhanHoi = {
  _id?:
    string;

  nguoiGuiTen:
    string;

  vaiTro:
    Role;

  noiDung:
    string;

  tepDinhKem?:
    Attachment[];

  createdAt:
    string;
};

type LichSuXuLy = {
  _id?:
    string;

  nguoiThucHienTen:
    string;

  vaiTro:
    Role;

  hanhDong:
    HanhDongXuLy;

  trangThaiCu?:
    TrangThai | null;

  trangThaiMoi?:
    TrangThai | null;

  ghiChu?:
    string;

  createdAt:
    string;
};

type Ticket = {
  _id:
    string;

  maYeuCau:
    string;

  tieuDe:
    string;

  noiDung:
    string;

  loai:
    LoaiHoTro;

  mucDo:
    MucDo;

  trangThai:
    TrangThai;

  nguoiGuiTen:
    string;

  nguoiGuiVaiTro:
    Role;

  nguoiXuLyTen?:
    string;

  tepDinhKem?:
    Attachment[];

  phanHoi:
    PhanHoi[];

  lichSuXuLy?:
    LichSuXuLy[];

  thoiGianTiepNhan?:
    string | null;

  thoiGianXuLyXong?:
    string | null;

  thoiGianDong?:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;
};

type Permissions = {
  canManage:
    boolean;
};

type Summary = {
  total:
    number;

  moi:
    number;

  daTiepNhan:
    number;

  dangXuLy:
    number;

  choBoSung:
    number;

  daXuLy:
    number;

  dong:
    number;
};

type ApiResult = {
  success:
    boolean;

  message?:
    string;

  data?:
    unknown;

  summary?:
    Summary;

  permissions?:
    Permissions;
};

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_SUMMARY:
  Summary = {
    total: 0,

    moi: 0,

    daTiepNhan: 0,

    dangXuLy: 0,

    choBoSung: 0,

    daXuLy: 0,

    dong: 0,
  };

const MAX_FILES =
  5;

const MAX_FILE_SIZE =
  10 *
  1024 *
  1024;

const ALLOWED_EXTENSIONS =
  new Set([
    "png",
    "jpg",
    "jpeg",
    "webp",
    "pdf",
  ]);

/* =========================================================
   HELPERS
========================================================= */

async function parseResponse(
  response:
    Response,
): Promise<ApiResult> {
  const text =
    await response.text();

  if (!text.trim()) {
    return {
      success:
        false,

      message:
        `Máy chủ không trả dữ liệu. HTTP ${response.status}`,
    };
  }

  try {
    return JSON.parse(
      text,
    ) as ApiResult;
  } catch {
    return {
      success:
        false,

      message:
        `Dữ liệu máy chủ trả về không hợp lệ. HTTP ${response.status}`,
    };
  }
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
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  ).format(
    date,
  );
}

function formatFileSize(
  bytes =
    0,
) {
  if (
    bytes <=
    0
  ) {
    return "—";
  }

  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 *
      1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(
      1,
    )} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(
    1,
  )} MB`;
}

function getExtension(
  fileName:
    string,
) {
  return (
    fileName
      .split(".")
      .pop()
      ?.toLowerCase() ||
    ""
  );
}

function attachmentUrl(
  file:
    Attachment,
) {
  if (
    file.pathname
  ) {
    return `/api/ho-tro/file?pathname=${encodeURIComponent(
      file.pathname,
    )}`;
  }

  return file.duongDan;
}

function statusLabel(
  value:
    TrangThai,
) {
  const map:
    Record<
      TrangThai,
      string
    > = {
    MOI:
      "Mới",

    DA_TIEP_NHAN:
      "Đã tiếp nhận",

    DANG_XU_LY:
      "Đang xử lý",

    CHO_BO_SUNG:
      "Chờ bổ sung",

    DA_XU_LY:
      "Đã xử lý",

    DONG:
      "Đã đóng",
  };

  return map[value];
}

function roleLabel(
  value:
    Role,
) {
  const map:
    Record<
      Role,
      string
    > = {
    ADMIN:
      "Quản trị viên",

    BAN_CHAP_HANH:
      "Ban Chấp hành",

    CHI_HOI_TRUONG:
      "Chi hội trưởng",

    HOI_VIEN:
      "Hội viên",
  };

  return map[value];
}

function priorityLabel(
  value:
    MucDo,
) {
  if (
    value ===
    "CAO"
  ) {
    return "Cao";
  }

  if (
    value ===
    "THAP"
  ) {
    return "Thấp";
  }

  return "Trung bình";
}

function actionLabel(
  value:
    HanhDongXuLy,
) {
  const map:
    Record<
      HanhDongXuLy,
      string
    > = {
    TAO_YEU_CAU:
      "Tạo yêu cầu",

    TIEP_NHAN:
      "Tiếp nhận",

    PHAN_HOI:
      "Phản hồi",

    CAP_NHAT_TRANG_THAI:
      "Cập nhật trạng thái",

    DONG_YEU_CAU:
      "Đóng yêu cầu",

    MO_LAI:
      "Mở lại yêu cầu",
  };

  return map[value];
}

function validateFiles(
  files:
    File[],
) {
  if (
    files.length >
    MAX_FILES
  ) {
    return `Chỉ được chọn tối đa ${MAX_FILES} tệp`;
  }

  for (
    const file of
    files
  ) {
    const extension =
      getExtension(
        file.name,
      );

    if (
      !ALLOWED_EXTENSIONS.has(
        extension,
      )
    ) {
      return `Tệp "${file.name}" không đúng định dạng cho phép`;
    }

    if (
      file.size <=
      0
    ) {
      return `Tệp "${file.name}" không có dữ liệu`;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return `Tệp "${file.name}" vượt quá 10MB`;
    }
  }

  return "";
}

/* =========================================================
   PAGE
========================================================= */

export default function HoTroPage() {
  const createFileRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const replyFileRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    items,
    setItems,
  ] =
    useState<
      Ticket[]
    >([]);

  const [
    permissions,
    setPermissions,
  ] =
    useState<Permissions>({
      canManage:
        false,
    });

  const [
    summary,
    setSummary,
  ] =
    useState<Summary>({
      ...EMPTY_SUMMARY,
    });

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false,
    );

  const [
    uploading,
    setUploading,
  ] =
    useState(
      false,
    );

  const [
    processingId,
    setProcessingId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      "",
    );

  const [
    isError,
    setIsError,
  ] =
    useState(
      false,
    );

  /* =======================================================
     FILTER
  ======================================================= */

  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const [
    appliedSearch,
    setAppliedSearch,
  ] =
    useState(
      "",
    );

  const [
    filterStatus,
    setFilterStatus,
  ] =
    useState(
      "",
    );

  const [
    filterType,
    setFilterType,
  ] =
    useState(
      "",
    );

  const [
    filterPriority,
    setFilterPriority,
  ] =
    useState(
      "",
    );

  /* =======================================================
     CREATE
  ======================================================= */

  const [
    tieuDe,
    setTieuDe,
  ] =
    useState(
      "",
    );

  const [
    noiDung,
    setNoiDung,
  ] =
    useState(
      "",
    );

  const [
    loai,
    setLoai,
  ] =
    useState<LoaiHoTro>(
      "KHAC",
    );

  const [
    mucDo,
    setMucDo,
  ] =
    useState<MucDo>(
      "TRUNG_BINH",
    );

  const [
    selectedFiles,
    setSelectedFiles,
  ] =
    useState<
      File[]
    >([]);

  /* =======================================================
     REPLY
  ======================================================= */

  const [
    replyText,
    setReplyText,
  ] =
    useState(
      "",
    );

  const [
    replyFiles,
    setReplyFiles,
  ] =
    useState<
      File[]
    >([]);

  /* =======================================================
     SELECTED
  ======================================================= */

  const selectedTicket =
    useMemo(
      () =>
        items.find(
          (
            item,
          ) =>
            item._id ===
            selectedId,
        ) ||
        null,
      [
        items,
        selectedId,
      ],
    );

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData =
    useCallback(
      async () => {
        try {
          setLoading(
            true,
          );

          const query =
            new URLSearchParams();

          if (
            appliedSearch.trim()
          ) {
            query.set(
              "search",
              appliedSearch.trim(),
            );
          }

          if (
            filterStatus
          ) {
            query.set(
              "trangThai",
              filterStatus,
            );
          }

          if (
            filterType
          ) {
            query.set(
              "loai",
              filterType,
            );
          }

          if (
            filterPriority
          ) {
            query.set(
              "mucDo",
              filterPriority,
            );
          }

          const response =
            await fetch(
              query.toString()
                ? `/api/ho-tro?${query.toString()}`
                : "/api/ho-tro",
              {
                cache:
                  "no-store",

                credentials:
                  "include",
              },
            );

          const result =
            await parseResponse(
              response,
            );

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ||
                "Không thể tải yêu cầu hỗ trợ",
            );
          }

          const nextItems =
            Array.isArray(
              result.data,
            )
              ? result.data as
                  Ticket[]
              : [];

          setItems(
            nextItems,
          );

          setSummary(
            result.summary ||
              {
                ...EMPTY_SUMMARY,
              },
          );

          setPermissions(
            result.permissions ||
              {
                canManage:
                  false,
              },
          );
        } catch (
          error
        ) {
          setIsError(
            true,
          );

          setMessage(
            error instanceof
              Error
              ? error.message
              : "Không thể tải dữ liệu",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        appliedSearch,
        filterPriority,
        filterStatus,
        filterType,
      ],
    );

  /*
   * Quan trọng:
   * Không gọi loadData() trực tiếp trong effect body.
   * React ESLint mới sẽ báo react-hooks/set-state-in-effect
   * vì loadData có setLoading(true) trước await.
   */
  useEffect(
    () => {
      const timeoutId =
        window.setTimeout(
          () => {
            void loadData();
          },
          0,
        );

      return () => {
        window.clearTimeout(
          timeoutId,
        );
      };
    },
    [
      loadData,
    ],
  );

  /* =======================================================
     FILE SELECTION
  ======================================================= */

  function addFiles(
    current:
      File[],

    incoming:
      File[],

    setter:
      (
        files:
          File[],
      ) => void,
  ) {
    const merged = [
      ...current,
    ];

    for (
      const file of
      incoming
    ) {
      const duplicate =
        merged.some(
          (
            item,
          ) =>
            item.name ===
              file.name &&
            item.size ===
              file.size &&
            item.lastModified ===
              file.lastModified,
        );

      if (
        !duplicate
      ) {
        merged.push(
          file,
        );
      }
    }

    const validationError =
      validateFiles(
        merged,
      );

    if (
      validationError
    ) {
      setIsError(
        true,
      );

      setMessage(
        validationError,
      );

      return;
    }

    setter(
      merged,
    );

    setIsError(
      false,
    );

    setMessage(
      "",
    );
  }

  function handleCreateFiles(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    addFiles(
      selectedFiles,

      Array.from(
        event.target.files ||
          [],
      ),

      setSelectedFiles,
    );

    event.target.value =
      "";
  }

  function handleReplyFiles(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    addFiles(
      replyFiles,

      Array.from(
        event.target.files ||
          [],
      ),

      setReplyFiles,
    );

    event.target.value =
      "";
  }

  /* =======================================================
     UPLOAD
  ======================================================= */

  async function uploadFiles(
    files:
      File[],
  ) {
    if (
      files.length ===
      0
    ) {
      return [] as
        Attachment[];
    }

    setUploading(
      true,
    );

    try {
      const data =
        new FormData();

      for (
        const file of
        files
      ) {
        data.append(
          "files",
          file,
        );
      }

      const response =
        await fetch(
          "/api/ho-tro/upload",
          {
            method:
              "POST",

            credentials:
              "include",

            body:
              data,
          },
        );

      const result =
        await parseResponse(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể tải tệp lên",
        );
      }

      if (
        !Array.isArray(
          result.data,
        )
      ) {
        throw new Error(
          "Dữ liệu tệp tải lên không hợp lệ",
        );
      }

      return result.data as
        Attachment[];
    } finally {
      setUploading(
        false,
      );
    }
  }

  /* =======================================================
     CREATE TICKET
  ======================================================= */

  async function createTicket(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !tieuDe.trim()
    ) {
      setIsError(
        true,
      );

      setMessage(
        "Vui lòng nhập tiêu đề yêu cầu",
      );

      return;
    }

    if (
      !noiDung.trim()
    ) {
      setIsError(
        true,
      );

      setMessage(
        "Vui lòng nhập nội dung yêu cầu",
      );

      return;
    }

    try {
      setSaving(
        true,
      );

      setMessage(
        "",
      );

      setIsError(
        false,
      );

      const attachments =
        await uploadFiles(
          selectedFiles,
        );

      const response =
        await fetch(
          "/api/ho-tro",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                tieuDe:
                  tieuDe.trim(),

                noiDung:
                  noiDung.trim(),

                loai,

                mucDo,

                tepDinhKem:
                  attachments,
              }),
          },
        );

      const result =
        await parseResponse(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể gửi yêu cầu",
        );
      }

      setTieuDe(
        "",
      );

      setNoiDung(
        "",
      );

      setLoai(
        "KHAC",
      );

      setMucDo(
        "TRUNG_BINH",
      );

      setSelectedFiles(
        [],
      );

      setIsError(
        false,
      );

      setMessage(
        result.message ||
          "Gửi yêu cầu thành công",
      );

      await loadData();
    } catch (
      error
    ) {
      setIsError(
        true,
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Không thể gửi yêu cầu",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  /* =======================================================
     SEND REPLY
  ======================================================= */

  async function sendReply(
    complete =
      false,
  ) {
    if (
      !selectedTicket
    ) {
      return;
    }

    if (
      !replyText.trim() &&
      replyFiles.length ===
        0
    ) {
      setIsError(
        true,
      );

      setMessage(
        "Vui lòng nhập nội dung hoặc chọn tệp đính kèm",
      );

      return;
    }

    try {
      setProcessingId(
        selectedTicket._id,
      );

      setMessage(
        "",
      );

      setIsError(
        false,
      );

      const attachments =
        await uploadFiles(
          replyFiles,
        );

      const response =
        await fetch(
          `/api/ho-tro/${selectedTicket._id}`,
          {
            method:
              "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "ADD_REPLY",

                noiDung:
                  replyText.trim(),

                tepDinhKem:
                  attachments,

                danhDauDaXuLy:
                  complete,
              }),
          },
        );

      const result =
        await parseResponse(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể gửi phản hồi",
        );
      }

      setReplyText(
        "",
      );

      setReplyFiles(
        [],
      );

      setIsError(
        false,
      );

      setMessage(
        result.message ||
          "Đã gửi phản hồi",
      );

      await loadData();
    } catch (
      error
    ) {
      setIsError(
        true,
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Không thể gửi phản hồi",
      );
    } finally {
      setProcessingId(
        null,
      );
    }
  }

  /* =======================================================
     UPDATE STATUS
  ======================================================= */

  async function updateStatus(
    ticketId:
      string,

    trangThai:
      TrangThai,
  ) {
    try {
      setProcessingId(
        ticketId,
      );

      setMessage(
        "",
      );

      setIsError(
        false,
      );

      const response =
        await fetch(
          `/api/ho-tro/${ticketId}`,
          {
            method:
              "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "UPDATE_STATUS",

                trangThai,
              }),
          },
        );

      const result =
        await parseResponse(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể cập nhật trạng thái",
        );
      }

      setIsError(
        false,
      );

      setMessage(
        result.message ||
          "Cập nhật trạng thái thành công",
      );

      await loadData();
    } catch (
      error
    ) {
      setIsError(
        true,
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Không thể cập nhật trạng thái",
      );
    } finally {
      setProcessingId(
        null,
      );
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-full bg-[#f4f7fb] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1650px]">
        {/* HEADER */}

        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123b68]">
              Hỗ trợ hệ thống
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Hỗ trợ và phản hồi
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Gửi yêu cầu, đính kèm ảnh lỗi và theo dõi toàn bộ quá trình xử lý.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            disabled={
              loading
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Làm mới
          </button>
        </div>

        {/* MESSAGE */}

        {message && (
          <div
            className={`mb-5 flex items-center justify-between gap-4 rounded-xl border p-4 text-sm ${
              isError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <span>
              {message}
            </span>

            <button
              type="button"
              onClick={() =>
                setMessage(
                  "",
                )
              }
              className="shrink-0"
            >
              <X
                size={16}
              />
            </button>
          </div>
        )}

        {/* SUMMARY */}

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard
            label="Tổng"
            value={
              summary.total
            }
          />

          <SummaryCard
            label="Mới"
            value={
              summary.moi
            }
          />

          <SummaryCard
            label="Đang xử lý"
            value={
              summary.daTiepNhan +
              summary.dangXuLy
            }
          />

          <SummaryCard
            label="Chờ bổ sung"
            value={
              summary.choBoSung
            }
          />

          <SummaryCard
            label="Đã xử lý"
            value={
              summary.daXuLy
            }
          />

          <SummaryCard
            label="Đã đóng"
            value={
              summary.dong
            }
          />
        </div>

        {/* FILTER */}

        <section className="mb-5 rounded-2xl border bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px_190px_auto]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={
                  search
                }
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target.value,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    setAppliedSearch(
                      search.trim(),
                    );
                  }
                }}
                className="h-11 w-full rounded-xl border pl-10 pr-3 text-sm outline-none focus:border-[#123b68]"
                placeholder="Tìm mã, tiêu đề..."
              />
            </div>

            <select
              value={
                filterStatus
              }
              onChange={(
                event,
              ) =>
                setFilterStatus(
                  event.target.value,
                )
              }
              className="h-11 rounded-xl border px-3 text-sm"
            >
              <option value="">
                Tất cả trạng thái
              </option>

              <option value="MOI">
                Mới
              </option>

              <option value="DA_TIEP_NHAN">
                Đã tiếp nhận
              </option>

              <option value="DANG_XU_LY">
                Đang xử lý
              </option>

              <option value="CHO_BO_SUNG">
                Chờ bổ sung
              </option>

              <option value="DA_XU_LY">
                Đã xử lý
              </option>

              <option value="DONG">
                Đã đóng
              </option>
            </select>

            <select
              value={
                filterType
              }
              onChange={(
                event,
              ) =>
                setFilterType(
                  event.target.value,
                )
              }
              className="h-11 rounded-xl border px-3 text-sm"
            >
              <option value="">
                Tất cả nhóm
              </option>

              <option value="TAI_KHOAN">
                Tài khoản
              </option>

              <option value="HOI_VIEN">
                Hội viên
              </option>

              <option value="HOAT_DONG">
                Hoạt động
              </option>

              <option value="HOI_PHI">
                Hội phí
              </option>

              <option value="TAI_CHINH">
                Tài chính
              </option>

              <option value="VAN_KIEN">
                Văn kiện
              </option>

              <option value="KHAC">
                Khác
              </option>
            </select>

            <select
              value={
                filterPriority
              }
              onChange={(
                event,
              ) =>
                setFilterPriority(
                  event.target.value,
                )
              }
              className="h-11 rounded-xl border px-3 text-sm"
            >
              <option value="">
                Tất cả mức độ
              </option>

              <option value="THAP">
                Thấp
              </option>

              <option value="TRUNG_BINH">
                Trung bình
              </option>

              <option value="CAO">
                Cao
              </option>
            </select>

            <button
              type="button"
              onClick={() =>
                setAppliedSearch(
                  search.trim(),
                )
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#123b68] px-4 text-sm font-semibold text-white"
            >
              <Filter
                size={16}
              />

              Lọc
            </button>
          </div>
        </section>

        {/* CONTENT */}

        <section className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          {/* CREATE */}

          <form
            onSubmit={
              createTicket
            }
            className="h-fit rounded-2xl border bg-white shadow-sm"
          >
            <div className="border-b p-5">
              <h2 className="font-bold">
                Gửi yêu cầu hỗ trợ
              </h2>
            </div>

            <div className="space-y-4 p-5">
              <Field
                label="Tiêu đề"
              >
                <input
                  value={
                    tieuDe
                  }
                  onChange={(
                    event,
                  ) =>
                    setTieuDe(
                      event.target.value,
                    )
                  }
                  maxLength={
                    255
                  }
                  className="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:border-[#123b68]"
                  placeholder="Nhập tiêu đề yêu cầu"
                />
              </Field>

              <Field
                label="Nhóm hỗ trợ"
              >
                <select
                  value={
                    loai
                  }
                  onChange={(
                    event,
                  ) =>
                    setLoai(
                      event.target.value as
                        LoaiHoTro,
                    )
                  }
                  className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
                >
                  <option value="TAI_KHOAN">
                    Tài khoản
                  </option>

                  <option value="HOI_VIEN">
                    Hội viên
                  </option>

                  <option value="HOAT_DONG">
                    Hoạt động
                  </option>

                  <option value="HOI_PHI">
                    Hội phí
                  </option>

                  <option value="TAI_CHINH">
                    Tài chính
                  </option>

                  <option value="VAN_KIEN">
                    Văn kiện
                  </option>

                  <option value="KHAC">
                    Khác
                  </option>
                </select>
              </Field>

              <Field
                label="Mức độ"
              >
                <select
                  value={
                    mucDo
                  }
                  onChange={(
                    event,
                  ) =>
                    setMucDo(
                      event.target.value as
                        MucDo,
                    )
                  }
                  className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
                >
                  <option value="THAP">
                    Thấp
                  </option>

                  <option value="TRUNG_BINH">
                    Trung bình
                  </option>

                  <option value="CAO">
                    Cao
                  </option>
                </select>
              </Field>

              <Field
                label="Nội dung"
              >
                <textarea
                  rows={
                    6
                  }
                  value={
                    noiDung
                  }
                  onChange={(
                    event,
                  ) =>
                    setNoiDung(
                      event.target.value,
                    )
                  }
                  maxLength={
                    5000
                  }
                  className="w-full resize-none rounded-lg border p-3 text-sm outline-none focus:border-[#123b68]"
                  placeholder="Mô tả chi tiết vấn đề cần hỗ trợ..."
                />
              </Field>

              <input
                ref={
                  createFileRef
                }
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.webp,.pdf"
                onChange={
                  handleCreateFiles
                }
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  createFileRef
                    .current
                    ?.click()
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm text-slate-600 hover:border-[#123b68] hover:text-[#123b68]"
              >
                <Upload
                  size={17}
                />

                Chọn ảnh / PDF
              </button>

              <p className="text-xs leading-5 text-slate-400">
                PNG, JPG, JPEG, WEBP hoặc PDF. Tối đa 5 tệp, mỗi tệp không quá 10MB.
              </p>

              <FileSelection
                files={
                  selectedFiles
                }
                onRemove={(
                  index,
                ) =>
                  setSelectedFiles(
                    (
                      current,
                    ) =>
                      current.filter(
                        (
                          _,
                          currentIndex,
                        ) =>
                          currentIndex !==
                          index,
                      ),
                  )
                }
              />

              <button
                type="submit"
                disabled={
                  saving ||
                  uploading
                }
                className="h-11 w-full rounded-xl bg-[#123b68] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ||
                uploading
                  ? "Đang gửi..."
                  : "Gửi yêu cầu"}
              </button>
            </div>
          </form>

          {/* LIST */}

          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            {loading ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <Loader2
                  size={28}
                  className="animate-spin text-[#123b68]"
                />
              </div>
            ) : items.length ===
              0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-slate-400">
                <Inbox
                  size={42}
                />

                <p className="mt-3">
                  Chưa có yêu cầu hỗ trợ
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {items.map(
                  (
                    ticket,
                  ) => (
                    <button
                      key={
                        ticket._id
                      }
                      type="button"
                      onClick={() => {
                        setSelectedId(
                          ticket._id,
                        );

                        setReplyText(
                          "",
                        );

                        setReplyFiles(
                          [],
                        );
                      }}
                      className="block w-full p-5 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#123b68]">
                          {ticket.maYeuCau}
                        </span>

                        <StatusBadge
                          status={
                            ticket.trangThai
                          }
                        />

                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                          {priorityLabel(
                            ticket.mucDo,
                          )}
                        </span>
                      </div>

                      <h3 className="mt-2 font-bold text-slate-900">
                        {ticket.tieuDe}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                        {ticket.noiDung}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span>
                          {ticket.nguoiGuiTen}
                        </span>

                        <span>
                          {formatDateTime(
                            ticket.createdAt,
                          )}
                        </span>

                        {ticket.tepDinhKem &&
                          ticket
                            .tepDinhKem
                            .length >
                            0 && (
                            <span className="inline-flex items-center gap-1">
                              <Paperclip
                                size={12}
                              />

                              {
                                ticket
                                  .tepDinhKem
                                  .length
                              }
                            </span>
                          )}

                        {ticket.phanHoi &&
                          ticket
                            .phanHoi
                            .length >
                            0 && (
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare
                                size={12}
                              />

                              {
                                ticket
                                  .phanHoi
                                  .length
                              }
                            </span>
                          )}
                      </div>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* DETAIL DRAWER */}

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50">
          <button
            type="button"
            aria-label="Đóng"
            className="absolute inset-0 cursor-default"
            onClick={() =>
              setSelectedId(
                null,
              )
            }
          />

          <div className="relative z-10 h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
            {/* HEADER */}

            <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white p-5">
              <div className="min-w-0 pr-4">
                <p className="text-xs font-bold text-[#123b68]">
                  {selectedTicket.maYeuCau}
                </p>

                <h2 className="mt-1 break-words text-xl font-bold">
                  {selectedTicket.tieuDe}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {selectedTicket.nguoiGuiTen}
                  {" · "}
                  {formatDateTime(
                    selectedTicket.createdAt,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedId(
                    null,
                  )
                }
                className="shrink-0 rounded-lg p-2 hover:bg-slate-100"
              >
                <X />
              </button>
            </div>

            <div className="space-y-6 p-5">
              {/* BADGES */}

              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  status={
                    selectedTicket.trangThai
                  }
                />

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                  {priorityLabel(
                    selectedTicket.mucDo,
                  )}
                </span>
              </div>

              {/* CONTENT */}

              <div>
                <h3 className="font-bold">
                  Nội dung yêu cầu
                </h3>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedTicket.noiDung}
                </p>
              </div>

              {/* ORIGINAL FILES */}

              {(selectedTicket
                .tepDinhKem ||
                []).length >
                0 && (
                <div>
                  <h3 className="font-bold">
                    Tệp đính kèm
                  </h3>

                  <AttachmentGrid
                    files={
                      selectedTicket.tepDinhKem ||
                      []
                    }
                  />
                </div>
              )}

              {/* MANAGER */}

              {permissions.canManage && (
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldCheck
                      size={17}
                    />

                    Xử lý yêu cầu
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Cập nhật trạng thái xử lý hiện tại.
                  </p>

                  <select
                    value={
                      selectedTicket.trangThai
                    }
                    disabled={
                      processingId ===
                      selectedTicket._id
                    }
                    onChange={(
                      event,
                    ) =>
                      void updateStatus(
                        selectedTicket._id,

                        event.target.value as
                          TrangThai,
                      )
                    }
                    className="mt-3 h-11 w-full rounded-lg border bg-white px-3 text-sm"
                  >
                    <option value="MOI">
                      Mới
                    </option>

                    <option value="DA_TIEP_NHAN">
                      Đã tiếp nhận
                    </option>

                    <option value="DANG_XU_LY">
                      Đang xử lý
                    </option>

                    <option value="CHO_BO_SUNG">
                      Chờ bổ sung
                    </option>

                    <option value="DA_XU_LY">
                      Đã xử lý
                    </option>

                    <option value="DONG">
                      Đóng
                    </option>
                  </select>

                  {selectedTicket.nguoiXuLyTen && (
                    <p className="mt-2 text-xs text-slate-500">
                      Người xử lý:{" "}
                      <span className="font-semibold">
                        {selectedTicket.nguoiXuLyTen}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* CONVERSATION */}

              <div>
                <h3 className="flex items-center gap-2 font-bold">
                  <MessageSquare
                    size={17}
                  />

                  Trao đổi
                </h3>

                {(selectedTicket
                  .phanHoi ||
                  []).length ===
                  0 ? (
                  <div className="mt-4 rounded-xl border border-dashed p-5 text-center text-sm text-slate-400">
                    Chưa có phản hồi.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {(
                      selectedTicket
                        .phanHoi ||
                      []
                    ).map(
                      (
                        reply,
                        index,
                      ) => (
                        <div
                          key={
                            reply._id ||
                            `${reply.createdAt}-${index}`
                          }
                          className="rounded-xl border bg-slate-50 p-4"
                        >
                          <div className="flex justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">
                                {reply.nguoiGuiTen}
                              </p>

                              <p className="text-xs text-slate-400">
                                {roleLabel(
                                  reply.vaiTro,
                                )}
                              </p>
                            </div>

                            <span className="shrink-0 text-xs text-slate-400">
                              {formatDateTime(
                                reply.createdAt,
                              )}
                            </span>
                          </div>

                          {reply.noiDung && (
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {reply.noiDung}
                            </p>
                          )}

                          <AttachmentGrid
                            files={
                              reply.tepDinhKem ||
                              []
                            }
                            compact
                          />
                        </div>
                      ),
                    )}
                  </div>
                )}

                {/* REPLY FORM */}

                {selectedTicket.trangThai !==
                  "DONG" && (
                  <div className="mt-5 rounded-xl border p-4">
                    <textarea
                      rows={
                        4
                      }
                      value={
                        replyText
                      }
                      onChange={(
                        event,
                      ) =>
                        setReplyText(
                          event.target.value,
                        )
                      }
                      maxLength={
                        3000
                      }
                      className="w-full resize-none rounded-lg border p-3 text-sm outline-none focus:border-[#123b68]"
                      placeholder="Nhập nội dung phản hồi..."
                    />

                    <input
                      ref={
                        replyFileRef
                      }
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg,.webp,.pdf"
                      onChange={
                        handleReplyFiles
                      }
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        replyFileRef
                          .current
                          ?.click()
                      }
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                    >
                      <Paperclip
                        size={15}
                      />

                      Đính kèm file
                    </button>

                    <FileSelection
                      files={
                        replyFiles
                      }
                      onRemove={(
                        index,
                      ) =>
                        setReplyFiles(
                          (
                            current,
                          ) =>
                            current.filter(
                              (
                                _,
                                currentIndex,
                              ) =>
                                currentIndex !==
                                index,
                            ),
                        )
                      }
                    />

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void sendReply(
                            false,
                          )
                        }
                        disabled={
                          processingId ===
                            selectedTicket._id ||
                          uploading ||
                          (
                            !replyText.trim() &&
                            replyFiles.length ===
                              0
                          )
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingId ===
                        selectedTicket._id ? (
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <Send
                            size={15}
                          />
                        )}

                        Gửi phản hồi
                      </button>

                      {permissions.canManage && (
                        <button
                          type="button"
                          onClick={() =>
                            void sendReply(
                              true,
                            )
                          }
                          disabled={
                            processingId ===
                              selectedTicket._id ||
                            uploading ||
                            (
                              !replyText.trim() &&
                              replyFiles.length ===
                                0
                            )
                          }
                          className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Gửi & đánh dấu đã xử lý
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* HISTORY */}

              <div>
                <h3 className="flex items-center gap-2 font-bold">
                  <Clock3
                    size={17}
                  />

                  Lịch sử xử lý
                </h3>

                {(selectedTicket
                  .lichSuXuLy ||
                  []).length ===
                  0 ? (
                  <div className="mt-4 rounded-xl border border-dashed p-5 text-center text-sm text-slate-400">
                    Chưa có lịch sử xử lý.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {(
                      selectedTicket
                        .lichSuXuLy ||
                      []
                    )
                      .slice()
                      .reverse()
                      .map(
                        (
                          history,
                          index,
                        ) => (
                          <div
                            key={
                              history._id ||
                              `${history.createdAt}-${index}`
                            }
                            className="flex gap-3"
                          >
                            <CircleDot
                              size={17}
                              className="mt-1 shrink-0 text-[#123b68]"
                            />

                            <div className="min-w-0">
                              <p className="text-sm font-semibold">
                                {actionLabel(
                                  history.hanhDong,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {history.nguoiThucHienTen}
                                {" · "}
                                {roleLabel(
                                  history.vaiTro,
                                )}
                                {" · "}
                                {formatDateTime(
                                  history.createdAt,
                                )}
                              </p>

                              {history.trangThaiCu &&
                                history.trangThaiMoi &&
                                history.trangThaiCu !==
                                  history.trangThaiMoi && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {statusLabel(
                                      history.trangThaiCu,
                                    )}
                                    {" → "}
                                    {statusLabel(
                                      history.trangThaiMoi,
                                    )}
                                  </p>
                                )}

                              {history.ghiChu && (
                                <p className="mt-1 break-words text-xs text-slate-500">
                                  {history.ghiChu}
                                </p>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                  </div>
                )}
              </div>
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

function Field({
  label,
  children,
}: {
  label:
    string;

  children:
    ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    TrangThai;
}) {
  let classes =
    "bg-blue-50 text-blue-700";

  if (
    status ===
    "DA_TIEP_NHAN"
  ) {
    classes =
      "bg-indigo-50 text-indigo-700";
  }

  if (
    status ===
    "DANG_XU_LY"
  ) {
    classes =
      "bg-cyan-50 text-cyan-700";
  }

  if (
    status ===
    "DA_XU_LY"
  ) {
    classes =
      "bg-emerald-50 text-emerald-700";
  }

  if (
    status ===
    "CHO_BO_SUNG"
  ) {
    classes =
      "bg-amber-50 text-amber-700";
  }

  if (
    status ===
    "DONG"
  ) {
    classes =
      "bg-slate-100 text-slate-600";
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}
    >
      {statusLabel(
        status,
      )}
    </span>
  );
}

function FileSelection({
  files,
  onRemove,
}: {
  files:
    File[];

  onRemove:
    (
      index:
        number,
    ) => void;
}) {
  if (
    files.length ===
    0
  ) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {files.map(
        (
          file,
          index,
        ) => (
          <div
            key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
            className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">
                {file.name}
              </p>

              <p className="text-[11px] text-slate-400">
                {formatFileSize(
                  file.size,
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onRemove(
                  index,
                )
              }
              className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50"
            >
              <Trash2
                size={15}
              />
            </button>
          </div>
        ),
      )}
    </div>
  );
}

function AttachmentGrid({
  files,
  compact =
    false,
}: {
  files:
    Attachment[];

  compact?:
    boolean;
}) {
  if (
    files.length ===
    0
  ) {
    return null;
  }

  return (
    <div
      className={`grid gap-2 ${
        compact
          ? "mt-3 sm:grid-cols-2"
          : "mt-4 sm:grid-cols-2 lg:grid-cols-3"
      }`}
    >
      {files.map(
        (
          file,
          index,
        ) => (
          <a
            key={`${file.pathname || file.duongDan}-${index}`}
            href={
              attachmentUrl(
                file,
              )
            }
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-3 rounded-lg border bg-white p-3 transition hover:border-[#123b68]"
          >
            <FileText
              size={22}
              className="shrink-0 text-[#123b68]"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {file.tenTep}
              </p>

              <p className="text-[11px] text-slate-400">
                {formatFileSize(
                  file.kichThuoc,
                )}
              </p>
            </div>

            <ExternalLink
              size={13}
              className="shrink-0 text-slate-400"
            />
          </a>
        ),
      )}
    </div>
  );
}