type Props = {
  xepLoai?: string | null;
};

const ratingStyles: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  XUAT_SAC: {
    label: "Xuất sắc",
    className:
      "border-green-200 bg-green-50 text-green-700",
  },

  TOT: {
    label: "Tốt",
    className:
      "border-blue-200 bg-blue-50 text-blue-700",
  },

  KHA: {
    label: "Khá",
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
  },

  TRUNG_BINH: {
    label: "Trung bình",
    className:
      "border-orange-200 bg-orange-50 text-orange-700",
  },

  YEU: {
    label: "Yếu",
    className:
      "border-red-200 bg-red-50 text-red-700",
  },
};

export default function XepLoaiChiHoiBadge({
  xepLoai,
}: Props) {
  if (!xepLoai || !ratingStyles[xepLoai]) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
        Chưa đánh giá
      </span>
    );
  }

  const rating = ratingStyles[xepLoai];

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${rating.className}`}
    >
      {rating.label}
    </span>
  );
}