"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  File as FileIcon,
  FileCheck2,
  FilePlus2,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import { upload } from "@vercel/blob/client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type TrangThaiMinhChung =
  | "DA_GUI"
  | "DA_NHAN"
  | "DA_XET_DUYET"
  | "YEU_CAU_BO_SUNG";

type CurrentUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
};

type ChiHoi = {
  _id?: string;
  id?: string;

  maChiHoi: string;
  tenChiHoi: string;
};

type HoatDong = {
  _id?: string;
  id?: string;

  maHoatDong: string;
  tenHoatDong: string;

  phamVi?: string;

  chiHoiId?:
    | string
    | ChiHoi
    | null;

  diaDiem?: string;

  thoiGianBatDau?: string;
  thoiGianKetThuc?: string;

  trangThai: string;
};

type TepDinhKem = {
  tenTep: string;

  duongDan: string;

  pathname?: string;

  mimeType?: string;

  kichThuoc?: number;
};

type UploadedFile = {
  tenTep: string;

  duongDan: string;

  pathname?: string;

  mimeType: string;

  kichThuoc: number;
};

type MinhChung = {
  _id: string;

  hoatDongId:
    | HoatDong
    | string;

  chiHoiId?:
    | ChiHoi
    | string
    | null;

  nguoiGuiId?:
    | string
    | {
        _id?: string;
        id?: string;
        username?: string;
        fullName?: string;
      }
    | null;

  nguoiGuiTen: string;

  tieuDe: string;

  moTa?: string;

  ghiChu?: string;

  tepDinhKem: TepDinhKem[];

  trangThai: TrangThaiMinhChung;

  nguoiXuLyId?:
    | string
    | null;

  nguoiXuLyTen?: string;

  noiDungYeuCauBoSung?: string;

  ngayNhan?: string;

  ngayXetDuyet?: string;

  createdAt: string;

  updatedAt?: string;
};

type MessageState = {
  type:
    | "success"
    | "error"
    | "info";

  text: string;
};

type UploadProgress =
  Record<string, number>;

type ApiResult = {
  success?: boolean;

  message?: string;

  user?: unknown;

  data?: unknown;

  activities?: unknown;
};

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const MAX_FILES = 10;

const ALLOWED_EXTENSIONS =
  new Set([
    "png",
    "jpg",
    "jpeg",

    "pdf",

    "doc",
    "docx",

    "xls",
    "xlsx",
  ]);

const FILE_ACCEPT =
  ".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx";

/* =========================================================
   HELPERS
========================================================= */

function getId(
  value:
    | string
    | {
        _id?: string;
        id?: string;
      }
    | null
    | undefined,
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

  return (
    value._id ||
    value.id ||
    ""
  );
}

function formatDateTime(
  value?:
    | string
    | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

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
      hour: "2-digit",

      minute:
        "2-digit",

      day: "2-digit",

      month: "2-digit",

      year:
        "numeric",
    },
  ).format(date);
}

