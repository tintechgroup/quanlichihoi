"use client";

import {
  
  
  
  
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  
  Search,
  
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

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type LoaiVanKien =
  | "THONG_BAO"
  | "KE_HOACH"
  | "QUYET_DINH"
  | "BIEN_BAN"
  | "BIEU_MAU"
  | "KHAC";

type PhamVi =
  | "TOAN_HE_THONG"
  | "CHI_HOI"
  | "VAI_TRO";

type TrangThaiVanKien =
  | "NHAP"
  | "CHO_DUYET"
  | "DA_DUYET"
  | "TU_CHOI"
  | "DA_AN";

type UserRef = {
  _id?: string;
  id?: string;
  username?: string;
  fullName?: string;
  role?: UserRole;
};

type ChiHoi = {
  _id: string;
  maChiHoi: string;
  tenChiHoi: string;
};

type ChiHoiRef = {
  _id?: string;
  id?: string;
  maChiHoi?: string;
  tenChiHoi?: string;
};

type VanKien = {
  _id: string;

  tieuDe: string;

  moTa?: string;

  loai: LoaiVanKien;

  soKyHieu?: string;

  ngayBanHanh?: string | null;

  fileUrl?: string;

  tenFile?: string;

  phamVi: PhamVi;

  chiHoiIds?: Array<
    string | ChiHoiRef
  >;

  vaiTroNhan?: UserRole[];

  nguoiTaoId?:
    | string
    | UserRef;

  nguoiTaoTen: string;

  trangThai:
    TrangThaiVanKien;

  nguoiDuyetId?:
    | string
    | UserRef
    | null;

  nguoiDuyetTen?: string;

  ngayGuiDuyet?:
    string | null;

  ngayDuyet?:
    string | null;

  lyDoTuChoi?: string;

  isActive?: boolean;

  createdAt: string;

  updatedAt?: string;
};

type Permissions = {
  canCreate: boolean;

  canManage: boolean;

  canApprove: boolean;

  role: UserRole;
};

type ThongKe = {
  total: number;

  choDuyet: number;

  daDuyet: number;

  tuChoi: number;

  nhap: number;

  daAn: number;
};

type VanKienForm = {
  tieuDe: string;

  moTa: string;

  loai: LoaiVanKien;

  soKyHieu: string;

  ngayBanHanh: string;

  fileUrl: string;

  tenFile: string;

  phamVi: PhamVi;

  chiHoiIds: string[];

  vaiTroNhan: UserRole[];

  trangThai: TrangThaiVanKien;
};

type UploadResult = {
  tenFile: string;

  fileUrl: string;

  pathname?: string;

  kichThuoc?: number;

  mimeType?: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_STATS:
  ThongKe = {
    total: 0,
    choDuyet: 0,
    daDuyet: 0,
    tuChoi: 0,
    nhap: 0,
    daAn: 0,
  };

const EMPTY_FORM:
  VanKienForm = {
    tieuDe: "",
    moTa: "",
    loai:
      "THONG_BAO",
    soKyHieu: "",
    ngayBanHanh:
      new Date()
        .toISOString()
        .slice(0, 10),
    fileUrl: "",
    tenFile: "",
    phamVi:
      "TOAN_HE_THONG",
    chiHoiIds: [],
    vaiTroNhan: [],
    trangThai:
      "DA_DUYET",
  };



const STATUS_LABEL: Record<
  TrangThaiVanKien,
  string
> = {
  NHAP:
    "Bản nháp",

  CHO_DUYET:
    "Chờ duyệt",

  DA_DUYET:
    "Đã duyệt",

  TU_CHOI:
    "Bị từ chối",

  DA_AN:
    "Đã ẩn",
};

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ACCEPTED_FILES =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png,.webp";

/* =========================================================
   HELPERS
========================================================= */

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
      item._id ??
        item.id ??
        "",
    );
  }

  return String(
    value,
  );
}

function pathnameFromFileUrl(
  fileUrl: string,
) {
  if (!fileUrl) {
    return "";
  }

  try {
    const url =
      new URL(
        fileUrl,
        window.location.origin,
      );

    return (
      url.searchParams
        .get(
          "pathname",
        )
        ?.trim() ||
      ""
    );
  } catch {
    return "";
  }
}





function dateInputValue(
  value?:
    string | null,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
}

function loaiLabel(
  loai:
    LoaiVanKien,
) {
  switch (loai) {
    case "THONG_BAO":
      return "Thông báo";

    case "KE_HOACH":
      return "Kế hoạch";

    case "QUYET_DINH":
      return "Quyết định";

    case "BIEN_BAN":
      return "Biên bản";

    case "BIEU_MAU":
      return "Biểu mẫu";

    default:
      return "Khác";
  }
}



async function parseResponse(
  response:
    Response,
) {
  const text =
    await response.text();

  if (
    !text.trim()
  ) {
    return {};
  }

  try {
    return JSON.parse(
      text,
    );
  } catch {
    throw new Error(
      "Máy chủ trả về dữ liệu không hợp lệ",
    );
  }
}

