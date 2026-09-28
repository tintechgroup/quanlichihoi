"use client";

import type { ReactNode } from "react";

import {
  CircleCheckBig,
  CircleX,
  RefreshCw,
  Save,
  Search,
  UserCheck,
  UserMinus,
  Users,
  UserX,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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

type ChiHoi = {
  _id: string;
  maChiHoi?: string;
  tenChiHoi?: string;
};

type HoiVien = {
  _id: string;
  maHoiVien?: string;
  hoTen?: string;
  gioiTinh?: string;
  lop?: string;
  email?: string;
  soDienThoai?: string;
  chiHoiId?: ChiHoi | null;
};

type DangKyHoatDong = {
  _id: string;
  hoiVienId?: HoiVien | null;
  trangThai: TrangThaiDangKy;
  thoiGianDangKy?: string;
  thoiGianHuy?: string;
  lyDoHuy?: string;
  ghiChu?: string;
};

type HoatDongModal = {
  _id: string;
  maHoatDong: string;
  tenHoatDong: string;
  trangThai: TrangThaiHoatDong;
};

type Props = {
  mo: boolean;
  hoatDong: HoatDongModal | null;
  onDong: () => void;
};

const TEN_TRANG_THAI: Record<
  TrangThaiDangKy,
  string
> = {
  DA_DANG_KY: "Đã đăng ký",
  DA_THAM_GIA: "Đã tham gia",
  VANG_MAT: "Vắng mặt",
  DA_HUY: "Đã hủy",
};

const MAU_TRANG_THAI: Record<
  TrangThaiDangKy,
  string
> = {
  DA_DANG_KY:
    "border-blue-200 bg-blue-50 text-blue-700",

  DA_THAM_GIA:
    "border-emerald-200 bg-emerald-50 text-emerald-700",

  VANG_MAT:
    "border-amber-200 bg-amber-50 text-amber-700",

  DA_HUY:
    "border-red-200 bg-red-50 text-red-700",
};

const CAC_TRANG_THAI_DIEM_DANH: TrangThaiDangKy[] =
  [
    "DA_DANG_KY",
    "DA_THAM_GIA",
    "VANG_MAT",
  ];

function dinhDangNgayGio(
  value?: string
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function boDauTiengViet(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

async function docPhanHoi(
  response: Response
) {
  try {
    const data = await response.json();

    return {
      data,
      message:
        data?.message ||
        "Đã xảy ra lỗi trong quá trình xử lý",
    };
  } catch {
    return {
      data: null,
      message:
        "Không thể đọc phản hồi từ hệ thống",
    };
  }
}

export default function QuanLyNguoiThamGiaModal({
  mo,
  hoatDong,
  onDong,
}: Props) {
  const [
    danhSach,
    setDanhSach,
  ] = useState<DangKyHoatDong[]>([]);

  const [
    thayDoiTrangThai,
    setThayDoiTrangThai,
  ] = useState<
    Record<string, TrangThaiDangKy>
  >({});

  const [tuKhoa, setTuKhoa] =
    useState("");

  const [dangTai, setDangTai] =
    useState(false);

  const [dangLuu, setDangLuu] =
    useState(false);

  const [thongBao, setThongBao] =
    useState("");

  const [
    loaiThongBao,
    setLoaiThongBao,
  ] = useState<
    "success" | "error" | ""
  >("");

  const hienThongBao = (
    message: string,
    type: "success" | "error"
  ) => {
    setThongBao(message);
    setLoaiThongBao(type);

    window.setTimeout(() => {
      setThongBao("");
      setLoaiThongBao("");
    }, 5000);
  };

  const taiDanhSach =
    useCallback(async () => {
      if (!mo || !hoatDong?._id) {
        return;
      }

      try {
        setDangTai(true);

        const response = await fetch(
          `/api/hoat-dong/${hoatDong._id}/dang-ky`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const { data, message } =
          await docPhanHoi(response);

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(message);
        }

        setDanhSach(
          Array.isArray(data.data)
            ? data.data
            : []
        );

        setThayDoiTrangThai({});
      } catch (error) {
        setDanhSach([]);

        hienThongBao(
          error instanceof Error
            ? error.message
            : "Không thể tải danh sách người đăng ký",
          "error"
        );
      } finally {
        setDangTai(false);
      }
    }, [mo, hoatDong?._id]);

  useEffect(() => {
    if (mo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset editable modal state when the selected record or open state changes.
      setTuKhoa("");
      setThongBao("");
      setLoaiThongBao("");
      setThayDoiTrangThai({});

      void taiDanhSach();
    }
  }, [mo, taiDanhSach]);

  const danhSachHienThi =
    useMemo(() => {
      const keyword =
        boDauTiengViet(tuKhoa);

      if (!keyword) {
        return danhSach;
      }

      return danhSach.filter(
        (item) => {
          const hoiVien =
            item.hoiVienId;

          const noiDung = [
            hoiVien?.maHoiVien,
            hoiVien?.hoTen,
            hoiVien?.lop,
            hoiVien?.email,
            hoiVien?.soDienThoai,
            hoiVien?.chiHoiId
              ?.maChiHoi,
            hoiVien?.chiHoiId
              ?.tenChiHoi,
          ]
            .filter(Boolean)
            .join(" ");

          return boDauTiengViet(
            noiDung
          ).includes(keyword);
        }
      );
    }, [danhSach, tuKhoa]);

  const thongKe = useMemo(() => {
    return {
      tongSo: danhSach.length,

      daDangKy: danhSach.filter(
        (item) =>
          item.trangThai ===
          "DA_DANG_KY"
      ).length,

      daThamGia: danhSach.filter(
        (item) =>
          item.trangThai ===
          "DA_THAM_GIA"
      ).length,

      vangMat: danhSach.filter(
        (item) =>
          item.trangThai ===
          "VANG_MAT"
      ).length,

      daHuy: danhSach.filter(
        (item) =>
          item.trangThai ===
          "DA_HUY"
      ).length,
    };
  }, [danhSach]);

  const duocDiemDanh =
    hoatDong?.trangThai ===
      "DANG_DIEN_RA" ||
    hoatDong?.trangThai ===
      "DA_KET_THUC";

  const soLuongThayDoi =
    Object.keys(
      thayDoiTrangThai
    ).length;

  const thayDoiDiemDanh = (
    dangKy: DangKyHoatDong,
    trangThaiMoi: TrangThaiDangKy
  ) => {
    if (
      dangKy.trangThai ===
      "DA_HUY"
    ) {
      return;
    }

    setThayDoiTrangThai(
      (current) => {
        const next = {
          ...current,
        };

        if (
          trangThaiMoi ===
          dangKy.trangThai
        ) {
          delete next[dangKy._id];
        } else {
          next[dangKy._id] =
            trangThaiMoi;
        }

        return next;
      }
    );
  };

  const luuDiemDanh =
    async () => {
      if (!hoatDong?._id) {
        return;
      }

      const danhSachCapNhat =
        Object.entries(
          thayDoiTrangThai
        ).map(
          ([
            dangKyId,
            trangThai,
          ]) => ({
            dangKyId,
            trangThai,
            ghiChu: "",
          })
        );

      if (
        danhSachCapNhat.length === 0
      ) {
        hienThongBao(
          "Chưa có thay đổi điểm danh nào",
          "error"
        );

        return;
      }

      try {
        setDangLuu(true);

        const response = await fetch(
          `/api/hoat-dong/${hoatDong._id}/diem-danh`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              danhSach:
                danhSachCapNhat,
            }),
          }
        );

        const { data, message } =
          await docPhanHoi(response);

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(message);
        }

        hienThongBao(
          data.message ||
            "Lưu điểm danh thành công",
          "success"
        );

        setThayDoiTrangThai({});

        await taiDanhSach();
      } catch (error) {
        hienThongBao(
          error instanceof Error
            ? error.message
            : "Không thể lưu điểm danh",
          "error"
        );
      } finally {
        setDangLuu(false);
      }
    };

  if (!mo || !hoatDong) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-0 sm:p-4"
      style={{
        fontFamily:
          "Roboto, Arial, sans-serif",
      }}
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[94vh] sm:max-w-7xl sm:rounded-xl">
        {/* HEADER */}

        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-950 sm:text-xl">
              Người tham gia hoạt động
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {hoatDong.maHoatDong} -{" "}
              {hoatDong.tenHoatDong}
            </p>
          </div>

          <button
            type="button"
            onClick={onDong}
            disabled={dangLuu}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={21} />
          </button>
        </div>

        {/* NỘI DUNG CUỘN */}

        <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6">
          {thongBao && (
            <div
              className={`mb-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                loaiThongBao ===
                "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {loaiThongBao ===
              "success" ? (
                <CircleCheckBig
                  size={19}
                  className="mt-0.5 shrink-0"
                />
              ) : (
                <CircleX
                  size={19}
                  className="mt-0.5 shrink-0"
                />
              )}

              <span>{thongBao}</span>
            </div>
          )}

          {!duocDiemDanh && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
              Chỉ có thể điểm danh khi
              hoạt động ở trạng thái{" "}
              <strong>
                Đang diễn ra
              </strong>{" "}
              hoặc{" "}
              <strong>
                Đã kết thúc
              </strong>
              .
            </div>
          )}

          {/* THỐNG KÊ */}

          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <ThongKeCard
              title="Tổng đăng ký"
              value={thongKe.tongSo}
              icon={<Users size={20} />}
              color="blue"
            />

            <ThongKeCard
              title="Đã đăng ký"
              value={thongKe.daDangKy}
              icon={
                <UserMinus size={20} />
              }
              color="blue"
            />

            <ThongKeCard
              title="Đã tham gia"
              value={
                thongKe.daThamGia
              }
              icon={
                <UserCheck size={20} />
              }
              color="green"
            />

            <ThongKeCard
              title="Vắng mặt"
              value={thongKe.vangMat}
              icon={<UserX size={20} />}
              color="amber"
            />

            <ThongKeCard
              title="Đã hủy"
              value={thongKe.daHuy}
              icon={
                <CircleX size={20} />
              }
              color="red"
            />
          </div>

          {/* TÌM KIẾM */}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-xl">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={tuKhoa}
                  onChange={(event) =>
                    setTuKhoa(
                      event.target.value
                    )
                  }
                  placeholder="Tìm theo mã, họ tên, lớp, email hoặc số điện thoại"
                  className="h-11 w-full rounded-lg border border-slate-300 pl-11 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-[#143b66] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  void taiDanhSach()
                }
                disabled={
                  dangTai || dangLuu
                }
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={
                    dangTai
                      ? "animate-spin"
                      : ""
                  }
                />
                Làm mới
              </button>
            </div>

            {/* BẢNG */}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-bold uppercase text-slate-600">
                    <th className="px-4 py-4">
                      STT
                    </th>

                    <th className="px-4 py-4">
                      Mã Hội viên
                    </th>

                    <th className="px-4 py-4">
                      Họ và tên
                    </th>

                    <th className="px-4 py-4">
                      Chi hội
                    </th>

                    <th className="px-4 py-4">
                      Liên hệ
                    </th>

                    <th className="px-4 py-4">
                      Thời gian đăng ký
                    </th>

                    <th className="px-4 py-4">
                      Trạng thái
                    </th>

                    <th className="px-4 py-4">
                      Điểm danh
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {dangTai ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-16 text-center text-sm text-slate-500"
                      >
                        <RefreshCw
                          size={24}
                          className="mx-auto mb-3 animate-spin text-[#143b66]"
                        />

                        Đang tải danh
                        sách...
                      </td>
                    </tr>
                  ) : danhSachHienThi.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-16 text-center"
                      >
                        <Users
                          size={34}
                          className="mx-auto mb-3 text-slate-300"
                        />

                        <p className="font-medium text-slate-700">
                          Chưa có Hội viên
                          đăng ký
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Danh sách sẽ hiển
                          thị khi có Hội viên
                          đăng ký hoạt động.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    danhSachHienThi.map(
                      (
                        dangKy,
                        index
                      ) => {
                        const hoiVien =
                          dangKy.hoiVienId;

                        const
                          trangThaiDangChon =
                            thayDoiTrangThai[
                              dangKy._id
                            ] ||
                            dangKy.trangThai;

                        const coThayDoi =
                          Boolean(
                            thayDoiTrangThai[
                              dangKy._id
                            ]
                          );

                        return (
                          <tr
                            key={
                              dangKy._id
                            }
                            className={`border-t border-slate-100 align-middle text-sm ${
                              coThayDoi
                                ? "bg-blue-50/60"
                                : "hover:bg-slate-50/70"
                            }`}
                          >
                            <td className="px-4 py-4 text-slate-600">
                              {index + 1}
                            </td>

                            <td className="px-4 py-4">
                              <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#143b66]">
                                {hoiVien?.maHoiVien ||
                                  "—"}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900">
                                {hoiVien?.hoTen ||
                                  "Không xác định"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {hoiVien?.lop ||
                                  "Chưa cập nhật lớp"}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-sm text-slate-700">
                                {hoiVien
                                  ?.chiHoiId
                                  ?.maChiHoi ||
                                  "—"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {hoiVien
                                  ?.chiHoiId
                                  ?.tenChiHoi ||
                                  ""}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-sm text-slate-700">
                                {hoiVien?.soDienThoai ||
                                  "—"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {hoiVien?.email ||
                                  "—"}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                              {dinhDangNgayGio(
                                dangKy.thoiGianDangKy
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                  MAU_TRANG_THAI[
                                    dangKy
                                      .trangThai
                                  ]
                                }`}
                              >
                                {
                                  TEN_TRANG_THAI[
                                    dangKy
                                      .trangThai
                                  ]
                                }
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              {dangKy.trangThai ===
                              "DA_HUY" ? (
                                <span className="text-xs text-red-600">
                                  Không thể điểm
                                  danh
                                </span>
                              ) : (
                                <select
                                  value={
                                    trangThaiDangChon
                                  }
                                  disabled={
                                    !duocDiemDanh ||
                                    dangLuu
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    thayDoiDiemDanh(
                                      dangKy,
                                      event
                                        .target
                                        .value as TrangThaiDangKy
                                    )
                                  }
                                  className="h-9 min-w-[145px] rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-[#143b66] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  {CAC_TRANG_THAI_DIEM_DANH.map(
                                    (
                                      value
                                    ) => (
                                      <option
                                        key={
                                          value
                                        }
                                        value={
                                          value
                                        }
                                      >
                                        {
                                          TEN_TRANG_THAI[
                                            value
                                          ]
                                        }
                                      </option>
                                    )
                                  )}
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FOOTER */}

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-slate-500">
            {soLuongThayDoi > 0
              ? `Có ${soLuongThayDoi} thay đổi chưa lưu`
              : "Chưa có thay đổi điểm danh"}
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onDong}
              disabled={dangLuu}
              className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={() =>
                void luuDiemDanh()
              }
              disabled={
                !duocDiemDanh ||
                dangLuu ||
                soLuongThayDoi === 0
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#143b66] px-5 text-sm font-semibold text-white hover:bg-[#0f3155] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {dangLuu ? (
                <RefreshCw
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Save size={17} />
              )}

              Lưu điểm danh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThongKeCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  color:
    | "blue"
    | "green"
    | "amber"
    | "red";
}) {
  const colorClass = {
    blue: "bg-blue-50 text-blue-700",
    green:
      "bg-emerald-50 text-emerald-700",
    amber:
      "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  }[color];

  return (
    <article className="flex min-h-[92px] items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-medium text-slate-600 sm:text-sm">
          {title}
        </p>

        <p className="mt-2 text-xl font-bold text-slate-950">
          {value}
        </p>
      </div>

      <div
        className={`grid h-10 w-10 place-items-center rounded-lg ${colorClass}`}
      >
        {icon}
      </div>
    </article>
  );
}