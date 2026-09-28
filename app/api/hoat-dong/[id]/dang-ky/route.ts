import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import DangKyHoatDong from "@/models/DangKyHoatDong";
import HoatDong from "@/models/HoatDong";
import HoiVien from "@/models/HoiVien";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const VAI_TRO_QUAN_LY = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const VAI_TRO_DUOC_DANG_KY = [
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

async function timHoatDong(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return HoatDong.findById(id);
}

/* =====================================================
   GET: LẤY THÔNG TIN ĐĂNG KÝ
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
      .populate(
        "chiHoiId",
        "maChiHoi tenChiHoi"
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
     * Quản trị viên, Ban Chấp hành và Chi hội trưởng
     * được xem toàn bộ danh sách đăng ký.
     */
    if (VAI_TRO_QUAN_LY.includes(session.role)) {
      const danhSachDangKy =
        await DangKyHoatDong.find({
          hoatDongId: id,
        })
          .populate({
            path: "hoiVienId",
            select:
              "maHoiVien hoTen gioiTinh lop khoaHoc soDienThoai email trangThai chiHoiId",
            populate: {
              path: "chiHoiId",
              select: "maChiHoi tenChiHoi",
            },
          })
          .populate(
            "nguoiCapNhatId",
            "username fullName role"
          )
          .sort({
            thoiGianDangKy: -1,
          })
          .lean();

      const thongKe = {
        tongSo: danhSachDangKy.length,

        daDangKy: danhSachDangKy.filter(
          (item) =>
            item.trangThai === "DA_DANG_KY"
        ).length,

        daThamGia: danhSachDangKy.filter(
          (item) =>
            item.trangThai === "DA_THAM_GIA"
        ).length,

        vangMat: danhSachDangKy.filter(
          (item) => item.trangThai === "VANG_MAT"
        ).length,

        daHuy: danhSachDangKy.filter(
          (item) => item.trangThai === "DA_HUY"
        ).length,
      };

      return NextResponse.json({
        success: true,
        message:
          "Lấy danh sách đăng ký hoạt động thành công",
        data: danhSachDangKy,
        total: danhSachDangKy.length,
        thongKe,
        hoatDong,
      });
    }

    /*
     * Hội viên chỉ xem được thông tin đăng ký
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

    const dangKy =
      await DangKyHoatDong.findOne({
        hoatDongId: id,
        hoiVienId: hoiVien._id,
      })
        .populate(
          "hoatDongId",
          "maHoatDong tenHoatDong diaDiem thoiGianBatDau thoiGianKetThuc trangThai"
        )
        .lean();

    return NextResponse.json({
      success: true,
      message:
        "Lấy trạng thái đăng ký thành công",
      data: dangKy,
      daDangKy:
        dangKy?.trangThai === "DA_DANG_KY" ||
        dangKy?.trangThai === "DA_THAM_GIA",
    });
  } catch (error) {
    console.error(
      "Lỗi lấy danh sách đăng ký:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi lấy danh sách đăng ký",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   POST: ĐĂNG KÝ HOẠT ĐỘNG
===================================================== */

export async function POST(
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

    if (
      !VAI_TRO_DUOC_DANG_KY.includes(
        session.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tài khoản này không được đăng ký hoạt động",
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

    await connectDB();

    const [hoatDong, hoiVien] =
      await Promise.all([
        timHoatDong(id),
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
            "Hội viên đang tạm ngừng hoạt động nên không thể đăng ký",
        },
        { status: 403 }
      );
    }

    if (
      ![
        "DA_DUYET",
        "SAP_DIEN_RA",
      ].includes(hoatDong.trangThai)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hoạt động hiện không nhận đăng ký",
        },
        { status: 409 }
      );
    }

    const hienTai = new Date();

    if (
      hoatDong.hanDangKy &&
      hienTai >
        new Date(hoatDong.hanDangKy)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hoạt động đã hết hạn đăng ký",
        },
        { status: 409 }
      );
    }

    if (
      hienTai >=
      new Date(hoatDong.thoiGianBatDau)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hoạt động đã bắt đầu, không thể đăng ký",
        },
        { status: 409 }
      );
    }

    /*
     * Hoạt động thuộc phạm vi Chi hội thì
     * Hội viên phải thuộc đúng Chi hội đó.
     */
    if (
      hoatDong.phamVi === "CHI_HOI"
    ) {
      if (!hoatDong.chiHoiId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Hoạt động chưa được thiết lập Chi hội",
          },
          { status: 409 }
        );
      }

      const chiHoiHoatDong =
        hoatDong.chiHoiId.toString();

      const chiHoiHoiVien =
        hoiVien.chiHoiId?.toString();

      if (
        !chiHoiHoiVien ||
        chiHoiHoatDong !== chiHoiHoiVien
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Bạn không thuộc Chi hội tổ chức hoạt động này",
          },
          { status: 403 }
        );
      }
    }

    const dangKyCu =
      await DangKyHoatDong.findOne({
        hoatDongId: hoatDong._id,
        hoiVienId: hoiVien._id,
      });

    if (
      dangKyCu &&
      dangKyCu.trangThai !== "DA_HUY"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn đã đăng ký hoạt động này",
        },
        { status: 409 }
      );
    }

    const tongNguoiDangKy =
      await DangKyHoatDong.countDocuments({
        hoatDongId: hoatDong._id,
        trangThai: {
          $in: [
            "DA_DANG_KY",
            "DA_THAM_GIA",
          ],
        },
      });

    if (
      hoatDong.soLuongToiDa &&
      hoatDong.soLuongToiDa > 0 &&
      tongNguoiDangKy >=
        hoatDong.soLuongToiDa
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hoạt động đã đủ số lượng người đăng ký",
        },
        { status: 409 }
      );
    }

    let dangKy;

    if (dangKyCu) {
      dangKyCu.trangThai =
        "DA_DANG_KY";

      dangKyCu.thoiGianDangKy =
        new Date();

      dangKyCu.thoiGianHuy =
        undefined;

      dangKyCu.lyDoHuy = "";

      dangKyCu.ghiChu = "";

      dangKyCu.nguoiCapNhatId =
        new mongoose.Types.ObjectId(
          session.userId
        );

      dangKy = await dangKyCu.save();
    } else {
      dangKy =
        await DangKyHoatDong.create({
          hoatDongId: hoatDong._id,
          hoiVienId: hoiVien._id,
          trangThai: "DA_DANG_KY",
          thoiGianDangKy: new Date(),
          nguoiCapNhatId:
            session.userId,
        });
    }

    const ketQua =
      await DangKyHoatDong.findById(
        dangKy._id
      )
        .populate(
          "hoiVienId",
          "maHoiVien hoTen email soDienThoai lop"
        )
        .populate(
          "hoatDongId",
          "maHoatDong tenHoatDong diaDiem thoiGianBatDau thoiGianKetThuc"
        )
        .lean();

    return NextResponse.json(
      {
        success: true,
        message:
          dangKyCu
            ? "Đăng ký lại hoạt động thành công"
            : "Đăng ký hoạt động thành công",
        data: ketQua,
      },
      {
        status: dangKyCu ? 200 : 201,
      }
    );
  } catch (error) {
    console.error(
      "Lỗi đăng ký hoạt động:",
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
            "Bạn đã đăng ký hoạt động này",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi đăng ký hoạt động",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   DELETE: HỦY ĐĂNG KÝ HOẠT ĐỘNG
===================================================== */

export async function DELETE(
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
      !VAI_TRO_DUOC_DANG_KY.includes(
        session.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tài khoản này không được hủy đăng ký hoạt động",
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

    let body: {
      lyDoHuy?: string;
    } = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const lyDoHuy =
      typeof body.lyDoHuy === "string"
        ? body.lyDoHuy.trim()
        : "";

    await connectDB();

    const [hoatDong, hoiVien] =
      await Promise.all([
        timHoatDong(id),
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
      new Date() >=
      new Date(hoatDong.thoiGianBatDau)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hoạt động đã bắt đầu, không thể hủy đăng ký",
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

    if (dangKy.trangThai === "DA_HUY") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Đăng ký này đã được hủy trước đó",
        },
        { status: 409 }
      );
    }

    if (
      ["DA_THAM_GIA", "VANG_MAT"].includes(
        dangKy.trangThai
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hoạt động đã được điểm danh, không thể hủy đăng ký",
        },
        { status: 409 }
      );
    }

    dangKy.trangThai = "DA_HUY";
    dangKy.thoiGianHuy = new Date();
    dangKy.lyDoHuy = lyDoHuy;
    dangKy.nguoiCapNhatId =
      new mongoose.Types.ObjectId(
        session.userId
      );

    await dangKy.save();

    return NextResponse.json({
      success: true,
      message:
        "Hủy đăng ký hoạt động thành công",
      data: dangKy,
    });
  } catch (error) {
    console.error(
      "Lỗi hủy đăng ký hoạt động:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi hủy đăng ký hoạt động",
      },
      { status: 500 }
    );
  }
}