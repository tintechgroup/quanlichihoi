"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Users,
} from "lucide-react";

interface TongQuan {
  tongChiHoi: number;
  tongHoiVien: number;
  hoiVienDangHoatDong: number;
  tongHoatDong: number;
  tongLuotDangKy: number;
  choDiemDanh: number;
  daThamGia: number;
  tyLeThamGia: number;
}

const quickLinks = [
  {
    title: "Quản lý Chi hội",
    description: "Xem danh sách và thông tin các Chi hội.",
    href: "/dashboard/chi-hoi",
    icon: Building2,
  },
  {
    title: "Quản lý Hội viên",
    description: "Tra cứu và cập nhật hồ sơ Hội viên.",
    href: "/dashboard/hoi-vien",
    icon: Users,
  },
  {
    title: "Quản lý hoạt động",
    description: "Theo dõi các hoạt động của Liên Chi hội.",
    href: "/dashboard/hoat-dong",
    icon: Activity,
  },
  {
    title: "Điểm danh QR",
    description: "Mở chức năng quản lý điểm danh hoạt động.",
    href: "/dashboard/diem-danh-qr",
    icon: ClipboardCheck,
  },
];

function formatNumber(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("vi-VN").format(value);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<TongQuan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const response = await fetch("/api/thong-ke?loai=TONG_QUAN", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Không thể tải số liệu tổng quan");
        }

        if (!cancelled) {
          setStats(result.data?.tongQuan ?? null);
        }
      } catch (error) {
        console.error("Không thể tải số liệu tổng quan:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      label: "Chi hội",
      value: stats?.tongChiHoi,
      icon: Building2,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Hội viên",
      value: stats?.tongHoiVien,
      icon: Users,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Hội viên đang hoạt động",
      value: stats?.hoiVienDangHoatDong,
      icon: ClipboardCheck,
      color: "bg-violet-50 text-violet-700",
    },
    {
      label: "Hoạt động",
      value: stats?.tongHoatDong,
      icon: CalendarDays,
      color: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <section className="w-full">
      <div className="mb-7">
        <p className="text-sm font-semibold tracking-[0.14em] text-[#12345B]">
          TRANG ĐIỀU HÀNH
        </p>

        <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-900">
          Tổng quan hệ thống
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
          Theo dõi tình hình hoạt động của Liên Chi hội Khoa Sư phạm.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-600">
                  {card.label}
                </p>

                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}>
                  <Icon size={21} />
                </div>
              </div>

              <p className="mt-4 text-3xl font-bold text-slate-900">
                {loading ? "…" : formatNumber(card.value)}
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tình hình hoạt động
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Số liệu điểm danh và đăng ký hiện có trong hệ thống.
              </p>
            </div>

            <Link
              href="/dashboard/hoat-dong"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#123b68] hover:underline"
            >
              Xem hoạt động
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Lượt đăng ký</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {loading ? "…" : formatNumber(stats?.tongLuotDangKy)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Đã tham gia</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {loading ? "…" : formatNumber(stats?.daThamGia)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Chờ điểm danh</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {loading ? "…" : formatNumber(stats?.choDiemDanh)}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                Tỷ lệ tham gia
              </span>
              <span className="font-bold text-[#123b68]">
                {loading
                  ? "…"
                  : `${formatNumber(stats?.tyLeThamGia)}%`}
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#123b68] transition-all"
                style={{
                  width: `${Math.min(
                    Math.max(stats?.tyLeThamGia ?? 0, 0),
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Truy cập nhanh
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Chọn một chức năng để tiếp tục quản lý.
          </p>

          <div className="mt-4 space-y-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#123b68]">
                    <Icon size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <ArrowUpRight
                    size={17}
                    className="shrink-0 text-slate-400 transition group-hover:text-[#123b68]"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}