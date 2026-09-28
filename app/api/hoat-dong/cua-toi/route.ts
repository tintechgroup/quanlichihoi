import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import ChiHoi from "@/models/ChiHoi";
import DangKyHoatDong from "@/models/DangKyHoatDong";
import HoatDong from "@/models/HoatDong";
import HoiVien from "@/models/HoiVien";

export const dynamic = "force-dynamic";

type TrangThaiDangKy =
  | "DA_DANG_KY"
  | "DA_THAM_GIA"
  | "VANG_MAT"
  | "DA_HUY";

type HoiVienDaLay = {
  _id: unknown;
  maHoiVien?: string;
  hoTen?: string;
  lop?: string;
  chiHoiId?: unknown;
  taiKhoanId?: unknown;
  trangThai?: string;
};

type ChiHoiDaPopulate = {
  _id?: unknown;
  maChiHoi?: string;
  tenChiHoi?: string;
};

type HoatDongDaPopulate = {
  _id?: unknown;
  maHoatDong?: string;
  tenHoatDong?: string;
  phamVi?: string;

  chiHoiId?: ChiHoiDaPopulate | string | null;
  chiHoi?: ChiHoiDaPopulate | string | null;

  donViToChuc?: string;
  diaDiem?: string;

  thoiGianBatDau?: Date | string;
  thoiGianKetThuc?: Date | string;
  hanDangKy?: Date | string | null;

  soLuongToiDa?: number | null;

  moTa?: string;
  noiDung?: string;
  trangThai?: string;
};

type DangKyDaLay = {
  _id?: unknown;

  hoiVienId?: unknown;
  hoiVien?: unknown;

  hoatDongId?:
    | HoatDongDaPopulate
    | string
    | null;

  hoatDong?:
    | HoatDongDaPopulate
    | string
    | null;

  trangThai?: TrangThaiDangKy;
  trangThaiDangKy?: TrangThaiDangKy;

  thoiGianDangKy?: Date | string;
  ngayDangKy?: Date | string;
  createdAt?: Date | string;

  thoiGianHuy?: Date | string | null;
  ngayHuy?: Date | string | null;

  ghiChu?: string;
};

function chuyenNgaySangChuoi(
  giaTri?: Date | string | null
): string | null {
  if (!giaTri) {
    return null;
  }

  const ngay = new Date(giaTri);

  if (Number.isNaN(ngay.getTime())) {
    return null;
  }

  return ngay.toISOString();
}

function laDoiTuong(
  giaTri: unknown
): giaTri is Record<string, unknown> {
  return (
    typeof giaTri === "object" &&
    giaTri !== null
  );
}

function layTrangThaiDangKy(
  dangKy: DangKyDaLay
): TrangThaiDangKy {
  return (
    dangKy.trangThai ??
    dangKy.trangThaiDangKy ??
    "DA_DANG_KY"
  );
}

