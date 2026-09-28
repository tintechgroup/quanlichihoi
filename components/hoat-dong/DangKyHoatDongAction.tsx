"use client";

import {
  CheckCircle2,
  Loader2,
  UserMinus,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type TrangThaiHoatDong =
  | "CHO_DUYET"
  | "DA_DUYET"
  | "SAP_DIEN_RA"
  | "DANG_DIEN_RA"
  | "DA_KET_THUC"
  | "DA_HUY";

type TrangThaiDangKy =
  | "DA_DANG_KY"
  | "DA_THAM_GIA"
  | "VANG_MAT"
  | "DA_HUY";

type DangKy = {
  _id: string;
  trangThai: TrangThaiDangKy;
  thoiGianDangKy?: string;
  thoiGianHuy?: string | null;
  lyDoHuy?: string;
};

type HoatDong = {
  _id: string;
  maHoatDong: string;
  tenHoatDong: string;
  trangThai: TrangThaiHoatDong;
  thoiGianBatDau: string;
  thoiGianKetThuc: string;
  hanDangKy?: string | null;
  soLuongToiDa?: number | null;
};

type Props = {
  hoatDong: HoatDong;
  onThayDoi?: () => void;
};

type ThongBao = {
  loai: "success" | "error";
  noiDung: string;
};

function docThongBao(data: unknown, macDinh: string) {
  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }

  return macDinh;
}

function layDangKy(data: unknown): DangKy | null {
  if (
    typeof data === "object" &&
    data !== null &&
    "registration" in data &&
    typeof data.registration === "object" &&
    data.registration !== null
  ) {
    return data.registration as DangKy;
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    Array.isArray(data.data) &&
    data.data.length > 0
  ) {
    return data.data[0] as DangKy;
  }

  return null;
}

