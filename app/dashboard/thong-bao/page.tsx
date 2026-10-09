"use client";

import {
  AlertCircle,
  Archive,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Megaphone,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,

  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
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

type LoaiThongBao =
  | "THONG_BAO_CHUNG"
  | "HOAT_DONG"
  | "TAI_LIEU"
  | "KHAC";

type MucDoThongBao =
  | "THONG_THUONG"
  | "QUAN_TRONG"
  | "KHAN_CAP";

type PhamViThongBao =
  | "TAT_CA"
  | "CHI_HOI"
  | "VAI_TRO"
  | "CA_NHAN";

type TrangThaiThongBao =
  | "NHAP"
  | "CHO_DUYET"
  | "DA_DANG"
  | "TU_CHOI"
  | "DA_AN";

interface TepDinhKem {
  tenTep: string;
  duongDan: string;
  loaiTep?: string;
  kichThuoc?: number;
}

interface ChiHoiOption {
  id: string;
  maChiHoi: string;
  tenChiHoi: string;
}

interface NguoiDungOption {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
}

interface NguoiDungRef {
  id?: string;
  username?: string;
  fullName?: string;
  role?: UserRole;
}

interface ThongBao {
  id: string;
  _id?: string;

  maThongBao?: string;

  tieuDe: string;
  noiDung: string;

  loaiThongBao: LoaiThongBao;
  mucDo: MucDoThongBao;
  phamVi: PhamViThongBao;

  chiHoiIds: string[];
  vaiTroNguoiNhan: UserRole[];
  nguoiNhanIds: string[];

  tepDinhKem: TepDinhKem[];

  ngayBatDau?: string;
  ngayKetThuc?: string;

  trangThai: TrangThaiThongBao;

  ngayGuiDuyet?: string | null;
  ngayDuyet?: string | null;
  lyDoTuChoi?: string;

  daDoc?: boolean;
  soLuotXem?: number;

  nguoiTao?: NguoiDungRef;
  nguoiDuyet?: NguoiDungRef;

  nguoiTaoId?: string;
  nguoiDuyetId?: string;

  createdAt: string;
  updatedAt?: string;
}

interface ThongBaoFormData {
  tieuDe: string;
  noiDung: string;

  loaiThongBao: LoaiThongBao;
  mucDo: MucDoThongBao;
  phamVi: PhamViThongBao;

  chiHoiIds: string[];
  vaiTroNguoiNhan: UserRole[];
  nguoiNhanIds: string[];

  tepDinhKem: TepDinhKem[];

  ngayBatDau: string;
  ngayKetThuc: string;

  trangThai: TrangThaiThongBao;
}

interface ThongKe {
  tong: number;
  chuaDoc: number;

  quanTrong: number;
  khanCap: number;

  choDuyet: number;
  tuChoi: number;
  banNhap: number;
  daDang: number;
  daAn: number;
}

interface QuyenThongBao {
  role: UserRole;
  canManage: boolean;
  canApprove: boolean;
  canPublishDirectly: boolean;
}

/* =========================================================
   CONSTANTS
========================================================= */

const VALID_STATUS: TrangThaiThongBao[] = [
  "NHAP",
  "CHO_DUYET",
  "DA_DANG",
  "TU_CHOI",
  "DA_AN",
];

const EMPTY_FORM: ThongBaoFormData = {
  tieuDe: "",
  noiDung: "",

  loaiThongBao: "THONG_BAO_CHUNG",

  mucDo: "THONG_THUONG",

  phamVi: "TAT_CA",

  chiHoiIds: [],
  vaiTroNguoiNhan: [],
  nguoiNhanIds: [],

  tepDinhKem: [],

  ngayBatDau: "",
  ngayKetThuc: "",

  trangThai: "DA_DANG",
};

const EMPTY_STATS: ThongKe = {
  tong: 0,
  chuaDoc: 0,

  quanTrong: 0,
  khanCap: 0,

  choDuyet: 0,
  tuChoi: 0,
  banNhap: 0,
  daDang: 0,
  daAn: 0,
};

const ROLE_LABEL: Record<
  UserRole,
  string
> = {
  ADMIN: "Quản trị viên",
  BAN_CHAP_HANH: "Ban Chấp hành",
  CHI_HOI_TRUONG: "Chi hội trưởng",
  HOI_VIEN: "Hội viên",
};

const LOAI_LABEL: Record<
  LoaiThongBao,
  string
> = {
  THONG_BAO_CHUNG: "Thông báo chung",
  HOAT_DONG: "Thông báo hoạt động",
  TAI_LIEU: "Tài liệu",
  KHAC: "Thông báo khác",
};

const TRANG_THAI_LABEL: Record<
  TrangThaiThongBao,
  string
> = {
  NHAP: "Bản nháp",
  CHO_DUYET: "Chờ duyệt",
  DA_DANG: "Đã đăng",
  TU_CHOI: "Bị từ chối",
  DA_AN: "Đã ẩn",
};

const MAX_FILES = 5;

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ACCEPTED_FILE_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png,.webp";

/* =========================================================
   HELPERS
========================================================= */

function getId(
  value: unknown,
): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const item =
      value as Record<
        string,
        unknown
      >;

    return String(
      item.id ??
        item._id ??
        "",
    );
  }

  return String(value);
}

async function parseResponse(
  response: Response,
) {
  const text =
    await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Máy chủ trả về dữ liệu không hợp lệ",
    );
  }
}

function toDateTimeLocal(
  value?: string,
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

  const localDate =
    new Date(
      date.getTime() -
        date.getTimezoneOffset() *
          60_000,
    );

  return localDate
    .toISOString()
    .slice(0, 16);
}