export async function GET() {
  try {
    /*
     * 1. Kiểm tra đăng nhập.
     */
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        },
        { status: 401 }
      );
    }

    /*
     * 2. Chỉ Hội viên được dùng API này.
     */
    if (session.role !== "HOI_VIEN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chức năng này chỉ dành cho tài khoản Hội viên",
        },
        { status: 403 }
      );
    }

    await connectDB();

    /*
     * 3. Tìm hồ sơ Hội viên bằng đúng trường
     * taiKhoanId trong models/HoiVien.ts.
     */
    const ketQuaHoiVien =
      await HoiVien.findOne({
        taiKhoanId: session.userId,
      })
        .select(
          [
            "_id",
            "maHoiVien",
            "hoTen",
            "lop",
            "chiHoiId",
            "taiKhoanId",
            "trangThai",
          ].join(" ")
        )
        .lean();

    const hoiVien =
      ketQuaHoiVien as unknown as
        | HoiVienDaLay
        | null;

    if (!hoiVien) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tài khoản chưa được liên kết với hồ sơ Hội viên",
        },
        { status: 404 }
      );
    }

    /*
     * 4. Không cho Hội viên tạm ngừng sử dụng
     * chức năng hoạt động.
     */
    if (hoiVien.trangThai === "TAM_NGUNG") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hồ sơ Hội viên đang tạm ngừng hoạt động",
        },
        { status: 403 }
      );
    }

    /*
     * 5. Tự nhận biết tên trường trong model
     * DangKyHoatDong.
     *
     * Hỗ trợ cả:
     * - hoiVienId, hoatDongId
     * - hoiVien, hoatDong
     */
    const truongHoiVien =
      DangKyHoatDong.schema.path(
        "hoiVienId"
      )
        ? "hoiVienId"
        : "hoiVien";

    const truongHoatDong =
      DangKyHoatDong.schema.path(
        "hoatDongId"
      )
        ? "hoatDongId"
        : "hoatDong";

    /*
     * 6. Tự nhận biết trường Chi hội trong
     * model HoatDong.
     */
    const truongChiHoi =
      HoatDong.schema.path("chiHoiId")
        ? "chiHoiId"
        : "chiHoi";

    const dieuKienDangKy: Record<
      string,
      unknown
    > = {
      [truongHoiVien]: hoiVien._id,
    };

    /*
     * 7. Lấy lịch sử đăng ký.
     */
    const ketQuaDangKy =
      await DangKyHoatDong.find(
        dieuKienDangKy
      )
        .populate({
          path: truongHoatDong,
          model: HoatDong,
          select: [
            "_id",
            "maHoatDong",
            "tenHoatDong",
            "phamVi",
            "chiHoiId",
            "chiHoi",
            "donViToChuc",
            "diaDiem",
            "thoiGianBatDau",
            "thoiGianKetThuc",
            "hanDangKy",
            "soLuongToiDa",
            "moTa",
            "noiDung",
            "trangThai",
          ].join(" "),
          populate: {
            path: truongChiHoi,
            model: ChiHoi,
            select:
              "_id maChiHoi tenChiHoi",
          },
        })
        .sort({
          thoiGianDangKy: -1,
          ngayDangKy: -1,
          createdAt: -1,
        })
        .lean();

    const danhSachDangKy =
      ketQuaDangKy as unknown as DangKyDaLay[];

    /*
     * 8. Chuẩn hóa dữ liệu.
     */
    const danhSach = danhSachDangKy
      .map((dangKy) => {
        const giaTriHoatDong =
          truongHoatDong === "hoatDongId"
            ? dangKy.hoatDongId
            : dangKy.hoatDong;

        if (
          !giaTriHoatDong ||
          typeof giaTriHoatDong !==
            "object"
        ) {
          return null;
        }

        const hoatDong =
          giaTriHoatDong as HoatDongDaPopulate;

        const giaTriChiHoi =
          truongChiHoi === "chiHoiId"
            ? hoatDong.chiHoiId
            : hoatDong.chiHoi;

        let chiHoi = null;

        if (
          giaTriChiHoi &&
          laDoiTuong(giaTriChiHoi)
        ) {
          const chiHoiDaPopulate =
            giaTriChiHoi as ChiHoiDaPopulate;

          chiHoi = {
            id: String(
              chiHoiDaPopulate._id ?? ""
            ),
            _id: String(
              chiHoiDaPopulate._id ?? ""
            ),
            maChiHoi:
              chiHoiDaPopulate.maChiHoi ??
              "",
            tenChiHoi:
              chiHoiDaPopulate.tenChiHoi ??
              "",
          };
        }

        const trangThaiDangKy =
          layTrangThaiDangKy(dangKy);

        return {
          id: String(dangKy._id ?? ""),
          _id: String(dangKy._id ?? ""),

          trangThaiDangKy,

          thoiGianDangKy:
            chuyenNgaySangChuoi(
              dangKy.thoiGianDangKy ??
                dangKy.ngayDangKy ??
                dangKy.createdAt
            ),

          thoiGianHuy:
            chuyenNgaySangChuoi(
              dangKy.thoiGianHuy ??
                dangKy.ngayHuy
            ),

          ghiChu: dangKy.ghiChu ?? "",

          hoatDong: {
            id: String(
              hoatDong._id ?? ""
            ),
            _id: String(
              hoatDong._id ?? ""
            ),

            maHoatDong:
              hoatDong.maHoatDong ?? "",

            tenHoatDong:
              hoatDong.tenHoatDong ?? "",

            phamVi:
              hoatDong.phamVi ?? "",

            chiHoi,

            donViToChuc:
              hoatDong.donViToChuc ?? "",

            diaDiem:
              hoatDong.diaDiem ?? "",

            thoiGianBatDau:
              chuyenNgaySangChuoi(
                hoatDong.thoiGianBatDau
              ),

            thoiGianKetThuc:
              chuyenNgaySangChuoi(
                hoatDong.thoiGianKetThuc
              ),

            hanDangKy:
              chuyenNgaySangChuoi(
                hoatDong.hanDangKy
              ),

            soLuongToiDa:
              hoatDong.soLuongToiDa ??
              null,

            moTa: hoatDong.moTa ?? "",
            noiDung:
              hoatDong.noiDung ?? "",

            trangThai:
              hoatDong.trangThai ?? "",
          },
        };
      })
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > => item !== null
      );

    /*
     * 9. Thống kê trạng thái tham gia.
     */
    const thongKe = {
      tongBanGhi: danhSach.length,

      dangThamGia: danhSach.filter(
        (item) =>
          item.trangThaiDangKy ===
          "DA_DANG_KY"
      ).length,

      daThamGia: danhSach.filter(
        (item) =>
          item.trangThaiDangKy ===
          "DA_THAM_GIA"
      ).length,

      vangMat: danhSach.filter(
        (item) =>
          item.trangThaiDangKy ===
          "VANG_MAT"
      ).length,

      daHuy: danhSach.filter(
        (item) =>
          item.trangThaiDangKy ===
          "DA_HUY"
      ).length,
    };

    /*
     * 10. Trả dữ liệu cho giao diện.
     */
    return NextResponse.json(
      {
        success: true,
        message:
          "Lấy lịch sử hoạt động thành công",

        data: {
          hoiVien: {
            id: String(hoiVien._id),
            _id: String(hoiVien._id),

            maHoiVien:
              hoiVien.maHoiVien ?? "",

            hoTen:
              hoiVien.hoTen ?? "",

            lop:
              hoiVien.lop ?? "",

            trangThai:
              hoiVien.trangThai ?? "",
          },

          thongKe,
          danhSach,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "Lỗi lấy lịch sử hoạt động của Hội viên:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi lấy lịch sử hoạt động",
      },
      { status: 500 }
    );
  }
}