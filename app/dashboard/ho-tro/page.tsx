"use client";

import {
  
  
  ChevronRight,
  CircleDot,
  Clock3,
  ExternalLink,
  File,
  
  FileText,
  Filter,
  
  Inbox,
  Loader2,
  MessageSquare,
  Paperclip,
  
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  
  X,
} from "lucide-react";

import {
  ChangeEvent,
  FormEvent,
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
  total:
    0,

  moi:
    0,

  daTiepNhan:
    0,

  dangXuLy:
    0,

  choBoSung:
    0,

  daXuLy:
    0,

  dong:
    0,
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

function isImageAttachment(
  file:
    Attachment,
) {
  if (
    file.mimeType?.startsWith(
      "image/",
    )
  ) {
    return true;
  }

  return [
    "png",
    "jpg",
    "jpeg",
    "webp",
  ].includes(
    getExtension(
      file.tenTep,
    ),
  );
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

/* =========================================================
   PAGE
========================================================= */

export default function HoTroPage() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    items,
    setItems,
  ] =
    useState<
      Ticket[]
    >(
      [],
    );

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
     SEARCH
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
     CREATE FORM
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
    useState<File[]>(
      [],
    );

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
     LOAD
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

          const url =
            query.toString()
              ? `/api/ho-tro?${query.toString()}`
              : "/api/ho-tro";

          const response =
            await fetch(
              url,
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

          if (
            selectedId &&
            !nextItems.some(
              (
                item,
              ) =>
                item._id ===
                selectedId,
            )
          ) {
            setSelectedId(
              null,
            );
          }
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
        selectedId,
      ],
    );

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            void loadData();
          },
          0,
        );

      return () =>
        window.clearTimeout(
          timer,
        );
    },
    [
      loadData,
    ],
  );

  /* =======================================================
     FILE SELECT
  ======================================================= */

  function handleFileSelect(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const files =
      Array.from(
        event.target.files ||
          [],
      );

    if (
      files.length ===
      0
    ) {
      return;
    }

    const nextFiles = [
      ...selectedFiles,
    ];

    for (
      const file of
      files
    ) {
      if (
        nextFiles.length >=
        MAX_FILES
      ) {
        setIsError(
          true,
        );

        setMessage(
          `Chỉ được đính kèm tối đa ${MAX_FILES} tệp`,
        );

        break;
      }

      const extension =
        getExtension(
          file.name,
        );

      if (
        !ALLOWED_EXTENSIONS.has(
          extension,
        )
      ) {
        setIsError(
          true,
        );

        setMessage(
          `Tệp "${file.name}" không đúng định dạng cho phép`,
        );

        continue;
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        setIsError(
          true,
        );

        setMessage(
          `Tệp "${file.name}" vượt quá 10MB`,
        );

        continue;
      }

      const duplicate =
        nextFiles.some(
          (
            current,
          ) =>
            current.name ===
              file.name &&
            current.size ===
              file.size,
        );

      if (!duplicate) {
        nextFiles.push(
          file,
        );
      }
    }

    setSelectedFiles(
      nextFiles,
    );

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  function removeSelectedFile(
    index:
      number,
  ) {
    setSelectedFiles(
      (
        previous,
      ) =>
        previous.filter(
          (
            _,
            currentIndex,
          ) =>
            currentIndex !==
            index,
        ),
    );
  }

  /* =======================================================
     UPLOAD
  ======================================================= */

  async function uploadFiles() {
    if (
      selectedFiles.length ===
      0
    ) {
      return [] as
        Attachment[];
    }

    setUploading(
      true,
    );

    try {
      const formData =
        new FormData();

      for (
        const file of
        selectedFiles
      ) {
        formData.append(
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
              formData,
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
          "Dữ liệu file upload không hợp lệ",
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
     CREATE
  ======================================================= */

  async function createTicket(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage(
      "",
    );

    setIsError(
      false,
    );

    if (
      !tieuDe.trim()
    ) {
      setIsError(
        true,
      );

      setMessage(
        "Tiêu đề không được để trống",
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
        "Nội dung hỗ trợ không được để trống",
      );

      return;
    }

    try {
      setSaving(
        true,
      );

      const uploadedFiles =
        await uploadFiles();

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
                  uploadedFiles,
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

      setMessage(
        result.message ||
          "Gửi yêu cầu thành công",
      );

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
     REPLY
  ======================================================= */

  async function sendReply() {
    if (
      !selectedTicket ||
      !replyText.trim()
    ) {
      return;
    }

    try {
      setProcessingId(
        selectedTicket._id,
      );

      setIsError(
        false,
      );

      setMessage(
        "",
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
     STATUS
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
     FILTER
  ======================================================= */

  function applyFilters() {
    setAppliedSearch(
      search.trim(),
    );
  }

  function resetFilters() {
    setSearch(
      "",
    );

    setAppliedSearch(
      "",
    );

    setFilterStatus(
      "",
    );

    setFilterType(
      "",
    );

    setFilterPriority(
      "",
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-full bg-[#f4f7fb] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1650px]">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123b68]">
            Hỗ trợ hệ thống
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
            Hỗ trợ và phản hồi
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Gửi yêu cầu, đính kèm ảnh lỗi/tài liệu và theo dõi quá trình xử lý.
          </p>
        </div>

        {message && (
          <div
            className={`mb-5 flex items-start justify-between rounded-xl border p-4 text-sm ${
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
            >
              <X
                size={16}
              />
            </button>
          </div>
        )}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard
            label="Tổng yêu cầu"
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
        </section>

        <section className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          {/* CREATE */}

          <form
            onSubmit={
              createTicket
            }
            className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-bold">
                Gửi yêu cầu hỗ trợ
              </h2>
            </div>

            <div className="space-y-4 p-5">
              <Field label="Tiêu đề">
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
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  placeholder="VD: Không đăng ký được hoạt động"
                />
              </Field>

              <Field label="Nhóm hỗ trợ">
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
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
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

              <Field label="Mức độ">
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
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
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

              <Field label="Nội dung">
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
                  className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm"
                  placeholder="Mô tả chi tiết vấn đề..."
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {noiDung.length}/5000
                </p>
              </Field>

              {/* ATTACHMENT */}

              <Field label="Ảnh lỗi / tài liệu">
                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.webp,.pdf"
                  onChange={
                    handleFileSelect
                  }
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    selectedFiles.length >=
                    MAX_FILES
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-600 hover:border-[#123b68] disabled:opacity-50"
                >
                  <Upload
                    size={18}
                  />

                  Chọn ảnh hoặc PDF
                </button>

                <p className="mt-2 text-xs text-slate-400">
                  PNG, JPG, WEBP, PDF · tối đa 10MB/tệp · tối đa 5 tệp
                </p>

                {selectedFiles.length >
                  0 && (
                  <div className="mt-3 space-y-2">
                    {selectedFiles.map(
                      (
                        file,
                        index,
                      ) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-700">
                              {file.name}
                            </p>

                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {formatFileSize(
                                file.size,
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeSelectedFile(
                                index,
                              )
                            }
                            className="text-red-500"
                          >
                            <Trash2
                              size={15}
                            />
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </Field>

              <button
                type="submit"
                disabled={
                  saving ||
                  uploading
                }
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#123b68] text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ||
                uploading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Send
                    size={17}
                  />
                )}

                {uploading
                  ? "Đang tải tệp..."
                  : saving
                    ? "Đang gửi..."
                    : "Gửi yêu cầu"}
              </button>
            </div>
          </form>

          {/* LIST */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold">
                    Danh sách yêu cầu
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    {items.length} yêu cầu đang hiển thị
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadData()
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm"
                >
                  <RefreshCw
                    size={15}
                  />

                  Làm mới
                </button>
              </div>

              <div className="mt-4 grid gap-2 lg:grid-cols-[1.5fr_170px_150px_140px_auto]">
                <div className="relative">
                  <Search
                    size={16}
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
                    className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm"
                    placeholder="Tìm mã, tiêu đề, người gửi..."
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
                  className="h-10 rounded-lg border bg-white px-3 text-sm"
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
                  className="h-10 rounded-lg border bg-white px-3 text-sm"
                >
                  <option value="">
                    Mọi nhóm
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
                  <option value="TAI_CHINH">
                    Tài chính
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
                  className="h-10 rounded-lg border bg-white px-3 text-sm"
                >
                  <option value="">
                    Mọi mức độ
                  </option>
                  <option value="CAO">
                    Cao
                  </option>
                  <option value="TRUNG_BINH">
                    Trung bình
                  </option>
                  <option value="THAP">
                    Thấp
                  </option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={
                      applyFilters
                    }
                    className="inline-flex h-10 items-center gap-1 rounded-lg bg-[#123b68] px-3 text-sm text-white"
                  >
                    <Filter
                      size={14}
                    />

                    Lọc
                  </button>

                  <button
                    type="button"
                    onClick={
                      resetFilters
                    }
                    className="h-10 rounded-lg border px-3"
                  >
                    <RotateCcw
                      size={14}
                    />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[350px] items-center justify-center">
                <Loader2
                  className="animate-spin"
                />
              </div>
            ) : items.length ===
              0 ? (
              <div className="flex min-h-[350px] flex-col items-center justify-center">
                <Inbox
                  size={42}
                  className="text-slate-300"
                />

                <p className="mt-3 text-sm text-slate-500">
                  Không có yêu cầu phù hợp.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map(
                  (
                    item,
                  ) => (
                    <button
                      key={
                        item._id
                      }
                      type="button"
                      onClick={() =>
                        setSelectedId(
                          item._id,
                        )
                      }
                      className="block w-full p-5 text-left hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-[#123b68]">
                              {item.maYeuCau}
                            </span>

                            <PriorityBadge
                              value={
                                item.mucDo
                              }
                            />

                            {item.tepDinhKem &&
                              item.tepDinhKem.length >
                                0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                  <Paperclip
                                    size={12}
                                  />

                                  {
                                    item
                                      .tepDinhKem
                                      .length
                                  }
                                </span>
                              )}
                          </div>

                          <p className="mt-2 font-semibold">
                            {item.tieuDe}
                          </p>

                          <p className="mt-2 text-xs text-slate-500">
                            {item.nguoiGuiTen}
                            {" · "}
                            {formatDateTime(
                              item.createdAt,
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusBadge
                            status={
                              item.trangThai
                            }
                          />

                          <ChevronRight
                            size={17}
                          />
                        </div>
                      </div>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </section>

        {/* DETAIL */}

        {selectedTicket && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b p-5">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-bold text-[#123b68]">
                      {selectedTicket.maYeuCau}
                    </span>

                    <PriorityBadge
                      value={
                        selectedTicket.mucDo
                      }
                    />

                    <StatusBadge
                      status={
                        selectedTicket.trangThai
                      }
                    />
                  </div>

                  <h2 className="mt-3 text-xl font-bold">
                    {selectedTicket.tieuDe}
                  </h2>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {selectedTicket.noiDung}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedId(
                      null,
                    )
                  }
                >
                  <X
                    size={18}
                  />
                </button>
              </div>

              {/* ATTACHMENTS */}

              {selectedTicket
                .tepDinhKem &&
                selectedTicket
                  .tepDinhKem
                  .length >
                  0 && (
                  <div className="mt-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Paperclip
                        size={16}
                      />

                      <h3 className="text-sm font-bold">
                        Tệp đính kèm
                      </h3>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {selectedTicket.tepDinhKem.map(
                        (
                          file,
                          index,
                        ) => (
                          <a
                            key={`${file.duongDan}-${index}`}
                            href={
                              file.duongDan
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:border-[#123b68]"
                          >
                            {isImageAttachment(
                              file,
                            ) ? (
                              <div className="aspect-video overflow-hidden bg-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={
                                    file.duongDan
                                  }
                                  alt={
                                    file.tenTep
                                  }
                                  className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                                />
                              </div>
                            ) : (
                              <div className="flex aspect-video items-center justify-center bg-red-50 text-red-600">
                                <FileText
                                  size={36}
                                />
                              </div>
                            )}

                            <div className="p-3">
                              <p className="truncate text-xs font-semibold text-slate-700">
                                {file.tenTep}
                              </p>

                              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                                <span>
                                  {formatFileSize(
                                    file.kichThuoc,
                                  )}
                                </span>

                                <ExternalLink
                                  size={12}
                                />
                              </div>
                            </div>
                          </a>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {permissions.canManage && (
                <div className="mt-5">
                  <select
                    value={
                      selectedTicket.trangThai
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
                    disabled={
                      processingId ===
                      selectedTicket._id
                    }
                    className="h-11 rounded-lg border bg-white px-3 text-sm"
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
                      Đã đóng
                    </option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid xl:grid-cols-2">
              {/* CHAT */}

              <div className="border-b p-5 xl:border-b-0 xl:border-r">
                <h3 className="flex items-center gap-2 font-bold">
                  <MessageSquare
                    size={17}
                  />
                  Trao đổi
                </h3>

                <div className="mt-4 space-y-3">
                  {selectedTicket.phanHoi.map(
                    (
                      reply,
                      index,
                    ) => (
                      <div
                        key={
                          reply._id ||
                          index
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

                          <span className="text-xs text-slate-400">
                            {formatDateTime(
                              reply.createdAt,
                            )}
                          </span>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                          {reply.noiDung}
                        </p>
                      </div>
                    ),
                  )}
                </div>

                {selectedTicket.trangThai !==
                  "DONG" && (
                  <div className="mt-5">
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
                      className="w-full resize-none rounded-lg border p-3 text-sm"
                      placeholder="Nhập nội dung phản hồi..."
                    />

                    <button
                      type="button"
                      onClick={() =>
                        void sendReply()
                      }
                      disabled={
                        !replyText.trim() ||
                        processingId ===
                          selectedTicket._id
                      }
                      className="mt-2 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <Send
                        size={15}
                      />

                      Gửi phản hồi
                    </button>
                  </div>
                )}
              </div>

              {/* HISTORY */}

              <div className="p-5">
                <h3 className="flex items-center gap-2 font-bold">
                  <Clock3
                    size={17}
                  />
                  Lịch sử xử lý
                </h3>

                <div className="mt-5 space-y-4">
                  {selectedTicket
                    .lichSuXuLy
                    ?.slice()
                    .reverse()
                    .map(
                      (
                        history,
                        index,
                      ) => (
                        <div
                          key={
                            history._id ||
                            index
                          }
                          className="flex gap-3"
                        >
                          <CircleDot
                            size={17}
                            className="mt-1 shrink-0 text-[#123b68]"
                          />

                          <div>
                            <p className="text-sm font-semibold">
                              {actionLabel(
                                history.hanhDong,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {history.nguoiThucHienTen}
                              {" · "}
                              {formatDateTime(
                                history.createdAt,
                              )}
                            </p>

                            {history.ghiChu && (
                              <p className="mt-1 text-xs text-slate-500">
                                {history.ghiChu}
                              </p>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                </div>

                {selectedTicket.nguoiXuLyTen && (
                  <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex gap-3">
                      <ShieldCheck
                        size={20}
                        className="text-[#123b68]"
                      />

                      <div>
                        <p className="text-xs text-blue-600">
                          Người phụ trách
                        </p>

                        <p className="font-bold text-blue-950">
                          {selectedTicket.nguoiXuLyTen}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function Field({
  label,
  children,
}: {
  label:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      {children}
    </div>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
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
  return (
    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
      {statusLabel(
        status,
      )}
    </span>
  );
}

function PriorityBadge({
  value,
}: {
  value:
    MucDo;
}) {
  const classes =
    value ===
    "CAO"
      ? "border-red-200 bg-red-50 text-red-700"
      : value ===
          "THAP"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${classes}`}
    >
      {priorityLabel(
        value,
      )}
    </span>
  );
}