function formatDate(
  value?: string | null,
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
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function formatFileSize(
  size?: number,
) {
  if (!size || size <= 0) {
    return "";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function normalizeThongBao(
  raw:
    Partial<ThongBao> &
    Pick<
      ThongBao,
      "tieuDe" | "noiDung"
    >,
): ThongBao {
  return {
    ...raw,

    id:
      getId(
        raw.id ??
          raw._id,
      ),

    chiHoiIds:
      (
        raw.chiHoiIds ??
        []
      ).map(getId),

    nguoiNhanIds:
      (
        raw.nguoiNhanIds ??
        []
      ).map(getId),

    vaiTroNguoiNhan:
      raw.vaiTroNguoiNhan ??
      [],

    tepDinhKem:
      raw.tepDinhKem ??
      [],

    trangThai:
      raw.trangThai ??
      "DA_DANG",

    mucDo:
      raw.mucDo ??
      "THONG_THUONG",

    loaiThongBao:
      raw.loaiThongBao ??
      "THONG_BAO_CHUNG",

    phamVi:
      raw.phamVi ??
      "TAT_CA",

    createdAt:
      raw.createdAt ??
      new Date()
        .toISOString(),

    tieuDe:
      raw.tieuDe,

    noiDung:
      raw.noiDung,
  };
}

function getStatusBadgeClass(
  status:
    TrangThaiThongBao,
) {
  if (
    status ===
    "DA_DANG"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status ===
    "CHO_DUYET"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    status ===
    "TU_CHOI"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    status ===
    "DA_AN"
  ) {
    return "border-slate-300 bg-slate-100 text-slate-600";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

/* =========================================================
   PAGE
========================================================= */

export default function ThongBaoPage() {
  const queryInitializedRef =
    useRef(false);

  const openedQueryIdRef =
    useRef("");

  const [
    queryInitialized,
    setQueryInitialized,
  ] =
    useState(false);

  const [
    userRole,
    setUserRole,
  ] =
    useState<UserRole>(
      "HOI_VIEN",
    );

  const [
    sessionLoaded,
    setSessionLoaded,
  ] =
    useState(false);

  const [
    thongBaoList,
    setThongBaoList,
  ] =
    useState<
      ThongBao[]
    >([]);

  const [
    chiHoiList,
    setChiHoiList,
  ] =
    useState<
      ChiHoiOption[]
    >([]);

  const [
    nguoiDungList,
    setNguoiDungList,
  ] =
    useState<
      NguoiDungOption[]
    >([]);

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
    openingQuery,
    setOpeningQuery,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const [
    keyword,
    setKeyword,
  ] =
    useState("");

  const [
    loaiFilter,
    setLoaiFilter,
  ] =
    useState("");

  const [
    mucDoFilter,
    setMucDoFilter,
  ] =
    useState("");

  const [
    trangThaiFilter,
    setTrangThaiFilter,
  ] =
    useState("");

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    totalPages,
    setTotalPages,
  ] =
    useState(1);

  const [
    total,
    setTotal,
  ] =
    useState(0);

  const [
    thongKe,
    setThongKe,
  ] =
    useState<ThongKe>({
      ...EMPTY_STATS,
    });

  const [
    ,
    setQuyen,
  ] =
    useState<QuyenThongBao | null>(
      null,
    );

  const [
    showFormModal,
    setShowFormModal,
  ] =
    useState(false);

  const [
    editingThongBao,
    setEditingThongBao,
  ] =
    useState<ThongBao | null>(
      null,
    );

  const [
    viewingThongBao,
    setViewingThongBao,
  ] =
    useState<ThongBao | null>(
      null,
    );

  const [
    deletingThongBao,
    setDeletingThongBao,
  ] =
    useState<ThongBao | null>(
      null,
    );

  const [
    approvalTarget,
    setApprovalTarget,
  ] =
    useState<ThongBao | null>(
      null,
    );

  const [
    rejectTarget,
    setRejectTarget,
  ] =
    useState<ThongBao | null>(
      null,
    );

  const [
    rejectReason,
    setRejectReason,
  ] =
    useState("");

  const canManage =
    [
      "ADMIN",
      "BAN_CHAP_HANH",
      "CHI_HOI_TRUONG",
    ].includes(
      userRole,
    );

  const isAdmin =
    userRole ===
    "ADMIN";

  /* =======================================================
     INITIAL URL QUERY
  ======================================================= */

  useEffect(
    () => {
      if (
        queryInitializedRef.current
      ) {
        return;
      }

      queryInitializedRef.current =
        true;

      const params =
        new URLSearchParams(
          window.location.search,
        );

      const status =
        params.get(
          "status",
        );

      if (
        status &&
        VALID_STATUS.includes(
          status as
            TrangThaiThongBao,
        )
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
        setTrangThaiFilter(
          status,
        );

        setPage(1);
      }

      setQueryInitialized(
        true,
      );
    },
    [],
  );

  /* =======================================================
     SESSION
  ======================================================= */

  const loadSession =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/auth/me",
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

          const role =
            result?.user
              ?.role ??
            result?.data
              ?.user
              ?.role ??
            result?.data
              ?.role;

          if (role) {
            setUserRole(
              role as
                UserRole,
            );
          }
        } catch {
          // DashboardShell xử lý phiên đăng nhập.
        } finally {
          setSessionLoaded(
            true,
          );
        }
      },
      [],
    );

  /* =======================================================
     RECIPIENT OPTIONS
  ======================================================= */

  const loadRecipients =
    useCallback(
      async () => {
        if (!canManage) {
          return;
        }

        try {
          const response =
            await fetch(
              "/api/thong-bao/nguoi-nhan",
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
            result.success ===
              false
          ) {
            return;
          }

          const data =
            result.data ??
            result;

          const rawChiHoi =
            data.chiHoi ??
            data.danhSachChiHoi ??
            [];

          const rawNguoiDung =
            data.nguoiDung ??
            data.danhSachNguoiDung ??
            [];

          setChiHoiList(
            rawChiHoi.map(
              (
                item:
                  Partial<ChiHoiOption> & {
                    _id?: string;
                  },
              ) => ({
                id:
                  getId(item),

                maChiHoi:
                  item.maChiHoi ??
                  "",

                tenChiHoi:
                  item.tenChiHoi ??
                  "",
              }),
            ),
          );

          setNguoiDungList(
            rawNguoiDung.map(
              (
                item:
                  Partial<NguoiDungOption> & {
                    _id?: string;
                    hoTen?: string;
                    role:
                      UserRole;
                  },
              ) => ({
                id:
                  getId(item),

                username:
                  item.username ??
                  "",

                fullName:
                  item.fullName ??
                  item.hoTen ??
                  item.username ??
                  "",

                role:
                  item.role,
              }),
            ),
          );
        } catch {
          // Backend vẫn validate lại.
        }
      },
      [
        canManage,
      ],
    );

  /* =======================================================
     LOAD LIST
  ======================================================= */

  const loadThongBao =
    useCallback(
      async () => {
        if (
          !sessionLoaded ||
          !queryInitialized
        ) {
          return;
        }

        setLoading(true);
        setError("");

        try {
          const params =
            new URLSearchParams({
              page:
                String(page),

              limit:
                "10",
            });

          if (canManage) {
            params.set(
              "mode",
              "quan-ly",
            );
          }

          if (
            keyword.trim()
          ) {
            params.set(
              "search",
              keyword.trim(),
            );
          }

          if (loaiFilter) {
            params.set(
              "loaiThongBao",
              loaiFilter,
            );
          }

          if (mucDoFilter) {
            params.set(
              "mucDo",
              mucDoFilter,
            );
          }

          if (
            trangThaiFilter
          ) {
            params.set(
              "trangThai",
              trangThaiFilter,
            );
          }

          const response =
            await fetch(
              `/api/thong-bao?${params.toString()}`,
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
            result.success ===
              false
          ) {
            throw new Error(
              result.message ||
                "Không thể tải thông báo",
            );
          }

          const data =
            result.data ??
            result;

          const rawList =
            data.danhSach ??
            data.items ??
            data.thongBao ??
            [];

          const pagination =
            data.phanTrang ??
            data.pagination ??
            {};

          const rawThongKe =
            data.thongKe ??
            {};

          const normalized:
            ThongBao[] =
            Array.isArray(
              rawList,
            )
              ? rawList.map(
                  normalizeThongBao,
                )
              : [];

          setThongBaoList(
            normalized,
          );

          setTotal(
            Number(
              pagination.total ??
                data.total ??
                normalized.length,
            ),
          );

          setTotalPages(
            Math.max(
              1,

              Number(
                pagination.totalPages ??
                  data.totalPages ??
                  1,
              ),
            ),
          );

          setThongKe({
            tong:
              Number(
                rawThongKe.tong ??
                  normalized.length,
              ),

            chuaDoc:
              Number(
                rawThongKe.chuaDoc ??
                  normalized.filter(
                    (
                      item,
                    ) =>
                      !item.daDoc,
                  ).length,
              ),

            quanTrong:
              Number(
                rawThongKe.quanTrong ??
                  0,
              ),

            khanCap:
              Number(
                rawThongKe.khanCap ??
                  0,
              ),

            choDuyet:
              Number(
                rawThongKe.choDuyet ??
                  0,
              ),

            tuChoi:
              Number(
                rawThongKe.tuChoi ??
                  0,
              ),

            banNhap:
              Number(
                rawThongKe.banNhap ??
                  0,
              ),

            daDang:
              Number(
                rawThongKe.daDang ??
                  0,
              ),

            daAn:
              Number(
                rawThongKe.daAn ??
                  0,
              ),
          });

          if (
            data.quyen
          ) {
            setQuyen({
              role:
                data.quyen.role ??
                userRole,

              canManage:
                Boolean(
                  data.quyen
                    .canManage,
                ),

              canApprove:
                Boolean(
                  data.quyen
                    .canApprove,
                ),

              canPublishDirectly:
                Boolean(
                  data.quyen
                    .canPublishDirectly,
                ),
            });
          }
        } catch (
          requestError
        ) {
          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Đã xảy ra lỗi khi tải thông báo",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        sessionLoaded,
        queryInitialized,
        canManage,
        page,
        keyword,
        loaiFilter,
        mucDoFilter,
        trangThaiFilter,
        userRole,
      ],
    );

  /* =======================================================
     OPEN DETAIL BY ID
  ======================================================= */

  const openDetailById =
    useCallback(
      async (
        id:
          string,
      ) => {
        if (!id) {
          return;
        }

        setOpeningQuery(true);
        setError("");

        try {
          const response =
            await fetch(
              `/api/thong-bao/${encodeURIComponent(
                id,
              )}`,
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
            result.success ===
              false
          ) {
            throw new Error(
              result.message ||
                "Không thể mở thông báo",
            );
          }

          const rawDetail =
            result.data
              ?.thongBao ??
            result.data ??
            result;

          const detail =
            normalizeThongBao(
              rawDetail,
            );

          /*
           * Nếu là người nhận và chưa đọc,
           * đảm bảo trạng thái đọc được cập nhật.
           *
           * Khi đi từ DashboardShell thì route
           * đã đánh dấu trước, nhưng gọi lại
           * là idempotent.
           */
          if (
            !canManage &&
            !detail.daDoc
          ) {
            try {
              const readResponse =
                await fetch(
                  `/api/thong-bao/${detail.id}/da-doc`,
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
                        daDoc:
                          true,
                      }),
                  },
                );

              if (
                readResponse.ok
              ) {
                detail.daDoc =
                  true;

                setThongKe(
                  (
                    current,
                  ) => ({
                    ...current,

                    chuaDoc:
                      Math.max(
                        0,
                        current.chuaDoc -
                          1,
                      ),
                  }),
                );
              }
            } catch {
              // Không chặn việc xem nội dung.
            }
          }

          setViewingThongBao(
            detail,
          );

          setThongBaoList(
            (
              current,
            ) =>
              current.map(
                (
                  item,
                ) =>
                  item.id ===
                  detail.id
                    ? {
                        ...item,

                        daDoc:
                          detail.daDoc ??
                          item.daDoc,
                      }
                    : item,
              ),
          );
        } catch (
          openError
        ) {
          setError(
            openError instanceof
              Error
              ? openError.message
              : "Không thể mở thông báo",
          );
        } finally {
          setOpeningQuery(false);
        }
      },
      [
        canManage,
      ],
    );

  /* =======================================================
     EFFECTS
  ======================================================= */

  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
      void loadSession();
    },
    [
      loadSession,
    ],
  );

  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
      void loadThongBao();
    },
    [
      loadThongBao,
    ],
  );

  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
      void loadRecipients();
    },
    [
      loadRecipients,
    ],
  );

  /*
   * Xử lý:
   *
   * /dashboard/thong-bao?open=<id>
   */
  useEffect(
    () => {
      if (
        !sessionLoaded ||
        !queryInitialized
      ) {
        return;
      }

      const params =
        new URLSearchParams(
          window.location.search,
        );

      const openId =
        params
          .get("open")
          ?.trim() ??
        "";

      if (!openId) {
        return;
      }

      if (
        openedQueryIdRef.current ===
        openId
      ) {
        return;
      }

      openedQueryIdRef.current =
        openId;

      void openDetailById(
        openId,
      );
    },
    [
      sessionLoaded,
      queryInitialized,
      openDetailById,
    ],
  );

  /* =======================================================
     FORM
  ======================================================= */

  function openCreateModal() {
    setEditingThongBao(null);
    setShowFormModal(true);
    setError("");
    setSuccess("");
  }

  function openEditModal(
    item:
      ThongBao,
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
      setError(
        "Chỉ có thể sửa bản nháp hoặc thông báo đã bị từ chối.",
      );

      return;
    }

    setEditingThongBao(
      item,
    );

    setShowFormModal(
      true,
    );

    setError("");
    setSuccess("");
  }

  function closeFormModal() {
    if (saving) {
      return;
    }

    setShowFormModal(false);
    setEditingThongBao(null);
  }

  /* =======================================================
     VIEW
  ======================================================= */

  async function handleViewDetail(
    item:
      ThongBao,
  ) {
    setError("");

    try {
      const response =
        await fetch(
          `/api/thong-bao/${item.id}`,
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
        result.success ===
          false
      ) {
        throw new Error(
          result.message ||
            "Không thể xem thông báo",
        );
      }

      const rawDetail =
        result.data
          ?.thongBao ??
        result.data ??
        result;

      const detail =
        normalizeThongBao(
          rawDetail,
        );

      if (
        !canManage &&
        !item.daDoc
      ) {
        try {
          const readResponse =
            await fetch(
              `/api/thong-bao/${item.id}/da-doc`,
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
                    daDoc:
                      true,
                  }),
              },
            );

          if (
            readResponse.ok
          ) {
            detail.daDoc =
              true;

            setThongKe(
              (
                current,
              ) => ({
                ...current,

                chuaDoc:
                  Math.max(
                    0,
                    current.chuaDoc -
                      1,
                  ),
              }),
            );
          }
        } catch {
          // Vẫn cho xem nội dung.
        }
      }

      setViewingThongBao(
        detail,
      );

      setThongBaoList(
        (
          current,
        ) =>
          current.map(
            (
              notification,
            ) =>
              notification.id ===
              item.id
                ? {
                    ...notification,

                    daDoc:
                      detail.daDoc ??
                      notification.daDoc,
                  }
                : notification,
          ),
      );
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Không thể xem thông báo",
      );
    }
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function handleSaveThongBao(
    form:
      ThongBaoFormData,
  ) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const isEditing =
        Boolean(
          editingThongBao,
        );

      const url =
        editingThongBao
          ? `/api/thong-bao/${editingThongBao.id}`
          : "/api/thong-bao";

      const response =
        await fetch(
          url,
          {
            method:
              editingThongBao
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
                ...form,

                ngayBatDau:
                  form.ngayBatDau
                    ? new Date(
                        form.ngayBatDau,
                      ).toISOString()
                    : null,

                ngayKetThuc:
                  form.ngayKetThuc
                    ? new Date(
                        form.ngayKetThuc,
                      ).toISOString()
                    : null,
              }),
          },
        );

      const result =
        await parseResponse(
          response,
        );

      if (
        !response.ok ||
        result.success ===
          false
      ) {
        throw new Error(
          result.message ||
            "Không thể lưu thông báo",
        );
      }

      setShowFormModal(false);
      setEditingThongBao(null);

      setSuccess(
        result.message ||
          (
            isEditing
              ? "Cập nhật thông báo thành công"
              : isAdmin
                ? "Tạo thông báo thành công"
                : "Tạo thông báo thành công. Đang chờ Quản trị viên duyệt."
          ),
      );

      await loadThongBao();
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Không thể lưu thông báo",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  async function handleDelete() {
    if (
      !deletingThongBao
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/thong-bao/${deletingThongBao.id}`,
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
        result.success ===
          false
      ) {
        throw new Error(
          result.message ||
            "Không thể xóa thông báo",
        );
      }

      setDeletingThongBao(null);

      setSuccess(
        result.message ||
          "Xóa thông báo thành công",
      );

      if (
        thongBaoList.length ===
          1 &&
        page > 1
      ) {
        setPage(
          (
            current,
          ) =>
            current -
            1,
        );
      } else {
        await loadThongBao();
      }
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Không thể xóa thông báo",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     APPROVE
  ======================================================= */

  async function handleApprove() {
    if (
      !approvalTarget
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          `/api/thong-bao/${approvalTarget.id}/phe-duyet`,
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
        result.success ===
          false
      ) {
        throw new Error(
          result.message ||
            "Không thể duyệt thông báo",
        );
      }

      setApprovalTarget(null);

      setSuccess(
        result.message ||
          "Duyệt thông báo thành công",
      );

      await loadThongBao();
    } catch (
      approveError
    ) {
      setError(
        approveError instanceof
          Error
          ? approveError.message
          : "Không thể duyệt thông báo",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     REJECT
  ======================================================= */

  async function handleReject() {
    if (
      !rejectTarget
    ) {
      return;
    }

    const reason =
      rejectReason.trim();

    if (!reason) {
      setError(
        "Vui lòng nhập lý do từ chối.",
      );

      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          `/api/thong-bao/${rejectTarget.id}/phe-duyet`,
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
                  reason,
              }),
          },
        );

      const result =
        await parseResponse(
          response,
        );

      if (
        !response.ok ||
        result.success ===
          false
      ) {
        throw new Error(
          result.message ||
            "Không thể từ chối thông báo",
        );
      }

      setRejectTarget(null);
      setRejectReason("");

      setSuccess(
        result.message ||
          "Đã từ chối thông báo",
      );

      await loadThongBao();
    } catch (
      rejectError
    ) {
      setError(
        rejectError instanceof
          Error
          ? rejectError.message
          : "Không thể từ chối thông báo",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     MARK ALL READ
  ======================================================= */

  async function handleMarkAllRead() {
    const unreadItems =
      thongBaoList.filter(
        (
          item,
        ) =>
          !item.daDoc,
      );

    if (
      unreadItems.length ===
      0
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await Promise.all(
        unreadItems.map(
          async (
            item,
          ) => {
            const response =
              await fetch(
                `/api/thong-bao/${item.id}/da-doc`,
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
                      daDoc:
                        true,
                    }),
                },
              );

            if (
              !response.ok
            ) {
              throw new Error(
                "Không thể đánh dấu đã đọc",
              );
            }
          },
        ),
      );

      setThongBaoList(
        (
          current,
        ) =>
          current.map(
            (
              item,
            ) => ({
              ...item,

              daDoc:
                true,
            }),
          ),
      );

      setThongKe(
        (
          current,
        ) => ({
          ...current,

          chuaDoc:
            0,
        }),
      );

      setSuccess(
        "Đã đánh dấu tất cả thông báo là đã đọc",
      );
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Không thể cập nhật thông báo",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     FILTER
  ======================================================= */

  function resetFilters() {
    setKeyword("");
    setLoaiFilter("");
    setMucDoFilter("");
    setTrangThaiFilter("");
    setPage(1);

    /*
     * Xóa query status nhưng giữ open nếu có.
     */
    const params =
      new URLSearchParams(
        window.location.search,
      );

    params.delete("status");

    const next =
      params.toString();

    window.history.replaceState(
      null,
      "",
      next
        ? `/dashboard/thong-bao?${next}`
        : "/dashboard/thong-bao",
    );
  }

  function quickStatusFilter(
    status:
      TrangThaiThongBao,
  ) {
    setTrangThaiFilter(
      status,
    );

    setPage(1);

    const params =
      new URLSearchParams(
        window.location.search,
      );

    params.set(
      "status",
      status,
    );

    params.delete(
      "open",
    );

    window.history.replaceState(
      null,
      "",
      `/dashboard/thong-bao?${params.toString()}`,
    );
  }

  function handleStatusFilterChange(
    value:
      string,
  ) {
    setTrangThaiFilter(
      value,
    );

    setPage(1);

    const params =
      new URLSearchParams(
        window.location.search,
      );

    if (value) {
      params.set(
        "status",
        value,
      );
    } else {
      params.delete(
        "status",
      );
    }

    params.delete(
      "open",
    );

    const query =
      params.toString();

    window.history.replaceState(
      null,
      "",
      query
        ? `/dashboard/thong-bao?${query}`
        : "/dashboard/thong-bao",
    );
  }

  function closeDetailModal() {
    setViewingThongBao(
      null,
    );

    const params =
      new URLSearchParams(
        window.location.search,
      );

    params.delete(
      "open",
    );

    const query =
      params.toString();

    window.history.replaceState(
      null,
      "",
      query
        ? `/dashboard/thong-bao?${query}`
        : "/dashboard/thong-bao",
    );

    openedQueryIdRef.current =
      "";
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-6 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-[1600px]">

        {/* HEADER */}

        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#123b68]">
              Quản trị hệ thống
            </p>

            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
              Thông báo và tài liệu
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Quản lý thông báo, phạm vi người nhận, tài liệu đính kèm và quy trình phê duyệt trước khi phát hành.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void loadThongBao()
              }
              disabled={
                loading
              }
              className="notification-secondary-button"
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

            {!canManage && (
              <button
                type="button"
                onClick={() =>
                  void handleMarkAllRead()
                }
                disabled={
                  saving ||
                  thongKe.chuaDoc ===
                    0
                }
                className="notification-secondary-button"
              >
                <CheckCheck
                  size={17}
                />

                Đánh dấu đã đọc
              </button>
            )}

            {canManage && (
              <button
                type="button"
                onClick={
                  openCreateModal
                }
                className="notification-primary-button"
              >
                <Plus
                  size={18}
                />

                Tạo thông báo
              </button>
            )}
          </div>
        </div>

        {/* QUERY OPEN LOADING */}

        {openingQuery && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <Loader2
              size={18}
              className="animate-spin"
            />

            Đang mở thông báo...
          </div>
        )}

        {/* ALERT */}

        {error && (
          <AlertBox
            type="error"
            message={error}
            onClose={() =>
              setError("")
            }
          />
        )}

        {success && (
          <AlertBox
            type="success"
            message={success}
            onClose={() =>
              setSuccess("")
            }
          />
        )}

        {/* BCH NOTICE */}

        {canManage &&
          !isAdmin && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <Clock3
                size={20}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <p className="text-sm font-bold text-amber-900">
                  Thông báo cần được phê duyệt
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-700">
                  Khi bạn chọn phát hành, thông báo sẽ chuyển sang trạng thái Chờ duyệt. Chỉ sau khi Quản trị viên duyệt thì thông báo mới hiển thị với người nhận.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STATS */}

        {canManage ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <WorkflowStatCard
              icon={
                <Bell
                  size={20}
                />
              }
              label="Tổng thông báo"
              value={
                thongKe.tong
              }
              onClick={() => {
                handleStatusFilterChange(
                  "",
                );
              }}
            />

            <WorkflowStatCard
              icon={
                <Clock3
                  size={20}
                />
              }
              label="Chờ duyệt"
              value={
                thongKe.choDuyet
              }
              tone="warning"
              onClick={() =>
                quickStatusFilter(
                  "CHO_DUYET",
                )
              }
            />

            <WorkflowStatCard
              icon={
                <CheckCircle2
                  size={20}
                />
              }
              label="Đã đăng"
              value={
                thongKe.daDang
              }
              tone="success"
              onClick={() =>
                quickStatusFilter(
                  "DA_DANG",
                )
              }
            />

            <WorkflowStatCard
              icon={
                <FileText
                  size={20}
                />
              }
              label="Bản nháp"
              value={
                thongKe.banNhap
              }
              onClick={() =>
                quickStatusFilter(
                  "NHAP",
                )
              }
            />

            <WorkflowStatCard
              icon={
                <XCircle
                  size={20}
                />
              }
              label="Bị từ chối"
              value={
                thongKe.tuChoi
              }
              tone="danger"
              onClick={() =>
                quickStatusFilter(
                  "TU_CHOI",
                )
              }
            />

            <WorkflowStatCard
              icon={
                <Archive
                  size={20}
                />
              }
              label="Đã ẩn"
              value={
                thongKe.daAn
              }
              onClick={() =>
                quickStatusFilter(
                  "DA_AN",
                )
              }
            />
          </div>
        ) : (
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <WorkflowStatCard
              icon={
                <Bell
                  size={20}
                />
              }
              label="Tổng thông báo"
              value={
                thongKe.tong
              }
            />

            <WorkflowStatCard
              icon={
                <Megaphone
                  size={20}
                />
              }
              label="Chưa đọc"
              value={
                thongKe.chuaDoc
              }
              tone="warning"
            />

            <WorkflowStatCard
              icon={
                <AlertCircle
                  size={20}
                />
              }
              label="Quan trọng"
              value={
                thongKe.quanTrong
              }
            />

            <WorkflowStatCard
              icon={
                <AlertCircle
                  size={20}
                />
              }
              label="Khẩn cấp"
              value={
                thongKe.khanCap
              }
              tone="danger"
            />
          </div>
        )}

        {/* FILTER */}

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={keyword}
                onChange={(
                  event,
                ) => {
                  setKeyword(
                    event.target
                      .value,
                  );

                  setPage(1);
                }}
                placeholder="Tìm mã, tiêu đề hoặc nội dung..."
                className="notification-control pl-10"
              />
            </div>

            <select
              value={
                loaiFilter
              }
              onChange={(
                event,
              ) => {
                setLoaiFilter(
                  event.target
                    .value,
                );

                setPage(1);
              }}
              className="notification-control"
            >
              <option value="">
                Tất cả loại
              </option>

              <option value="THONG_BAO_CHUNG">
                Thông báo chung
              </option>

              <option value="HOAT_DONG">
                Hoạt động
              </option>

              <option value="TAI_LIEU">
                Tài liệu
              </option>

              <option value="KHAC">
                Khác
              </option>
            </select>

            <select
              value={
                mucDoFilter
              }
              onChange={(
                event,
              ) => {
                setMucDoFilter(
                  event.target
                    .value,
                );

                setPage(1);
              }}
              className="notification-control"
            >
              <option value="">
                Tất cả mức độ
              </option>

              <option value="THONG_THUONG">
                Thông thường
              </option>

              <option value="QUAN_TRONG">
                Quan trọng
              </option>

              <option value="KHAN_CAP">
                Khẩn cấp
              </option>
            </select>

            {canManage ? (
              <select
                value={
                  trangThaiFilter
                }
                onChange={(
                  event,
                ) =>
                  handleStatusFilterChange(
                    event.target
                      .value,
                  )
                }
                className="notification-control"
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

                <option value="DA_DANG">
                  Đã đăng
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
              onClick={
                resetFilters
              }
              className="notification-secondary-button justify-center"
            >
              <RefreshCw
                size={16}
              />

              Xóa lọc
            </button>
          </div>
        </section>

        {/* LIST */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Danh sách thông báo
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {total} kết quả
              </p>
            </div>

            {isAdmin &&
              thongKe.choDuyet >
                0 && (
                <button
                  type="button"
                  onClick={() =>
                    quickStatusFilter(
                      "CHO_DUYET",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700"
                >
                  <Clock3
                    size={15}
                  />

                  {
                    thongKe.choDuyet
                  }{" "}
                  đang chờ duyệt
                </button>
              )}
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <Loader2
                  size={32}
                  className="mx-auto animate-spin text-[#123b68]"
                />

                <p className="mt-3 text-sm text-slate-500">
                  Đang tải thông báo...
                </p>
              </div>
            </div>
          ) : thongBaoList.length ===
            0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center p-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
                <Bell
                  size={28}
                />
              </div>

              <h3 className="mt-4 font-bold text-slate-800">
                Không có thông báo
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Không tìm thấy dữ liệu phù hợp với bộ lọc hiện tại.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {thongBaoList.map(
                (
                  item,
                ) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    canManage={
                      canManage
                    }
                    isAdmin={
                      isAdmin
                    }
                    onView={() =>
                      void handleViewDetail(
                        item,
                      )
                    }
                    onEdit={() =>
                      openEditModal(
                        item,
                      )
                    }
                    onDelete={() =>
                      setDeletingThongBao(
                        item,
                      )
                    }
                    onApprove={() =>
                      setApprovalTarget(
                        item,
                      )
                    }
                    onReject={() => {
                      setRejectTarget(
                        item,
                      );

                      setRejectReason(
                        "",
                      );
                    }}
                  />
                ),
              )}
            </div>
          )}

          {/* PAGINATION */}

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Trang{" "}
              <strong className="text-slate-800">
                {page}
              </strong>{" "}
              /{" "}
              <strong className="text-slate-800">
                {totalPages}
              </strong>
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setPage(
                    (
                      current,
                    ) =>
                      Math.max(
                        1,
                        current - 1,
                      ),
                  )
                }
                disabled={
                  page <= 1 ||
                  loading
                }
                className="notification-secondary-button"
              >
                <ChevronLeft
                  size={17}
                />

                Trước
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage(
                    (
                      current,
                    ) =>
                      Math.min(
                        totalPages,
                        current + 1,
                      ),
                  )
                }
                disabled={
                  page >=
                    totalPages ||
                  loading
                }
                className="notification-secondary-button"
              >
                Sau

                <ChevronRight
                  size={17}
                />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* FORM */}

      <ThongBaoFormModal
        open={
          showFormModal
        }
        initialData={
          editingThongBao
        }
        saving={
          saving
        }
        userRole={
          userRole
        }
        chiHoiList={
          chiHoiList
        }
        nguoiDungList={
          nguoiDungList
        }
        onClose={
          closeFormModal
        }
        onSubmit={
          handleSaveThongBao
        }
      />

      {/* DETAIL */}

      <DetailModal
        item={
          viewingThongBao
        }
        onClose={
          closeDetailModal
        }
      />

      {/* DELETE */}

      <ConfirmModal
        open={
          Boolean(
            deletingThongBao,
          )
        }
        loading={
          saving
        }
        title="Xóa thông báo"
        message={
          deletingThongBao
            ? `Bạn có chắc muốn xóa “${deletingThongBao.tieuDe}”?`
            : ""
        }
        onClose={() =>
          setDeletingThongBao(
            null,
          )
        }
        onConfirm={() =>
          void handleDelete()
        }
      />

      {/* APPROVE */}

      <ApproveModal
        item={
          approvalTarget
        }
        loading={
          saving
        }
        onClose={() =>
          setApprovalTarget(
            null,
          )
        }
        onConfirm={() =>
          void handleApprove()
        }
      />

      {/* REJECT */}

      <RejectModal
        item={
          rejectTarget
        }
        reason={
          rejectReason
        }
        loading={
          saving
        }
        onReasonChange={
          setRejectReason
        }
        onClose={() => {
          if (saving) {
            return;
          }

          setRejectTarget(
            null,
          );

          setRejectReason(
            "",
          );
        }}
        onConfirm={() =>
          void handleReject()
        }
      />

      {/* GLOBAL STYLES */}

      <style jsx global>{`
        .notification-control {
          width: 100%;
          height: 44px;
          border-radius: 0.75rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0 0.875rem;
          font-size: 0.875rem;
          color: rgb(30 41 59);
          outline: none;
          transition: 0.15s ease;
        }

        .notification-control:focus {
          border-color: rgb(37 99 235);
          box-shadow: 0 0 0 3px rgb(219 234 254);
        }

        .notification-control:disabled {
          cursor: not-allowed;
          background: rgb(248 250 252);
          opacity: 0.7;
        }

        .notification-primary-button {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          gap: 0.5rem;
          border-radius: 0.75rem;
          background: #123b68;
          padding: 0 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: white;
          transition: 0.15s ease;
        }

        .notification-primary-button:hover {
          background: #0d3158;
        }

        .notification-primary-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .notification-secondary-button {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          gap: 0.5rem;
          border-radius: 0.75rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: rgb(51 65 85);
          transition: 0.15s ease;
        }

        .notification-secondary-button:hover {
          background: rgb(248 250 252);
        }

        .notification-secondary-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   ROW
========================================================= */

function NotificationRow({
  item,
  canManage,
  isAdmin,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: {
  item: ThongBao;

  canManage: boolean;
  isAdmin: boolean;

  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div
      className={`p-4 transition hover:bg-slate-50 sm:p-5 ${
        !item.daDoc &&
        !canManage
          ? "bg-blue-50/30"
          : ""
      }`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <NotificationBadge
              item={item}
            />

            {canManage && (
              <StatusBadge
                status={
                  item.trangThai
                }
              />
            )}

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {
                LOAI_LABEL[
                  item.loaiThongBao
                ]
              }
            </span>

            {!item.daDoc &&
              !canManage && (
              <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
                Mới
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={
              onView
            }
            className="mt-3 block max-w-full text-left"
          >
            <h3 className="line-clamp-2 text-base font-bold text-slate-900 hover:text-blue-700">
              {item.tieuDe}
            </h3>
          </button>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {item.noiDung}
          </p>

          {item.trangThai ===
            "TU_CHOI" &&
            item.lyDoTuChoi && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-bold uppercase text-red-700">
                Lý do từ chối
              </p>

              <p className="mt-1 text-sm text-red-700">
                {
                  item.lyDoTuChoi
                }
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>
              {formatDate(
                item.createdAt,
              )}
            </span>

            {item.maThongBao && (
              <span>
                Mã:{" "}
                <strong>
                  {
                    item.maThongBao
                  }
                </strong>
              </span>
            )}

            {item.nguoiTao
              ?.fullName && (
              <span>
                Người tạo:{" "}
                {
                  item.nguoiTao
                    .fullName
                }
              </span>
            )}

            {item.tepDinhKem
              .length >
              0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip
                  size={13}
                />

                {
                  item.tepDinhKem
                    .length
                }{" "}
                tệp
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <ActionButton
            title="Xem"
            icon={
              <Eye
                size={17}
              />
            }
            onClick={
              onView
            }
          />

          {isAdmin &&
            item.trangThai ===
              "CHO_DUYET" && (
              <>
                <button
                  type="button"
                  onClick={
                    onApprove
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Check
                    size={16}
                  />

                  Duyệt
                </button>

                <button
                  type="button"
                  onClick={
                    onReject
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  <X
                    size={16}
                  />

                  Từ chối
                </button>
              </>
            )}

          {canManage &&
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
                    size={17}
                  />
                }
                onClick={
                  onEdit
                }
              />
            )}

          {canManage &&
            item.trangThai !==
              "CHO_DUYET" && (
              <ActionButton
                title="Xóa"
                danger
                icon={
                  <Trash2
                    size={17}
                  />
                }
                onClick={
                  onDelete
                }
              />
            )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FORM MODAL
========================================================= */

function ThongBaoFormModal({
  open,
  initialData,
  saving,
  userRole,
  chiHoiList,
  nguoiDungList,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialData: ThongBao | null;
  saving: boolean;
  userRole: UserRole;
  chiHoiList: ChiHoiOption[];
  nguoiDungList: NguoiDungOption[];
  onClose: () => void;
  onSubmit: (
    form:
      ThongBaoFormData,
  ) => Promise<void>;
}) {
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<ThongBaoFormData>({
      ...EMPTY_FORM,
    });

  const [
    localError,
    setLocalError,
  ] =
    useState("");

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const isAdmin =
    userRole ===
    "ADMIN";

  const disabled =
    saving ||
    uploading;

  useEffect(
    () => {
      if (!open) {
        return;
      }

      if (initialData) {
        let editStatus =
          initialData.trangThai;

        if (
          !isAdmin &&
          editStatus ===
            "TU_CHOI"
        ) {
          editStatus =
            "DA_DANG";
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
        setForm({
          tieuDe:
            initialData.tieuDe,

          noiDung:
            initialData.noiDung,

          loaiThongBao:
            initialData.loaiThongBao,

          mucDo:
            initialData.mucDo,

          phamVi:
            initialData.phamVi,

          chiHoiIds:
            [
              ...initialData.chiHoiIds,
            ],

          vaiTroNguoiNhan:
            [
              ...initialData.vaiTroNguoiNhan,
            ],

          nguoiNhanIds:
            [
              ...initialData.nguoiNhanIds,
            ],

          tepDinhKem:
            [
              ...initialData.tepDinhKem,
            ],

          ngayBatDau:
            toDateTimeLocal(
              initialData.ngayBatDau,
            ),

          ngayKetThuc:
            toDateTimeLocal(
              initialData.ngayKetThuc,
            ),

          trangThai:
            editStatus,
        });
      } else {
        setForm({
          ...EMPTY_FORM,

          chiHoiIds: [],
          vaiTroNguoiNhan: [],
          nguoiNhanIds: [],
          tepDinhKem: [],
        });
      }

      setLocalError("");
      setUploading(false);
    },
    [
      open,
      initialData,
      isAdmin,
    ],
  );

  if (!open) {
    return null;
  }

  function setField<
    K extends
      keyof ThongBaoFormData
  >(
    field: K,
    value:
      ThongBaoFormData[K],
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        [field]:
          value,
      }),
    );

    setLocalError("");
  }

  function toggleValue<
    T extends string
  >(
    values: T[],
    value: T,
  ) {
    return values.includes(
      value,
    )
      ? values.filter(
          (
            item,
          ) =>
            item !==
            value,
        )
      : [
          ...values,
          value,
        ];
  }

  function handleScopeChange(
    value:
      PhamViThongBao,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        phamVi:
          value,

        chiHoiIds:
          value ===
          "CHI_HOI"
            ? current.chiHoiIds
            : [],

        vaiTroNguoiNhan:
          value ===
          "VAI_TRO"
            ? current.vaiTroNguoiNhan
            : [],

        nguoiNhanIds:
          value ===
          "CA_NHAN"
            ? current.nguoiNhanIds
            : [],
      }),
    );
  }

  async function handleChooseFiles(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles =
      Array.from(
        event.target.files ??
          [],
      );

    event.target.value =
      "";

    if (
      selectedFiles.length ===
      0
    ) {
      return;
    }

    const remaining =
      MAX_FILES -
      form.tepDinhKem
        .length;

    if (
      selectedFiles.length >
      remaining
    ) {
      setLocalError(
        `Bạn chỉ có thể chọn thêm ${remaining} tệp`,
      );

      return;
    }

    const oversized =
      selectedFiles.find(
        (
          file,
        ) =>
          file.size >
          MAX_FILE_SIZE,
      );

    if (oversized) {
      setLocalError(
        `Tệp “${oversized.name}” vượt quá 10 MB`,
      );

      return;
    }

    setUploading(true);
    setLocalError("");

    try {
      const uploadData =
        new FormData();

      selectedFiles.forEach(
        (
          file,
        ) => {
          uploadData.append(
            "files",
            file,
          );
        },
      );

      const response =
        await fetch(
          "/api/thong-bao/upload",
          {
            method:
              "POST",

            credentials:
              "include",

            body:
              uploadData,
          },
        );

      const result =
        await parseResponse(
          response,
        );

      if (
        !response.ok ||
        result.success ===
          false
      ) {
        throw new Error(
          result.message ||
            "Không thể tải tài liệu lên",
        );
      }

      const uploadedFiles =
        result?.data
          ?.files ??
        result?.files ??
        result?.data ??
        [];

      if (
        !Array.isArray(
          uploadedFiles,
        )
      ) {
        throw new Error(
          "Dữ liệu tệp tải lên không hợp lệ",
        );
      }

      setForm(
        (
          current,
        ) => ({
          ...current,

          tepDinhKem:
            [
              ...current
                .tepDinhKem,

              ...uploadedFiles,
            ].slice(
              0,
              MAX_FILES,
            ),
        }),
      );
    } catch (
      uploadError
    ) {
      setLocalError(
        uploadError instanceof
          Error
          ? uploadError.message
          : "Không thể tải tài liệu lên",
      );
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(
    index:
      number,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        tepDinhKem:
          current.tepDinhKem.filter(
            (
              _,
              itemIndex,
            ) =>
              itemIndex !==
              index,
          ),
      }),
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !form.tieuDe.trim()
    ) {
      setLocalError(
        "Vui lòng nhập tiêu đề thông báo",
      );

      return;
    }

    if (
      !form.noiDung.trim()
    ) {
      setLocalError(
        "Vui lòng nhập nội dung thông báo",
      );

      return;
    }

    if (
      form.phamVi ===
        "CHI_HOI" &&
      form.chiHoiIds
        .length ===
        0
    ) {
      setLocalError(
        "Vui lòng chọn ít nhất một Chi hội",
      );

      return;
    }

    if (
      form.phamVi ===
        "VAI_TRO" &&
      form.vaiTroNguoiNhan
        .length ===
        0
    ) {
      setLocalError(
        "Vui lòng chọn ít nhất một vai trò",
      );

      return;
    }

    if (
      form.phamVi ===
        "CA_NHAN" &&
      form.nguoiNhanIds
        .length ===
        0
    ) {
      setLocalError(
        "Vui lòng chọn ít nhất một người nhận",
      );

      return;
    }

    if (
      form.ngayBatDau &&
      form.ngayKetThuc &&
      new Date(
        form.ngayKetThuc,
      ) <=
        new Date(
          form.ngayBatDau,
        )
    ) {
      setLocalError(
        "Thời gian kết thúc phải sau thời gian bắt đầu",
      );

      return;
    }

    await onSubmit({
      ...form,

      tieuDe:
        form.tieuDe.trim(),

      noiDung:
        form.noiDung.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {initialData
                ? "Cập nhật thông báo"
                : "Tạo thông báo"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {isAdmin
                ? "Quản trị viên có thể phát hành trực tiếp."
                : "Thông báo phát hành sẽ được gửi Quản trị viên phê duyệt."}
            </p>
          </div>

          <button
            type="button"
            disabled={
              disabled
            }
            onClick={
              onClose
            }
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X />
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-6 overflow-y-auto p-5">

            {localError && (
              <AlertBox
                type="error"
                message={
                  localError
                }
                onClose={() =>
                  setLocalError(
                    "",
                  )
                }
              />
            )}

            {initialData
              ?.trangThai ===
              "TU_CHOI" &&
              initialData.lyDoTuChoi && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="font-bold text-red-800">
                  Lý do bị từ chối
                </p>

                <p className="mt-2 text-sm text-red-700">
                  {
                    initialData
                      .lyDoTuChoi
                  }
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
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
                    setField(
                      "tieuDe",
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    disabled
                  }
                  maxLength={
                    250
                  }
                  className="notification-control"
                />
              </FormField>

              <FormField label="Loại thông báo">
                <select
                  value={
                    form.loaiThongBao
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "loaiThongBao",
                      event.target
                        .value as
                        LoaiThongBao,
                    )
                  }
                  className="notification-control"
                >
                  {Object.entries(
                    LOAI_LABEL,
                  ).map(
                    (
                      [
                        value,
                        label,
                      ],
                    ) => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        {
                          label
                        }
                      </option>
                    ),
                  )}
                </select>
              </FormField>

              <FormField label="Mức độ">
                <select
                  value={
                    form.mucDo
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "mucDo",
                      event.target
                        .value as
                        MucDoThongBao,
                    )
                  }
                  className="notification-control"
                >
                  <option value="THONG_THUONG">
                    Thông thường
                  </option>

                  <option value="QUAN_TRONG">
                    Quan trọng
                  </option>

                  <option value="KHAN_CAP">
                    Khẩn cấp
                  </option>
                </select>
              </FormField>

              <FormField
                label="Nội dung"
                required
                wide
              >
                <textarea
                  value={
                    form.noiDung
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "noiDung",
                      event.target
                        .value,
                    )
                  }
                  rows={
                    7
                  }
                  disabled={
                    disabled
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none"
                />
              </FormField>
            </div>

            {/* PHẠM VI */}

            <section>
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                Phạm vi nhận thông báo
              </h3>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <ScopeButton
                  selected={
                    form.phamVi ===
                    "TAT_CA"
                  }
                  label="Tất cả"
                  description="Toàn hệ thống"
                  onClick={() =>
                    handleScopeChange(
                      "TAT_CA",
                    )
                  }
                />

                <ScopeButton
                  selected={
                    form.phamVi ===
                    "CHI_HOI"
                  }
                  label="Chi hội"
                  description="Theo Chi hội"
                  onClick={() =>
                    handleScopeChange(
                      "CHI_HOI",
                    )
                  }
                />

                <ScopeButton
                  selected={
                    form.phamVi ===
                    "VAI_TRO"
                  }
                  label="Vai trò"
                  description="Theo quyền"
                  onClick={() =>
                    handleScopeChange(
                      "VAI_TRO",
                    )
                  }
                />

                <ScopeButton
                  selected={
                    form.phamVi ===
                    "CA_NHAN"
                  }
                  label="Cá nhân"
                  description="Người cụ thể"
                  onClick={() =>
                    handleScopeChange(
                      "CA_NHAN",
                    )
                  }
                />
              </div>

              {form.phamVi ===
                "CHI_HOI" && (
                <ChoiceBox>
                  {chiHoiList.map(
                    (
                      item,
                    ) => (
                      <CheckOption
                        key={
                          item.id
                        }
                        checked={form.chiHoiIds.includes(
                          item.id,
                        )}
                        label={`${item.maChiHoi} - ${item.tenChiHoi}`}
                        onChange={() =>
                          setField(
                            "chiHoiIds",

                            toggleValue(
                              form.chiHoiIds,
                              item.id,
                            ),
                          )
                        }
                      />
                    ),
                  )}
                </ChoiceBox>
              )}

              {form.phamVi ===
                "VAI_TRO" && (
                <ChoiceBox>
                  {(
                    Object.keys(
                      ROLE_LABEL,
                    ) as
                      UserRole[]
                  ).map(
                    (
                      role,
                    ) => (
                      <CheckOption
                        key={
                          role
                        }
                        checked={form.vaiTroNguoiNhan.includes(
                          role,
                        )}
                        label={
                          ROLE_LABEL[
                            role
                          ]
                        }
                        onChange={() =>
                          setField(
                            "vaiTroNguoiNhan",

                            toggleValue(
                              form.vaiTroNguoiNhan,
                              role,
                            ),
                          )
                        }
                      />
                    ),
                  )}
                </ChoiceBox>
              )}

              {form.phamVi ===
                "CA_NHAN" && (
                <ChoiceBox>
                  {nguoiDungList.map(
                    (
                      user,
                    ) => (
                      <CheckOption
                        key={
                          user.id
                        }
                        checked={form.nguoiNhanIds.includes(
                          user.id,
                        )}
                        label={`${user.fullName} (${user.username})`}
                        onChange={() =>
                          setField(
                            "nguoiNhanIds",

                            toggleValue(
                              form.nguoiNhanIds,
                              user.id,
                            ),
                          )
                        }
                      />
                    ),
                  )}
                </ChoiceBox>
              )}
            </section>

            {/* DATE */}

            <div className="grid gap-5 md:grid-cols-3">
              <FormField label="Bắt đầu">
                <input
                  type="datetime-local"
                  value={
                    form.ngayBatDau
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "ngayBatDau",
                      event.target
                        .value,
                    )
                  }
                  className="notification-control"
                />
              </FormField>

              <FormField label="Kết thúc">
                <input
                  type="datetime-local"
                  value={
                    form.ngayKetThuc
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "ngayKetThuc",
                      event.target
                        .value,
                    )
                  }
                  className="notification-control"
                />
              </FormField>

              <FormField label="Hành động">
                <select
                  value={
                    form.trangThai
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "trangThai",
                      event.target
                        .value as
                        TrangThaiThongBao,
                    )
                  }
                  className="notification-control"
                >
                  {isAdmin ? (
                    <>
                      <option value="DA_DANG">
                        Phát hành
                      </option>

                      <option value="NHAP">
                        Lưu nháp
                      </option>

                      <option value="DA_AN">
                        Lưu đã ẩn
                      </option>
                    </>
                  ) : (
                    <>
                      <option value="DA_DANG">
                        Gửi duyệt
                      </option>

                      <option value="NHAP">
                        Lưu nháp
                      </option>
                    </>
                  )}
                </select>
              </FormField>
            </div>

            {/* FILE */}

            <section>
              <div className="mb-3 flex justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Tệp đính kèm
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Tối đa 5 tệp, mỗi tệp tối đa 10 MB.
                  </p>
                </div>

                <span className="text-xs text-slate-500">
                  {
                    form
                      .tepDinhKem
                      .length
                  }
                  /5
                </span>
              </div>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                multiple
                accept={
                  ACCEPTED_FILE_TYPES
                }
                onChange={
                  handleChooseFiles
                }
                className="hidden"
              />

              <button
                type="button"
                disabled={
                  disabled ||
                  form
                    .tepDinhKem
                    .length >=
                    MAX_FILES
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-7"
              >
                {uploading ? (
                  <Loader2
                    size={28}
                    className="animate-spin text-blue-700"
                  />
                ) : (
                  <Upload
                    size={28}
                    className="text-blue-700"
                  />
                )}

                <span className="mt-2 text-sm font-semibold">
                  {uploading
                    ? "Đang tải..."
                    : "Chọn tài liệu"}
                </span>
              </button>

              {form
                .tepDinhKem
                .length >
                0 && (
                <div className="mt-4 space-y-2">
                  {form.tepDinhKem.map(
                    (
                      file,
                      index,
                    ) => (
                      <div
                        key={`${file.duongDan}-${index}`}
                        className="flex items-center gap-3 rounded-xl border p-3"
                      >
                        <FileText
                          className="text-blue-700"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {
                              file.tenTep
                            }
                          </p>

                          <p className="text-xs text-slate-500">
                            {formatFileSize(
                              file.kichThuoc,
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeAttachment(
                              index,
                            )
                          }
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        >
                          <Trash2
                            size={17}
                          />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="flex justify-end gap-3 border-t p-4">
            <button
              type="button"
              onClick={
                onClose
              }
              className="notification-secondary-button"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={
                disabled
              }
              className="notification-primary-button"
            >
              {saving ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Send
                  size={17}
                />
              )}

              {initialData
                ? "Lưu thay đổi"
                : !isAdmin &&
                    form.trangThai ===
                      "DA_DANG"
                  ? "Gửi duyệt"
                  : "Tạo thông báo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   DETAIL
========================================================= */

function DetailModal({
  item,
  onClose,
}: {
  item:
    ThongBao | null;

  onClose:
    () => void;
}) {
  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex justify-between border-b p-6">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <NotificationBadge
                item={
                  item
                }
              />

              <StatusBadge
                status={
                  item.trangThai
                }
              />
            </div>

            <h2 className="text-2xl font-bold">
              {item.tieuDe}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {formatDate(
                item.createdAt,
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
          >
            <X />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {item.trangThai ===
            "CHO_DUYET" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
              Đang chờ Quản trị viên duyệt.
            </div>
          )}

          {item.trangThai ===
            "TU_CHOI" &&
            item.lyDoTuChoi && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <strong>
                Lý do từ chối:
              </strong>{" "}
              {
                item.lyDoTuChoi
              }
            </div>
          )}

          <div className="whitespace-pre-wrap leading-7 text-slate-700">
            {item.noiDung}
          </div>

          {item
            .tepDinhKem
            .length >
            0 && (
            <div>
              <h3 className="mb-3 font-bold">
                Tài liệu đính kèm
              </h3>

              <div className="space-y-2">
                {item.tepDinhKem.map(
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
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border p-3 hover:bg-slate-50"
                    >
                      <FileText
                        className="text-blue-700"
                      />

                      <span className="text-sm font-semibold">
                        {
                          file.tenTep
                        }
                      </span>
                    </a>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t p-4">
          <button
            type="button"
            onClick={
              onClose
            }
            className="notification-primary-button"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   APPROVE
========================================================= */

function ApproveModal({
  item,
  loading,
  onClose,
  onConfirm,
}: {
  item:
    ThongBao | null;

  loading:
    boolean;

  onClose:
    () => void;

  onConfirm:
    () => void;
}) {
  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <CheckCircle2
          size={38}
          className="text-emerald-600"
        />

        <h3 className="mt-4 text-xl font-bold">
          Duyệt thông báo
        </h3>

        <p className="mt-2 text-sm text-slate-600">
          Phát hành thông báo{" "}
          <strong>
            “{item.tieuDe}”
          </strong>
          ?
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={
              onClose
            }
            className="notification-secondary-button"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={
              onConfirm
            }
            disabled={
              loading
            }
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white"
          >
            Duyệt và phát hành
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   REJECT
========================================================= */

function RejectModal({
  item,
  reason,
  loading,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  item:
    ThongBao | null;

  reason:
    string;

  loading:
    boolean;

  onReasonChange:
    (
      value:
        string,
    ) => void;

  onClose:
    () => void;

  onConfirm:
    () => void;
}) {
  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <XCircle
          size={38}
          className="text-red-600"
        />

        <h3 className="mt-4 text-xl font-bold">
          Từ chối thông báo
        </h3>

        <textarea
          value={
            reason
          }
          onChange={(
            event,
          ) =>
            onReasonChange(
              event.target
                .value,
            )
          }
          rows={5}
          maxLength={
            1000
          }
          placeholder="Nhập lý do từ chối..."
          className="mt-4 w-full rounded-xl border p-3 text-sm outline-none"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={
              onClose
            }
            className="notification-secondary-button"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={
              onConfirm
            }
            disabled={
              loading ||
              !reason.trim()
            }
            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Xác nhận từ chối
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CONFIRM
========================================================= */

function ConfirmModal({
  open,
  loading,
  title,
  message,
  onClose,
  onConfirm,
}: {
  open:
    boolean;

  loading:
    boolean;

  title:
    string;

  message:
    string;

  onClose:
    () => void;

  onConfirm:
    () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <Trash2
          className="text-red-600"
        />

        <h3 className="mt-4 text-xl font-bold">
          {title}
        </h3>

        <p className="mt-2 text-sm text-slate-600">
          {message}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={
              onClose
            }
            className="notification-secondary-button"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={
              onConfirm
            }
            disabled={
              loading
            }
            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function AlertBox({
  type,
  message,
  onClose,
}: {
  type:
    "success" |
    "error";

  message:
    string;

  onClose:
    () => void;
}) {
  const ok =
    type ===
    "success";

  return (
    <div
      className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <span>
        {message}
      </span>

      <button
        type="button"
        onClick={
          onClose
        }
      >
        <X
          size={16}
        />
      </button>
    </div>
  );
}

function WorkflowStatCard({
  icon,
  label,
  value,
  tone =
    "default",
  onClick,
}: {
  icon:
    ReactNode;

  label:
    string;

  value:
    number;

  tone?:
    | "default"
    | "success"
    | "warning"
    | "danger";

  onClick?:
    () => void;
}) {
  const map = {
    default:
      "text-slate-900",

    success:
      "text-emerald-700",

    warning:
      "text-amber-700",

    danger:
      "text-red-700",
  };

  const content = (
    <div className="flex items-center gap-3">
      {icon}

      <div>
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p
          className={`text-xl font-bold ${map[tone]}`}
        >
          {value}
        </p>
      </div>
    </div>
  );

  return onClick ? (
    <button
      type="button"
      onClick={
        onClick
      }
      className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:shadow-md"
    >
      {content}
    </button>
  ) : (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      {content}
    </div>
  );
}

function NotificationBadge({
  item,
}: {
  item:
    ThongBao;
}) {
  if (
    item.mucDo ===
    "KHAN_CAP"
  ) {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
        Khẩn cấp
      </span>
    );
  }

  if (
    item.mucDo ===
    "QUAN_TRONG"
  ) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
        Quan trọng
      </span>
    );
  }

  return (
    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
      Thông thường
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status:
    TrangThaiThongBao;
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(
        status,
      )}`}
    >
      {
        TRANG_THAI_LABEL[
          status
        ]
      }
    </span>
  );
}

function ActionButton({
  title,
  icon,
  danger =
    false,
  onClick,
}: {
  title:
    string;

  icon:
    ReactNode;

  danger?:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}

      {title}
    </button>
  );
}

function FormField({
  label,
  required =
    false,
  wide =
    false,
  children,
}: {
  label:
    string;

  required?:
    boolean;

  wide?:
    boolean;

  children:
    ReactNode;
}) {
  return (
    <label
      className={
        wide
          ? "md:col-span-2"
          : ""
      }
    >
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

function ScopeButton({
  selected,
  label,
  description,
  onClick,
}: {
  selected:
    boolean;

  label:
    string;

  description:
    string;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-xl border p-3 text-left ${
        selected
          ? "border-blue-600 bg-blue-50"
          : "border-slate-200"
      }`}
    >
      <strong className="block text-sm">
        {label}
      </strong>

      <span className="mt-1 block text-xs text-slate-500">
        {description}
      </span>
    </button>
  );
}

function ChoiceBox({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <div className="mt-4 grid max-h-56 gap-2 overflow-y-auto rounded-xl border p-4 md:grid-cols-2">
      {children}
    </div>
  );
}

function CheckOption({
  checked,
  label,
  onChange,
}: {
  checked:
    boolean;

  label:
    string;

  onChange:
    () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={
          onChange
        }
      />

      <span className="text-sm">
        {label}
      </span>
    </label>
  );
}