"use client";

import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  DatabaseBackup,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  ShieldCheck,
  Star,
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

/* =========================================================
   TYPES
========================================================= */

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
}

/* =========================================================
   CONSTANTS
========================================================= */

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  BAN_CHAP_HANH: "Ban Chấp hành",
  CHI_HOI_TRUONG: "Chi hội trưởng",
  HOI_VIEN: "Hội viên",
};

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
    roles: [
      "ADMIN",
      "BAN_CHAP_HANH",
      "CHI_HOI_TRUONG",
    ],
  },
  {
    label: "Quản lý Ban Chấp hành",
    href: "/dashboard/ban-chap-hanh",
    icon: <UserCog size={19} />,
    roles: ["ADMIN", "BAN_CHAP_HANH"],
  },
  {
    label: "Quản lý hoạt động",
    href: "/dashboard/hoat-dong",
    icon: <CalendarDays size={19} />,
  },
  {
    label: "Thông báo và tài liệu",
    href: "/dashboard/thong-bao",
    icon: <Bell size={19} />,
  },
  {
    label: "Thống kê và báo cáo",
    href: "/dashboard/thong-ke",
    icon: <BarChart3 size={19} />,
    roles: [
      "ADMIN",
      "BAN_CHAP_HANH",
      "CHI_HOI_TRUONG",
    ],
  },
  {
    label: "Xem đánh giá",
    href: "/dashboard/danh-gia",
    icon: <Star size={19} />,
  },
  {
    label: "Sao lưu và bảo mật",
    href: "/dashboard/sao-luu",
    icon: <DatabaseBackup size={19} />,
    roles: ["ADMIN"],
  },
];

/* =========================================================
   HELPERS
========================================================= */

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Máy chủ trả về dữ liệu không hợp lệ",
    );
  }
}