function statusClass(
  status:
    TrangThaiVanKien,
) {
  switch (status) {
    case "CHO_DUYET":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "DA_DUYET":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "TU_CHOI":
      return "border-red-200 bg-red-50 text-red-700";

    case "DA_AN":
      return "border-slate-300 bg-slate-100 text-slate-600";

    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function formatFileSize(
  value?: number,
) {
  if (
    !value ||
    value <= 0
  ) {
    return "";
  }

  if (
    value <
    1024
  ) {
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
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

/* =========================================================
   PAGE
========================================================= */

export default function VanKienPage() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  /*
   * URL file đã tồn tại trong DB
   * trước khi mở form sửa.
   */
  const originalFileUrlRef =
    useRef("");

  /*
   * Những file vừa upload trong phiên form hiện tại.
   * Dùng để xác định file nào là orphan khi Hủy.
   */
  const temporaryPathnamesRef =
    useRef<
      Set<string>
    >(
      new Set(),
    );

  const [
    items,
    setItems,
  ] =
    useState<
      VanKien[]
    >([]);

  const [
    ,
    setChiHoiList,
  ] =
    useState<
      ChiHoi[]
    >([]);

  const [
    ,
    setLoadingChiHoi,
  ] =
    useState(false);

  const [
    permissions,
    setPermissions,
  ] =
    useState<Permissions>({
      canCreate:
        false,
      canManage:
        false,
      canApprove:
        false,
      role:
        "HOI_VIEN",
    });

  const [
    stats,
    setStats,
  ] =
    useState<ThongKe>({
      ...EMPTY_STATS,
    });

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    uploadedFile,
    setUploadedFile,
  ] =
    useState<UploadResult | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    isError,
    setIsError,
  ] =
    useState(false);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    filterLoai,
    setFilterLoai,
  ] =
    useState("");

  const [
    filterStatus,
    setFilterStatus,
  ] =
    useState("");

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    editingItem,
    setEditingItem,
  ] =
    useState<VanKien | null>(
      null,
    );

  const [
    detailItem,
    setDetailItem,
  ] =
    useState<VanKien | null>(
      null,
    );

  const [
    deleteItem,
    setDeleteItem,
  ] =
    useState<VanKien | null>(
      null,
    );

  const [
    approveItem,
    setApproveItem,
  ] =
    useState<VanKien | null>(
      null,
    );

  const [
    rejectItem,
    setRejectItem,
  ] =
    useState<VanKien | null>(
      null,
    );

  const [
    rejectReason,
    setRejectReason,
  ] =
    useState("");

  const [
    form,
    setForm,
  ] =
    useState<VanKienForm>({
      ...EMPTY_FORM,
    });

  const isAdmin =
    permissions.role ===
    "ADMIN";

  const isBCH =
    permissions.role ===
    "BAN_CHAP_HANH";

  /* =======================================================
     BLOB CLEANUP
  ======================================================= */

  async function cleanupBlob(
    pathname:
      string,
  ) {
    if (!pathname) {
      return false;
    }

    try {
      const response =
        await fetch(
          "/api/van-kien/file/xoa",
          {
            method:
              "DELETE",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                pathname,
              }),
          },
        );

      /*
       * 409 nghĩa là file vẫn đang được DB sử dụng.
       * Đây không phải lỗi nghiêm trọng của UI.
       */
      if (
        response.status ===
        409
      ) {
        return false;
      }

      return response.ok;
    } catch (
      error
    ) {
      console.error(
        "Không thể dọn Blob:",
        error,
      );

      return false;
    }
  }

  async function cleanupTemporaryFiles(
    exceptPathname =
      "",
  ) {
    const pathnames =
      Array.from(
        temporaryPathnamesRef.current,
      );

    await Promise.allSettled(
      pathnames
        .filter(
          (
            pathname,
          ) =>
            pathname !==
            exceptPathname,
        )
        .map(
          (
            pathname,
          ) =>
            cleanupBlob(
              pathname,
            ),
        ),
    );

    temporaryPathnamesRef.current =
      new Set(
        exceptPathname
          ? [
              exceptPathname,
            ]
          : [],
      );
  }

  /* =======================================================
     LOAD CHI HOI
  ======================================================= */

  const loadChiHoi =
    useCallback(
      async () => {
        try {
          setLoadingChiHoi(
            true,
          );

          const response =
            await fetch(
              "/api/chi-hoi",
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
                "Không thể tải danh sách Chi hội",
            );
          }

          let source:
            unknown[] = [];

          if (
            Array.isArray(
              result.data,
            )
          ) {
            source =
              result.data;
          } else if (
            result.data &&
            typeof result.data ===
              "object"
          ) {
            const nested =
              result.data as Record<
                string,
                unknown
              >;

            const candidate =
              nested.danhSach ??
              nested.items ??
              nested.data;

            if (
              Array.isArray(
                candidate,
              )
            ) {
              source =
                candidate;
            }
          }

          const normalized =
            source
              .map(
                (
                  raw,
                ) => {
                  if (
                    !raw ||
                    typeof raw !==
                      "object"
                  ) {
                    return null;
                  }

                  const item =
                    raw as Record<
                      string,
                      unknown
                    >;

                  const id =
                    getId(
                      item,
                    );

                  if (!id) {
                    return null;
                  }

                  return {
                    _id:
                      id,

                    maChiHoi:
                      String(
                        item.maChiHoi ??
                          "",
                      ),

                    tenChiHoi:
                      String(
                        item.tenChiHoi ??
                          "",
                      ),
                  };
                },
              )
              .filter(
                (
                  item,
                ): item is
                  ChiHoi =>
                  item !==
                  null,
              );

          setChiHoiList(
            normalized,
          );
        } catch (
          error
        ) {
          console.error(
            "LOAD CHI HOI:",
            error,
          );
        } finally {
          setLoadingChiHoi(
            false,
          );
        }
      },
      [],
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
            permissions.canManage
          ) {
            query.set(
              "mode",
              "quan-ly",
            );
          }

          if (
            search.trim()
          ) {
            query.set(
              "search",
              search.trim(),
            );
          }

          if (
            filterLoai
          ) {
            query.set(
              "loai",
              filterLoai,
            );
          }

          if (
            filterStatus
          ) {
            query.set(
              "status",
              filterStatus,
            );
          }

          const response =
            await fetch(
              `/api/van-kien${
                query.toString()
                  ? `?${query.toString()}`
                  : ""
              }`,
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
                "Không thể tải văn kiện",
            );
          }

          setItems(
            Array.isArray(
              result.data,
            )
              ? result.data
              : [],
          );

          setPermissions({
            canCreate:
              Boolean(
                result.permissions
                  ?.canCreate,
              ),

            canManage:
              Boolean(
                result.permissions
                  ?.canManage,
              ),

            canApprove:
              Boolean(
                result.permissions
                  ?.canApprove,
              ),

            role:
              result.permissions
                ?.role ??
              "HOI_VIEN",
          });

          setStats({
            total:
              Number(
                result.thongKe
                  ?.total ??
                  0,
              ),

            choDuyet:
              Number(
                result.thongKe
                  ?.choDuyet ??
                  0,
              ),

            daDuyet:
              Number(
                result.thongKe
                  ?.daDuyet ??
                  0,
              ),

            tuChoi:
              Number(
                result.thongKe
                  ?.tuChoi ??
                  0,
              ),

            nhap:
              Number(
                result.thongKe
                  ?.nhap ??
                  0,
              ),

            daAn:
              Number(
                result.thongKe
                  ?.daAn ??
                  0,
              ),
          });
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
              : "Không thể tải văn kiện",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        search,
        filterLoai,
        filterStatus,
        permissions.canManage,
      ],
    );

  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
      void loadData();
    },
    [
      loadData,
    ],
  );

  useEffect(
    () => {
      if (
        permissions.canCreate
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
        void loadChiHoi();
      }
    },
    [
      permissions.canCreate,
      loadChiHoi,
    ],
  );

  /* =======================================================
     FORM
  ======================================================= */

  function resetForm() {
    setForm({
      ...EMPTY_FORM,

      chiHoiIds:
        [],

      vaiTroNhan:
        [],

      trangThai:
        isAdmin
          ? "DA_DUYET"
          : "CHO_DUYET",
    });

    setUploadedFile(
      null,
    );

    originalFileUrlRef.current =
      "";

    temporaryPathnamesRef.current =
      new Set();
  }

  function openCreate() {
    setEditingItem(
      null,
    );

    originalFileUrlRef.current =
      "";

    temporaryPathnamesRef.current =
      new Set();

    setForm({
      ...EMPTY_FORM,

      chiHoiIds:
        [],

      vaiTroNhan:
        [],

      trangThai:
        isAdmin
          ? "DA_DUYET"
          : "CHO_DUYET",
    });

    setUploadedFile(
      null,
    );

    setMessage("");

    setIsError(
      false,
    );

    setFormOpen(
      true,
    );
  }

  function openEdit(
    item:
      VanKien,
  ) {
    if (
      !isAdmin &&
      ![
        "NHAP",
        "TU_CHOI",
      ].includes(
        item.trangThai,
      )
    ) {
      setIsError(
        true,
      );

      setMessage(
        "Bạn chỉ có thể chỉnh sửa bản nháp hoặc văn kiện đã bị từ chối.",
      );

      return;
    }

    setEditingItem(
      item,
    );

    originalFileUrlRef.current =
      item.fileUrl ||
      "";

    temporaryPathnamesRef.current =
      new Set();

    setForm({
      tieuDe:
        item.tieuDe,

      moTa:
        item.moTa ||
        "",

      loai:
        item.loai,

      soKyHieu:
        item.soKyHieu ||
        "",

      ngayBanHanh:
        dateInputValue(
          item.ngayBanHanh,
        ),

      fileUrl:
        item.fileUrl ||
        "",

      tenFile:
        item.tenFile ||
        "",

      phamVi:
        item.phamVi,

      chiHoiIds:
        Array.isArray(
          item.chiHoiIds,
        )
          ? item.chiHoiIds
              .map(
                getId,
              )
              .filter(
                Boolean,
              )
          : [],

      vaiTroNhan:
        item.vaiTroNhan
          ? [
              ...item.vaiTroNhan,
            ]
          : [],

      trangThai:
        !isAdmin &&
        item.trangThai ===
          "TU_CHOI"
          ? "CHO_DUYET"
          : item.trangThai,
    });

    if (
      item.fileUrl
    ) {
      setUploadedFile({
        tenFile:
          item.tenFile ||
          "Tài liệu hiện tại",

        fileUrl:
          item.fileUrl,

        pathname:
          pathnameFromFileUrl(
            item.fileUrl,
          ),
      });
    } else {
      setUploadedFile(
        null,
      );
    }

    setMessage("");

    setIsError(
      false,
    );

    setFormOpen(
      true,
    );
  }

  async function closeForm() {
    if (
      saving ||
      uploading
    ) {
      return;
    }

    /*
     * Dọn toàn bộ file mới vừa upload
     * nhưng chưa được DB lưu.
     */
    await cleanupTemporaryFiles();

    setFormOpen(
      false,
    );

    setEditingItem(
      null,
    );

    resetForm();
  }

  function updateForm<
    K extends
      keyof VanKienForm
  >(
    key:
      K,

    value:
      VanKienForm[K],
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        [key]:
          value,
      }),
    );
  }

  

  

  /* =======================================================
     UPLOAD
  ======================================================= */

  async function handleChooseFile(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setIsError(
        true,
      );

      setMessage(
        "Dung lượng tệp không được vượt quá 10 MB",
      );

      return;
    }

    try {
      setUploading(
        true,
      );

      setIsError(
        false,
      );

      setMessage("");

      const formData =
        new FormData();

      formData.append(
        "file",
        file,
      );

      const response =
        await fetch(
          "/api/van-kien/upload",
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
            "Không thể tải tài liệu lên",
        );
      }

      const uploaded =
        result.data as
          UploadResult;

      if (
        !uploaded.fileUrl ||
        !uploaded.tenFile
      ) {
        throw new Error(
          "Không nhận được thông tin tệp sau khi upload",
        );
      }

      const newPathname =
        uploaded.pathname ||
        pathnameFromFileUrl(
          uploaded.fileUrl,
        );

      /*
       * Ghi nhận file mới này là temporary.
       */
      if (
        newPathname
      ) {
        temporaryPathnamesRef.current.add(
          newPathname,
        );
      }

      /*
       * Nếu trước đó cũng là một file temporary
       * trong cùng phiên form thì có thể dọn ngay.
       *
       * Không đụng file gốc đang được DB tham chiếu.
       */
      const previousPathname =
        uploadedFile?.pathname ||
        pathnameFromFileUrl(
          form.fileUrl,
        );

      const previousIsTemporary =
        previousPathname &&
        temporaryPathnamesRef.current.has(
          previousPathname,
        ) &&
        previousPathname !==
          newPathname;

      if (
        previousIsTemporary
      ) {
        const removed =
          await cleanupBlob(
            previousPathname,
          );

        if (removed) {
          temporaryPathnamesRef.current.delete(
            previousPathname,
          );
        }
      }

      setUploadedFile(
        {
          ...uploaded,

          pathname:
            newPathname,
        },
      );

      setForm(
        (
          current,
        ) => ({
          ...current,

          fileUrl:
            uploaded.fileUrl,

          tenFile:
            uploaded.tenFile,
        }),
      );

      setMessage(
        "Tải tài liệu lên thành công",
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
          : "Không thể tải tài liệu lên",
      );
    } finally {
      setUploading(
        false,
      );
    }
  }

  async function removeUploadedFile() {
    if (
      uploading ||
      saving
    ) {
      return;
    }

    const pathname =
      uploadedFile?.pathname ||
      pathnameFromFileUrl(
        form.fileUrl,
      );

    /*
     * Chỉ xóa Blob ngay nếu nó là file temporary.
     *
     * File gốc của record đang sửa vẫn đang được DB dùng
     * nên chưa thể xóa trước khi PUT thành công.
     */
    if (
      pathname &&
      temporaryPathnamesRef.current.has(
        pathname,
      )
    ) {
      const removed =
        await cleanupBlob(
          pathname,
        );

      if (removed) {
        temporaryPathnamesRef.current.delete(
          pathname,
        );
      }
    }

    setUploadedFile(
      null,
    );

    setForm(
      (
        current,
      ) => ({
        ...current,

        fileUrl:
          "",

        tenFile:
          "",
      }),
    );
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !form.tieuDe.trim()
    ) {
      setIsError(
        true,
      );

      setMessage(
        "Vui lòng nhập tiêu đề văn kiện",
      );

      return;
    }

    if (
      form.phamVi ===
        "CHI_HOI" &&
      form.chiHoiIds.length ===
        0
    ) {
      setIsError(
        true,
      );

      setMessage(
        "Vui lòng chọn ít nhất một Chi hội",
      );

      return;
    }

    if (
      form.phamVi ===
        "VAI_TRO" &&
      form.vaiTroNhan.length ===
        0
    ) {
      setIsError(
        true,
      );

      setMessage(
        "Vui lòng chọn ít nhất một vai trò nhận",
      );

      return;
    }

    try {
      setSaving(
        true,
      );

      setMessage("");

      setIsError(
        false,
      );

      const previousFileUrl =
        originalFileUrlRef.current;

      let submitStatus =
        form.trangThai;

      if (!isAdmin) {
        submitStatus =
          form.trangThai ===
          "NHAP"
            ? "NHAP"
            : "CHO_DUYET";
      }

      const response =
        await fetch(
          editingItem
            ? `/api/van-kien/${editingItem._id}`
            : "/api/van-kien",
          {
            method:
              editingItem
                ? "PUT"
                : "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                tieuDe:
                  form.tieuDe.trim(),

                moTa:
                  form.moTa.trim(),

                loai:
                  form.loai,

                soKyHieu:
                  form.soKyHieu.trim(),

                ngayBanHanh:
                  form.ngayBanHanh ||
                  null,

                fileUrl:
                  form.fileUrl,

                tenFile:
                  form.tenFile,

                phamVi:
                  form.phamVi,

                chiHoiIds:
                  form.phamVi ===
                  "CHI_HOI"
                    ? form.chiHoiIds
                    : [],

                vaiTroNhan:
                  form.phamVi ===
                  "VAI_TRO"
                    ? form.vaiTroNhan
                    : [],

                trangThai:
                  submitStatus,
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
            "Không thể lưu văn kiện",
        );
      }

      /*
       * File hiện tại đã được DB lưu.
       * Không còn là temporary.
       */
      const currentPathname =
        pathnameFromFileUrl(
          form.fileUrl,
        );

      if (
        currentPathname
      ) {
        temporaryPathnamesRef.current.delete(
          currentPathname,
        );
      }

      /*
       * Dọn các file temporary cũ khác nếu còn.
       */
      await cleanupTemporaryFiles(
        currentPathname,
      );

      /*
       * Nếu update record:
       * - file gốc khác file mới
       * - PUT đã thành công
       *
       * => file gốc giờ trở thành orphan.
       * Có thể thử xóa an toàn.
       */
      if (
        editingItem &&
        previousFileUrl &&
        previousFileUrl !==
          form.fileUrl
      ) {
        const oldPathname =
          pathnameFromFileUrl(
            previousFileUrl,
          );

        if (
          oldPathname
        ) {
          await cleanupBlob(
            oldPathname,
          );
        }
      }

      /*
       * Trường hợp người dùng xóa file khỏi record:
       * PUT xong fileUrl="" nên file cũ không còn được tham chiếu.
       */
      if (
        editingItem &&
        previousFileUrl &&
        !form.fileUrl
      ) {
        const oldPathname =
          pathnameFromFileUrl(
            previousFileUrl,
          );

        if (
          oldPathname
        ) {
          await cleanupBlob(
            oldPathname,
          );
        }
      }

      setFormOpen(
        false,
      );

      setEditingItem(
        null,
      );

      resetForm();

      setIsError(
        false,
      );

      setMessage(
        result.message ||
          "Lưu văn kiện thành công",
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
          : "Không thể lưu văn kiện",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  /* =======================================================
     DETAIL
  ======================================================= */

  async function openDetail(
    item:
      VanKien,
  ) {
    try {
      const response =
        await fetch(
          `/api/van-kien/${item._id}`,
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
            "Không thể tải chi tiết văn kiện",
        );
      }

      setDetailItem(
        result.data ||
          item,
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
          : "Không thể tải chi tiết văn kiện",
      );
    }
  }

  /* =======================================================
     DELETE RECORD
  ======================================================= */

  async function confirmDelete() {
    if (
      !deleteItem
    ) {
      return;
    }

    try {
      setSaving(
        true,
      );

      const oldFileUrl =
        deleteItem.fileUrl ||
        "";

      const response =
        await fetch(
          `/api/van-kien/${deleteItem._id}`,
          {
            method:
              "DELETE",

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
            "Không thể xóa văn kiện",
        );
      }

      /*
       * Record đã soft delete => fileUrl không còn
       * được active VanKien tham chiếu.
       */
      const oldPathname =
        pathnameFromFileUrl(
          oldFileUrl,
        );

      if (
        oldPathname
      ) {
        await cleanupBlob(
          oldPathname,
        );
      }

      setDeleteItem(
        null,
      );

      setIsError(
        false,
      );

      setMessage(
        result.message ||
          "Xóa văn kiện thành công",
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
          : "Không thể xóa văn kiện",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  /* =======================================================
     APPROVE
  ======================================================= */

  async function confirmApprove() {
    if (
      !approveItem
    ) {
      return;
    }

    try {
      setSaving(
        true,
      );

      const response =
        await fetch(
          `/api/van-kien/${approveItem._id}/phe-duyet`,
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
                  "DUYET",
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
            "Không thể duyệt văn kiện",
        );
      }

      setApproveItem(
        null,
      );

      setIsError(
        false,
      );

      setMessage(
        result.message ||
          "Duyệt văn kiện thành công",
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
          : "Không thể duyệt văn kiện",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  /* =======================================================
     REJECT
  ======================================================= */

  async function confirmReject() {
    if (
      !rejectItem ||
      !rejectReason.trim()
    ) {
      return;
    }

    try {
      setSaving(
        true,
      );

      const response =
        await fetch(
          `/api/van-kien/${rejectItem._id}/phe-duyet`,
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
                  "TU_CHOI",

                lyDoTuChoi:
                  rejectReason.trim(),
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
            "Không thể từ chối văn kiện",
        );
      }

      setRejectItem(
        null,
      );

      setRejectReason(
        "",
      );

      setIsError(
        false,
      );

      setMessage(
        result.message ||
          "Đã từ chối văn kiện",
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
          : "Không thể từ chối văn kiện",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  const titleCount =
    useMemo(
      () =>
        items.length,
      [
        items.length,
      ],
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">

        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#123b68]">
              Kho tài liệu
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Văn kiện và tài liệu
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Quản lý, phê duyệt, lưu trữ và chia sẻ tài liệu trong hệ thống.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                void loadData()
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold"
            >
              <RefreshCw
                size={17}
              />

              Làm mới
            </button>

            {permissions.canCreate && (
              <button
                type="button"
                onClick={
                  openCreate
                }
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#123b68] px-4 text-sm font-bold text-white"
              >
                <Plus
                  size={18}
                />

                Thêm văn kiện
              </button>
            )}
          </div>
        </div>

        {message && (
          <div
            className={`mb-5 flex justify-between rounded-xl border p-4 text-sm ${
              isError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message}

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
            >
              <X
                size={16}
              />
            </button>
          </div>
        )}

        {isBCH && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            <div className="flex gap-2">
              <ShieldCheck
                size={18}
              />

              Văn kiện của Ban Chấp hành phải được Quản trị viên duyệt trước khi công khai.
            </div>
          </div>
        )}

        {permissions.canManage && (
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Tổng"
              value={
                stats.total
              }
              onClick={() =>
                setFilterStatus("")
              }
            />

            <StatCard
              label="Chờ duyệt"
              value={
                stats.choDuyet
              }
              tone="warning"
              onClick={() =>
                setFilterStatus(
                  "CHO_DUYET",
                )
              }
            />

            <StatCard
              label="Đã duyệt"
              value={
                stats.daDuyet
              }
              tone="success"
              onClick={() =>
                setFilterStatus(
                  "DA_DUYET",
                )
              }
            />

            <StatCard
              label="Từ chối"
              value={
                stats.tuChoi
              }
              tone="danger"
              onClick={() =>
                setFilterStatus(
                  "TU_CHOI",
                )
              }
            />

            <StatCard
              label="Bản nháp"
              value={
                stats.nhap
              }
              onClick={() =>
                setFilterStatus(
                  "NHAP",
                )
              }
            />

            <StatCard
              label="Đã ẩn"
              value={
                stats.daAn
              }
              onClick={() =>
                setFilterStatus(
                  "DA_AN",
                )
              }
            />
          </div>
        )}

        <section className="mb-5 rounded-2xl border bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
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
                    event.target
                      .value,
                  )
                }
                placeholder="Tìm văn kiện..."
                className="h-11 w-full rounded-xl border pl-10 pr-3 text-sm"
              />
            </div>

            <select
              value={
                filterLoai
              }
              onChange={(
                event,
              ) =>
                setFilterLoai(
                  event.target
                    .value,
                )
              }
              className="h-11 rounded-xl border px-3"
            >
              <option value="">
                Tất cả loại
              </option>

              <option value="THONG_BAO">
                Thông báo
              </option>

              <option value="KE_HOACH">
                Kế hoạch
              </option>

              <option value="QUYET_DINH">
                Quyết định
              </option>

              <option value="BIEN_BAN">
                Biên bản
              </option>

              <option value="BIEU_MAU">
                Biểu mẫu
              </option>

              <option value="KHAC">
                Khác
              </option>
            </select>

            {permissions.canManage ? (
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
                className="h-11 rounded-xl border px-3"
              >
                <option value="">
                  Tất cả trạng thái
                </option>

                <option value="NHAP">
                  Bản nháp
                </option>

                <option value="CHO_DUYET">
                  Chờ duyệt
                </option>

                <option value="DA_DUYET">
                  Đã duyệt
                </option>

                <option value="TU_CHOI">
                  Bị từ chối
                </option>

                <option value="DA_AN">
                  Đã ẩn
                </option>
              </select>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterLoai("");
                setFilterStatus("");
              }}
              className="h-11 rounded-xl border px-4 text-sm font-semibold"
            >
              Xóa lọc
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b px-5 py-4">
            <h2 className="font-bold">
              Danh sách văn kiện
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {titleCount} văn kiện
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2
                className="animate-spin"
              />
            </div>
          ) : (
            <div className="divide-y">
              {items.map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item._id
                    }
                    className="p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 xl:flex-row">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {loaiLabel(
                              item.loai,
                            )}
                          </span>

                          {permissions.canManage && (
                            <StatusBadge
                              status={
                                item.trangThai
                              }
                            />
                          )}
                        </div>

                        <h3 className="mt-3 font-bold">
                          {item.tieuDe}
                        </h3>

                        {item.tenFile && (
                          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                            <Paperclip
                              size={13}
                            />

                            {
                              item.tenFile
                            }
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          title="Xem"
                          icon={
                            <Eye
                              size={15}
                            />
                          }
                          onClick={() =>
                            void openDetail(
                              item,
                            )
                          }
                        />

                        {isAdmin &&
                          item.trangThai ===
                            "CHO_DUYET" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setApproveItem(
                                    item,
                                  )
                                }
                                className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white"
                              >
                                Duyệt
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setRejectItem(
                                    item,
                                  )
                                }
                                className="h-9 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600"
                              >
                                Từ chối
                              </button>
                            </>
                          )}

                        {permissions.canManage &&
                          (
                            isAdmin ||
                            [
                              "NHAP",
                              "TU_CHOI",
                            ].includes(
                              item.trangThai,
                            )
                          ) && (
                            <ActionButton
                              title="Sửa"
                              icon={
                                <Pencil
                                  size={15}
                                />
                              }
                              onClick={() =>
                                openEdit(
                                  item,
                                )
                              }
                            />
                          )}

                        {permissions.canManage &&
                          (
                            isAdmin ||
                            [
                              "NHAP",
                              "TU_CHOI",
                            ].includes(
                              item.trangThai,
                            )
                          ) && (
                            <ActionButton
                              title="Xóa"
                              danger
                              icon={
                                <Trash2
                                  size={15}
                                />
                              }
                              onClick={() =>
                                setDeleteItem(
                                  item,
                                )
                              }
                            />
                          )}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>

      {/* FORM */}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3">
          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white">
            <div className="flex justify-between border-b p-5">
              <h2 className="text-xl font-bold">
                {editingItem
                  ? "Cập nhật văn kiện"
                  : "Thêm văn kiện"}
              </h2>

              <button
                type="button"
                onClick={() =>
                  void closeForm()
                }
              >
                <X />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="overflow-y-auto"
            >
              <div className="grid gap-5 p-5 md:grid-cols-2">
                <Field
                  label="Tiêu đề"
                  required
                  wide
                >
                  <input
                    value={
                      form.tieuDe
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "tieuDe",
                        event.target
                          .value,
                      )
                    }
                    className="input-control"
                  />
                </Field>

                <Field label="Loại">
                  <select
                    value={
                      form.loai
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "loai",
                        event.target
                          .value as
                          LoaiVanKien,
                      )
                    }
                    className="input-control"
                  >
                    <option value="THONG_BAO">
                      Thông báo
                    </option>

                    <option value="KE_HOACH">
                      Kế hoạch
                    </option>

                    <option value="QUYET_DINH">
                      Quyết định
                    </option>

                    <option value="BIEN_BAN">
                      Biên bản
                    </option>

                    <option value="BIEU_MAU">
                      Biểu mẫu
                    </option>

                    <option value="KHAC">
                      Khác
                    </option>
                  </select>
                </Field>

                <Field label="Số / ký hiệu">
                  <input
                    value={
                      form.soKyHieu
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "soKyHieu",
                        event.target
                          .value,
                      )
                    }
                    className="input-control"
                  />
                </Field>

                <Field label="Ngày ban hành">
                  <input
                    type="date"
                    value={
                      form.ngayBanHanh
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "ngayBanHanh",
                        event.target
                          .value,
                      )
                    }
                    className="input-control"
                  />
                </Field>

                <Field label="Phạm vi">
                  <select
                    value={
                      form.phamVi
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "phamVi",
                        event.target
                          .value as
                          PhamVi,
                      )
                    }
                    className="input-control"
                  >
                    <option value="TOAN_HE_THONG">
                      Toàn hệ thống
                    </option>

                    <option value="CHI_HOI">
                      Theo Chi hội
                    </option>

                    <option value="VAI_TRO">
                      Theo vai trò
                    </option>
                  </select>
                </Field>

                <Field label="Trạng thái">
                  <select
                    value={
                      form.trangThai
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "trangThai",
                        event.target
                          .value as
                          TrangThaiVanKien,
                      )
                    }
                    className="input-control"
                  >
                    {isAdmin ? (
                      <>
                        <option value="DA_DUYET">
                          Công khai
                        </option>

                        <option value="NHAP">
                          Lưu nháp
                        </option>

                        <option value="DA_AN">
                          Đã ẩn
                        </option>
                      </>
                    ) : (
                      <>
                        <option value="CHO_DUYET">
                          Gửi duyệt
                        </option>

                        <option value="NHAP">
                          Lưu nháp
                        </option>
                      </>
                    )}
                  </select>
                </Field>

                <Field
                  label="Tài liệu"
                  wide
                >
                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    accept={
                      ACCEPTED_FILES
                    }
                    onChange={
                      handleChooseFile
                    }
                    className="hidden"
                  />

                  {!form.fileUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed"
                    >
                      {uploading ? (
                        <Loader2
                          className="animate-spin"
                        />
                      ) : (
                        <Upload />
                      )}

                      <span className="mt-2 font-semibold">
                        Chọn file
                      </span>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-bold">
                        {form.tenFile}
                      </p>

                      {uploadedFile?.kichThuoc && (
                        <p className="mt-1 text-xs text-slate-500">
                          {formatFileSize(
                            uploadedFile.kichThuoc,
                          )}
                        </p>
                      )}

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            fileInputRef.current?.click()
                          }
                          className="h-9 rounded-lg border bg-white px-3 text-xs font-bold"
                        >
                          Thay file
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void removeUploadedFile()
                          }
                          className="h-9 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-600"
                        >
                          Xóa file
                        </button>
                      </div>
                    </div>
                  )}
                </Field>

                <Field
                  label="Mô tả"
                  wide
                >
                  <textarea
                    value={
                      form.moTa
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "moTa",
                        event.target
                          .value,
                      )
                    }
                    rows={5}
                    className="w-full rounded-xl border p-3"
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-3 border-t p-4">
                <button
                  type="button"
                  onClick={() =>
                    void closeForm()
                  }
                  className="h-11 rounded-xl border px-4"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    uploading
                  }
                  className="h-11 rounded-xl bg-[#123b68] px-5 font-bold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Đang lưu..."
                    : editingItem
                      ? "Lưu thay đổi"
                      : "Tạo văn kiện"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL */}

      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6">
            <div className="flex justify-between">
              <h2 className="text-xl font-bold">
                {detailItem.tieuDe}
              </h2>

              <button
                type="button"
                onClick={() =>
                  setDetailItem(
                    null,
                  )
                }
              >
                <X />
              </button>
            </div>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {detailItem.moTa}
            </p>

            {detailItem.fileUrl && (
              <a
                href={
                  detailItem.fileUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
              >
                <FileText
                  size={17}
                />

                {detailItem.tenFile ||
                  "Mở tài liệu"}
              </a>
            )}
          </div>
        </div>
      )}

      {/* APPROVE */}

      {approveItem && (
        <ConfirmDialog
          title="Duyệt văn kiện"
          description={`Duyệt và công khai “${approveItem.tieuDe}”?`}
          loading={
            saving
          }
          confirmLabel="Duyệt"
          confirmClass="bg-emerald-600"
          onCancel={() =>
            setApproveItem(
              null,
            )
          }
          onConfirm={() =>
            void confirmApprove()
          }
        />
      )}

      {/* REJECT */}

      {rejectItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-xl font-bold">
              Từ chối văn kiện
            </h3>

            <textarea
              value={
                rejectReason
              }
              onChange={(
                event,
              ) =>
                setRejectReason(
                  event.target
                    .value,
                )
              }
              rows={5}
              className="mt-4 w-full rounded-xl border p-3"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setRejectItem(
                    null,
                  )
                }
                className="h-10 rounded-lg border px-4"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() =>
                  void confirmReject()
                }
                className="h-10 rounded-lg bg-red-600 px-4 font-bold text-white"
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE */}

      {deleteItem && (
        <ConfirmDialog
          title="Xóa văn kiện"
          description={`Bạn có chắc muốn xóa “${deleteItem.tieuDe}”?`}
          loading={
            saving
          }
          confirmLabel="Xóa"
          confirmClass="bg-red-600"
          onCancel={() =>
            setDeleteItem(
              null,
            )
          }
          onConfirm={() =>
            void confirmDelete()
          }
        />
      )}

      <style jsx global>{`
        .input-control {
          width: 100%;
          height: 44px;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.75rem;
          padding: 0 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function StatusBadge({
  status,
}: {
  status:
    TrangThaiVanKien;
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(
        status,
      )}`}
    >
      {
        STATUS_LABEL[
          status
        ]
      }
    </span>
  );
}

function StatCard({
  label,
  value,
  tone =
    "default",
  onClick,
}: {
  label: string;
  value: number;

  tone?:
    | "default"
    | "warning"
    | "success"
    | "danger";

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="rounded-xl border bg-white p-4 text-left"
    >
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-bold ${
          tone ===
          "warning"
            ? "text-amber-700"
            : tone ===
                "success"
              ? "text-emerald-700"
              : tone ===
                  "danger"
                ? "text-red-700"
                : ""
        }`}
      >
        {value}
      </p>
    </button>
  );
}

function ActionButton({
  title,
  icon,
  danger =
    false,
  onClick,
}: {
  title: string;
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`h-9 rounded-lg border px-3 text-xs font-bold ${
        danger
          ? "border-red-200 text-red-600"
          : ""
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {icon}
        {title}
      </span>
    </button>
  );
}

function Field({
  label,
  required =
    false,
  wide =
    false,
  children,
}: {
  label: string;
  required?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={
        wide
          ? "md:col-span-2"
          : ""
      }
    >
      <span className="mb-2 block text-sm font-semibold">
        {label}

        {required && (
          <span className="text-red-500">
            {" "}
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

function ConfirmDialog({
  title,
  description,
  loading,
  confirmLabel,
  confirmClass,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  loading: boolean;
  confirmLabel: string;
  confirmClass: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 className="text-xl font-bold">
          {title}
        </h3>

        <p className="mt-2 text-sm text-slate-600">
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={
              onCancel
            }
            className="h-10 rounded-lg border px-4"
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              onConfirm
            }
            className={`h-10 rounded-lg px-4 font-bold text-white ${confirmClass}`}
          >
            {loading
              ? "Đang xử lý..."
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}