function hienThiNgayGio(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function DangKyHoatDongAction({
  hoatDong,
  onThayDoi,
}: Props) {
  const [dangKy, setDangKy] = useState<DangKy | null>(null);

  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState(false);

  const [moXacNhan, setMoXacNhan] = useState(false);
  const [hanhDong, setHanhDong] = useState<"DANG_KY" | "HUY">(
    "DANG_KY"
  );

  const [thongBao, setThongBao] = useState<ThongBao | null>(null);

  const hienThongBao = useCallback(
    (loai: ThongBao["loai"], noiDung: string) => {
      setThongBao({
        loai,
        noiDung,
      });

      window.setTimeout(() => {
        setThongBao(null);
      }, 4000);
    },
    []
  );

  const taiTrangThaiDangKy = useCallback(async () => {
    try {
      setDangTai(true);

      const response = await fetch(
        `/api/hoat-dong/${hoatDong._id}/dang-ky`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          docThongBao(data, "Không thể kiểm tra trạng thái đăng ký")
        );
      }

      setDangKy(layDangKy(data));
    } catch (error) {
      setDangKy(null);

      hienThongBao(
        "error",
        error instanceof Error
          ? error.message
          : "Không thể kiểm tra trạng thái đăng ký"
      );
    } finally {
      setDangTai(false);
    }
  }, [hienThongBao, hoatDong._id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the request and its loading state together when effect dependencies change.
    void taiTrangThaiDangKy();
  }, [taiTrangThaiDangKy]);

  const daDangKy = useMemo(() => {
    return Boolean(
      dangKy &&
        ["DA_DANG_KY", "DA_THAM_GIA", "VANG_MAT"].includes(
          dangKy.trangThai
        )
    );
  }, [dangKy]);

  const quyenDangKy = useMemo(() => {
    const hienTai = new Date();

    if (
      !["DA_DUYET", "SAP_DIEN_RA"].includes(
        hoatDong.trangThai
      )
    ) {
      if (hoatDong.trangThai === "CHO_DUYET") {
        return {
          duocPhep: false,
          lyDo: "Hoạt động đang chờ phê duyệt",
        };
      }

      if (hoatDong.trangThai === "DANG_DIEN_RA") {
        return {
          duocPhep: false,
          lyDo: "Hoạt động đã bắt đầu",
        };
      }

      if (hoatDong.trangThai === "DA_KET_THUC") {
        return {
          duocPhep: false,
          lyDo: "Hoạt động đã kết thúc",
        };
      }

      if (hoatDong.trangThai === "DA_HUY") {
        return {
          duocPhep: false,
          lyDo: "Hoạt động đã bị hủy",
        };
      }

      return {
        duocPhep: false,
        lyDo: "Hoạt động chưa mở đăng ký",
      };
    }

    if (hoatDong.hanDangKy) {
      const hanDangKy = new Date(hoatDong.hanDangKy);

      if (hienTai.getTime() > hanDangKy.getTime()) {
        return {
          duocPhep: false,
          lyDo: `Đã hết hạn đăng ký lúc ${hienThiNgayGio(
            hoatDong.hanDangKy
          )}`,
        };
      }
    }

    const batDau = new Date(hoatDong.thoiGianBatDau);

    if (
      !Number.isNaN(batDau.getTime()) &&
      hienTai.getTime() >= batDau.getTime()
    ) {
      return {
        duocPhep: false,
        lyDo: "Hoạt động đã bắt đầu",
      };
    }

    return {
      duocPhep: true,
      lyDo: "",
    };
  }, [
    hoatDong.hanDangKy,
    hoatDong.thoiGianBatDau,
    hoatDong.trangThai,
  ]);

  const quyenHuy = useMemo(() => {
    if (!daDangKy) {
      return {
        duocPhep: false,
        lyDo: "",
      };
    }

    if (
      dangKy &&
      ["DA_THAM_GIA", "VANG_MAT"].includes(dangKy.trangThai)
    ) {
      return {
        duocPhep: false,
        lyDo: "Hoạt động đã được điểm danh",
      };
    }

    if (
      ["DANG_DIEN_RA", "DA_KET_THUC", "DA_HUY"].includes(
        hoatDong.trangThai
      )
    ) {
      return {
        duocPhep: false,
        lyDo: "Không thể hủy ở trạng thái hiện tại",
      };
    }

    const batDau = new Date(hoatDong.thoiGianBatDau);

    if (
      !Number.isNaN(batDau.getTime()) &&
      new Date().getTime() >= batDau.getTime()
    ) {
      return {
        duocPhep: false,
        lyDo: "Hoạt động đã bắt đầu",
      };
    }

    return {
      duocPhep: true,
      lyDo: "",
    };
  }, [
    daDangKy,
    dangKy,
    hoatDong.thoiGianBatDau,
    hoatDong.trangThai,
  ]);

  function moXacNhanDangKy() {
    setHanhDong("DANG_KY");
    setMoXacNhan(true);
  }

  function moXacNhanHuy() {
    setHanhDong("HUY");
    setMoXacNhan(true);
  }

  async function thucHienDangKy() {
    try {
      setDangXuLy(true);

      const response = await fetch(
        `/api/hoat-dong/${hoatDong._id}/dang-ky`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          docThongBao(data, "Không thể đăng ký hoạt động")
        );
      }

      setMoXacNhan(false);

      await taiTrangThaiDangKy();
      onThayDoi?.();

      hienThongBao(
        "success",
        docThongBao(data, "Đăng ký hoạt động thành công")
      );
    } catch (error) {
      hienThongBao(
        "error",
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi đăng ký hoạt động"
      );
    } finally {
      setDangXuLy(false);
    }
  }

  async function thucHienHuy() {
    try {
      setDangXuLy(true);

      const response = await fetch(
        `/api/hoat-dong/${hoatDong._id}/dang-ky`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lyDoHuy: "Hội viên tự hủy đăng ký",
          }),
        }
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          docThongBao(data, "Không thể hủy đăng ký")
        );
      }

      setMoXacNhan(false);

      await taiTrangThaiDangKy();
      onThayDoi?.();

      hienThongBao(
        "success",
        docThongBao(data, "Hủy đăng ký thành công")
      );
    } catch (error) {
      hienThongBao(
        "error",
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi hủy đăng ký"
      );
    } finally {
      setDangXuLy(false);
    }
  }

  if (dangTai) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-10 min-w-[130px] items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-500"
      >
        <Loader2 size={16} className="animate-spin" />
        Đang kiểm tra
      </button>
    );
  }

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        {daDangKy ? (
          <>
            <div className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={17} />

              {dangKy?.trangThai === "DA_THAM_GIA"
                ? "Đã tham gia"
                : dangKy?.trangThai === "VANG_MAT"
                ? "Vắng mặt"
                : "Đã đăng ký"}
            </div>

            {quyenHuy.duocPhep && (
              <button
                type="button"
                onClick={moXacNhanHuy}
                className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <UserMinus size={16} />
                Hủy đăng ký
              </button>
            )}

            {!quyenHuy.duocPhep && quyenHuy.lyDo && (
              <p className="max-w-[220px] text-right text-xs text-slate-500">
                {quyenHuy.lyDo}
              </p>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!quyenDangKy.duocPhep}
              onClick={moXacNhanDangKy}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-blue-950 px-4 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              <UserPlus size={17} />
              Đăng ký tham gia
            </button>

            {!quyenDangKy.duocPhep && (
              <p className="max-w-[220px] text-right text-xs text-red-500">
                {quyenDangKy.lyDo}
              </p>
            )}
          </>
        )}
      </div>

      {thongBao && (
        <div className="fixed right-5 top-5 z-[110] w-[calc(100%-40px)] max-w-md">
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
              thongBao.loai === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {thongBao.loai === "success" ? (
              <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={20} className="mt-0.5 shrink-0" />
            )}

            <p className="flex-1 text-sm font-medium">
              {thongBao.noiDung}
            </p>

            <button
              type="button"
              onClick={() => setThongBao(null)}
              className="shrink-0"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      {moXacNhan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="p-6">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  hanhDong === "DANG_KY"
                    ? "bg-blue-50 text-blue-900"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {hanhDong === "DANG_KY" ? (
                  <UserPlus size={23} />
                ) : (
                  <UserMinus size={23} />
                )}
              </div>

              <h2 className="mt-4 text-xl font-bold text-slate-950">
                {hanhDong === "DANG_KY"
                  ? "Xác nhận đăng ký"
                  : "Xác nhận hủy đăng ký"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {hanhDong === "DANG_KY"
                  ? `Bạn có muốn đăng ký tham gia hoạt động "${hoatDong.maHoatDong} - ${hoatDong.tenHoatDong}" không?`
                  : `Bạn có chắc chắn muốn hủy đăng ký hoạt động "${hoatDong.maHoatDong} - ${hoatDong.tenHoatDong}" không?`}
              </p>

              {hanhDong === "DANG_KY" && (
                <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold">Bắt đầu:</span>{" "}
                    {hienThiNgayGio(hoatDong.thoiGianBatDau)}
                  </p>

                  {hoatDong.hanDangKy && (
                    <p className="mt-1">
                      <span className="font-semibold">
                        Hạn đăng ký:
                      </span>{" "}
                      {hienThiNgayGio(hoatDong.hanDangKy)}
                    </p>
                  )}

                  <p className="mt-1">
                    <span className="font-semibold">
                      Số lượng:
                    </span>{" "}
                    {hoatDong.soLuongToiDa
                      ? `Tối đa ${hoatDong.soLuongToiDa} người`
                      : "Không giới hạn"}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                disabled={dangXuLy}
                onClick={() => setMoXacNhan(false)}
                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Đóng
              </button>

              <button
                type="button"
                disabled={dangXuLy}
                onClick={() =>
                  void (hanhDong === "DANG_KY"
                    ? thucHienDangKy()
                    : thucHienHuy())
                }
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60 ${
                  hanhDong === "DANG_KY"
                    ? "bg-blue-950 hover:bg-blue-900"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {dangXuLy && (
                  <Loader2 size={16} className="animate-spin" />
                )}

                {hanhDong === "DANG_KY"
                  ? "Đăng ký tham gia"
                  : "Hủy đăng ký"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}