function formatSize(
  value?: number,
) {
  if (
    value === undefined ||
    value === null ||
    value < 0
  ) {
    return "—";
  }

  if (value === 0) {
    return "0 B";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (
    value <
    1024 * 1024
  ) {
    return `${(
      value / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

function statusLabel(
  value:
    TrangThaiMinhChung,
) {
  switch (value) {
    case "DA_GUI":
      return "Đã gửi";

    case "DA_NHAN":
      return "Đã nhận";

    case "DA_XET_DUYET":
      return "Đã xét duyệt";

    case "YEU_CAU_BO_SUNG":
      return "Yêu cầu bổ sung";

    default:
      return value;
  }
}

function statusClass(
  value:
    TrangThaiMinhChung,
) {
  switch (value) {
    case "DA_GUI":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "DA_NHAN":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "DA_XET_DUYET":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "YEU_CAU_BO_SUNG":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function fileExtension(
  filename: string,
) {
  return (
    filename
      .split(".")
      .pop()
      ?.toLowerCase() ||
    ""
  );
}

function isImageFile(
  file:
    | File
    | TepDinhKem,
) {
  /*
   * Không dùng:
   *
   * file instanceof File
   *
   * để tránh lỗi Runtime TypeError
   * đã gặp trước đó.
   */

  if (
    "name" in file
  ) {
    if (
      typeof file.type ===
        "string" &&
      file.type.startsWith(
        "image/",
      )
    ) {
      return true;
    }

    return [
      "png",
      "jpg",
      "jpeg",
    ].includes(
      fileExtension(
        file.name,
      ),
    );
  }

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
  ].includes(
    fileExtension(
      file.tenTep,
    ),
  );
}

function getActivity(
  item: MinhChung,
): HoatDong | null {
  if (
    typeof item.hoatDongId ===
    "object"
  ) {
    return item.hoatDongId;
  }

  return null;
}

function getBranch(
  item: MinhChung,
): ChiHoi | null {
  if (
    item.chiHoiId &&
    typeof item.chiHoiId ===
      "object"
  ) {
    return item.chiHoiId;
  }

  return null;
}

function safeFilename(
  filename: string,
) {
  const normalized =
    filename
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "-",
      )
      .replace(
        /-+/g,
        "-",
      )
      .replace(
        /^[-.]+|[-.]+$/g,
        "",
      );

  return (
    normalized ||
    "minh-chung"
  );
}

function makeFileKey(
  file: File,
  index: number,
) {
  return [
    file.name,
    file.size,
    file.lastModified,
    index,
  ].join("-");
}

/* =========================================================
   API HELPERS
========================================================= */

async function readApiResponse(
  response: Response,
): Promise<ApiResult> {
  const text =
    await response.text();

  if (!text.trim()) {
    return {
      success: false,

      message:
        `Máy chủ không trả dữ liệu. HTTP ${response.status}.`,
    };
  }

  try {
    return JSON.parse(
      text,
    ) as ApiResult;
  } catch {
    return {
      success: false,

      message:
        `Máy chủ trả dữ liệu không hợp lệ. HTTP ${response.status}: ${text.slice(
          0,
          300,
        )}`,
    };
  }
}

function extractActivities(
  result: ApiResult,
): HoatDong[] {
  if (
    Array.isArray(
      result.data,
    )
  ) {
    return result.data as HoatDong[];
  }

  if (
    result.data &&
    typeof result.data ===
      "object"
  ) {
    const data =
      result.data as {
        danhSach?: HoatDong[];

        activities?: HoatDong[];

        data?: HoatDong[];
      };

    if (
      Array.isArray(
        data.danhSach,
      )
    ) {
      return data.danhSach;
    }

    if (
      Array.isArray(
        data.activities,
      )
    ) {
      return data.activities;
    }

    if (
      Array.isArray(
        data.data,
      )
    ) {
      return data.data;
    }
  }

  if (
    Array.isArray(
      result.activities,
    )
  ) {
    return result.activities as HoatDong[];
  }

  return [];
}

function extractEvidence(
  result: ApiResult,
): MinhChung[] {
  if (
    Array.isArray(
      result.data,
    )
  ) {
    return result.data as MinhChung[];
  }

  if (
    result.data &&
    typeof result.data ===
      "object"
  ) {
    const data =
      result.data as {
        danhSach?: MinhChung[];

        minhChung?: MinhChung[];

        data?: MinhChung[];
      };

    if (
      Array.isArray(
        data.danhSach,
      )
    ) {
      return data.danhSach;
    }

    if (
      Array.isArray(
        data.minhChung,
      )
    ) {
      return data.minhChung;
    }

    if (
      Array.isArray(
        data.data,
      )
    ) {
      return data.data;
    }
  }

  return [];
}

function extractCurrentUser(
  result: ApiResult,
): CurrentUser | null {
  let raw:
    | Record<
        string,
        unknown
      >
    | null = null;

  if (
    result.user &&
    typeof result.user ===
      "object"
  ) {
    raw =
      result.user as Record<
        string,
        unknown
      >;
  }

  if (
    !raw &&
    result.data &&
    typeof result.data ===
      "object"
  ) {
    const data =
      result.data as Record<
        string,
        unknown
      >;

    if (
      data.user &&
      typeof data.user ===
        "object"
    ) {
      raw =
        data.user as Record<
          string,
          unknown
        >;
    } else {
      raw = data;
    }
  }

  if (!raw) {
    return null;
  }

  const id =
    String(
      raw.id ??
        raw._id ??
        raw.userId ??
        "",
    );

  const role =
    String(
      raw.role ??
        "",
    ) as UserRole;

  if (
    !id ||
    ![
      "ADMIN",
      "BAN_CHAP_HANH",
      "CHI_HOI_TRUONG",
      "HOI_VIEN",
    ].includes(role)
  ) {
    return null;
  }

  return {
    id,

    username:
      String(
        raw.username ??
          "",
      ),

    fullName:
      String(
        raw.fullName ??
          raw.hoTen ??
          "",
      ),

    role,
  };
}

/* =========================================================
   BLOB ERROR
========================================================= */

function getBlobErrorMessage(
  error: unknown,
) {
  console.error(
    "[MINH-CHUNG] Blob upload:",
    error,
  );

  if (
    error instanceof
    Error
  ) {
    const message =
      error.message ||
      "";

    if (
      message.includes(
        "Failed to retrieve the client token",
      )
    ) {
      return (
        "Không lấy được quyền tải tệp lên Vercel Blob. " +
        "Hãy kiểm tra BLOB_READ_WRITE_TOKEN hoặc OIDC của Vercel."
      );
    }

    if (
      message.includes(
        "Unauthorized",
      ) ||
      message.includes(
        "401",
      )
    ) {
      return "Vercel Blob từ chối xác thực.";
    }

    if (
      message.includes(
        "Forbidden",
      ) ||
      message.includes(
        "403",
      )
    ) {
      return "Bạn không có quyền tải tệp lên.";
    }

    return message.startsWith(
      "Vercel Blob:",
    )
      ? message
      : `Vercel Blob: ${message}`;
  }

  return "Không thể tải tệp lên Vercel Blob.";
}

/* =========================================================
   PAGE
========================================================= */

export default function MinhChungPage() {
  /* =======================================================
     FILE INPUT REFS
  ======================================================= */

  const createFileInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const supplementFileInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  /* =======================================================
     USER
  ======================================================= */

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null,
    );

  /* =======================================================
     DATA
  ======================================================= */

  const [
    records,
    setRecords,
  ] =
    useState<MinhChung[]>(
      [],
    );

  const [
    activities,
    setActivities,
  ] =
    useState<HoatDong[]>(
      [],
    );

  /* =======================================================
     GENERAL
  ======================================================= */

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    openingFile,
    setOpeningFile,
  ] =
    useState<string | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState<MessageState | null>(
      null,
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("");

  /* =======================================================
     CREATE FORM
  ======================================================= */

  const [
    showCreateForm,
    setShowCreateForm,
  ] =
    useState(false);

  const [
    hoatDongId,
    setHoatDongId,
  ] =
    useState("");

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    note,
    setNote,
  ] =
    useState("");

  const [
    selectedFiles,
    setSelectedFiles,
  ] =
    useState<File[]>([]);

  const [
    uploadProgress,
    setUploadProgress,
  ] =
    useState<UploadProgress>(
      {},
    );

  /* =======================================================
     DETAIL
  ======================================================= */

  const [
    detail,
    setDetail,
  ] =
    useState<MinhChung | null>(
      null,
    );

  /* =======================================================
     REQUEST SUPPLEMENT
  ======================================================= */

  const [
    supplementRequestTarget,
    setSupplementRequestTarget,
  ] =
    useState<MinhChung | null>(
      null,
    );

  const [
    supplementRequestReason,
    setSupplementRequestReason,
  ] =
    useState("");

  /* =======================================================
     SUBMIT SUPPLEMENT
  ======================================================= */

  const [
    supplementTarget,
    setSupplementTarget,
  ] =
    useState<MinhChung | null>(
      null,
    );

  const [
    supplementFiles,
    setSupplementFiles,
  ] =
    useState<File[]>([]);

  const [
    supplementNote,
    setSupplementNote,
  ] =
    useState("");

  const [
    supplementUploadProgress,
    setSupplementUploadProgress,
  ] =
    useState<UploadProgress>(
      {},
    );

  /* =======================================================
     PERMISSIONS
  ======================================================= */

  const canSend =
    currentUser?.role ===
      "CHI_HOI_TRUONG" ||
    currentUser?.role ===
      "HOI_VIEN";

  const canReview =
    currentUser?.role ===
      "ADMIN" ||
    currentUser?.role ===
      "BAN_CHAP_HANH";

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);

        const [
          userResponse,
          evidenceResponse,
          activityResponse,
        ] =
          await Promise.all([
            fetch(
              "/api/auth/me",
              {
                credentials:
                  "include",

                cache:
                  "no-store",
              },
            ),

            fetch(
              "/api/minh-chung",
              {
                credentials:
                  "include",

                cache:
                  "no-store",
              },
            ),

            fetch(
              "/api/hoat-dong",
              {
                credentials:
                  "include",

                cache:
                  "no-store",
              },
            ),
          ]);

        const userResult =
          await readApiResponse(
            userResponse,
          );

        const evidenceResult =
          await readApiResponse(
            evidenceResponse,
          );

        const activityResult =
          await readApiResponse(
            activityResponse,
          );

        /* -------------------------
           USER
        ------------------------- */

        if (
          !userResponse.ok ||
          userResult.success ===
            false
        ) {
          throw new Error(
            userResult.message ||
              "Không thể tải thông tin tài khoản.",
          );
        }

        const user =
          extractCurrentUser(
            userResult,
          );

        if (!user) {
          throw new Error(
            "Không xác định được người dùng hiện tại.",
          );
        }

        setCurrentUser(
          user,
        );

        /* -------------------------
           EVIDENCE
        ------------------------- */

        if (
          !evidenceResponse.ok ||
          evidenceResult.success ===
            false
        ) {
          throw new Error(
            evidenceResult.message ||
              "Không thể tải danh sách minh chứng.",
          );
        }

        setRecords(
          extractEvidence(
            evidenceResult,
          ),
        );

        /* -------------------------
           ACTIVITIES
        ------------------------- */

        if (
          activityResponse.ok &&
          activityResult.success !==
            false
        ) {
          const allActivities =
            extractActivities(
              activityResult,
            );

          setActivities(
            allActivities.filter(
              (activity) =>
                activity.trangThai ===
                "DA_KET_THUC",
            ),
          );
        } else {
          setActivities([]);
        }
      } catch (error) {
        console.error(
          "Load minh chứng:",
          error,
        );

        setMessage({
          type:
            "error",

          text:
            error instanceof
            Error
              ? error.message
              : "Không thể tải dữ liệu.",
        });
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
    void loadData();
  }, [loadData]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredRecords =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return records.filter(
        (item) => {
          const activity =
            getActivity(
              item,
            );

          const branch =
            getBranch(
              item,
            );

          const searchable =
            [
              item.tieuDe,

              item.nguoiGuiTen,

              activity?.maHoatDong,

              activity?.tenHoatDong,

              branch?.maChiHoi,

              branch?.tenChiHoi,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const matchesSearch =
            !keyword ||
            searchable.includes(
              keyword,
            );

          const matchesStatus =
            !statusFilter ||
            item.trangThai ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      records,
      search,
      statusFilter,
    ]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const stats =
    useMemo(
      () => ({
        total:
          records.length,

        sent:
          records.filter(
            (item) =>
              item.trangThai ===
              "DA_GUI",
          ).length,

        received:
          records.filter(
            (item) =>
              item.trangThai ===
              "DA_NHAN",
          ).length,

        approved:
          records.filter(
            (item) =>
              item.trangThai ===
              "DA_XET_DUYET",
          ).length,

        supplement:
          records.filter(
            (item) =>
              item.trangThai ===
              "YEU_CAU_BO_SUNG",
          ).length,
      }),
      [records],
    );

  /* =======================================================
     CREATE FILE HANDLING
  ======================================================= */

  function resetCreateForm() {
    setHoatDongId("");

    setTitle("");

    setDescription("");

    setNote("");

    setSelectedFiles([]);

    setUploadProgress({});

    if (
      createFileInputRef.current
    ) {
      createFileInputRef.current.value =
        "";
    }
  }

  function openCreateForm() {
    setMessage(null);

    resetCreateForm();

    setShowCreateForm(
      true,
    );
  }

  function closeCreateForm() {
    if (submitting) {
      return;
    }

    setShowCreateForm(
      false,
    );

    resetCreateForm();
  }

  function validateIncomingFiles(
    existingCount: number,

    files: File[],
  ) {
    if (
      existingCount +
        files.length >
      MAX_FILES
    ) {
      return `Tổng số tệp không được vượt quá ${MAX_FILES}.`;
    }

    for (
      const file
      of files
    ) {
      const extension =
        fileExtension(
          file.name,
        );

      if (
        !ALLOWED_EXTENSIONS.has(
          extension,
        )
      ) {
        return `Tệp "${file.name}" không đúng định dạng.`;
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        return `Tệp "${file.name}" vượt quá 10MB.`;
      }

      if (
        file.size === 0
      ) {
        return `Tệp "${file.name}" không có dữ liệu.`;
      }
    }

    return "";
  }

  function handleCreateFiles(
    files:
      FileList
      | null,
  ) {
    if (!files) {
      return;
    }

    const incoming =
      Array.from(files);

    const error =
      validateIncomingFiles(
        selectedFiles.length,

        incoming,
      );

    if (error) {
      setMessage({
        type:
          "error",

        text:
          error,
      });

      return;
    }

    const existing =
      new Set(
        selectedFiles.map(
          (file) =>
            [
              file.name,
              file.size,
              file.lastModified,
            ].join(":"),
        ),
      );

    const unique =
      incoming.filter(
        (file) =>
          !existing.has(
            [
              file.name,
              file.size,
              file.lastModified,
            ].join(":"),
          ),
      );

    setSelectedFiles(
      (current) => [
        ...current,

        ...unique,
      ],
    );

    setMessage(null);

    if (
      createFileInputRef.current
    ) {
      createFileInputRef.current.value =
        "";
    }
  }

  function removeCreateFile(
    index: number,
  ) {
    if (submitting) {
      return;
    }

    setSelectedFiles(
      (current) =>
        current.filter(
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
     GENERIC BLOB UPLOAD
  ======================================================= */

  async function uploadFilesToBlob({
    files,

    folder,

    setProgress,
  }: {
    files: File[];

    folder: string;

    setProgress:
      React.Dispatch<
        React.SetStateAction<UploadProgress>
      >;
  }) {
    if (!currentUser) {
      throw new Error(
        "Không xác định được người dùng.",
      );
    }

    const uploaded:
      UploadedFile[] =
      [];

    for (
      let index = 0;
      index <
      files.length;
      index += 1
    ) {
      const file =
        files[index];

      const progressKey =
        makeFileKey(
          file,
          index,
        );

      const filename =
        safeFilename(
          file.name,
        );

      const dateFolder =
        new Date()
          .toISOString()
          .slice(
            0,
            10,
          );

      const pathname =
        [
          "minh-chung",

          currentUser.id,

          dateFolder,

          folder,

          `${Date.now()}-${index}-${filename}`,
        ].join("/");

      setProgress(
        (current) => ({
          ...current,

          [progressKey]:
            1,
        }),
      );

      try {
        const blob =
          await upload(
            pathname,

            file,

            {
              access:
                "private",

              handleUploadUrl:
                "/api/minh-chung/upload",

              /*
               * Không ép multipart
               * cho file nhỏ.
               */
              multipart:
                file.size >
                4 *
                  1024 *
                  1024,

              onUploadProgress(
                progress,
              ) {
                setProgress(
                  (current) => ({
                    ...current,

                    [progressKey]:
                      Math.max(
                        1,

                        Math.round(
                          progress.percentage,
                        ),
                      ),
                  }),
                );
              },
            },
          );

        if (
          !blob?.url
        ) {
          throw new Error(
            "Vercel Blob không trả đường dẫn tệp.",
          );
        }

        uploaded.push({
          tenTep:
            file.name,

          duongDan:
            blob.url,

          pathname:
            blob.pathname,

          mimeType:
            file.type ||
            "application/octet-stream",

          kichThuoc:
            file.size,
        });

        setProgress(
          (current) => ({
            ...current,

            [progressKey]:
              100,
          }),
        );
      } catch (error) {
        throw new Error(
          getBlobErrorMessage(
            error,
          ),
        );
      }
    }

    return uploaded;
  }

  /* =======================================================
     CREATE EVIDENCE
  ======================================================= */

  async function submitEvidence(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canSend) {
      setMessage({
        type:
          "error",

        text:
          "Bạn không có quyền gửi minh chứng.",
      });

      return;
    }

    if (!hoatDongId) {
      setMessage({
        type:
          "error",

        text:
          "Vui lòng chọn hoạt động.",
      });

      return;
    }

    if (!title.trim()) {
      setMessage({
        type:
          "error",

        text:
          "Vui lòng nhập tiêu đề minh chứng.",
      });

      return;
    }

    if (
      selectedFiles.length ===
      0
    ) {
      setMessage({
        type:
          "error",

        text:
          "Vui lòng chọn ít nhất một tệp minh chứng.",
      });

      return;
    }

    try {
      setSubmitting(true);

      setUploadProgress(
        {},
      );

      setMessage({
        type:
          "info",

        text:
          "Đang tải tệp lên Private Vercel Blob...",
      });

      /* -------------------------
         UPLOAD BLOB
      ------------------------- */

      const uploadedFiles =
        await uploadFilesToBlob({
          files:
            selectedFiles,

          folder:
            "gui-moi",

          setProgress:
            setUploadProgress,
        });

      if (
        uploadedFiles.length !==
        selectedFiles.length
      ) {
        throw new Error(
          "Chưa tải đầy đủ tệp minh chứng.",
        );
      }

      /* -------------------------
         SAVE MONGODB
      ------------------------- */

      setMessage({
        type:
          "info",

        text:
          "Tệp đã upload thành công. Đang lưu hồ sơ...",
      });

      const response =
        await fetch(
          "/api/minh-chung",
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
                hoatDongId,

                tieuDe:
                  title.trim(),

                moTa:
                  description.trim(),

                ghiChu:
                  note.trim(),

                tepDinhKem:
                  uploadedFiles,
              }),
          },
        );

      const result =
        await readApiResponse(
          response,
        );

      if (
        !response.ok ||
        result.success ===
          false
      ) {
        throw new Error(
          result.message ||
            "Không thể lưu hồ sơ minh chứng.",
        );
      }

      setShowCreateForm(
        false,
      );

      resetCreateForm();

      setMessage({
        type:
          "success",

        text:
          result.message ||
          "Nộp minh chứng thành công",
      });

      await loadData();
    } catch (error) {
      console.error(
        "Submit minh chứng:",
        error,
      );

      setMessage({
        type:
          "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể gửi minh chứng.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     REVIEW ACTION
  ======================================================= */

  async function processEvidence(
    item: MinhChung,

    action:
      | "RECEIVE"
      | "APPROVE",
  ) {
    if (!canReview) {
      return;
    }

    const actionText =
      action ===
      "RECEIVE"
        ? "tiếp nhận"
        : "xét duyệt";

    const confirmed =
      window.confirm(
        `Xác nhận ${actionText} minh chứng "${item.tieuDe}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);

      const response =
        await fetch(
          `/api/minh-chung/${item._id}`,
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
                action,
              }),
          },
        );

      const result =
        await readApiResponse(
          response,
        );

      if (
        !response.ok ||
        result.success ===
          false
      ) {
        throw new Error(
          result.message ||
            "Không thể xử lý minh chứng.",
        );
      }

      setMessage({
        type:
          "success",

        text:
          result.message ||
          "Cập nhật minh chứng thành công.",
      });

      setDetail(null);

      await loadData();
    } catch (error) {
      setMessage({
        type:
          "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể xử lý minh chứng.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     REQUEST SUPPLEMENT
  ======================================================= */

  function openRequestSupplement(
    item: MinhChung,
  ) {
    setSupplementRequestTarget(
      item,
    );

    setSupplementRequestReason(
      "",
    );
  }

  async function submitSupplementRequest(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !supplementRequestTarget ||
      !canReview
    ) {
      return;
    }

    if (
      !supplementRequestReason.trim()
    ) {
      setMessage({
        type:
          "error",

        text:
          "Vui lòng nhập nội dung cần bổ sung.",
      });

      return;
    }

    try {
      setSubmitting(true);

      const response =
        await fetch(
          `/api/minh-chung/${supplementRequestTarget._id}`,
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
                  "REQUEST_SUPPLEMENT",

                noiDungYeuCauBoSung:
                  supplementRequestReason.trim(),
              }),
          },
        );

      const result =
        await readApiResponse(
          response,
        );

      if (
        !response.ok ||
        result.success ===
          false
      ) {
        throw new Error(
          result.message ||
            "Không thể gửi yêu cầu bổ sung.",
        );
      }

      setSupplementRequestTarget(
        null,
      );

      setSupplementRequestReason(
        "",
      );

      setDetail(null);

      setMessage({
        type:
          "success",

        text:
          result.message ||
          "Đã gửi yêu cầu bổ sung.",
      });

      await loadData();
    } catch (error) {
      setMessage({
        type:
          "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể gửi yêu cầu bổ sung.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     OPEN SUPPLEMENT FORM
  ======================================================= */

  function openSupplementForm(
    item: MinhChung,
  ) {
    if (
      item.trangThai !==
      "YEU_CAU_BO_SUNG"
    ) {
      return;
    }

    setSupplementTarget(
      item,
    );

    setSupplementFiles([]);

    setSupplementNote("");

    setSupplementUploadProgress(
      {},
    );

    setMessage(null);

    if (
      supplementFileInputRef.current
    ) {
      supplementFileInputRef.current.value =
        "";
    }
  }

  function closeSupplementForm() {
    if (submitting) {
      return;
    }

    setSupplementTarget(
      null,
    );

    setSupplementFiles([]);

    setSupplementNote("");

    setSupplementUploadProgress(
      {},
    );
  }

  /* =======================================================
     SUPPLEMENT FILES
  ======================================================= */

  function handleSupplementFiles(
    files:
      FileList
      | null,
  ) {
    if (
      !files ||
      !supplementTarget
    ) {
      return;
    }

    const incoming =
      Array.from(files);

    const currentServerFileCount =
      supplementTarget
        .tepDinhKem
        ?.length ||
      0;

    const error =
      validateIncomingFiles(
        currentServerFileCount +
          supplementFiles.length,

        incoming,
      );

    if (error) {
      setMessage({
        type:
          "error",

        text:
          error,
      });

      return;
    }

    const existing =
      new Set(
        supplementFiles.map(
          (file) =>
            [
              file.name,
              file.size,
              file.lastModified,
            ].join(":"),
        ),
      );

    const unique =
      incoming.filter(
        (file) =>
          !existing.has(
            [
              file.name,
              file.size,
              file.lastModified,
            ].join(":"),
          ),
      );

    setSupplementFiles(
      (current) => [
        ...current,

        ...unique,
      ],
    );

    setMessage(null);

    if (
      supplementFileInputRef.current
    ) {
      supplementFileInputRef.current.value =
        "";
    }
  }

  function removeSupplementFile(
    index: number,
  ) {
    if (submitting) {
      return;
    }

    setSupplementFiles(
      (current) =>
        current.filter(
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
     SUBMIT SUPPLEMENT
  ======================================================= */

  async function submitSupplement(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !supplementTarget
    ) {
      return;
    }

    if (!canSend) {
      setMessage({
        type:
          "error",

        text:
          "Bạn không có quyền bổ sung minh chứng.",
      });

      return;
    }

    if (
      supplementTarget.trangThai !==
      "YEU_CAU_BO_SUNG"
    ) {
      setMessage({
        type:
          "error",

        text:
          "Hồ sơ hiện không còn ở trạng thái yêu cầu bổ sung.",
      });

      return;
    }

    if (
      supplementFiles.length ===
      0
    ) {
      setMessage({
        type:
          "error",

        text:
          "Vui lòng chọn ít nhất một tệp bổ sung.",
      });

      return;
    }

    try {
      setSubmitting(true);

      setSupplementUploadProgress(
        {},
      );

      setMessage({
        type:
          "info",

        text:
          "Đang tải tệp bổ sung lên Private Vercel Blob...",
      });

      /* -------------------------
         BLOB
      ------------------------- */

      const uploadedFiles =
        await uploadFilesToBlob({
          files:
            supplementFiles,

          folder:
            `bo-sung-${supplementTarget._id}`,

          setProgress:
            setSupplementUploadProgress,
        });

      if (
        uploadedFiles.length !==
        supplementFiles.length
      ) {
        throw new Error(
          "Chưa tải đầy đủ các tệp bổ sung.",
        );
      }

      /* -------------------------
         PATCH RECORD
      ------------------------- */

      setMessage({
        type:
          "info",

        text:
          "Tệp bổ sung đã upload. Đang gửi lại hồ sơ...",
      });

      const response =
        await fetch(
          `/api/minh-chung/${supplementTarget._id}`,
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
                  "SUPPLEMENT",

                tepDinhKem:
                  uploadedFiles,

                ghiChu:
                  supplementNote.trim(),
              }),
          },
        );

      const result =
        await readApiResponse(
          response,
        );

      if (
        !response.ok ||
        result.success ===
          false
      ) {
        throw new Error(
          result.message ||
            "Không thể bổ sung minh chứng.",
        );
      }

      closeSupplementForm();

      setDetail(null);

      setMessage({
        type:
          "success",

        text:
          result.message ||
          "Bổ sung minh chứng thành công. Hồ sơ đã được gửi lại.",
      });

      await loadData();
    } catch (error) {
      console.error(
        "Bổ sung minh chứng:",
        error,
      );

      setMessage({
        type:
          "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể bổ sung minh chứng.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     PRIVATE FILE
  ======================================================= */

  async function openPrivateFile(
    file: TepDinhKem,
  ) {
    if (!file.duongDan) {
      return;
    }

    /*
     * URL public/legacy.
     */
    if (
      !file.duongDan.includes(
        ".private.blob.vercel-storage.com",
      )
    ) {
      window.open(
        file.duongDan,

        "_blank",

        "noopener,noreferrer",
      );

      return;
    }

    try {
      setOpeningFile(
        file.duongDan,
      );

      const response =
        await fetch(
          "/api/minh-chung/file",
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
                url:
                  file.duongDan,

                pathname:
                  file.pathname,
              }),
          },
        );

      const result =
        await readApiResponse(
          response,
        );

      if (
        !response.ok ||
        result.success ===
          false
      ) {
        throw new Error(
          result.message ||
            "Không thể mở tệp.",
        );
      }

      const data =
        result.data &&
        typeof result.data ===
          "object"
          ? result.data as {
              url?: string;
            }
          : {};

      if (!data.url) {
        throw new Error(
          "API không trả URL truy cập tệp.",
        );
      }

      window.open(
        data.url,

        "_blank",

        "noopener,noreferrer",
      );
    } catch (error) {
      setMessage({
        type:
          "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể mở tệp.",
      });
    } finally {
      setOpeningFile(
        null,
      );
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-full bg-[#F3F6FA] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1600px]">
        {/* =================================================
            HEADER
        ================================================= */}

        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#12345B]">
              Quản lý hoạt động
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Minh chứng rèn luyện
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {canReview
                ? "Tiếp nhận, kiểm tra, yêu cầu bổ sung và xét duyệt minh chứng hoạt động."
                : "Tải hình ảnh, danh sách, biên bản và tài liệu làm minh chứng cho các hoạt động đã kết thúc."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                void loadData()
              }
              disabled={
                loading
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
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

            {canSend && (
              <button
                type="button"
                onClick={
                  openCreateForm
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#12345B] px-5 text-sm font-semibold text-white transition hover:bg-[#0D2947]"
              >
                <FilePlus2
                  size={18}
                />

                Gửi minh chứng
              </button>
            )}
          </div>
        </header>

        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (
          <div
            className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
              message.type ===
              "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : message.type ===
                    "info"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex min-w-0 items-start gap-2">
              {message.type ===
              "success" ? (
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              ) : message.type ===
                "info" ? (
                <Loader2
                  size={18}
                  className="mt-0.5 shrink-0 animate-spin"
                />
              ) : (
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              )}

              <span className="break-words">
                {message.text}
              </span>
            </div>

            {message.type !==
              "info" && (
              <button
                type="button"
                onClick={() =>
                  setMessage(null)
                }
                className="shrink-0 rounded p-1 hover:bg-black/5"
              >
                <X
                  size={16}
                />
              </button>
            )}
          </div>
        )}

        {/* =================================================
            STATS
        ================================================= */}

        <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Stat
            label="Tổng hồ sơ"
            value={
              stats.total
            }
          />

          <Stat
            label="Đã gửi"
            value={
              stats.sent
            }
          />

          <Stat
            label="Đã nhận"
            value={
              stats.received
            }
          />

          <Stat
            label="Đã xét duyệt"
            value={
              stats.approved
            }
          />

          <Stat
            label="Cần bổ sung"
            value={
              stats.supplement
            }
          />
        </section>

        {/* =================================================
            LIST
        ================================================= */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* FILTER */}

          <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(300px,1fr)_240px]">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="Tìm tiêu đề, hoạt động, Chi hội, người gửi..."
                className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#12345B] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={
                statusFilter
              }
              onChange={(
                event,
              ) =>
                setStatusFilter(
                  event.target
                    .value,
                )
              }
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#12345B]"
            >
              <option value="">
                Tất cả trạng thái
              </option>

              <option value="DA_GUI">
                Đã gửi
              </option>

              <option value="DA_NHAN">
                Đã nhận
              </option>

              <option value="DA_XET_DUYET">
                Đã xét duyệt
              </option>

              <option value="YEU_CAU_BO_SUNG">
                Yêu cầu bổ sung
              </option>
            </select>
          </div>

          {/* LOADING */}

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2
                size={30}
                className="animate-spin text-[#12345B]"
              />
            </div>
          ) : filteredRecords.length ===
            0 ? (
            /* EMPTY */

            <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
              <FileCheck2
                size={42}
                className="text-slate-300"
              />

              <p className="mt-4 font-semibold text-slate-700">
                Chưa có hồ sơ minh chứng
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Hồ sơ gửi lên sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredRecords.map(
                (item) => {
                  const activity =
                    getActivity(
                      item,
                    );

                  const branch =
                    getBranch(
                      item,
                    );

                  return (
                    <article
                      key={
                        item._id
                      }
                      className="p-4 transition hover:bg-slate-50/70 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        {/* INFO */}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                item.trangThai,
                              )}`}
                            >
                              {statusLabel(
                                item.trangThai,
                              )}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {item
                                .tepDinhKem
                                ?.length ||
                                0}{" "}
                              tệp
                            </span>
                          </div>

                          <h2 className="mt-3 break-words text-base font-bold text-slate-900">
                            {
                              item.tieuDe
                            }
                          </h2>

                          <p className="mt-1 text-sm text-slate-600">
                            {activity
                              ? `${activity.maHoatDong} - ${activity.tenHoatDong}`
                              : "Hoạt động chưa xác định"}
                          </p>

                          {branch && (
                            <p className="mt-1 text-sm text-slate-500">
                              {
                                branch.maChiHoi
                              }{" "}
                              -{" "}
                              {
                                branch.tenChiHoi
                              }
                            </p>
                          )}

                          <p className="mt-2 text-xs text-slate-400">
                            Gửi bởi{" "}
                            <span className="font-medium text-slate-500">
                              {
                                item.nguoiGuiTen
                              }
                            </span>

                            {" • "}

                            {formatDateTime(
                              item.createdAt,
                            )}
                          </p>
                        </div>

                        {/* ACTIONS */}

                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
                          {/* SUPPLEMENT BUTTON */}

                          {canSend &&
                            item.trangThai ===
                              "YEU_CAU_BO_SUNG" && (
                              <button
                                type="button"
                                onClick={() =>
                                  openSupplementForm(
                                    item,
                                  )
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                              >
                                <Plus
                                  size={16}
                                />

                                Bổ sung minh chứng
                              </button>
                            )}

                          {/* VIEW */}

                          <button
                            type="button"
                            onClick={() =>
                              setDetail(
                                item,
                              )
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye
                              size={16}
                            />

                            Chi tiết
                          </button>

                          {/* RECEIVE */}

                          {canReview &&
                            item.trangThai ===
                              "DA_GUI" && (
                              <button
                                type="button"
                                disabled={
                                  submitting
                                }
                                onClick={() =>
                                  void processEvidence(
                                    item,
                                    "RECEIVE",
                                  )
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                <Clock3
                                  size={16}
                                />

                                Tiếp nhận
                              </button>
                            )}

                          {/* APPROVE */}

                          {canReview &&
                            item.trangThai ===
                              "DA_NHAN" && (
                              <button
                                type="button"
                                disabled={
                                  submitting
                                }
                                onClick={() =>
                                  void processEvidence(
                                    item,
                                    "APPROVE",
                                  )
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <CheckCircle2
                                  size={16}
                                />

                                Xét duyệt
                              </button>
                            )}

                          {/* REQUEST SUPPLEMENT */}

                          {canReview &&
                            (
                              item.trangThai ===
                                "DA_GUI" ||
                              item.trangThai ===
                                "DA_NHAN"
                            ) && (
                              <button
                                type="button"
                                disabled={
                                  submitting
                                }
                                onClick={() =>
                                  openRequestSupplement(
                                    item,
                                  )
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                <XCircle
                                  size={16}
                                />

                                Yêu cầu bổ sung
                              </button>
                            )}
                        </div>
                      </div>

                      {/* SUPPLEMENT WARNING */}

                      {item.trangThai ===
                        "YEU_CAU_BO_SUNG" &&
                        item.noiDungYeuCauBoSung && (
                          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
                            <strong>
                              Nội dung cần bổ sung:
                            </strong>{" "}

                            {
                              item.noiDungYeuCauBoSung
                            }
                          </div>
                        )}
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>

      {/* ===================================================
          CREATE MODAL
      =================================================== */}

      {showCreateForm && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={
              submitEvidence
            }
            className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            {/* HEADER */}

            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Gửi minh chứng rèn luyện
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Tệp được lưu trực tiếp trong Private Vercel Blob.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={
                  closeCreateForm
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X
                  size={20}
                />
              </button>
            </div>

            {/* BODY */}

            <div className="space-y-5 p-4 sm:p-6">
              {/* ACTIVITY */}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Hoạt động{" "}

                  <span className="text-red-600">
                    *
                  </span>
                </span>

                <select
                  required
                  disabled={
                    submitting
                  }
                  value={
                    hoatDongId
                  }
                  onChange={(
                    event,
                  ) =>
                    setHoatDongId(
                      event.target
                        .value,
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#12345B] disabled:bg-slate-100"
                >
                  <option value="">
                    Chọn hoạt động đã kết thúc
                  </option>

                  {activities.map(
                    (activity) => (
                      <option
                        key={
                          getId(
                            activity,
                          )
                        }
                        value={
                          getId(
                            activity,
                          )
                        }
                      >
                        {
                          activity.maHoatDong
                        }{" "}
                        -{" "}
                        {
                          activity.tenHoatDong
                        }
                      </option>
                    ),
                  )}
                </select>

                {activities.length ===
                  0 && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                    Chưa có hoạt động nào ở trạng thái{" "}

                    <strong>
                      Đã kết thúc
                    </strong>
                    .
                  </div>
                )}
              </label>

              {/* TITLE */}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Tiêu đề minh chứng{" "}

                  <span className="text-red-600">
                    *
                  </span>
                </span>

                <input
                  required
                  disabled={
                    submitting
                  }
                  maxLength={255}
                  value={title}
                  onChange={(
                    event,
                  ) =>
                    setTitle(
                      event.target
                        .value,
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#12345B] disabled:bg-slate-100"
                  placeholder="Ví dụ: Minh chứng hoạt động Hiến máu tháng 10"
                />
              </label>

              {/* DESCRIPTION */}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Mô tả
                </span>

                <textarea
                  disabled={
                    submitting
                  }
                  value={
                    description
                  }
                  onChange={(
                    event,
                  ) =>
                    setDescription(
                      event.target
                        .value,
                    )
                  }
                  rows={3}
                  maxLength={3000}
                  className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-[#12345B] disabled:bg-slate-100"
                  placeholder="Mô tả nội dung minh chứng"
                />
              </label>

              {/* FILE PICKER */}

              <FilePicker
                title="Tệp minh chứng"
                files={
                  selectedFiles
                }
                progress={
                  uploadProgress
                }
                inputRef={
                  createFileInputRef
                }
                disabled={
                  submitting
                }
                maxExistingFiles={
                  0
                }
                onFiles={
                  handleCreateFiles
                }
                onRemove={
                  removeCreateFile
                }
              />

              {/* NOTE */}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Ghi chú
                </span>

                <textarea
                  disabled={
                    submitting
                  }
                  value={note}
                  onChange={(
                    event,
                  ) =>
                    setNote(
                      event.target
                        .value,
                    )
                  }
                  maxLength={2000}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-[#12345B] disabled:bg-slate-100"
                  placeholder="Ghi chú gửi BCH nếu cần"
                />
              </label>

              <BlobNotice />
            </div>

            {/* FOOTER */}

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={
                  closeCreateForm
                }
                className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !hoatDongId ||
                  !title.trim() ||
                  selectedFiles.length ===
                    0
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#12345B] px-5 text-sm font-semibold text-white transition hover:bg-[#0D2947] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />

                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send
                      size={17}
                    />

                    Gửi minh chứng
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================
          SUPPLEMENT FORM
      =================================================== */}

      {supplementTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={
              submitSupplement
            }
            className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            {/* HEADER */}

            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Bổ sung minh chứng
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Bổ sung tài liệu cho hồ sơ{" "}

                  <strong>
                    {
                      supplementTarget.tieuDe
                    }
                  </strong>
                  .
                </p>
              </div>

              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={
                  closeSupplementForm
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X
                  size={20}
                />
              </button>
            </div>

            {/* BODY */}

            <div className="space-y-5 p-4 sm:p-6">
              {/* REQUEST */}

              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                  Nội dung BCH/Admin yêu cầu bổ sung
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-red-700">
                  {supplementTarget.noiDungYeuCauBoSung ||
                    "Không có nội dung cụ thể."}
                </p>
              </div>

              {/* ACTIVITY */}

              <Info
                label="Hoạt động"
                value={
                  getActivity(
                    supplementTarget,
                  )
                    ? `${getActivity(supplementTarget)?.maHoatDong} - ${getActivity(supplementTarget)?.tenHoatDong}`
                    : "—"
                }
              />

              {/* EXISTING FILES */}

              <section>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    Tệp đã gửi trước đó
                  </h3>

                  <span className="text-xs text-slate-500">
                    {supplementTarget
                      .tepDinhKem
                      ?.length ||
                      0}{" "}
                    tệp
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {supplementTarget
                    .tepDinhKem
                    ?.map(
                      (
                        file,
                        index,
                      ) => (
                        <ExistingFileRow
                          key={`${file.duongDan}-${index}`}
                          file={
                            file
                          }
                          opening={
                            openingFile ===
                            file.duongDan
                          }
                          onOpen={() =>
                            void openPrivateFile(
                              file,
                            )
                          }
                        />
                      ),
                    )}
                </div>
              </section>

              {/* NEW FILE */}

              <FilePicker
                title="Tệp bổ sung"
                files={
                  supplementFiles
                }
                progress={
                  supplementUploadProgress
                }
                inputRef={
                  supplementFileInputRef
                }
                disabled={
                  submitting
                }
                maxExistingFiles={
                  supplementTarget
                    .tepDinhKem
                    ?.length ||
                  0
                }
                onFiles={
                  handleSupplementFiles
                }
                onRemove={
                  removeSupplementFile
                }
              />

              {/* NOTE */}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Ghi chú bổ sung
                </span>

                <textarea
                  disabled={
                    submitting
                  }
                  value={
                    supplementNote
                  }
                  onChange={(
                    event,
                  ) =>
                    setSupplementNote(
                      event.target
                        .value,
                    )
                  }
                  maxLength={2000}
                  rows={4}
                  placeholder="Ví dụ: Đã bổ sung danh sách Hội viên có chữ ký và 02 ảnh hoạt động..."
                  className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-[#12345B] disabled:bg-slate-100"
                />
              </label>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                Sau khi gửi bổ sung, các tệp mới sẽ được{" "}

                <strong>
                  thêm vào hồ sơ hiện tại
                </strong>

                , không xóa tệp cũ. Trạng thái hồ sơ sẽ quay lại{" "}

                <strong>
                  Đã gửi
                </strong>

                {" "}để BCH/Admin kiểm tra lại.
              </div>

              <BlobNotice />
            </div>

            {/* FOOTER */}

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={
                  closeSupplementForm
                }
                className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  supplementFiles.length ===
                    0
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />

                    Đang gửi bổ sung...
                  </>
                ) : (
                  <>
                    <Send
                      size={17}
                    />

                    Gửi lại hồ sơ
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================
          DETAIL MODAL
      =================================================== */}

      {detail && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            {/* HEADER */}

            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Chi tiết minh chứng
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    detail.tieuDe
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetail(
                    null,
                  )
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X
                  size={20}
                />
              </button>
            </div>

            {/* BODY */}

            <div className="space-y-5 p-4 sm:p-6">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                    detail.trangThai,
                  )}`}
                >
                  {statusLabel(
                    detail.trangThai,
                  )}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {detail
                    .tepDinhKem
                    ?.length ||
                    0}{" "}
                  tệp
                </span>
              </div>

              {/* SUPPLEMENT ACTION */}

              {canSend &&
                detail.trangThai ===
                  "YEU_CAU_BO_SUNG" && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetail(
                        null,
                      );

                      openSupplementForm(
                        detail,
                      );
                    }}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 sm:w-auto"
                  >
                    <Plus
                      size={17}
                    />

                    Bổ sung minh chứng
                  </button>
                )}

              {/* INFO GRID */}

              <div className="grid gap-3 sm:grid-cols-2">
                <Info
                  label="Hoạt động"
                  value={
                    getActivity(
                      detail,
                    )
                      ? `${getActivity(detail)?.maHoatDong} - ${getActivity(detail)?.tenHoatDong}`
                      : "—"
                  }
                />

                <Info
                  label="Chi hội"
                  value={
                    getBranch(
                      detail,
                    )
                      ? `${getBranch(detail)?.maChiHoi} - ${getBranch(detail)?.tenChiHoi}`
                      : "—"
                  }
                />

                <Info
                  label="Người gửi"
                  value={
                    detail.nguoiGuiTen
                  }
                />

                <Info
                  label="Ngày gửi"
                  value={formatDateTime(
                    detail.createdAt,
                  )}
                />

                {detail.nguoiXuLyTen && (
                  <Info
                    label="Người xử lý"
                    value={
                      detail.nguoiXuLyTen
                    }
                  />
                )}

                {detail.ngayNhan && (
                  <Info
                    label="Ngày tiếp nhận"
                    value={formatDateTime(
                      detail.ngayNhan,
                    )}
                  />
                )}

                {detail.ngayXetDuyet && (
                  <Info
                    label="Ngày xử lý"
                    value={formatDateTime(
                      detail.ngayXetDuyet,
                    )}
                  />
                )}
              </div>

              {/* DESCRIPTION */}

              {detail.moTa && (
                <TextBox
                  label="Mô tả"
                  value={
                    detail.moTa
                  }
                />
              )}

              {/* NOTE */}

              {detail.ghiChu && (
                <TextBox
                  label="Ghi chú"
                  value={
                    detail.ghiChu
                  }
                />
              )}

              {/* REQUEST */}

              {detail.noiDungYeuCauBoSung && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                    Nội dung cần bổ sung
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-700">
                    {
                      detail.noiDungYeuCauBoSung
                    }
                  </p>
                </div>
              )}

              {/* FILES */}

              <section>
                <h3 className="font-bold text-slate-900">
                  Tệp minh chứng
                </h3>

                {detail
                  .tepDinhKem
                  ?.length ? (
                  <div className="mt-3 space-y-2">
                    {detail.tepDinhKem.map(
                      (
                        file,
                        index,
                      ) => (
                        <ExistingFileRow
                          key={`${file.duongDan}-${index}`}
                          file={
                            file
                          }
                          opening={
                            openingFile ===
                            file.duongDan
                          }
                          onOpen={() =>
                            void openPrivateFile(
                              file,
                            )
                          }
                        />
                      ),
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Không có tệp đính kèm.
                  </p>
                )}
              </section>

              {/* REVIEW BUTTONS */}

              {canReview && (
                <div className="flex flex-col gap-2 border-t border-slate-200 pt-5 sm:flex-row">
                  {detail.trangThai ===
                    "DA_GUI" && (
                    <button
                      type="button"
                      disabled={
                        submitting
                      }
                      onClick={() =>
                        void processEvidence(
                          detail,

                          "RECEIVE",
                        )
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Clock3
                        size={17}
                      />

                      Tiếp nhận
                    </button>
                  )}

                  {detail.trangThai ===
                    "DA_NHAN" && (
                    <button
                      type="button"
                      disabled={
                        submitting
                      }
                      onClick={() =>
                        void processEvidence(
                          detail,

                          "APPROVE",
                        )
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2
                        size={17}
                      />

                      Xét duyệt
                    </button>
                  )}

                  {(detail.trangThai ===
                    "DA_GUI" ||
                    detail.trangThai ===
                      "DA_NHAN") && (
                    <button
                      type="button"
                      disabled={
                        submitting
                      }
                      onClick={() => {
                        setDetail(
                          null,
                        );

                        openRequestSupplement(
                          detail,
                        );
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-300 px-5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle
                        size={17}
                      />

                      Yêu cầu bổ sung
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* FOOTER */}

            <div className="flex justify-end border-t border-slate-200 p-4 sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setDetail(
                    null,
                  )
                }
                className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          REQUEST SUPPLEMENT MODAL
      =================================================== */}

      {supplementRequestTarget && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={
              submitSupplementRequest
            }
            className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Yêu cầu bổ sung minh chứng
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {
                    supplementRequestTarget.tieuDe
                  }
                </p>
              </div>

              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={() => {
                  setSupplementRequestTarget(
                    null,
                  );

                  setSupplementRequestReason(
                    "",
                  );
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X
                  size={19}
                />
              </button>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Nội dung cần bổ sung{" "}

                <span className="text-red-600">
                  *
                </span>
              </span>

              <textarea
                required
                disabled={
                  submitting
                }
                value={
                  supplementRequestReason
                }
                onChange={(
                  event,
                ) =>
                  setSupplementRequestReason(
                    event.target
                      .value,
                  )
                }
                maxLength={2000}
                rows={5}
                placeholder="Ví dụ: Vui lòng bổ sung danh sách Hội viên có chữ ký và ảnh hoạt động..."
                className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-[#12345B] disabled:bg-slate-100"
              />

              <p className="mt-1 text-right text-xs text-slate-500">
                {
                  supplementRequestReason.length
                }
                /2000
              </p>
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={() => {
                  setSupplementRequestTarget(
                    null,
                  );

                  setSupplementRequestReason(
                    "",
                  );
                }}
                className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !supplementRequestReason.trim()
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting && (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                )}

                Gửi yêu cầu bổ sung
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   STAT
========================================================= */

function Stat({
  label,

  value,
}: {
  label: string;

  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 sm:text-sm">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   INFO
========================================================= */

function Info({
  label,

  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium leading-6 text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   TEXT BOX
========================================================= */

function TextBox({
  label,

  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   BLOB NOTICE
========================================================= */

function BlobNotice() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
      Tệp được tải trực tiếp từ trình duyệt lên{" "}

      <strong>
        Private Vercel Blob
      </strong>

      . Next.js API chỉ cấp quyền tải lên và lưu metadata của hồ sơ vào MongoDB.
    </div>
  );
}

/* =========================================================
   EXISTING FILE ROW
========================================================= */

function ExistingFileRow({
  file,

  opening,

  onOpen,
}: {
  file: TepDinhKem;

  opening: boolean;

  onOpen:
    () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        {isImageFile(
          file,
        ) ? (
          <ImageIcon
            size={20}
            className="text-blue-600"
          />
        ) : (
          <FileIcon
            size={20}
            className="text-slate-600"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-semibold text-slate-800"
          title={
            file.tenTep
          }
        >
          {
            file.tenTep
          }
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {formatSize(
            file.kichThuoc,
          )}
        </p>
      </div>

      <button
        type="button"
        disabled={
          opening
        }
        onClick={
          onOpen
        }
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        {opening ? (
          <Loader2
            size={15}
            className="animate-spin"
          />
        ) : (
          <Download
            size={15}
          />
        )}

        Mở tệp
      </button>
    </div>
  );
}

/* =========================================================
   FILE PICKER
========================================================= */

function FilePicker({
  title,

  files,

  progress,

  inputRef,

  disabled,

  maxExistingFiles,

  onFiles,

  onRemove,
}: {
  title: string;

  files: File[];

  progress:
    UploadProgress;

  inputRef:
    React.RefObject<HTMLInputElement | null>;

  disabled:
    boolean;

  maxExistingFiles:
    number;

  onFiles:
    (
      files:
        FileList
        | null,
    ) => void;

  onRemove:
    (
      index: number,
    ) => void;
}) {
  const totalFiles =
    maxExistingFiles +
    files.length;

  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          {title}{" "}

          <span className="text-red-600">
            *
          </span>
        </p>

        <p className="text-xs text-slate-500">
          {totalFiles}/
          {MAX_FILES} tệp
        </p>
      </div>

      <input
        ref={
          inputRef
        }
        type="file"
        multiple
        disabled={
          disabled
        }
        accept={
          FILE_ACCEPT
        }
        onChange={(
          event,
        ) =>
          onFiles(
            event.target
              .files,
          )
        }
        className="hidden"
      />

      <button
        type="button"
        disabled={
          disabled ||
          totalFiles >=
            MAX_FILES
        }
        onClick={() =>
          inputRef.current?.click()
        }
        className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-[#12345B] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Upload
          size={30}
          className="text-[#12345B]"
        />

        <span className="mt-3 text-sm font-semibold text-slate-700">
          Chọn tệp minh chứng
        </span>

        <span className="mt-1 text-xs leading-5 text-slate-500">
          PNG, JPG, JPEG, PDF, DOC, DOCX, XLS, XLSX
          <br />

          Tối đa 10MB/tệp
        </span>
      </button>

      {/* FILE LIST */}

      {files.length >
        0 && (
        <div className="mt-4 space-y-2">
          {files.map(
            (
              file,
              index,
            ) => {
              const key =
                makeFileKey(
                  file,
                  index,
                );

              const currentProgress =
                progress[key];

              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      {isImageFile(
                        file,
                      ) ? (
                        <ImageIcon
                          size={20}
                          className="text-blue-600"
                        />
                      ) : (
                        <FileIcon
                          size={20}
                          className="text-slate-600"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-semibold text-slate-800"
                        title={
                          file.name
                        }
                      >
                        {
                          file.name
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatSize(
                          file.size,
                        )}
                      </p>
                    </div>

                    {!disabled && (
                      <button
                        type="button"
                        onClick={() =>
                          onRemove(
                            index,
                          )
                        }
                        className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                      >
                        <X
                          size={17}
                        />
                      </button>
                    )}

                    {disabled &&
                      currentProgress !==
                        undefined && (
                        <span className="min-w-12 text-right text-xs font-bold text-[#12345B]">
                          {
                            currentProgress
                          }
                          %
                        </span>
                      )}
                  </div>

                  {disabled &&
                    currentProgress !==
                      undefined && (
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#12345B] transition-all"
                          style={{
                            width:
                              `${Math.min(
                                100,

                                Math.max(
                                  0,

                                  currentProgress,
                                ),
                              )}%`,
                          }}
                        />
                      </div>
                    )}
                </div>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}