function getId(value: unknown): string {
  if (!value) return "";

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
  if (!raw) return null;

  const id = getId(
    raw.id ?? raw._id ?? raw.userId,
  );

  const role = String(
    raw.role ?? "",
  ) as UserRole;

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
  let mucDo: MucDoThongBao =
    "THONG_THUONG";

  if (raw.mucDo === "QUAN_TRONG") {
    mucDo = "QUAN_TRONG";
  }

  if (raw.mucDo === "KHAN_CAP") {
    mucDo = "KHAN_CAP";
  }

  return {
    id: getId(raw.id ?? raw._id),
    tieuDe: String(
      raw.tieuDe ?? "Thông báo",
    ),
    noiDung: String(raw.noiDung ?? ""),
    mucDo,
    daDoc: Boolean(raw.daDoc),
    createdAt:
      (raw.createdAt as string | undefined) ??
      new Date().toISOString(),
    tepDinhKem: Array.isArray(
      raw.tepDinhKem,
    )
      ? raw.tepDinhKem
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

  return (
    words.at(-1)?.charAt(0).toUpperCase() ||
    "U"
  );
}

function isActiveMenu(
  pathname: string,
  href: string,
) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function DashboardShell({
  children,
  initialUser,
  user: userFromProps,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const notificationRef =
    useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] =
    useState<SessionUser | null>(
      initialUser ?? userFromProps ?? null,
    );

  const [loadingUser, setLoadingUser] =
    useState(
      !initialUser && !userFromProps,
    );

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [
    notificationOpen,
    setNotificationOpen,
  ] = useState(false);

  const [
    notificationLoading,
    setNotificationLoading,
  ] = useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState<ThongBaoHeader[]>([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const visibleMenuItems = useMemo(() => {
    if (!currentUser) {
      return MENU_ITEMS.filter(
        (item) => !item.roles,
      );
    }

    return MENU_ITEMS.filter((item) => {
      if (!item.roles) return true;

      return item.roles.includes(
        currentUser.role,
      );
    });
  }, [currentUser]);

  /* =======================================================
     LOAD CURRENT USER
  ======================================================= */

  const loadCurrentUser =
    useCallback(async () => {
      try {
        const response = await fetch(
          "/api/auth/me",
          {
            cache: "no-store",
            credentials: "include",
          },
        );

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          router.replace("/login");
          return;
        }

        const result =
          await parseResponse(response);

        if (
          !response.ok ||
          result.success === false
        ) {
          return;
        }

        const rawUser =
          result.user ??
          result.data?.user ??
          result.data;

        const normalizedUser =
          normalizeUser(rawUser);

        if (normalizedUser) {
          setCurrentUser(normalizedUser);
        }
      } catch (error) {
        console.error(
          "Không thể tải người dùng:",
          error,
        );
      } finally {
        setLoadingUser(false);
      }
    }, [router]);

  /* =======================================================
     LOAD NOTIFICATIONS
  ======================================================= */

  const loadNotifications =
    useCallback(async () => {
      setNotificationLoading(true);

      try {
        const response = await fetch(
          "/api/thong-bao?page=1&limit=6",
          {
            cache: "no-store",
            credentials: "include",
          },
        );

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          return;
        }

        const result =
          await parseResponse(response);

        if (
          !response.ok ||
          result.success === false
        ) {
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

        const thongKe =
          data.thongKe ?? {};

        setNotifications(list);

        setUnreadCount(
          Number(
            thongKe.chuaDoc ??
              thongKe.soChuaDoc ??
              list.filter(
                (item) => !item.daDoc,
              ).length,
          ),
        );
      } catch (error) {
        console.error(
          "Không thể tải thông báo:",
          error,
        );
      } finally {
        setNotificationLoading(false);
      }
    }, []);

  /* =======================================================
     EFFECTS
  ======================================================= */

  useEffect(() => {
    if (!initialUser && !userFromProps) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the request and its loading state together when effect dependencies change.
      void loadCurrentUser();
    }
  }, [
    initialUser,
    userFromProps,
    loadCurrentUser,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the request and its loading state together when effect dependencies change.
    void loadNotifications();

    const intervalId = window.setInterval(
      () => {
        void loadNotifications();
      },
      60_000,
    );

    const handleFocus = () => {
      void loadNotifications();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.clearInterval(intervalId);

      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [loadNotifications]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Close navigation overlays when the route changes.
    setSidebarOpen(false);
    setNotificationOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target as Node,
        )
      ) {
        setNotificationOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setNotificationOpen(false);
        setSidebarOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  /* =======================================================
     ACTIONS
  ======================================================= */

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error(
        "Lỗi đăng xuất:",
        error,
      );
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
      }

      return nextState;
    });
  }

  function openNotificationPage() {
    setNotificationOpen(false);
    router.push("/dashboard/thong-bao");
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-[#123b68] text-white shadow-xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* Logo */}
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
            onClick={() =>
              setSidebarOpen(false)
            }
            className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
          >
            <X size={21} />
          </button>
        </div>

        {/* School */}
        <div className="border-b border-white/15 px-4 py-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
            Hệ thống quản lý
          </p>

          <p className="mt-2 text-sm font-semibold text-white">
            Trường Đại học Quy Nhơn
          </p>
        </div>

        <div className="px-4 pb-2 pt-5">
          <p className="px-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
            Danh mục quản lý
          </p>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-5">
          {visibleMenuItems.map((item) => {
            const active = isActiveMenu(
              pathname,
              item.href,
            );

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

                {/* Ép màu chữ để không bị trắng trên nền trắng */}
                <span
                  className={`min-w-0 flex-1 truncate text-left ${
                    active
                      ? "text-[#123b68]"
                      : "text-white"
                  }`}
                >
                  {item.label}
                </span>

                {item.href ===
                  "/dashboard/thong-bao" &&
                  unreadCount > 0 && (
                    <span
                      className={`flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        active
                          ? "bg-red-500 text-white"
                          : "bg-white text-[#123b68]"
                      }`}
                    >
                      {unreadCount > 99
                        ? "99+"
                        : unreadCount}
                    </span>
                  )}

                {active &&
                  item.href !==
                    "/dashboard/thong-bao" && (
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-[#123b68]"
                    />
                  )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/15 p-4">
          <button
            type="button"
            onClick={handleLogout}
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

      {/* Main area */}
      <div className="min-h-screen lg:pl-[270px]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setSidebarOpen(true)
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900">
                Hệ thống quản lý Liên Chi hội
              </h2>

              <p className="mt-1 truncate text-xs text-slate-500">
                Liên Chi hội Khoa Sư phạm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Bell */}
            <div
              ref={notificationRef}
              className="relative"
            >
              <button
                type="button"
                onClick={
                  toggleNotificationPanel
                }
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
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
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
                      onClick={() =>
                        void loadNotifications()
                      }
                      disabled={
                        notificationLoading
                      }
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

                  <div className="max-h-[430px] overflow-y-auto">
                    {notificationLoading &&
                    notifications.length === 0 ? (
                      <div className="flex h-52 items-center justify-center">
                        <Loader2
                          size={28}
                          className="animate-spin text-[#123b68]"
                        />
                      </div>
                    ) : notifications.length ===
                      0 ? (
                      <div className="flex h-52 flex-col items-center justify-center px-6 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <Bell size={25} />
                        </div>

                        <p className="mt-4 font-semibold text-slate-700">
                          Chưa có thông báo
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Thông báo mới sẽ hiển thị tại
                          đây.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notifications.map(
                          (notification) => (
                            <button
                              key={
                                notification.id
                              }
                              type="button"
                              onClick={
                                openNotificationPage
                              }
                              className={`flex w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 ${
                                !notification.daDoc
                                  ? "bg-blue-50/60"
                                  : "bg-white"
                              }`}
                            >
                              <div
                                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                  notification.mucDo ===
                                  "KHAN_CAP"
                                    ? "bg-red-100 text-red-600"
                                    : notification.mucDo ===
                                        "QUAN_TRONG"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {notification.mucDo ===
                                "KHAN_CAP" ? (
                                  <AlertCircle
                                    size={19}
                                  />
                                ) : notification.mucDo ===
                                  "QUAN_TRONG" ? (
                                  <FileText
                                    size={19}
                                  />
                                ) : (
                                  <Bell
                                    size={19}
                                  />
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
                                    {
                                      notification.tieuDe
                                    }
                                  </p>

                                  {!notification.daDoc && (
                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                  )}
                                </div>

                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                  {
                                    notification.noiDung
                                  }
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] text-slate-400">
                                    {formatDate(
                                      notification.createdAt,
                                    )}
                                  </span>

                                  {notification
                                    .tepDinhKem
                                    .length >
                                    0 && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                      {
                                        notification
                                          .tepDinhKem
                                          .length
                                      }{" "}
                                      tệp
                                    </span>
                                  )}

                                  {notification.mucDo ===
                                    "KHAN_CAP" && (
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
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50 p-3">
                    <button
                      type="button"
                      onClick={
                        openNotificationPage
                      }
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#123b68] text-sm font-semibold text-white transition hover:bg-[#0d3158]"
                    >
                      Xem tất cả thông báo
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User information */}
            <div className="hidden text-right sm:block">
              {loadingUser ? (
                <div className="space-y-2">
                  <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="ml-auto h-3 w-16 animate-pulse rounded bg-slate-100" />
                </div>
              ) : (
                <>
                  <p className="max-w-44 truncate text-sm font-bold text-slate-900">
                    {currentUser?.fullName ??
                      "Người dùng"}
                  </p>

                  <div className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-500">
                    <ShieldCheck size={12} />

                    <span>
                      {currentUser
                        ? ROLE_LABEL[
                            currentUser.role
                          ]
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

        {/* Page */}
        <main className="min-h-[calc(100vh-80px)]">
          {children}
        </main>
      </div>
    </div>
  );
}