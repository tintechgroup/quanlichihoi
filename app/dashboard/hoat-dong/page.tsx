"use client";

import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import QuanLyNguoiThamGiaModal from "@/components/hoat-dong/QuanLyNguoiThamGiaModal";

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type TrangThaiHoatDong =
  | "CHO_PHE_DUYET"
  | "DA_DUYET"
  | "SAP_DIEN_RA"
  | "DANG_TRIEN_KHAI"
  | "DA_KET_THUC"
  | "DA_HUY";

type PhamViHoatDong = "LIEN_CHI_HOI" | "CHI_HOI";

type TrangThaiDangKy =
  | "DA_DANG_KY"
  | "DA_THAM_GIA"
  | "VANG_MAT"
  | "DA_HUY";

interface CurrentUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
}

interface ChiHoi {
  id?: string;
  _id?: string;
  maChiHoi: string;
  tenChiHoi: string;
}

interface HoatDong {
  id?: string;
  _id?: string;
  maHoatDong: string;
  tenHoatDong: string;
  phamVi: PhamViHoatDong;
  chiHoiId?: ChiHoi | string | null;
  chiHoi?: ChiHoi | null;
  donViToChuc?: string;
  diaDiem: string;
  thoiGianBatDau: string;
  thoiGianKetThuc: string;
  hanDangKy?: string;
  soLuongToiDa?: number | null;
  moTa?: string;
  noiDung?: string;
  trangThai: TrangThaiHoatDong;
  createdAt?: string;
  updatedAt?: string;
}

interface DangKyCuaToi {
  id?: string;
  _id?: string;
  trangThaiDangKy: TrangThaiDangKy;
  hoatDong: HoatDong;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  user?: CurrentUser;
  data?: unknown;
  activities?: HoatDong[];
}

interface FormData {
  maHoatDong: string;
  tenHoatDong: string;
  phamVi: PhamViHoatDong;
  chiHoiId: string;
  donViToChuc: string;
  diaDiem: string;
  thoiGianBatDau: string;
  thoiGianKetThuc: string;
  hanDangKy: string;
  soLuongToiDa: string;
  moTa: string;
  noiDung: string;
  trangThai: TrangThaiHoatDong;
}

interface MessageState {
  type: "success" | "error";
  text: string;
}

interface ConfirmState {
  type: "delete" | "status" | "register" | "cancel-registration";
  activity: HoatDong;
  nextStatus?: TrangThaiHoatDong;
}

const EMPTY_FORM: FormData = {
  maHoatDong: "",
  tenHoatDong: "",
  phamVi: "CHI_HOI",
  chiHoiId: "",
  donViToChuc: "",
  diaDiem: "",
  thoiGianBatDau: "",
  thoiGianKetThuc: "",
  hanDangKy: "",
  soLuongToiDa: "",
  moTa: "",
  noiDung: "",
  trangThai: "CHO_PHE_DUYET",
};

const STATUS_OPTIONS: Array<{
  value: TrangThaiHoatDong;
  label: string;
}> = [
  {
    value: "CHO_PHE_DUYET",
    label: "Chờ phê duyệt",
  },
  {
    value: "DA_DUYET",
    label: "Đã duyệt",
  },
  {
    value: "SAP_DIEN_RA",
    label: "Sắp diễn ra",
  },
  {
    value: "DANG_TRIEN_KHAI",
    label: "Đang triển khai",
  },
  {
    value: "DA_KET_THUC",
    label: "Đã kết thúc",
  },
  {
    value: "DA_HUY",
    label: "Đã hủy",
  },
];

/*
 * Truyền nhiều tên thuộc tính tương thích để sử dụng được với
 * component quản lý người tham gia đã tạo ở bước trước.
 */
const ParticipantModal =
  QuanLyNguoiThamGiaModal as React.ComponentType<
    Record<string, unknown>
  >;

function getId(
  value?:
    | string
    | {
        id?: string;
        _id?: string;
      }
    | null,
) {
  if (!value) return "";
  if (typeof value === "string") return value;

  return value.id || value._id || "";
}

function getActivityChiHoi(activity: HoatDong): ChiHoi | null {
  if (activity.chiHoi) {
    return activity.chiHoi;
  }

  if (
    activity.chiHoiId &&
    typeof activity.chiHoiId === "object"
  ) {
    return activity.chiHoiId;
  }

  return null;
}

function getChiHoiId(activity: HoatDong) {
  if (activity.chiHoiId) {
    return getId(activity.chiHoiId);
  }

  return getId(activity.chiHoi);
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
}

