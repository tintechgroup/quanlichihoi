"use client";

import Link from "next/link";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  DatabaseBackup,
  FileInput,
  FileText,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Star,
  UserCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type MucDoThongBao =
  | "THONG_THUONG"
  | "QUAN_TRONG"
  | "KHAN_CAP";

interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
}

interface ThongBaoHeader {
  id: string;
  tieuDe: string;
  noiDung: string;
  mucDo: MucDoThongBao;
  daDoc: boolean;
  createdAt: string;
  tepDinhKem: Array<{
    tenTep: string;
    duongDan: string;
  }>;
}

interface DashboardShellProps {
  children: ReactNode;
  initialUser?: SessionUser | null;
  user?: SessionUser | null;
}

interface MenuItem {
  label: string;
  href: string;
  icon: ReactNode;
  roles?: UserRole[];
  badgeType?: "UNREAD" | "PENDING";
}

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  BAN_CHAP_HANH: "Ban Chấp hành",
  CHI_HOI_TRUONG: "Chi hội trưởng",
  HOI_VIEN: "Hội viên",
};

const ACTIVITY_CHILD_HREFS = [
  "/dashboard/minh-chung",
  "/dashboard/diem-danh-qr",
  "/dashboard/diem-ren-luyen",
];

const MENU_ITEMS: MenuItem[] = [
  {
    label: "Tổng quan",
    href: "/dashboard",
    icon: <LayoutDashboard size={19} />,
  },
  {
    label: "Quản lý Chi hội",
    href: "/dashboard/chi-hoi",
    icon: <Building2 size={19} />,
    roles: ["ADMIN", "BAN_CHAP_HANH"],
  },
  {
    label: "Quản lý Hội viên",
    href: "/dashboard/hoi-vien",
    icon: <Users size={19} />,
    roles: ["ADMIN", "BAN_CHAP_HANH", "CHI_HOI_TRUONG"],
  },
  {
    label: "Quản lý Ban Chấp hành",
    href: "/dashboard/ban-chap-hanh",
    icon: <UserCog size={19} />,
    roles: ["ADMIN", "BAN_CHAP_HANH"],
  },
  {
    label: "Quản lý Chi hội trưởng",
    href: "/dashboard/chi-hoi-truong",
    icon: <UserCheck size={19} />,
    roles: ["ADMIN", "BAN_CHAP_HANH"],
  },
  {
    label: "Quản lý hoạt động",
    href: "/dashboard/hoat-dong",
    icon: <Activity size={19} />,
  },
  {
    label: "Minh chứng hoạt động",
    href: "/dashboard/minh-chung",
    icon: <ClipboardCheck size={19} />,
    roles: ["ADMIN", "BAN_CHAP_HANH", "CHI_HOI_TRUONG"],
  },
  {
    label: "Điểm danh QR",
    href: "/dashboard/diem-danh-qr",
    icon: <QrCode size={19} />,
  },
  {
    label: "Điểm rèn luyện",
    href: "/dashboard/diem-ren-luyen",
    icon: <Star size={19} />,
  },
  {
    label: "Quản lý tài chính",
    href: "/dashboard/tai-chinh",
    icon: <BarChart3 size={19} />,
    roles: ["ADMIN", "BAN_CHAP_HANH", "CHI_HOI_TRUONG"],
  },
  {
    label: "Thông báo",
    href: "/dashboard/thong-bao",
    icon: <Bell size={19} />,
    badgeType: "UNREAD",
  },
  {
    label: "Văn kiện và tài liệu",
    href: "/dashboard/van-kien",
    icon: <FileText size={19} />,
  },
  {
    label: "Hỗ trợ và phản hồi",
    href: "/dashboard/ho-tro",
    icon: <AlertCircle size={19} />,
  },
  {
    label: "Thống kê và báo cáo",
    href: "/dashboard/thong-ke",
    icon: <BarChart3 size={19} />,
    roles: ["ADMIN", "BAN_CHAP_HANH", "CHI_HOI_TRUONG"],
  },
  {
    label: "Xem đánh giá",
    href: "/dashboard/danh-gia",
    icon: <Star size={19} />,
    roles: ["ADMIN", "BAN_CHAP_HANH"],
  },
  {
    label: "Đánh giá hệ thống",
    href: "/dashboard/danh-gia-he-thong",
    icon: <CheckCircle2 size={19} />,
  },
  {
    label: "Import dữ liệu",
    href: "/dashboard/import-du-lieu",
    icon: <FileInput size={19} />,
    roles: ["ADMIN"],
  },
  {
    label: "Sao lưu và bảo mật",
    href: "/dashboard/sao-luu",
    icon: <DatabaseBackup size={19} />,
    roles: ["ADMIN"],
  },
  {
    label: "Nhật ký hệ thống",
    href: "/dashboard/nhat-ky-he-thong",
    icon: <History size={19} />,
    roles: ["ADMIN"],
  },
  {
    label: "Hồ sơ cá nhân",
    href: "/dashboard/ho-so",
    icon: <UserCog size={19} />,
  },
];

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Máy chủ trả về dữ liệu không hợp lệ");
  }
}

