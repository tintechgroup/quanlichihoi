"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  TrendingUp,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

/* =========================================================
 * TYPES
 * ======================================================= */

type ChiHoi = {
  _id: string;
  maChiHoi?: string;
  tenChiHoi?: string;
};

type HoiVien = {
  _id: string;
  maHoiVien?: string;
  hoTen?: string;
  trangThai?: string;
  chiHoiId?: string | ChiHoi | null;
};

type HoatDong = {
  _id: string;
  maHoatDong?: string;
  tenHoatDong?: string;
  phamVi?: string;
  chiHoiId?: string | ChiHoi | null;
  chiHoi?: ChiHoi | null;
  donViToChuc?: string;
  diaDiem?: string;
  thoiGianBatDau?: string;
  thoiGianKetThuc?: string;
  trangThai?: string;

  tongDangKy?: number;
  soDangKy?: number;

  daDangKy?: number;
  soDaDangKy?: number;

  daThamGia?: number;
  soThamGia?: number;

  vangMat?: number;
  soVangMat?: number;

  daHuy?: number;
  soDaHuy?: number;

  tyLeThamGia?: number;
};

type TongQuan = {
  tongChiHoi?: number;
  tongHoiVien?: number;
  hoiVienDangHoatDong?: number;
  tongHoatDong?: number;
  tongDangKy?: number;
  tongThamGia?: number;
  tongVangMat?: number;
  tongDaHuy?: number;
  tyLeThamGia?: number;
};

type TrangThaiItem = {
  _id?: string;
  trangThai?: string;
  tenTrangThai?: string;
  label?: string;
  soLuong?: number;
  tong?: number;
  value?: number;
};

type TheoThangItem = {
  _id?: string;
  thang?: string;
  tenThang?: string;
  label?: string;
  soHoatDong?: number;
  tongHoatDong?: number;
  soDangKy?: number;
  tongDangKy?: number;
  soThamGia?: number;
  tongThamGia?: number;
};

type ThongKeChiHoiItem = {
  _id?: string;
  chiHoiId?: string;
  maChiHoi?: string;
  tenChiHoi?: string;

  soHoiVien?: number;
  tongHoiVien?: number;

  soHoatDong?: number;
  tongHoatDong?: number;

  soDangKy?: number;
  tongDangKy?: number;

  soThamGia?: number;
  tongThamGia?: number;

  tyLeThamGia?: number;
};

type ReportData = {
  tongQuan: TongQuan;
  trangThaiHoatDong: TrangThaiItem[];
  theoThang: TheoThangItem[];
  thongKeChiHoi: ThongKeChiHoiItem[];
  chiTietHoatDong: HoatDong[];
  danhSachHoatDong: HoatDong[];
  danhSachHoiVien: HoiVien[];
  danhSachChiHoi: ChiHoi[];
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: Partial<ReportData> & {
    thongKe?: TongQuan;
  };
};

type ChartItem = {
  label: string;
  soHoatDong: number;
  soDangKy: number;
  soThamGia: number;
};

type StatusDisplayItem = {
  status: string;
  label: string;
  value: number;
  color: string;
  lightColor: string;
};

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  iconClassName: string;
  trend?: string;
};

/* =========================================================
 * CONSTANTS
 * ======================================================= */

const ITEMS_PER_PAGE = 6;

const INITIAL_DATA: ReportData = {
  tongQuan: {},
  trangThaiHoatDong: [],
  theoThang: [],
  thongKeChiHoi: [],
  chiTietHoatDong: [],
  danhSachHoatDong: [],
  danhSachHoiVien: [],
  danhSachChiHoi: [],
};

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "CHO_PHE_DUYET", label: "Chờ phê duyệt" },
  { value: "DA_DUYET", label: "Đã duyệt" },
  { value: "SAP_DIEN_RA", label: "Sắp diễn ra" },
  { value: "DANG_TRIEN_KHAI", label: "Đang triển khai" },
  { value: "DA_KET_THUC", label: "Đã kết thúc" },
  { value: "TAM_HOAN", label: "Tạm hoãn" },
  { value: "DA_HUY", label: "Đã hủy" },
  { value: "TU_CHOI", label: "Từ chối" },
];

const STATUS_COLORS: Record<
  string,
  {
    color: string;
    lightColor: string;
  }
