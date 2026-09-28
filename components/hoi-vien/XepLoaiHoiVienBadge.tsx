type XepLoai =
  | "XUAT_SAC"
  | "TOT"
  | "KHA"
  | "TRUNG_BINH"
  | "YEU";

type XepLoaiHoiVienBadgeProps = {
  xepLoai?: XepLoai | null;
};

const xepLoaiConfig: Record<
  XepLoai,
  {
    label: string;
    className: string;
  }
> = {
  XUAT_SAC: {
    label: "Xuất sắc",
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
  },

  TOT: {
    label: "Tốt",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },

  KHA: {
    label: "Khá",
    className:
      "border-blue-200 bg-blue-50 text-blue-700",
  },

  TRUNG_BINH: {
    label: "Trung bình",
    className:
      "border-slate-300 bg-slate-100 text-slate-700",
  },

  YEU: {
    label: "Yếu",
    className:
      "border-red-200 bg-red-50 text-red-700",
  },
};

export default function XepLoaiHoiVienBadge({
  xepLoai,
}: XepLoaiHoiVienBadgeProps) {
  if (!xepLoai) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
        Chưa đánh giá
      </span>
    );
  }

  const config = xepLoaiConfig[xepLoai];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}