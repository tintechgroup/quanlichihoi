"use client";

import { Award } from "lucide-react";
import { useState } from "react";

import DanhGiaHoiVienModal from "@/components/hoi-vien/DanhGiaHoiVienModal";
import XepLoaiHoiVienBadge from "@/components/hoi-vien/XepLoaiHoiVienBadge";

type XepLoai =
  | "XUAT_SAC"
  | "TOT"
  | "KHA"
  | "TRUNG_BINH"
  | "YEU";

type DanhGiaHoiVienActionProps = {
  hoiVienId: string;
  maHoiVien: string;
  hoTen: string;
  xepLoai?: XepLoai | null;
  onSuccess: () => void | Promise<void>;
  compact?: boolean;
};

export default function DanhGiaHoiVienAction({
  hoiVienId,
  maHoiVien,
  hoTen,
  xepLoai,
  onSuccess,
  compact = false,
}: DanhGiaHoiVienActionProps) {
  const [showModal, setShowModal] = useState(false);

  async function handleSuccess() {
    await onSuccess();
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          title="Đánh giá Hội viên"
          aria-label={`Đánh giá Hội viên ${hoTen}`}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-amber-50 hover:text-amber-700"
        >
          <Award size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 sm:w-auto"
        >
          <span className="inline-flex items-center gap-2">
            <Award size={17} className="text-amber-700" />
            Đánh giá
          </span>

          <XepLoaiHoiVienBadge xepLoai={xepLoai} />
        </button>
      )}

      {showModal && (
        <DanhGiaHoiVienModal
          hoiVienId={hoiVienId}
          maHoiVien={maHoiVien}
          hoTen={hoTen}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}