> = {
  CHO_PHE_DUYET: {
    color: "#f59e0b",
    lightColor: "#fef3c7",
  },
  DA_DUYET: {
    color: "#2563eb",
    lightColor: "#dbeafe",
  },
  SAP_DIEN_RA: {
    color: "#6366f1",
    lightColor: "#e0e7ff",
  },
  DANG_TRIEN_KHAI: {
    color: "#10b981",
    lightColor: "#d1fae5",
  },
  DA_KET_THUC: {
    color: "#8b5cf6",
    lightColor: "#ede9fe",
  },
  TAM_HOAN: {
    color: "#f97316",
    lightColor: "#ffedd5",
  },
  DA_HUY: {
    color: "#ef4444",
    lightColor: "#fee2e2",
  },
  TU_CHOI: {
    color: "#e11d48",
    lightColor: "#ffe4e6",
  },
  KHONG_XAC_DINH: {
    color: "#94a3b8",
    lightColor: "#f1f5f9",
  },
};

/* =========================================================
 * HELPERS
 * ======================================================= */

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("vi-VN").format(
    toNumber(value),
  );
}

function formatPercent(value: unknown) {
  const number = Math.max(
    0,
    Math.min(100, toNumber(value)),
  );

  return `${Math.round(number)}%`;
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
    hour12: false,
  }).format(date);
}

function getStatusLabel(status?: string) {
  if (!status) return "Chưa xác định";

  return (
    STATUS_OPTIONS.find(
      (item) => item.value === status,
    )?.label ??
    status.replaceAll("_", " ")
  );
}

function getStatusStyle(status?: string) {
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
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "TAM_HOAN":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "DA_HUY":
    case "TU_CHOI":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getPhamViLabel(value?: string) {
  switch (value) {
    case "TOAN_TRUONG":
      return "Toàn trường";

    case "LIEN_CHI_HOI":
      return "Liên Chi hội";

    case "CHI_HOI":
      return "Chi hội";

    default:
      return value || "Chưa xác định";
  }
}

function getChiHoi(item: HoatDong) {
  if (item.chiHoi) {
    return item.chiHoi;
  }

  if (
    item.chiHoiId &&
    typeof item.chiHoiId === "object"
  ) {
    return item.chiHoiId;
  }

  return null;
}

function getActivityStatistic(item: HoatDong) {
  const tongDangKy = toNumber(
    item.tongDangKy ?? item.soDangKy,
  );

  const daDangKy = toNumber(
    item.daDangKy ?? item.soDaDangKy,
  );

  const daThamGia = toNumber(
    item.daThamGia ?? item.soThamGia,
  );

  const vangMat = toNumber(
    item.vangMat ?? item.soVangMat,
  );

  const daHuy = toNumber(
    item.daHuy ?? item.soDaHuy,
  );

  const tyLeThamGia =
    item.tyLeThamGia !== undefined
      ? toNumber(item.tyLeThamGia)
      : tongDangKy > 0
        ? Math.round((daThamGia / tongDangKy) * 100)
        : 0;

  return {
    tongDangKy,
    daDangKy,
    daThamGia,
    vangMat,
    daHuy,
    tyLeThamGia,
  };
}

async function parseJsonResponse(
  response: Response,
): Promise<ApiResponse> {
  const contentType =
    response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    throw new Error(
      text ||
        `Máy chủ trả về dữ liệu không hợp lệ (${response.status})`,
    );
  }

  try {
    return (await response.json()) as ApiResponse;
  } catch {
    throw new Error(
      "Không thể đọc dữ liệu trả về từ máy chủ",
    );
  }
}

/* =========================================================
 * COMPONENTS
 * ======================================================= */