function getId(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    return String(item.id ?? item._id ?? "");
  }

  return String(value);
}

function normalizeUser(
  raw: Record<string, unknown>,
): SessionUser | null {
  if (!raw) {
    return null;
  }

  const id = getId(raw.id ?? raw._id ?? raw.userId);
  const role = String(raw.role ?? "") as UserRole;

  const validRoles: UserRole[] = [
    "ADMIN",
    "BAN_CHAP_HANH",
    "CHI_HOI_TRUONG",
    "HOI_VIEN",
  ];

  if (!id || !validRoles.includes(role)) {
    return null;
  }

  return {
    id,
    username: String(raw.username ?? ""),
    fullName: String(
      raw.fullName ??
        raw.hoTen ??
        raw.username ??
        "Người dùng",
    ),
    role,
  };
}

function normalizeThongBao(
  raw: Record<string, unknown>,
): ThongBaoHeader {
  let mucDo: MucDoThongBao = "THONG_THUONG";

  if (raw.mucDo === "QUAN_TRONG") {
    mucDo = "QUAN_TRONG";
  }

  if (raw.mucDo === "KHAN_CAP") {
    mucDo = "KHAN_CAP";
  }

  return {
    id: getId(raw.id ?? raw._id),
    tieuDe: String(raw.tieuDe ?? "Thông báo"),
    noiDung: String(raw.noiDung ?? ""),
    mucDo,
    daDoc: Boolean(raw.daDoc),
    createdAt:
      (raw.createdAt as string | undefined) ??
      new Date().toISOString(),
    tepDinhKem: Array.isArray(raw.tepDinhKem)
      ? (raw.tepDinhKem as ThongBaoHeader["tepDinhKem"])
      : [],
  };
}

