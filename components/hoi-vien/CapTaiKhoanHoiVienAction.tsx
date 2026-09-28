"use client";

import {
  CircleCheck,
  UserPlus,
} from "lucide-react";
import { useState } from "react";

import CapTaiKhoanHoiVienModal from "@/components/hoi-vien/CapTaiKhoanHoiVienModal";

type CapTaiKhoanHoiVienActionProps = {
  hoiVienId: string;
  maHoiVien: string;
  hoTen: string;
  daCoTaiKhoan: boolean;
  onSuccess: () => void | Promise<void>;
  compact?: boolean;
};

export default function CapTaiKhoanHoiVienAction({
  hoiVienId,
  maHoiVien,
  hoTen,
  daCoTaiKhoan,
  onSuccess,
  compact = false,
}: CapTaiKhoanHoiVienActionProps) {
  const [showModal, setShowModal] = useState(false);

  async function handleSuccess() {
    await onSuccess();
  }

  if (daCoTaiKhoan) {
    if (compact) {
      return (
        <button
          type="button"
          disabled
          title="Hội viên đã được cấp tài khoản"
          aria-label={`${hoTen} đã được cấp tài khoản`}
          className="cursor-not-allowed rounded-lg p-2 text-emerald-600 opacity-70"
        >
          <CircleCheck size={18} />
        </button>
      );
    }

    return (
      <div className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 sm:w-auto">
        <CircleCheck size={17} />
        Đã cấp tài khoản
      </div>
    );
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          title="Cấp tài khoản Hội viên"
          aria-label={`Cấp tài khoản cho Hội viên ${hoTen}`}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
        >
          <UserPlus size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 sm:w-auto"
        >
          <UserPlus size={17} />
          Cấp tài khoản
        </button>
      )}

      {showModal && (
        <CapTaiKhoanHoiVienModal
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