import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import DanhGiaHoatDong from "@/models/DanhGiaHoatDong";
import DangKyHoatDong from "@/models/DangKyHoatDong";
import HoatDong from "@/models/HoatDong";
import HoiVien from "@/models/HoiVien";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DanhGiaBody = {
  diemDanhGia?: number;
  nhanXet?: string;
  deXuat?: string;
  anDanh?: boolean;
};

const VAI_TRO_QUAN_LY = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const VAI_TRO_DUOC_DANH_GIA = [
  "HOI_VIEN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

async function timHoiVienTheoTaiKhoan(
  userId: string
) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  return HoiVien.findOne({
    taiKhoanId: userId,
  });
}

async function kiemTraPhamViChiHoiTruong(
  session: {
    userId: string;
    role: string;
  },
  hoatDong: {
    phamVi: string;
    chiHoiId?: {
      toString(): string;
    } | null;
  }
) {
  if (session.role !== "CHI_HOI_TRUONG") {
    return true;
  }

  const hoiVien = await HoiVien.findOne({
    taiKhoanId: session.userId,
  }).select("chiHoiId");

  if (
    !hoiVien ||
    !hoiVien.chiHoiId ||
    hoatDong.phamVi !== "CHI_HOI" ||
    !hoatDong.chiHoiId
  ) {
    return false;
  }

  return (
    hoiVien.chiHoiId.toString() ===
    hoatDong.chiHoiId.toString()
  );
}