function formatDate(value: string) {
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

function getInitialName(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.at(-1)?.charAt(0).toUpperCase() || "U";
}

function isActiveMenu(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardShell({
  children,
  initialUser,
  user: userFromProps,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const notificationRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] =
    useState<SessionUser | null>(
      initialUser ?? userFromProps ?? null,
    );
  const [loadingUser, setLoadingUser] = useState(
    !initialUser && !userFromProps,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activityMenuOpen, setActivityMenuOpen] =
    useState(true);
  const [notificationOpen, setNotificationOpen] =
    useState(false);
  const [notificationLoading, setNotificationLoading] =
    useState(false);
  const [notificationActionId, setNotificationActionId] =
    useState("");
  const [notifications, setNotifications] =
    useState<ThongBaoHeader[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApprovalCount, setPendingApprovalCount] =
    useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  const visibleMenuItems = useMemo(() => {
    if (!currentUser) {
      return MENU_ITEMS.filter((item) => !item.roles);
    }

    return MENU_ITEMS.filter((item) => {
      if (!item.roles) {
        return true;
      }

      return item.roles.includes(currentUser.role);
    });
  }, [currentUser]);

  const loadCurrentUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }

      const result = await parseResponse(response);

      if (!response.ok || result.success === false) {
        return;
      }

      const rawUser =
        result.user ??
        result.data?.user ??
        result.data;

      const normalizedUser = normalizeUser(rawUser);

      if (normalizedUser) {
        setCurrentUser(normalizedUser);
      }
    } catch (error) {
      console.error("Không thể tải người dùng:", error);
    } finally {
      setLoadingUser(false);
    }
  }, [router]);

  const loadNotifications = useCallback(async () => {
    setNotificationLoading(true);

    try {
      const response = await fetch(
        "/api/thong-bao?page=1&limit=6",
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      if (response.status === 401 || response.status === 403) {
        return;
      }

      const result = await parseResponse(response);

      if (!response.ok || result.success === false) {
        return;
      }

      const data = result.data ?? result;
      const rawList =
        data.danhSach ??
        data.items ??
        data.thongBao ??
        [];

      const list = Array.isArray(rawList)
        ? rawList.map(normalizeThongBao)
        : [];

      const thongKe = data.thongKe ?? {};

      setNotifications(list);
      setUnreadCount(
        Math.max(
          0,
          Number(
            thongKe.chuaDoc ??
              thongKe.soChuaDoc ??
              list.filter((item: ThongBaoHeader) => !item.daDoc)
                .length,
          ) || 0,
        ),
      );
    } catch (error) {
      console.error("Không thể tải thông báo:", error);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  const loadPendingApprovals = useCallback(async () => {
    if (currentUser?.role !== "ADMIN") {
      setPendingApprovalCount(0);
      return;
    }

    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "1",
        mode: "quan-ly",
        trangThai: "CHO_DUYET",
      });

      const response = await fetch(
        `/api/thong-bao?${params.toString()}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return;
      }

      const result = await parseResponse(response);

      if (result.success === false) {
        return;
      }

      const data = result.data ?? result;
      const count = Number(
        data.thongKe?.choDuyet ??
          data.phanTrang?.total ??
          data.total ??
          0,
      );

      setPendingApprovalCount(
        Number.isFinite(count) ? Math.max(0, count) : 0,
      );
    } catch (error) {
      console.error(
        "Không thể tải số thông báo chờ duyệt:",
        error,
      );
    }
  }, [currentUser?.role]);

  useEffect(() => {
    if (!initialUser && !userFromProps) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
      void loadCurrentUser();
    }
  }, [initialUser, userFromProps, loadCurrentUser]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);

    function handleFocus() {
      void loadNotifications();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadNotifications]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
    void loadPendingApprovals();

    if (currentUser?.role !== "ADMIN") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadPendingApprovals();
    }, 60_000);

    function handleFocus() {
      void loadPendingApprovals();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [currentUser?.role, loadPendingApprovals]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve existing loading and UI synchronization timing in this effect.
    setSidebarOpen(false);
    setNotificationOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setNotificationOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationOpen(false);
        setSidebarOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  function toggleNotificationPanel() {
    setNotificationOpen((current) => {
      const nextState = !current;

      if (nextState) {
        void loadNotifications();
        void loadPendingApprovals();
      }

      return nextState;
    });
  }

  function openNotificationPage() {
    setNotificationOpen(false);
    router.push("/dashboard/thong-bao");
  }

  async function openNotification(notification: ThongBaoHeader) {
    if (notificationActionId) {
      return;
    }

    setNotificationActionId(notification.id);

    try {
      if (!notification.daDoc) {
        const response = await fetch(
          `/api/thong-bao/${notification.id}/da-doc`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              daDoc: true,
            }),
          },
        );

        if (response.ok) {
          setNotifications((current) =>
            current.map((item) =>
              item.id === notification.id
                ? { ...item, daDoc: true }
                : item,
            ),
          );

          setUnreadCount((current) =>
            Math.max(0, current - 1),
          );
        }
      }
    } catch (error) {
      console.error(
        "Không thể đánh dấu thông báo đã đọc:",
        error,
      );
    } finally {
      setNotificationOpen(false);
      setNotificationActionId("");

      router.push(
        `/dashboard/thong-bao?open=${encodeURIComponent(
          notification.id,
        )}`,
      );
    }
  }

  function openPendingApprovals() {
    setNotificationOpen(false);
    router.push("/dashboard/thong-bao?status=CHO_DUYET");
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-[#123b68] text-white shadow-xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/15 px-4">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#123b68]">
              LCH
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-bold uppercase text-white">
                Liên Chi hội
              </p>
              <p className="mt-1 truncate text-xs text-blue-100">
                Khoa Sư phạm
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
          >
            <X size={21} />
          </button>
        </div>

        <div className="border-b border-white/15 px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
            Hệ thống quản lý
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            Trường Đại học Quy Nhơn
          </p>
        </div>

        <div className="px-4 pb-2 pt-4">
          <p className="px-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
            Danh mục quản lý
          </p>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-1">
            {visibleMenuItems.map((item) => {
              const isActivityChild =
                ACTIVITY_CHILD_HREFS.includes(item.href);

              if (isActivityChild) {
                return null;
              }

              if (item.href === "/dashboard/hoat-dong") {
                const active = isActiveMenu(pathname, item.href);
                const activityChildren = visibleMenuItems.filter(
                  (menuItem) =>
                    ACTIVITY_CHILD_HREFS.includes(menuItem.href),
                );

                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      aria-expanded={activityMenuOpen}
                      onClick={() =>
                        setActivityMenuOpen((open) => !open)
                      }
                      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                        active
                          ? "bg-white text-[#123b68] shadow-sm"
                          : "bg-transparent text-white hover:bg-white/10"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center ${
                          active
                            ? "text-[#123b68]"
                            : "text-blue-100"
                        }`}
                      >
                        {item.icon}
                      </span>

                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>

                      <ChevronRight
                        size={16}
                        className={`shrink-0 transition-transform duration-200 ${
                          activityMenuOpen ? "rotate-90" : ""
                        } ${
                          active
                            ? "text-[#123b68]"
                            : "text-blue-100"
                        }`}
                      />
                    </button>

                    {activityMenuOpen && (
                      <div className="mt-1 space-y-1">
                        <Link
                          href="/dashboard/hoat-dong"
                          title="Danh sách hoạt động"
                          className={`ml-6 flex min-h-10 w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            active
                              ? "bg-[#0d3158] !text-white shadow-sm"
                              : "text-white hover:bg-white/10"
                          }`}
                          style={{ color: "#ffffff" }}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-white">
                            {item.icon}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            Danh sách hoạt động
                          </span>
                        </Link>

                        {activityChildren.map((child) => {
                          const childActive = isActiveMenu(
                            pathname,
                            child.href,
                          );

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              title={child.label}
                              className={`ml-6 flex min-h-10 w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                childActive
                                  ? "bg-[#0d3158] !text-white shadow-sm"
                                  : "text-white hover:bg-white/10"
                              }`}
                              style={{ color: "#ffffff" }}
                            >
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center ${
                                  childActive
                                    ? "text-white"
                                    : "text-blue-100"
                                }`}
                              >
                                {child.icon}
                              </span>
                              <span className="min-w-0 flex-1 truncate">
                                {child.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const active = isActiveMenu(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-white shadow-sm"
                      : "bg-transparent hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center ${
                      active
                        ? "text-[#123b68]"
                        : "text-blue-100"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span
                    className={`min-w-0 flex-1 truncate text-left ${
                      active
                        ? "text-[#123b68]"
                        : "text-white"
                    }`}
                  >
                    {item.label}
                  </span>

                  {item.href === "/dashboard/thong-bao" &&
                    unreadCount > 0 && (
                      <span
                        className={`flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                          active
                            ? "bg-red-500 text-white"
                            : "bg-white text-[#123b68]"
                        }`}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}

                  {item.href === "/dashboard/thong-bao" &&
                    currentUser?.role === "ADMIN" &&
                    pendingApprovalCount > 0 && (
                      <span
                        title={`${pendingApprovalCount} thông báo chờ duyệt`}
                        className="flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950"
                      >
                        {pendingApprovalCount > 99
                          ? "99+"
                          : pendingApprovalCount}
                      </span>
                    )}

                  {active &&
                    item.href !== "/dashboard/thong-bao" && (
                      <ChevronRight
                        size={16}
                        className="shrink-0 text-[#123b68]"
                      />
                    )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/15 p-4">
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/25 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2
                size={19}
                className="animate-spin"
              />
            ) : (
              <LogOut size={19} />
            )}
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-3 shadow-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                Hệ thống quản lý Liên Chi hội
              </h2>
              <p className="mt-1 hidden truncate text-xs text-slate-500 sm:block">
                Liên Chi hội Khoa Sư phạm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser?.role === "ADMIN" &&
              pendingApprovalCount > 0 && (
                <button
                  type="button"
                  onClick={openPendingApprovals}
                  title="Thông báo đang chờ duyệt"
                  className="relative hidden h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-700 hover:bg-amber-100 md:flex"
                >
                  <ShieldCheck size={16} />
                  Chờ duyệt
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {pendingApprovalCount > 99
                      ? "99+"
                      : pendingApprovalCount}
                  </span>
                </button>
              )}

            <div
              ref={notificationRef}
              className="relative"
            >
              <button
                type="button"
                onClick={toggleNotificationPanel}
                title="Xem thông báo"
                aria-label="Xem thông báo"
                className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition ${
                  notificationOpen
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-[#123b68] hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                <Bell size={20} />

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}

                {currentUser?.role === "ADMIN" &&
                  unreadCount === 0 &&
                  pendingApprovalCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-amber-500 px-1 text-[10px] font-bold text-white">
                      {pendingApprovalCount > 99
                        ? "99+"
                        : pendingApprovalCount}
                    </span>
                  )}
              </button>

              {notificationOpen && (
                <div className="fixed left-3 right-3 top-[76px] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-[54px] sm:w-[420px]">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Thông báo mới
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {unreadCount > 0
                          ? `${unreadCount} thông báo chưa đọc`
                          : "Không có thông báo chưa đọc"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        void loadNotifications();
                        void loadPendingApprovals();
                      }}
                      disabled={notificationLoading}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      title="Làm mới"
                    >
                      <RefreshCw
                        size={17}
                        className={
                          notificationLoading
                            ? "animate-spin"
                            : ""
                        }
                      />
                    </button>
                  </div>

                  {currentUser?.role === "ADMIN" &&
                    pendingApprovalCount > 0 && (
                      <button
                        type="button"
                        onClick={openPendingApprovals}
                        className="flex w-full items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                          <ShieldCheck size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-amber-900">
                            Thông báo chờ phê duyệt
                          </p>
                          <p className="mt-1 text-xs text-amber-700">
                            Có{" "}
                            <strong>{pendingApprovalCount}</strong>{" "}
                            thông báo đang chờ xử lý
                          </p>
                        </div>

                        <ChevronRight
                          size={18}
                          className="shrink-0 text-amber-700"
                        />
                      </button>
                    )}

                  <div className="max-h-[430px] overflow-y-auto">
                    {notificationLoading &&
                    notifications.length === 0 ? (
                      <div className="flex h-52 items-center justify-center">
                        <Loader2
                          size={28}
                          className="animate-spin text-[#123b68]"
                        />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex h-52 flex-col items-center justify-center px-6 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <Bell size={25} />
                        </div>
                        <p className="mt-4 font-semibold text-slate-700">
                          Chưa có thông báo
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Thông báo mới sẽ hiển thị tại đây.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notifications.map((notification) => {
                          const processing =
                            notificationActionId ===
                            notification.id;

                          return (
                            <button
                              key={notification.id}
                              type="button"
                              disabled={Boolean(notificationActionId)}
                              onClick={() =>
                                void openNotification(notification)
                              }
                              className={`flex w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 disabled:cursor-wait ${
                                !notification.daDoc
                                  ? "bg-blue-50/60"
                                  : "bg-white"
                              }`}
                            >
                              <div
                                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                  notification.mucDo === "KHAN_CAP"
                                    ? "bg-red-100 text-red-600"
                                    : notification.mucDo ===
                                        "QUAN_TRONG"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {processing ? (
                                  <Loader2
                                    size={19}
                                    className="animate-spin"
                                  />
                                ) : notification.mucDo ===
                                  "KHAN_CAP" ? (
                                  <AlertCircle size={19} />
                                ) : notification.mucDo ===
                                  "QUAN_TRONG" ? (
                                  <FileText size={19} />
                                ) : (
                                  <Bell size={19} />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-2">
                                  <p
                                    className={`line-clamp-1 flex-1 text-sm text-slate-900 ${
                                      !notification.daDoc
                                        ? "font-bold"
                                        : "font-semibold"
                                    }`}
                                  >
                                    {notification.tieuDe}
                                  </p>

                                  {!notification.daDoc && (
                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                  )}
                                </div>

                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                  {notification.noiDung}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] text-slate-400">
                                    {formatDate(notification.createdAt)}
                                  </span>

                                  {notification.tepDinhKem.length > 0 && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                      {notification.tepDinhKem.length} tệp
                                    </span>
                                  )}

                                  {notification.mucDo === "KHAN_CAP" && (
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                      Khẩn cấp
                                    </span>
                                  )}

                                  {notification.mucDo ===
                                    "QUAN_TRONG" && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                      Quan trọng
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50 p-3">
                    <button
                      type="button"
                      onClick={openNotificationPage}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#123b68] text-sm font-semibold text-white transition hover:bg-[#0d3158]"
                    >
                      Xem tất cả thông báo
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden text-right sm:block">
              {loadingUser ? (
                <div className="space-y-2">
                  <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="ml-auto h-3 w-16 animate-pulse rounded bg-slate-100" />
                </div>
              ) : (
                <>
                  <p className="max-w-44 truncate text-sm font-bold text-slate-900">
                    {currentUser?.fullName ?? "Người dùng"}
                  </p>

                  <div className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-500">
                    <ShieldCheck size={12} />
                    <span>
                      {currentUser
                        ? ROLE_LABEL[currentUser.role]
                        : "Người dùng"}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-bold text-[#123b68]">
              {getInitialName(
                currentUser?.fullName ??
                  currentUser?.username ??
                  "U",
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-80px)]">
          <div
            className={
              pathname === "/dashboard"
                ? "w-full px-4 py-6 sm:px-6 lg:px-12 lg:py-8"
                : ""
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}