function getStatusLabel(status?: TrangThaiHoatDong) {
  return (
    STATUS_OPTIONS.find((item) => item.value === status)?.label ||
    "Chưa xác định"
  );
}

function getStatusClass(status?: TrangThaiHoatDong) {
  switch (status) {
    case "CHO_PHE_DUYET":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "DA_DUYET":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "SAP_DIEN_RA":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";

    case "DANG_TRIEN_KHAI":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "DA_KET_THUC":
      return "border-slate-300 bg-slate-100 text-slate-700";

    case "DA_HUY":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getRegistrationLabel(status?: TrangThaiDangKy) {
  switch (status) {
    case "DA_DANG_KY":
      return "Đã đăng ký";

    case "DA_THAM_GIA":
      return "Đã tham gia";

    case "VANG_MAT":
      return "Vắng mặt";

    case "DA_HUY":
      return "Đã hủy";

    default:
      return "Chưa đăng ký";
  }
}

function extractActivities(result: ApiResponse): HoatDong[] {
  if (Array.isArray(result.data)) {
    return result.data as HoatDong[];
  }

  if (result.data && typeof result.data === "object") {
    const objectData = result.data as {
      danhSach?: HoatDong[];
      activities?: HoatDong[];
      hoatDong?: HoatDong[];
      data?: HoatDong[];
    };

    if (Array.isArray(objectData.danhSach)) {
      return objectData.danhSach;
    }

    if (Array.isArray(objectData.activities)) {
      return objectData.activities;
    }

    if (Array.isArray(objectData.hoatDong)) {
      return objectData.hoatDong;
    }

    if (Array.isArray(objectData.data)) {
      return objectData.data;
    }
  }

  if (Array.isArray(result.activities)) {
    return result.activities;
  }

  return [];
}

function extractChiHoi(result: ApiResponse): ChiHoi[] {
  if (Array.isArray(result.data)) {
    return result.data as ChiHoi[];
  }

  if (result.data && typeof result.data === "object") {
    const objectData = result.data as {
      danhSach?: ChiHoi[];
      chiHoi?: ChiHoi[];
      data?: ChiHoi[];
    };

    if (Array.isArray(objectData.danhSach)) {
      return objectData.danhSach;
    }

    if (Array.isArray(objectData.chiHoi)) {
      return objectData.chiHoi;
    }

    if (Array.isArray(objectData.data)) {
      return objectData.data;
    }
  }

  return [];
}

function extractRegistrations(result: ApiResponse): DangKyCuaToi[] {
  if (!result.data || typeof result.data !== "object") {
    return [];
  }

  const objectData = result.data as {
    danhSach?: DangKyCuaToi[];
  };

  return Array.isArray(objectData.danhSach)
    ? objectData.danhSach
    : [];
}

async function parseApiResponse(
  response: Response,
): Promise<ApiResponse> {
  const text = await response.text();

  if (!text.trim()) {
    return {
      success: false,
      message: "Máy chủ không trả về dữ liệu",
    };
  }

  try {
    return JSON.parse(text) as ApiResponse;
  } catch {
    return {
      success: false,
      message: "Dữ liệu máy chủ trả về không hợp lệ",
    };
  }
}

export default function HoatDongPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [activities, setActivities] = useState<HoatDong[]>([]);
  const [chiHoiList, setChiHoiList] = useState<ChiHoi[]>([]);
  const [registrations, setRegistrations] = useState<
    DangKyCuaToi[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [message, setMessage] = useState<MessageState | null>(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingActivity, setEditingActivity] =
    useState<HoatDong | null>(null);
  const [detailActivity, setDetailActivity] =
    useState<HoatDong | null>(null);
  const [participantActivity, setParticipantActivity] =
    useState<HoatDong | null>(null);
  const [confirmState, setConfirmState] =
    useState<ConfirmState | null>(null);

  const [formData, setFormData] =
    useState<FormData>(EMPTY_FORM);

  const isMember = currentUser?.role === "HOI_VIEN";

  const canManage =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "BAN_CHAP_HANH" ||
    currentUser?.role === "CHI_HOI_TRUONG";

  const canDelete = currentUser?.role === "ADMIN";

  const loadCurrentUser = useCallback(async () => {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const result = await parseApiResponse(response);

    if (response.status === 401 || !result.success) {
      router.replace("/login");
      return null;
    }

    let user = result.user;

    if (!user && result.data && typeof result.data === "object") {
      const objectData = result.data as {
        user?: CurrentUser;
      };

      user = objectData.user;
    }

    if (!user) {
      router.replace("/login");
      return null;
    }

    setCurrentUser(user);
    return user;
  }, [router]);

  const loadActivities = useCallback(async () => {
    const response = await fetch("/api/hoat-dong", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const result = await parseApiResponse(response);

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Không thể tải danh sách hoạt động",
      );
    }

    setActivities(extractActivities(result));
  }, [router]);

  const loadChiHoi = useCallback(async () => {
    try {
      const response = await fetch("/api/chi-hoi", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const result = await parseApiResponse(response);

      if (response.ok && result.success) {
        setChiHoiList(extractChiHoi(result));
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách Chi hội:", error);
    }
  }, []);

  const loadMyRegistrations = useCallback(async () => {
    try {
      const response = await fetch("/api/hoat-dong/cua-toi", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const result = await parseApiResponse(response);

      if (response.ok && result.success) {
        setRegistrations(extractRegistrations(result));
      }
    } catch (error) {
      console.error("Lỗi lấy đăng ký hoạt động:", error);
    }
  }, []);

  const loadPage = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setMessage(null);

      try {
        const user = await loadCurrentUser();

        if (!user) return;

        await Promise.all([
          loadActivities(),
          user.role === "HOI_VIEN"
            ? loadMyRegistrations()
            : loadChiHoi(),
        ]);
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Đã xảy ra lỗi khi tải dữ liệu",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      loadActivities,
      loadChiHoi,
      loadCurrentUser,
      loadMyRegistrations,
    ],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the request and its loading state together when effect dependencies change.
    void loadPage();
  }, [loadPage]);

  const registrationMap = useMemo(() => {
    const map = new Map<string, DangKyCuaToi>();

    registrations.forEach((registration) => {
      const activityId = getId(registration.hoatDong);

      if (activityId) {
        map.set(activityId, registration);
      }
    });

    return map;
  }, [registrations]);

  const filteredActivities = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return activities.filter((activity) => {
      const chiHoi = getActivityChiHoi(activity);

      const searchableText = [
        activity.maHoatDong,
        activity.tenHoatDong,
        activity.donViToChuc,
        activity.diaDiem,
        activity.moTa,
        chiHoi?.maChiHoi,
        chiHoi?.tenChiHoi,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword || searchableText.includes(keyword);

      const matchesScope =
        !scopeFilter || activity.phamVi === scopeFilter;

      const matchesStatus =
        !statusFilter || activity.trangThai === statusFilter;

      return matchesSearch && matchesScope && matchesStatus;
    });
  }, [activities, scopeFilter, search, statusFilter]);

  const statistics = useMemo(() => {
    return {
      total: activities.length,

      pending: activities.filter(
        (activity) =>
          activity.trangThai === "CHO_PHE_DUYET",
      ).length,

      running: activities.filter(
        (activity) =>
          activity.trangThai === "DANG_TRIEN_KHAI",
      ).length,

      completed: activities.filter(
        (activity) =>
          activity.trangThai === "DA_KET_THUC",
      ).length,
    };
  }, [activities]);

  function showMessage(type: MessageState["type"], text: string) {
    setMessage({
      type,
      text,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openCreateModal() {
    setEditingActivity(null);
    setFormData(EMPTY_FORM);
    setShowFormModal(true);
  }

  function openEditModal(activity: HoatDong) {
    setEditingActivity(activity);

    setFormData({
      maHoatDong: activity.maHoatDong || "",
      tenHoatDong: activity.tenHoatDong || "",
      phamVi: activity.phamVi || "CHI_HOI",
      chiHoiId: getChiHoiId(activity),
      donViToChuc: activity.donViToChuc || "",
      diaDiem: activity.diaDiem || "",
      thoiGianBatDau: toDateTimeLocal(
        activity.thoiGianBatDau,
      ),
      thoiGianKetThuc: toDateTimeLocal(
        activity.thoiGianKetThuc,
      ),
      hanDangKy: toDateTimeLocal(activity.hanDangKy),
      soLuongToiDa:
        activity.soLuongToiDa !== null &&
        activity.soLuongToiDa !== undefined
          ? String(activity.soLuongToiDa)
          : "",
      moTa: activity.moTa || "",
      noiDung: activity.noiDung || "",
      trangThai: activity.trangThai || "CHO_PHE_DUYET",
    });

    setShowFormModal(true);
  }

  function closeFormModal() {
    if (submitting) return;

    setShowFormModal(false);
    setEditingActivity(null);
    setFormData(EMPTY_FORM);
  }

  function updateForm<K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "phamVi" && value === "LIEN_CHI_HOI"
        ? { chiHoiId: "" }
        : {}),
    }));
  }

  async function handleSubmitForm(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !formData.maHoatDong.trim() ||
      !formData.tenHoatDong.trim() ||
      !formData.diaDiem.trim() ||
      !formData.thoiGianBatDau ||
      !formData.thoiGianKetThuc
    ) {
      showMessage(
        "error",
        "Vui lòng nhập đầy đủ các trường bắt buộc",
      );
      return;
    }

    if (
      formData.phamVi === "CHI_HOI" &&
      !formData.chiHoiId
    ) {
      showMessage(
        "error",
        "Vui lòng chọn Chi hội tổ chức hoạt động",
      );
      return;
    }

    const startDate = new Date(formData.thoiGianBatDau);
    const endDate = new Date(formData.thoiGianKetThuc);

    if (endDate.getTime() <= startDate.getTime()) {
      showMessage(
        "error",
        "Thời gian kết thúc phải sau thời gian bắt đầu",
      );
      return;
    }

    setSubmitting(true);

    try {
      const editingId = getId(editingActivity);

      const endpoint = editingActivity
        ? `/api/hoat-dong/${editingId}`
        : "/api/hoat-dong";

      const response = await fetch(endpoint, {
        method: editingActivity ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maHoatDong: formData.maHoatDong
            .trim()
            .toUpperCase(),
          tenHoatDong: formData.tenHoatDong.trim(),
          phamVi: formData.phamVi,
          chiHoiId:
            formData.phamVi === "CHI_HOI"
              ? formData.chiHoiId
              : null,
          donViToChuc: formData.donViToChuc.trim(),
          diaDiem: formData.diaDiem.trim(),
          thoiGianBatDau: new Date(
            formData.thoiGianBatDau,
          ).toISOString(),
          thoiGianKetThuc: new Date(
            formData.thoiGianKetThuc,
          ).toISOString(),
          hanDangKy: formData.hanDangKy
            ? new Date(formData.hanDangKy).toISOString()
            : null,
          soLuongToiDa: formData.soLuongToiDa
            ? Number(formData.soLuongToiDa)
            : null,
          moTa: formData.moTa.trim(),
          noiDung: formData.noiDung.trim(),
          trangThai: formData.trangThai,
        }),
      });

      const result = await parseApiResponse(response);

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            (editingActivity
              ? "Không thể cập nhật hoạt động"
              : "Không thể thêm hoạt động"),
        );
      }

      closeFormModal();

      showMessage(
        "success",
        result.message ||
          (editingActivity
            ? "Cập nhật hoạt động thành công"
            : "Thêm hoạt động thành công"),
      );

      await loadActivities();
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi lưu hoạt động",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirmState) return;

    const activityId = getId(confirmState.activity);

    if (!activityId) {
      showMessage("error", "Không tìm thấy hoạt động");
      setConfirmState(null);
      return;
    }

    setActionLoading(true);

    try {
      let endpoint = "";
      let method = "";
      let body: string | undefined;

      if (confirmState.type === "delete") {
        endpoint = `/api/hoat-dong/${activityId}`;
        method = "DELETE";
      }

      if (confirmState.type === "status") {
        endpoint = `/api/hoat-dong/${activityId}/trang-thai`;
        method = "PATCH";
        body = JSON.stringify({
          trangThai: confirmState.nextStatus,
        });
      }

      if (confirmState.type === "register") {
        endpoint = `/api/hoat-dong/${activityId}/dang-ky`;
        method = "POST";
      }

      if (confirmState.type === "cancel-registration") {
        endpoint = `/api/hoat-dong/${activityId}/dang-ky`;
        method = "DELETE";
      }

      const response = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: body
          ? {
              "Content-Type": "application/json",
            }
          : undefined,
        body,
      });

      const result = await parseApiResponse(response);

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể thực hiện thao tác",
        );
      }

      const successMessage =
        result.message ||
        (confirmState.type === "delete"
          ? "Xóa hoạt động thành công"
          : confirmState.type === "status"
            ? "Cập nhật trạng thái thành công"
            : confirmState.type === "register"
              ? "Đăng ký tham gia thành công"
              : "Hủy đăng ký thành công");

      setConfirmState(null);
      showMessage("success", successMessage);

      await loadActivities();

      if (isMember) {
        await loadMyRegistrations();
      }
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi thực hiện thao tác",
      );
    } finally {
      setActionLoading(false);
    }
  }

  function canMemberRegister(activity: HoatDong) {
    if (
      activity.trangThai !== "DA_DUYET" &&
      activity.trangThai !== "SAP_DIEN_RA"
    ) {
      return false;
    }

    if (activity.hanDangKy) {
      const deadline = new Date(activity.hanDangKy);

      if (
        !Number.isNaN(deadline.getTime()) &&
        // eslint-disable-next-line react-hooks/purity -- Preserve the live registration deadline check on every render.
        deadline.getTime() < Date.now()
      ) {
        return false;
      }
    }

    return true;
  }

  function resetFilters() {
    setSearch("");
    setScopeFilter("");
    setStatusFilter("");
    void loadPage(true);
  }

  function getConfirmContent() {
    if (!confirmState) {
      return {
        title: "",
        description: "",
        button: "",
        destructive: false,
      };
    }

    switch (confirmState.type) {
      case "delete":
        return {
          title: "Xác nhận xóa hoạt động",
          description: `Bạn có chắc chắn muốn xóa hoạt động “${confirmState.activity.maHoatDong} - ${confirmState.activity.tenHoatDong}” không? Dữ liệu liên quan có thể bị ảnh hưởng.`,
          button: "Xóa hoạt động",
          destructive: true,
        };

      case "status":
        return {
          title: "Xác nhận cập nhật trạng thái",
          description: `Chuyển hoạt động “${confirmState.activity.maHoatDong}” sang trạng thái “${getStatusLabel(confirmState.nextStatus)}”?`,
          button: "Cập nhật",
          destructive: false,
        };

      case "register":
        return {
          title: "Xác nhận đăng ký",
          description: `Bạn có muốn đăng ký tham gia hoạt động “${confirmState.activity.maHoatDong} - ${confirmState.activity.tenHoatDong}” không?`,
          button: "Đăng ký tham gia",
          destructive: false,
        };

      case "cancel-registration":
        return {
          title: "Xác nhận hủy đăng ký",
          description: `Bạn có chắc chắn muốn hủy đăng ký hoạt động “${confirmState.activity.maHoatDong} - ${confirmState.activity.tenHoatDong}” không?`,
          button: "Hủy đăng ký",
          destructive: true,
        };
    }
  }

  const confirmContent = getConfirmContent();

  return (
    <div className="min-h-screen bg-[#f3f7fb]">
      <div className="mx-auto max-w-[1600px] px-5 py-8 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#123b68]">
              {isMember
                ? "Hoạt động Liên Chi hội"
                : "Quản trị hệ thống"}
            </p>

            <h1 className="text-3xl font-bold text-slate-950">
              {isMember
                ? "Danh sách hoạt động"
                : "Quản lý hoạt động"}
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              {isMember
                ? "Xem thông tin và đăng ký tham gia các hoạt động."
                : "Quản lý kế hoạch, phê duyệt, tiến độ, người tham gia và thông tin các hoạt động."}
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#123b68] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0e3158]"
            >
              <Plus size={19} />
              Thêm hoạt động
            </button>
          )}
        </div>

        {message && (
          <div
            className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertCircle size={18} />
              )}

              <span>{message.text}</span>
            </div>

            <button
              type="button"
              onClick={() => setMessage(null)}
              className="rounded-md p-1 hover:bg-black/5"
              aria-label="Đóng thông báo"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tổng hoạt động"
            value={statistics.total}
            icon={<CalendarDays size={23} />}
            iconClass="bg-blue-50 text-blue-700"
          />

          <StatCard
            label="Chờ phê duyệt"
            value={statistics.pending}
            icon={<Clock3 size={23} />}
            iconClass="bg-amber-50 text-amber-700"
          />

          <StatCard
            label="Đang triển khai"
            value={statistics.running}
            icon={<RefreshCw size={23} />}
            iconClass="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            label="Đã kết thúc"
            value={statistics.completed}
            icon={<Check size={23} />}
            iconClass="bg-violet-50 text-violet-700"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo mã, tên, đơn vị hoặc địa điểm"
                className="h-12 w-full rounded-xl border border-slate-300 pl-12 pr-4 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="relative min-w-[225px]">
              <Filter
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={scopeFilter}
                onChange={(event) =>
                  setScopeFilter(event.target.value)
                }
                className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-11 pr-10 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tất cả phạm vi</option>
                <option value="LIEN_CHI_HOI">
                  Toàn Liên Chi hội
                </option>
                <option value="CHI_HOI">Chi hội</option>
              </select>

              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative min-w-[225px]">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 pr-10 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tất cả trạng thái</option>

                {STATUS_OPTIONS.map((status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={resetFilters}
              disabled={refreshing}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin" : ""}
              />
              Làm mới
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[330px] flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2
                size={34}
                className="animate-spin text-[#123b68]"
              />
              <span className="text-sm">
                Đang tải danh sách hoạt động...
              </span>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex min-h-[330px] flex-col items-center justify-center px-5 text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
                <CalendarDays size={34} />
              </div>

              <h3 className="font-semibold text-slate-800">
                Chưa có hoạt động phù hợp
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Hãy thay đổi bộ lọc hoặc thêm hoạt động mới.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1400px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-600">
                      <th className="px-4 py-4">STT</th>
                      <th className="px-4 py-4">Mã hoạt động</th>
                      <th className="px-4 py-4">Tên hoạt động</th>
                      <th className="px-4 py-4">Phạm vi</th>
                      <th className="px-4 py-4">Thời gian</th>
                      <th className="px-4 py-4">Địa điểm</th>
                      <th className="px-4 py-4">Trạng thái</th>
                      <th className="px-4 py-4 text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredActivities.map(
                      (activity, index) => {
                        const activityId = getId(activity);
                        const chiHoi =
                          getActivityChiHoi(activity);
                        const registration =
                          registrationMap.get(activityId);

                        return (
                          <tr
                            key={
                              activityId ||
                              `${activity.maHoatDong}-${index}`
                            }
                            className="border-t border-slate-200 text-sm text-slate-700 hover:bg-slate-50/70"
                          >
                            <td className="px-4 py-4">
                              {index + 1}
                            </td>

                            <td className="px-4 py-4">
                              <span className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-[#123b68]">
                                {activity.maHoatDong}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <p className="max-w-[230px] truncate font-semibold text-slate-950">
                                {activity.tenHoatDong}
                              </p>

                              <p className="mt-1 max-w-[230px] truncate text-xs text-slate-500">
                                {activity.moTa ||
                                  "Không có mô tả"}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p className="font-medium text-slate-800">
                                {activity.phamVi ===
                                "LIEN_CHI_HOI"
                                  ? "Toàn Liên Chi hội"
                                  : "Chi hội"}
                              </p>

                              <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                                {activity.phamVi ===
                                "LIEN_CHI_HOI"
                                  ? activity.donViToChuc ||
                                    "Liên Chi hội"
                                  : chiHoi
                                    ? `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`
                                    : "Chưa xác định Chi hội"}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p>
                                Bắt đầu:{" "}
                                {formatDateTime(
                                  activity.thoiGianBatDau,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Kết thúc:{" "}
                                {formatDateTime(
                                  activity.thoiGianKetThuc,
                                )}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex max-w-[170px] items-center gap-2">
                                <MapPin
                                  size={16}
                                  className="shrink-0 text-slate-400"
                                />

                                <span className="truncate">
                                  {activity.diaDiem ||
                                    "Chưa cập nhật"}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusClass(
                                  activity.trangThai,
                                )}`}
                              >
                                {getStatusLabel(
                                  activity.trangThai,
                                )}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {canManage && (
                                  <>
                                    <select
                                      value=""
                                      onChange={(event) => {
                                        const nextStatus =
                                          event.target
                                            .value as TrangThaiHoatDong;

                                        if (!nextStatus) return;

                                        setConfirmState({
                                          type: "status",
                                          activity,
                                          nextStatus,
                                        });
                                      }}
                                      className="h-10 w-[190px] rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#123b68]"
                                    >
                                      <option value="">
                                        Cập nhật trạng thái
                                      </option>

                                      {STATUS_OPTIONS.map(
                                        (status) => (
                                          <option
                                            key={status.value}
                                            value={status.value}
                                            disabled={
                                              status.value ===
                                              activity.trangThai
                                            }
                                          >
                                            {status.label}
                                          </option>
                                        ),
                                      )}
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setParticipantActivity(
                                          activity,
                                        )
                                      }
                                      className="flex h-10 items-center gap-2 rounded-lg border border-emerald-300 px-3 font-medium text-emerald-700 hover:bg-emerald-50"
                                    >
                                      <Users size={17} />
                                      Người tham gia
                                    </button>
                                  </>
                                )}

                                {isMember &&
                                  (() => {
                                    if (
                                      registration?.trangThaiDangKy ===
                                      "DA_DANG_KY"
                                    ) {
                                      return (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setConfirmState({
                                              type: "cancel-registration",
                                              activity,
                                            })
                                          }
                                          className="h-10 rounded-lg border border-red-300 px-4 font-medium text-red-600 hover:bg-red-50"
                                        >
                                          Hủy đăng ký
                                        </button>
                                      );
                                    }

                                    if (
                                      registration &&
                                      registration.trangThaiDangKy !==
                                        "DA_HUY"
                                    ) {
                                      return (
                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                                          {getRegistrationLabel(
                                            registration.trangThaiDangKy,
                                          )}
                                        </span>
                                      );
                                    }

                                    if (
                                      canMemberRegister(activity)
                                    ) {
                                      return (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setConfirmState({
                                              type: "register",
                                              activity,
                                            })
                                          }
                                          className="flex h-10 items-center gap-2 rounded-lg border border-blue-300 px-4 font-medium text-blue-700 hover:bg-blue-50"
                                        >
                                          <UserCheck size={17} />
                                          Đăng ký
                                        </button>
                                      );
                                    }

                                    return null;
                                  })()}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDetailActivity(activity)
                                  }
                                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:border-[#123b68] hover:text-[#123b68]"
                                  title="Xem chi tiết"
                                >
                                  <Eye size={18} />
                                </button>

                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditModal(activity)
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50"
                                    title="Sửa hoạt động"
                                  >
                                    <Pencil size={17} />
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmState({
                                        type: "delete",
                                        activity,
                                      })
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                                    title="Xóa hoạt động"
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
                Hiển thị {filteredActivities.length} trên tổng số{" "}
                {activities.length} hoạt động.
              </div>
            </>
          )}
        </section>
      </div>

      {showFormModal && (
        <ActivityFormModal
          editing={Boolean(editingActivity)}
          formData={formData}
          chiHoiList={chiHoiList}
          submitting={submitting}
          onUpdate={updateForm}
          onClose={closeFormModal}
          onSubmit={handleSubmitForm}
        />
      )}

      {detailActivity && (
        <ActivityDetailModal
          activity={detailActivity}
          onClose={() => setDetailActivity(null)}
        />
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmContent.title}
          description={confirmContent.description}
          confirmLabel={confirmContent.button}
          destructive={confirmContent.destructive}
          loading={actionLoading}
          onClose={() => {
            if (!actionLoading) {
              setConfirmState(null);
            }
          }}
          onConfirm={handleConfirmAction}
        />
      )}

      {participantActivity && (
        <ParticipantModal
          isOpen={true}
          open={true}
          hoatDong={participantActivity}
          activity={participantActivity}
          hoatDongId={getId(participantActivity)}
          activityId={getId(participantActivity)}
          maHoatDong={participantActivity.maHoatDong}
          tenHoatDong={participantActivity.tenHoatDong}
          onClose={() => setParticipantActivity(null)}
          onSuccess={() => loadActivities()}
          onUpdated={() => loadActivities()}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">
          {value}
        </p>
      </div>

      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>
    </div>
  );
}

function ActivityFormModal({
  editing,
  formData,
  chiHoiList,
  submitting,
  onUpdate,
  onClose,
  onSubmit,
}: {
  editing: boolean;
  formData: FormData;
  chiHoiList: ChiHoi[];
  submitting: boolean;
  onUpdate: <K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {editing
                ? "Cập nhật hoạt động"
                : "Thêm hoạt động"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Nhập đầy đủ thông tin kế hoạch hoạt động.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={21} />
          </button>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <FormField
            label="Mã hoạt động"
            required
            value={formData.maHoatDong}
            onChange={(value) =>
              onUpdate("maHoatDong", value.toUpperCase())
            }
          />

          <FormField
            label="Tên hoạt động"
            required
            value={formData.tenHoatDong}
            onChange={(value) =>
              onUpdate("tenHoatDong", value)
            }
          />

          <SelectField
            label="Phạm vi"
            required
            value={formData.phamVi}
            onChange={(value) =>
              onUpdate(
                "phamVi",
                value as PhamViHoatDong,
              )
            }
            options={[
              {
                value: "LIEN_CHI_HOI",
                label: "Toàn Liên Chi hội",
              },
              {
                value: "CHI_HOI",
                label: "Chi hội",
              },
            ]}
          />

          {formData.phamVi === "CHI_HOI" ? (
            <SelectField
              label="Chi hội"
              required
              value={formData.chiHoiId}
              onChange={(value) =>
                onUpdate("chiHoiId", value)
              }
              options={[
                {
                  value: "",
                  label: "Chọn Chi hội",
                },
                ...chiHoiList.map((chiHoi) => ({
                  value: getId(chiHoi),
                  label: `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`,
                })),
              ]}
            />
          ) : (
            <FormField
              label="Đơn vị tổ chức"
              value={formData.donViToChuc}
              onChange={(value) =>
                onUpdate("donViToChuc", value)
              }
            />
          )}

          {formData.phamVi === "CHI_HOI" && (
            <FormField
              label="Đơn vị tổ chức"
              value={formData.donViToChuc}
              onChange={(value) =>
                onUpdate("donViToChuc", value)
              }
            />
          )}

          <FormField
            label="Địa điểm"
            required
            value={formData.diaDiem}
            onChange={(value) => onUpdate("diaDiem", value)}
          />

          <FormField
            label="Thời gian bắt đầu"
            type="datetime-local"
            required
            value={formData.thoiGianBatDau}
            onChange={(value) =>
              onUpdate("thoiGianBatDau", value)
            }
          />

          <FormField
            label="Thời gian kết thúc"
            type="datetime-local"
            required
            value={formData.thoiGianKetThuc}
            onChange={(value) =>
              onUpdate("thoiGianKetThuc", value)
            }
          />

          <FormField
            label="Hạn đăng ký"
            type="datetime-local"
            value={formData.hanDangKy}
            onChange={(value) =>
              onUpdate("hanDangKy", value)
            }
          />

          <FormField
            label="Số lượng tối đa"
            type="number"
            min="1"
            value={formData.soLuongToiDa}
            placeholder="Để trống nếu không giới hạn"
            onChange={(value) =>
              onUpdate("soLuongToiDa", value)
            }
          />

          <SelectField
            label="Trạng thái"
            value={formData.trangThai}
            onChange={(value) =>
              onUpdate(
                "trangThai",
                value as TrangThaiHoatDong,
              )
            }
            options={STATUS_OPTIONS}
          />

          <TextAreaField
            label="Mô tả"
            value={formData.moTa}
            onChange={(value) => onUpdate("moTa", value)}
          />

          <TextAreaField
            label="Nội dung"
            value={formData.noiDung}
            onChange={(value) => onUpdate("noiDung", value)}
          />
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Đóng
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 items-center gap-2 rounded-lg bg-[#123b68] px-5 text-sm font-semibold text-white hover:bg-[#0e3158] disabled:opacity-60"
          >
            {submitting && (
              <Loader2 size={17} className="animate-spin" />
            )}

            {editing ? "Lưu thay đổi" : "Thêm hoạt động"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ActivityDetailModal({
  activity,
  onClose,
}: {
  activity: HoatDong;
  onClose: () => void;
}) {
  const chiHoi = getActivityChiHoi(activity);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Chi tiết hoạt động
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {activity.maHoatDong} - {activity.tenHoatDong}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={21} />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <InfoItem
            label="Mã hoạt động"
            value={activity.maHoatDong}
          />

          <InfoItem
            label="Trạng thái"
            value={getStatusLabel(activity.trangThai)}
          />

          <InfoItem
            label="Tên hoạt động"
            value={activity.tenHoatDong}
          />

          <InfoItem
            label="Phạm vi"
            value={
              activity.phamVi === "LIEN_CHI_HOI"
                ? "Toàn Liên Chi hội"
                : "Chi hội"
            }
          />

          <InfoItem
            label="Chi hội"
            value={
              chiHoi
                ? `${chiHoi.maChiHoi} - ${chiHoi.tenChiHoi}`
                : "Không áp dụng"
            }
          />

          <InfoItem
            label="Đơn vị tổ chức"
            value={activity.donViToChuc || "Chưa cập nhật"}
          />

          <InfoItem
            label="Địa điểm"
            value={activity.diaDiem || "Chưa cập nhật"}
          />

          <InfoItem
            label="Số lượng tối đa"
            value={
              activity.soLuongToiDa
                ? `${activity.soLuongToiDa} người`
                : "Không giới hạn"
            }
          />

          <InfoItem
            label="Bắt đầu"
            value={formatDateTime(activity.thoiGianBatDau)}
          />

          <InfoItem
            label="Kết thúc"
            value={formatDateTime(activity.thoiGianKetThuc)}
          />

          <InfoItem
            label="Hạn đăng ký"
            value={formatDateTime(activity.hanDangKy)}
          />

          <div className="md:col-span-2">
            <InfoItem
              label="Mô tả"
              value={activity.moTa || "Không có mô tả"}
            />
          </div>

          <div className="md:col-span-2">
            <InfoItem
              label="Nội dung"
              value={activity.noiDung || "Không có nội dung"}
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg bg-[#123b68] px-6 text-sm font-semibold text-white hover:bg-[#0e3158]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  destructive,
  loading,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
              destructive
                ? "bg-red-50 text-red-600"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            <AlertCircle size={25} />
          </div>

          <h2 className="text-xl font-bold text-slate-950">
            {title}
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-60 ${
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#123b68] hover:bg-[#0e3158]"
            }`}
          >
            {loading && (
              <Loader2 size={17} className="animate-spin" />
            )}

            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  type = "text",
  required = false,
  placeholder,
  min,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>

      <input
        type={type}
        value={value}
        min={min}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>

      <select
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <textarea
        value={value}
        rows={5}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#123b68] focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}