/* =====================================================
   GET: LẤY ĐÁNH GIÁ HOẠT ĐỘNG
===================================================== */

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const hoatDong = await HoatDong.findById(id)
      .select(
        "maHoatDong tenHoatDong phamVi chiHoiId trangThai thoiGianBatDau thoiGianKetThuc"
      )
      .lean();

    if (!hoatDong) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy hoạt động",
        },
        { status: 404 }
      );
    }

    /*
     * Phía quản lý xem toàn bộ đánh giá
     * và số liệu thống kê.
     */
    if (VAI_TRO_QUAN_LY.includes(session.role)) {
      const dungPhamVi =
        await kiemTraPhamViChiHoiTruong(
          session,
          hoatDong
        );

      if (!dungPhamVi) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Bạn không có quyền xem đánh giá hoạt động này",
          },
          { status: 403 }
        );
      }

      const danhSachDanhGia =
        await DanhGiaHoatDong.find({
          hoatDongId: id,
        })
          .populate(
            "hoiVienId",
            "maHoiVien hoTen lop email chiHoiId"
          )
          .sort({
            thoiGianDanhGia: -1,
          })
          .lean();

      /*
       * Che thông tin Hội viên nếu đánh giá ẩn danh.
       */
      const duLieuHienThi =
        danhSachDanhGia.map((item) => ({
          ...item,
          hoiVienId: item.anDanh
            ? null
            : item.hoiVienId,
          nguoiDanhGia: item.anDanh
            ? "Ẩn danh"
            : undefined,
        }));

      const tongSoDanhGia =
        danhSachDanhGia.length;

      const tongDiem =
        danhSachDanhGia.reduce(
          (tong, item) =>
            tong + item.diemDanhGia,
          0
        );

      const diemTrungBinh =
        tongSoDanhGia > 0
          ? Number(
              (
                tongDiem / tongSoDanhGia
              ).toFixed(1)
            )
          : 0;

      const phanBoSoSao = {
        motSao: danhSachDanhGia.filter(
          (item) => item.diemDanhGia === 1
        ).length,

        haiSao: danhSachDanhGia.filter(
          (item) => item.diemDanhGia === 2
        ).length,

        baSao: danhSachDanhGia.filter(
          (item) => item.diemDanhGia === 3
        ).length,

        bonSao: danhSachDanhGia.filter(
          (item) => item.diemDanhGia === 4
        ).length,

        namSao: danhSachDanhGia.filter(
          (item) => item.diemDanhGia === 5
        ).length,
      };

      return NextResponse.json({
        success: true,
        message:
          "Lấy danh sách đánh giá hoạt động thành công",
        data: duLieuHienThi,
        total: tongSoDanhGia,
        thongKe: {
          tongSoDanhGia,
          diemTrungBinh,
          phanBoSoSao,
        },
        hoatDong,
      });
    }

    /*
     * Hội viên thường chỉ xem đánh giá
     * của chính mình.
     */
    const hoiVien =
      await timHoiVienTheoTaiKhoan(
        session.userId
      );

    if (!hoiVien) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy hồ sơ Hội viên của tài khoản",
        },
        { status: 404 }
      );
    }

    const danhGia =
      await DanhGiaHoatDong.findOne({
        hoatDongId: id,
        hoiVienId: hoiVien._id,
      })
        .populate(
          "hoatDongId",
          "maHoatDong tenHoatDong trangThai thoiGianKetThuc"
        )
        .lean();

    return NextResponse.json({
      success: true,
      message:
        "Lấy đánh giá hoạt động thành công",
      data: danhGia,
      daDanhGia: Boolean(danhGia),
    });
  } catch (error) {
    console.error(
      "Lỗi lấy đánh giá hoạt động:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi lấy đánh giá hoạt động",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   POST: TẠO HOẶC CẬP NHẬT ĐÁNH GIÁ
===================================================== */

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    if (
      !VAI_TRO_DUOC_DANH_GIA.includes(
        session.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tài khoản này không được đánh giá hoạt động",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    const body =
      (await request.json()) as DanhGiaBody;

    const diemDanhGia = Number(
      body.diemDanhGia
    );

    const nhanXet =
      typeof body.nhanXet === "string"
        ? body.nhanXet.trim()
        : "";

    const deXuat =
      typeof body.deXuat === "string"
        ? body.deXuat.trim()
        : "";

    const anDanh = body.anDanh === true;

    if (
      !Number.isInteger(diemDanhGia) ||
      diemDanhGia < 1 ||
      diemDanhGia > 5
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Điểm đánh giá phải là số nguyên từ 1 đến 5",
        },
        { status: 400 }
      );
    }

    if (nhanXet.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nhận xét không được vượt quá 2000 ký tự",
        },
        { status: 400 }
      );
    }

    if (deXuat.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Đề xuất không được vượt quá 2000 ký tự",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const [hoatDong, hoiVien] =
      await Promise.all([
        HoatDong.findById(id),

        timHoiVienTheoTaiKhoan(
          session.userId
        ),
      ]);

    if (!hoatDong) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy hoạt động",
        },
        { status: 404 }
      );
    }

    if (!hoiVien) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy hồ sơ Hội viên của tài khoản",
        },
        { status: 404 }
      );
    }

    if (
      hoiVien.trangThai !==
      "DANG_HOAT_DONG"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hội viên đang tạm ngừng hoạt động nên không thể đánh giá",
        },
        { status: 403 }
      );
    }

    if (
      hoatDong.trangThai !==
      "DA_KET_THUC"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chỉ được đánh giá sau khi hoạt động kết thúc",
        },
        { status: 409 }
      );
    }

    const dangKy =
      await DangKyHoatDong.findOne({
        hoatDongId: hoatDong._id,
        hoiVienId: hoiVien._id,
      });

    if (!dangKy) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chưa đăng ký hoạt động này",
        },
        { status: 404 }
      );
    }

    if (
      dangKy.trangThai !==
      "DA_THAM_GIA"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chỉ Hội viên đã tham gia hoạt động mới được đánh giá",
        },
        { status: 403 }
      );
    }

    let danhGia =
      await DanhGiaHoatDong.findOne({
        hoatDongId: hoatDong._id,
        hoiVienId: hoiVien._id,
      });

    const laCapNhat = Boolean(danhGia);

    if (danhGia) {
      danhGia.diemDanhGia =
        diemDanhGia;

      danhGia.nhanXet = nhanXet;
      danhGia.deXuat = deXuat;
      danhGia.anDanh = anDanh;
      danhGia.thoiGianDanhGia =
        new Date();

      await danhGia.save();
    } else {
      danhGia =
        await DanhGiaHoatDong.create({
          hoatDongId: hoatDong._id,
          hoiVienId: hoiVien._id,
          dangKyHoatDongId:
            dangKy._id,
          diemDanhGia,
          nhanXet,
          deXuat,
          anDanh,
          thoiGianDanhGia:
            new Date(),
        });
    }

    const ketQua =
      await DanhGiaHoatDong.findById(
        danhGia._id
      )
        .populate(
          "hoiVienId",
          "maHoiVien hoTen lop email"
        )
        .populate(
          "hoatDongId",
          "maHoatDong tenHoatDong trangThai thoiGianKetThuc"
        )
        .lean();

    return NextResponse.json(
      {
        success: true,
        message: laCapNhat
          ? "Cập nhật đánh giá hoạt động thành công"
          : "Đánh giá hoạt động thành công",
        data: ketQua,
      },
      {
        status: laCapNhat ? 200 : 201,
      }
    );
  } catch (error) {
    console.error(
      "Lỗi đánh giá hoạt động:",
      error
    );

    if (
      error instanceof Error &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn đã đánh giá hoạt động này",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi đánh giá hoạt động",
      },
      { status: 500 }
    );
  }
}