function StatCard({
  title,
  value,
  description,
  icon,
  iconClassName,
  trend,
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-50 transition group-hover:scale-110" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-2 line-clamp-1 text-xs text-slate-500">
            {description}
          </p>

          {trend && (
            <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <TrendingUp size={13} />
              {trend}
            </p>
          )}
        </div>

        <div
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <BarChart3 size={30} />
      </div>

      <p className="mt-4 font-bold text-slate-700">
        {title}
      </p>

      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
 * BEAUTIFUL SVG CHART
 * ======================================================= */

function ActivityChart({
  data,
}: {
  data: ChartItem[];
}) {
  const width = 820;
  const height = 310;

  const padding = {
    top: 30,
    right: 30,
    bottom: 55,
    left: 55,
  };

  const chartWidth =
    width - padding.left - padding.right;

  const chartHeight =
    height - padding.top - padding.bottom;

  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => [
      item.soHoatDong,
      item.soThamGia,
      item.soDangKy,
    ]),
  );

  const roundedMax =
    maxValue <= 5
      ? 5
      : Math.ceil(maxValue / 5) * 5;

  const getX = (index: number) => {
    if (data.length <= 1) {
      return padding.left + chartWidth / 2;
    }

    return (
      padding.left +
      (index / (data.length - 1)) * chartWidth
    );
  };

  const getY = (value: number) => {
    return (
      padding.top +
      chartHeight -
      (value / roundedMax) * chartHeight
    );
  };

  const linePath = data
    .map((item, index) => {
      const x = getX(index);
      const y = getY(item.soThamGia);

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaPath =
    data.length > 0
      ? `${linePath} L ${getX(
          data.length - 1,
        )} ${padding.top + chartHeight} L ${getX(
          0,
        )} ${padding.top + chartHeight} Z`
      : "";

  const gridLines = Array.from(
    { length: 6 },
    (_, index) => {
      const value = Math.round(
        roundedMax - (roundedMax / 5) * index,
      );

      const y =
        padding.top + (chartHeight / 5) * index;

      return {
        value,
        y,
      };
    },
  );

  if (data.length === 0) {
    return (
      <EmptyState
        title="Chưa có dữ liệu biểu đồ"
        description="Biểu đồ sẽ xuất hiện khi hệ thống có dữ liệu hoạt động theo tháng."
      />
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-5 px-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            Hoạt động
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Đã tham gia
          </div>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label="Biểu đồ hoạt động theo tháng"
        >
          <defs>
            <linearGradient
              id="activityAreaGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#10b981"
                stopOpacity="0.3"
              />

              <stop
                offset="100%"
                stopColor="#10b981"
                stopOpacity="0.01"
              />
            </linearGradient>

            <linearGradient
              id="activityBarGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#3b82f6"
              />

              <stop
                offset="100%"
                stopColor="#1d4ed8"
              />
            </linearGradient>

            <filter
              id="chartShadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="3"
                stdDeviation="4"
                floodColor="#2563eb"
                floodOpacity="0.2"
              />
            </filter>
          </defs>

          {gridLines.map((line, index) => (
            <g key={`grid-${line.value}-${index}`}>
              <line
                x1={padding.left}
                y1={line.y}
                x2={width - padding.right}
                y2={line.y}
                stroke="#e2e8f0"
                strokeDasharray="5 5"
              />

              <text
                x={padding.left - 15}
                y={line.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#94a3b8"
              >
                {line.value}
              </text>
            </g>
          ))}

          {areaPath && (
            <path
              d={areaPath}
              fill="url(#activityAreaGradient)"
            />
          )}

          {data.map((item, index) => {
            const x = getX(index);

            const availableWidth =
              chartWidth / Math.max(data.length, 1);

            const barWidth = Math.min(
              38,
              Math.max(18, availableWidth * 0.38),
            );

            const y = getY(item.soHoatDong);
            const bottom = padding.top + chartHeight;
            const barHeight = Math.max(2, bottom - y);

            return (
              <g
                key={`bar-${item.label}-${index}`}
              >
                <rect
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="8"
                  fill="url(#activityBarGradient)"
                  filter="url(#chartShadow)"
                />

                <text
                  x={x}
                  y={Math.max(16, y - 9)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#1e3a8a"
                >
                  {item.soHoatDong}
                </text>
              </g>
            );
          })}

          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {data.map((item, index) => {
            const x = getX(index);
            const y = getY(item.soThamGia);

            return (
              <g
                key={`point-${item.label}-${index}`}
              >
                <circle
                  cx={x}
                  cy={y}
                  r="7"
                  fill="white"
                  stroke="#10b981"
                  strokeWidth="4"
                />

                <title>
                  {`${item.label}: ${item.soThamGia} lượt tham gia`}
                </title>
              </g>
            );
          })}

          {data.map((item, index) => (
            <text
              key={`label-${item.label}-${index}`}
              x={getX(index)}
              y={height - 20}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#64748b"
            >
              {item.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* =========================================================
 * DONUT CHART
 * ======================================================= */

function StatusDonutChart({
  items,
  total,
}: {
  items: StatusDisplayItem[];
  total: number;
}) {
  const radius = 72;
  const circumference = 2 * Math.PI * radius;

  if (items.length === 0 || total <= 0) {
    return (
      <EmptyState
        title="Chưa có trạng thái"
        description="Không có hoạt động phù hợp với bộ lọc hiện tại."
      />
    );
  }

  // Tính trước từng đoạn của biểu đồ theo cách bất biến.
  // Không thay đổi biến trong lúc render để đáp ứng quy tắc
  // react-hooks/immutability của React/ESLint.
  const segments = items.map((item, index) => {
    const percentage = item.value / total;
    const dashLength = circumference * percentage;

    const previousLength = items
      .slice(0, index)
      .reduce((sum, previousItem) => {
        return (
          sum +
          circumference *
            (previousItem.value / total)
        );
      }, 0);

    return {
      ...item,
      index,
      dashLength,
      dashOffset: -previousLength,
    };
  });

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[220px_1fr] lg:items-center">
      <div className="relative mx-auto h-52 w-52">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full -rotate-90"
        >
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="22"
          />

          {segments.map((segment) => (
            <circle
              key={`donut-${segment.status}-${segment.index}`}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="22"
              strokeLinecap="butt"
              strokeDasharray={`${segment.dashLength} ${
                circumference - segment.dashLength
              }`}
              strokeDashoffset={segment.dashOffset}
            />
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-950">
            {formatNumber(total)}
          </span>

          <span className="mt-1 text-xs font-medium text-slate-500">
            Hoạt động
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const percentage =
            total > 0
              ? Math.round((item.value / total) * 100)
              : 0;

          return (
            <div
              key={`legend-${item.status}-${index}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-3 py-2.5 transition hover:bg-slate-50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: item.color,
                  }}
                />

                <span className="truncate text-sm font-medium text-slate-700">
                  {item.label}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {formatNumber(item.value)}
                </span>

                <span className="min-w-10 text-right text-xs text-slate-400">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
 * MAIN PAGE
 * ======================================================= */

export default function ThongKePage() {
  const [report, setReport] =
    useState<ReportData>(INITIAL_DATA);

  const [keyword, setKeyword] = useState("");
  const [chiHoiId, setChiHoiId] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const requestIdRef = useRef(0);

  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams();

    if (keyword.trim()) {
      params.set("search", keyword.trim());
    }

    if (chiHoiId) {
      params.set("chiHoiId", chiHoiId);
    }

    if (trangThai) {
      params.set("trangThai", trangThai);
    }

    if (tuNgay) {
      params.set("tuNgay", tuNgay);
    }

    if (denNgay) {
      params.set("denNgay", denNgay);
    }

    return params;
  }, [
    keyword,
    chiHoiId,
    trangThai,
    tuNgay,
    denNgay,
  ]);

  const loadData = useCallback(
    async (manualRefresh = false) => {
      const requestId = ++requestIdRef.current;

      try {
        setError("");

        if (manualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const params = buildSearchParams();
        const queryString = params.toString();

        const response = await fetch(
          `/api/thong-ke${
            queryString ? `?${queryString}` : ""
          }`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const result =
          await parseJsonResponse(response);

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message ||
              "Không thể tải dữ liệu thống kê",
          );
        }

        if (requestId !== requestIdRef.current) {
          return;
        }

        const data = result.data ?? {};

        setReport({
          tongQuan: {
            ...(data.thongKe ?? {}),
            ...(data.tongQuan ?? {}),
          },

          trangThaiHoatDong: Array.isArray(
            data.trangThaiHoatDong,
          )
            ? data.trangThaiHoatDong
            : [],

          theoThang: Array.isArray(data.theoThang)
            ? data.theoThang
            : [],

          thongKeChiHoi: Array.isArray(
            data.thongKeChiHoi,
          )
            ? data.thongKeChiHoi
            : [],

          chiTietHoatDong: Array.isArray(
            data.chiTietHoatDong,
          )
            ? data.chiTietHoatDong
            : [],

          danhSachHoatDong: Array.isArray(
            data.danhSachHoatDong,
          )
            ? data.danhSachHoatDong
            : [],

          danhSachHoiVien: Array.isArray(
            data.danhSachHoiVien,
          )
            ? data.danhSachHoiVien
            : [],

          danhSachChiHoi: Array.isArray(
            data.danhSachChiHoi,
          )
            ? data.danhSachChiHoi
            : [],
        });
      } catch (loadError) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        console.error(
          "Lỗi tải dữ liệu thống kê:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải dữ liệu thống kê",
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [buildSearchParams],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData();
    }, 400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep pagination synchronized with filters and the available results.
    setCurrentPage(1);
  }, [
    keyword,
    chiHoiId,
    trangThai,
    tuNgay,
    denNgay,
  ]);

  const activities = useMemo(() => {
    if (report.chiTietHoatDong.length > 0) {
      return report.chiTietHoatDong;
    }

    return report.danhSachHoatDong;
  }, [
    report.chiTietHoatDong,
    report.danhSachHoatDong,
  ]);

  const summary = useMemo(() => {
    const calculated = activities.reduce(
      (result, item) => {
        const statistic = getActivityStatistic(item);

        result.tongDangKy += statistic.tongDangKy;
        result.tongThamGia += statistic.daThamGia;
        result.tongVangMat += statistic.vangMat;
        result.tongDaHuy += statistic.daHuy;

        return result;
      },
      {
        tongDangKy: 0,
        tongThamGia: 0,
        tongVangMat: 0,
        tongDaHuy: 0,
      },
    );

    const tongChiHoi =
      report.tongQuan.tongChiHoi ??
      report.danhSachChiHoi.length;

    const tongHoiVien =
      report.tongQuan.tongHoiVien ??
      report.danhSachHoiVien.length;

    const hoiVienDangHoatDong =
      report.tongQuan.hoiVienDangHoatDong ??
      report.danhSachHoiVien.filter(
        (item) => item.trangThai === "DANG_HOAT_DONG",
      ).length;

    const tongHoatDong =
      report.tongQuan.tongHoatDong ??
      activities.length;

    const tongDangKy =
      report.tongQuan.tongDangKy ??
      calculated.tongDangKy;

    const tongThamGia =
      report.tongQuan.tongThamGia ??
      calculated.tongThamGia;

    const tongVangMat =
      report.tongQuan.tongVangMat ??
      calculated.tongVangMat;

    const tongDaHuy =
      report.tongQuan.tongDaHuy ??
      calculated.tongDaHuy;

    const tyLeThamGia =
      report.tongQuan.tyLeThamGia ??
      (tongDangKy > 0
        ? Math.round((tongThamGia / tongDangKy) * 100)
        : 0);

    return {
      tongChiHoi,
      tongHoiVien,
      hoiVienDangHoatDong,
      tongHoatDong,
      tongDangKy,
      tongThamGia,
      tongVangMat,
      tongDaHuy,
      tyLeThamGia,
    };
  }, [activities, report]);

  const monthlyData = useMemo<ChartItem[]>(() => {
    return report.theoThang.map((item, index) => ({
      label:
        item.tenThang ||
        item.label ||
        item.thang ||
        `Tháng ${index + 1}`,

      soHoatDong: toNumber(
        item.soHoatDong ?? item.tongHoatDong,
      ),

      soDangKy: toNumber(
        item.soDangKy ?? item.tongDangKy,
      ),

      soThamGia: toNumber(
        item.soThamGia ?? item.tongThamGia,
      ),
    }));
  }, [report.theoThang]);

  const statusData =
    useMemo<StatusDisplayItem[]>(() => {
      let rawItems: TrangThaiItem[] =
        report.trangThaiHoatDong;

      if (rawItems.length === 0) {
        const statusMap = new Map<string, number>();

        activities.forEach((item) => {
          const status =
            item.trangThai || "KHONG_XAC_DINH";

          statusMap.set(
            status,
            (statusMap.get(status) ?? 0) + 1,
          );
        });

        rawItems = Array.from(
          statusMap.entries(),
        ).map(([status, value]) => ({
          trangThai: status,
          soLuong: value,
        }));
      }

      return rawItems
        .map((item, index) => {
          const status =
            item.trangThai ||
            item._id ||
            `KHONG_XAC_DINH_${index}`;

          const colorConfig =
            STATUS_COLORS[status] ??
            STATUS_COLORS.KHONG_XAC_DINH;

          return {
            status,
            label:
              item.tenTrangThai ||
              item.label ||
              getStatusLabel(status),
            value: toNumber(
              item.soLuong ??
                item.tong ??
                item.value,
            ),
            color: colorConfig.color,
            lightColor: colorConfig.lightColor,
          };
        })
        .filter((item) => item.value > 0);
    }, [activities, report.trangThaiHoatDong]);

  const statusTotal = useMemo(() => {
    return statusData.reduce(
      (total, item) => total + item.value,
      0,
    );
  }, [statusData]);

  const totalPages = Math.max(
    1,
    Math.ceil(activities.length / ITEMS_PER_PAGE),
  );

  const currentActivities = useMemo(() => {
    const start =
      (currentPage - 1) * ITEMS_PER_PAGE;

    return activities.slice(
      start,
      start + ITEMS_PER_PAGE,
    );
  }, [activities, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep pagination synchronized with filters and the available results.
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const hasFilters =
    keyword.trim() !== "" ||
    chiHoiId !== "" ||
    trangThai !== "" ||
    tuNgay !== "" ||
    denNgay !== "";

  const clearFilters = () => {
    setKeyword("");
    setChiHoiId("");
    setTrangThai("");
    setTuNgay("");
    setDenNgay("");
    setError("");
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      setError("");

      const params = buildSearchParams();
      const queryString = params.toString();

      const response = await fetch(
        `/api/thong-ke/xuat-excel${
          queryString ? `?${queryString}` : ""
        }`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const contentType =
          response.headers.get("content-type") ?? "";

        let message = "Không thể xuất báo cáo Excel";

        if (contentType.includes("application/json")) {
          const result =
            (await response.json()) as ApiResponse;

          message = result.message ?? message;
        } else {
          const text = await response.text();

          if (text) {
            message = text;
          }
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error(
          "File Excel không có dữ liệu",
        );
      }

      const objectUrl =
        window.URL.createObjectURL(blob);

      const disposition =
        response.headers.get(
          "content-disposition",
        ) ?? "";

      const filenameMatch = disposition.match(
        /filename="?([^";]+)"?/i,
      );

      const filename =
        filenameMatch?.[1] ??
        `bao-cao-thong-ke-${
          new Date().toISOString().split("T")[0]
        }.xlsx`;

      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Không thể xuất báo cáo Excel",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto w-full max-w-[1650px] px-4 py-7 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#123d68]">
              Quản trị hệ thống
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Thống kê và báo cáo
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Tổng hợp Hội viên, hoạt động và tình hình
              tham gia trong hệ thống.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
            ) : (
              <Download size={18} />
            )}

            {exporting
              ? "Đang xuất..."
              : "Xuất báo cáo Excel"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-start gap-3">
              <XCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-lg p-1 transition hover:bg-red-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* FILTER */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Filter size={17} className="text-blue-700" />
            Bộ lọc báo cáo
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
            <div className="relative xl:col-span-4">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={keyword}
                onChange={(event) =>
                  setKeyword(event.target.value)
                }
                placeholder="Tìm mã, tên, đơn vị hoặc địa điểm"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={chiHoiId}
              onChange={(event) =>
                setChiHoiId(event.target.value)
              }
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 xl:col-span-2"
            >
              <option value="">Tất cả Chi hội</option>

              {report.danhSachChiHoi.map(
                (item, index) => (
                  <option
                    key={`chi-hoi-${item._id}-${index}`}
                    value={item._id}
                  >
                    {item.maChiHoi
                      ? `${item.maChiHoi} - `
                      : ""}
                    {item.tenChiHoi}
                  </option>
                ),
              )}
            </select>

            <select
              value={trangThai}
              onChange={(event) =>
                setTrangThai(event.target.value)
              }
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 xl:col-span-2"
            >
              {STATUS_OPTIONS.map((item, index) => (
                <option
                  key={`status-option-${item.value}-${index}`}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={tuNgay}
              onChange={(event) =>
                setTuNgay(event.target.value)
              }
              title="Từ ngày"
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 xl:col-span-2"
            />

            <input
              type="date"
              value={denNgay}
              min={tuNgay || undefined}
              onChange={(event) =>
                setDenNgay(event.target.value)
              }
              title="Đến ngày"
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 xl:col-span-2"
            />
          </div>

          <div className="mt-3 flex justify-end gap-2">
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <X size={16} />
                Xóa bộ lọc
              </button>
            )}

            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />

              Làm mới
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[480px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="text-center">
              <LoaderCircle
                size={40}
                className="mx-auto animate-spin text-blue-700"
              />

              <p className="mt-4 text-sm font-semibold text-slate-600">
                Đang tổng hợp dữ liệu...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* STAT CARDS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Tổng Chi hội"
                value={formatNumber(
                  summary.tongChiHoi,
                )}
                description="Số Chi hội trong hệ thống"
                icon={<Building2 size={23} />}
                iconClassName="bg-blue-50 text-blue-700"
              />

              <StatCard
                title="Tổng Hội viên"
                value={formatNumber(
                  summary.tongHoiVien,
                )}
                description={`${formatNumber(
                  summary.hoiVienDangHoatDong,
                )} Hội viên đang hoạt động`}
                icon={<Users size={23} />}
                iconClassName="bg-emerald-50 text-emerald-700"
              />

              <StatCard
                title="Tổng hoạt động"
                value={formatNumber(
                  summary.tongHoatDong,
                )}
                description="Hoạt động theo bộ lọc hiện tại"
                icon={<Activity size={23} />}
                iconClassName="bg-amber-50 text-amber-700"
              />

              <StatCard
                title="Tỷ lệ tham gia"
                value={formatPercent(
                  summary.tyLeThamGia,
                )}
                description={`${formatNumber(
                  summary.tongThamGia,
                )}/${formatNumber(
                  summary.tongDangKy,
                )} lượt đăng ký`}
                icon={<TrendingUp size={23} />}
                iconClassName="bg-violet-50 text-violet-700"
                trend="Theo dữ liệu điểm danh"
              />
            </div>

            {/* SECOND STATS */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Lượt đăng ký"
                value={formatNumber(
                  summary.tongDangKy,
                )}
                description="Tổng số lượt đăng ký"
                icon={<CalendarDays size={22} />}
                iconClassName="bg-sky-50 text-sky-700"
              />

              <StatCard
                title="Đã tham gia"
                value={formatNumber(
                  summary.tongThamGia,
                )}
                description="Đã được xác nhận điểm danh"
                icon={<UserCheck size={22} />}
                iconClassName="bg-emerald-50 text-emerald-700"
              />

              <StatCard
                title="Vắng mặt"
                value={formatNumber(
                  summary.tongVangMat,
                )}
                description="Đăng ký nhưng không tham dự"
                icon={<XCircle size={22} />}
                iconClassName="bg-orange-50 text-orange-700"
              />

              <StatCard
                title="Đã hủy"
                value={formatNumber(
                  summary.tongDaHuy,
                )}
                description="Số lượt đăng ký đã hủy"
                icon={<X size={22} />}
                iconClassName="bg-red-50 text-red-700"
              />
            </div>

            {/* CHART AREA */}
            <div className="mt-6 grid grid-cols-1 gap-6 2xl:grid-cols-[1.55fr_1fr]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <BarChart3 size={22} />
                    </div>

                    <div>
                      <h2 className="font-bold text-slate-900">
                        Xu hướng hoạt động
                      </h2>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Hoạt động và lượt tham gia theo tháng
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <ActivityChart data={monthlyData} />
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                      <Activity size={22} />
                    </div>

                    <div>
                      <h2 className="font-bold text-slate-900">
                        Trạng thái hoạt động
                      </h2>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Tỷ trọng theo từng trạng thái
                      </p>
                    </div>
                  </div>
                </div>

                <StatusDonutChart
                  items={statusData}
                  total={statusTotal}
                />
              </section>
            </div>

            {/* COMMUNITY TABLE */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Building2 size={22} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Hiệu quả theo Chi hội
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      So sánh Hội viên, hoạt động và tỷ lệ
                      tham gia
                    </p>
                  </div>
                </div>
              </div>

              {report.thongKeChiHoi.length === 0 ? (
                <EmptyState
                  title="Chưa có dữ liệu Chi hội"
                  description="Không tìm thấy dữ liệu phù hợp với bộ lọc."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
                          STT
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
                          Chi hội
                        </th>

                        <th className="px-5 py-3 text-center text-xs font-bold uppercase text-slate-500">
                          Hội viên
                        </th>

                        <th className="px-5 py-3 text-center text-xs font-bold uppercase text-slate-500">
                          Hoạt động
                        </th>

                        <th className="px-5 py-3 text-center text-xs font-bold uppercase text-slate-500">
                          Đăng ký
                        </th>

                        <th className="px-5 py-3 text-center text-xs font-bold uppercase text-slate-500">
                          Tham gia
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
                          Hiệu quả
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {report.thongKeChiHoi.map(
                        (item, index) => {
                          const dangKy = toNumber(
                            item.soDangKy ??
                              item.tongDangKy,
                          );

                          const thamGia = toNumber(
                            item.soThamGia ??
                              item.tongThamGia,
                          );

                          const tyLe =
                            item.tyLeThamGia !==
                            undefined
                              ? toNumber(
                                  item.tyLeThamGia,
                                )
                              : dangKy > 0
                                ? Math.round(
                                    (thamGia /
                                      dangKy) *
                                      100,
                                  )
                                : 0;

                          return (
                            <tr
                              key={`community-${
                                item._id ||
                                item.chiHoiId ||
                                item.maChiHoi ||
                                "unknown"
                              }-${index}`}
                              className="border-t border-slate-100 transition hover:bg-slate-50"
                            >
                              <td className="px-5 py-4 text-sm text-slate-500">
                                {index + 1}
                              </td>

                              <td className="px-5 py-4">
                                <p className="font-semibold text-slate-900">
                                  {item.tenChiHoi ||
                                    "Chưa xác định"}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {item.maChiHoi || "—"}
                                </p>
                              </td>

                              <td className="px-5 py-4 text-center text-sm font-bold text-slate-800">
                                {formatNumber(
                                  item.soHoiVien ??
                                    item.tongHoiVien,
                                )}
                              </td>

                              <td className="px-5 py-4 text-center text-sm font-bold text-slate-800">
                                {formatNumber(
                                  item.soHoatDong ??
                                    item.tongHoatDong,
                                )}
                              </td>

                              <td className="px-5 py-4 text-center text-sm font-bold text-blue-700">
                                {formatNumber(dangKy)}
                              </td>

                              <td className="px-5 py-4 text-center text-sm font-bold text-emerald-700">
                                {formatNumber(thamGia)}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-2.5 w-28 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          Math.max(
                                            0,
                                            tyLe,
                                          ),
                                        )}%`,
                                      }}
                                    />
                                  </div>

                                  <span className="min-w-11 text-sm font-bold text-slate-700">
                                    {formatPercent(
                                      tyLe,
                                    )}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ACTIVITY TABLE */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <CalendarDays size={22} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Chi tiết hoạt động
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Đăng ký và kết quả điểm danh từng hoạt
                      động
                    </p>
                  </div>
                </div>

                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
                  {formatNumber(activities.length)} hoạt động
                </span>
              </div>

              {activities.length === 0 ? (
                <EmptyState
                  title="Không có hoạt động"
                  description="Không tìm thấy hoạt động phù hợp với bộ lọc hiện tại."
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1320px]">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            STT
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Hoạt động
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Chi hội
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Thời gian
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Địa điểm
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Trạng thái
                          </th>

                          <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-500">
                            Đăng ký
                          </th>

                          <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-500">
                            Tham gia
                          </th>

                          <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-500">
                            Vắng
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                            Tỷ lệ
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {currentActivities.map(
                          (item, index) => {
                            const chiHoi =
                              getChiHoi(item);

                            const statistic =
                              getActivityStatistic(item);

                            return (
                              <tr
                                key={`activity-${item._id}-${index}`}
                                className="border-t border-slate-100 transition hover:bg-blue-50/30"
                              >
                                <td className="px-4 py-4 text-sm text-slate-500">
                                  {(currentPage - 1) *
                                    ITEMS_PER_PAGE +
                                    index +
                                    1}
                                </td>

                                <td className="px-4 py-4">
                                  <div className="flex items-start gap-3">
                                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                                      {item.maHoatDong ||
                                        "—"}
                                    </span>

                                    <div>
                                      <p className="max-w-64 font-semibold text-slate-900">
                                        {item.tenHoatDong ||
                                          "Chưa đặt tên"}
                                      </p>

                                      <p className="mt-1 text-xs text-slate-500">
                                        {getPhamViLabel(
                                          item.phamVi,
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-4">
                                  <p className="text-sm font-medium text-slate-800">
                                    {chiHoi?.tenChiHoi ||
                                      "Chưa xác định"}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {chiHoi?.maChiHoi ||
                                      "—"}
                                  </p>
                                </td>

                                <td className="px-4 py-4 text-xs leading-5 text-slate-600">
                                  <p>
                                    Bắt đầu:{" "}
                                    {formatDateTime(
                                      item.thoiGianBatDau,
                                    )}
                                  </p>

                                  <p>
                                    Kết thúc:{" "}
                                    {formatDateTime(
                                      item.thoiGianKetThuc,
                                    )}
                                  </p>
                                </td>

                                <td className="px-4 py-4">
                                  <div className="flex max-w-44 items-start gap-2 text-sm text-slate-700">
                                    <MapPin
                                      size={16}
                                      className="mt-0.5 shrink-0 text-slate-400"
                                    />

                                    <span>
                                      {item.diaDiem || "—"}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-4 py-4">
                                  <span
                                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(
                                      item.trangThai,
                                    )}`}
                                  >
                                    {getStatusLabel(
                                      item.trangThai,
                                    )}
                                  </span>
                                </td>

                                <td className="px-4 py-4 text-center font-bold text-blue-700">
                                  {formatNumber(
                                    statistic.tongDangKy,
                                  )}
                                </td>

                                <td className="px-4 py-4 text-center font-bold text-emerald-700">
                                  {formatNumber(
                                    statistic.daThamGia,
                                  )}
                                </td>

                                <td className="px-4 py-4 text-center font-bold text-orange-700">
                                  {formatNumber(
                                    statistic.vangMat,
                                  )}
                                </td>

                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-2.5 w-24 overflow-hidden rounded-full bg-slate-100">
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                                        style={{
                                          width: `${Math.min(
                                            100,
                                            statistic.tyLeThamGia,
                                          )}%`,
                                        }}
                                      />
                                    </div>

                                    <span className="min-w-11 text-sm font-bold text-slate-700">
                                      {formatPercent(
                                        statistic.tyLeThamGia,
                                      )}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-slate-500">
                      Hiển thị{" "}
                      {(currentPage - 1) *
                        ITEMS_PER_PAGE +
                        1}
                      –
                      {Math.min(
                        currentPage * ITEMS_PER_PAGE,
                        activities.length,
                      )}{" "}
                      trên tổng số {activities.length} hoạt
                      động
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((page) =>
                            Math.max(1, page - 1),
                          )
                        }
                        disabled={currentPage === 1}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <span className="min-w-24 text-center text-sm font-semibold text-slate-700">
                        Trang {currentPage}/{totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((page) =>
                            Math.min(
                              totalPages,
                              page + 1,
                            ),
                          )
                        }
                        disabled={
                          currentPage === totalPages
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0"
              />

              <p>
                Báo cáo Excel sẽ sử dụng đúng các bộ lọc Chi
                hội, trạng thái, từ khóa và khoảng thời gian
                đang chọn.
              </p>
            </div>
          </>
        )}b
      </div>
    </div>
  );
}
