import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB as connectMongoDB } from "@/lib/mongodb";
import { getCurrentSession as getSession } from "@/lib/session";
import ChiHoi from "@/models/ChiHoi";
import DanhGiaHoiVien from "@/models/DanhGiaHoiVien";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

function getErrorMessage(error: unknown) {
  if (error instanceof mongoose.Error.ValidationError) {
    const firstError = Object.values(error.errors)[0];

    return firstError?.message || "Dữ liệu Hội viên không hợp lệ";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    return "Mã Hội viên đã tồn tại";
  }

  if (error instanceof Error) {
    console.error("Chi tiết lỗi:", error.message);
  }

  return "Đã xảy ra lỗi trong quá trình xử lý";
}

/**
 * GET /api/hoi-vien
 *
 * Lấy danh sách Hội viên.
 *
 * Query:
 * - search: tìm theo mã, họ tên, email hoặc số điện thoại
 * - chiHoiId: lọc theo Chi hội
 * - trangThai: DANG_HOAT_DONG hoặc TAM_NGUNG
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        { status: 401 },
      );
    }

    await connectMongoDB();

    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const chiHoiId = searchParams.get("chiHoiId")?.trim() || "";
    const trangThai = searchParams.get("trangThai")?.trim() || "";

    const filter: Record<string, unknown> = {};

    if (search) {
      const safeSearch = escapeRegExp(search);

      filter.$or = [
        {
          maHoiVien: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          hoTen: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          email: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          soDienThoai: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    if (chiHoiId) {
      if (!mongoose.Types.ObjectId.isValid(chiHoiId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Chi hội không hợp lệ",
          },
          { status: 400 },
        );
      }

      filter.chiHoiId = new mongoose.Types.ObjectId(chiHoiId);
    }

    if (trangThai) {
      if (
        !["DANG_HOAT_DONG", "TAM_NGUNG"].includes(trangThai)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Trạng thái Hội viên không hợp lệ",
          },
          { status: 400 },
        );
      }

      filter.trangThai = trangThai;
    }

    const danhSachHoiVienGoc = await HoiVien.find(filter)
      .populate({
        path: "chiHoiId",
        model: ChiHoi,
        select: "maChiHoi tenChiHoi",
      })
      .populate({
        path: "taiKhoanId",
        model: User,
        select: "username role isActive",
      })
      .sort({
        createdAt: -1,
      })
      .lean();

    const danhSachIdHoiVien = danhSachHoiVienGoc.map(
      (hoiVien) => hoiVien._id,
    );

    const danhSachDanhGia =
      danhSachIdHoiVien.length > 0
        ? await DanhGiaHoiVien.find({
            hoiVienId: {
              $in: danhSachIdHoiVien,
            },
          })
            .select(
              "hoiVienId xepLoai nhanXet nguoiDanhGiaId createdAt updatedAt",
            )
            .lean()
        : [];

    const danhGiaTheoHoiVien = new Map(
      danhSachDanhGia.map((danhGia) => [
        String(danhGia.hoiVienId),
        danhGia,
      ]),
    );

    const danhSachHoiVien = danhSachHoiVienGoc.map((hoiVien) => ({
      ...hoiVien,
      danhGia:
        danhGiaTheoHoiVien.get(String(hoiVien._id)) || null,
    }));

    return NextResponse.json(
      {
        success: true,
        message: "Lấy danh sách Hội viên thành công",
        data: danhSachHoiVien,
        total: danhSachHoiVien.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Lỗi lấy danh sách Hội viên:", error);

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/hoi-vien
 *
 * Thêm Hội viên mới.
 * Chỉ Quản trị viên được thực hiện.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        { status: 401 },
      );
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền thêm Hội viên",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const maHoiVien =
      typeof body.maHoiVien === "string"
        ? body.maHoiVien.trim().toUpperCase()
        : "";

    const hoTen =
      typeof body.hoTen === "string"
        ? body.hoTen.trim()
        : "";

    const chiHoiId =
      typeof body.chiHoiId === "string"
        ? body.chiHoiId.trim()
        : "";

    const ngaySinh =
      typeof body.ngaySinh === "string"
        ? body.ngaySinh.trim()
        : "";

    const gioiTinh =
      typeof body.gioiTinh === "string"
        ? body.gioiTinh.trim()
        : "";

    const trangThai =
      typeof body.trangThai === "string"
        ? body.trangThai.trim()
        : "DANG_HOAT_DONG";

    if (!maHoiVien) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Hội viên không được để trống",
        },
        { status: 400 },
      );
    }

    if (!hoTen) {
      return NextResponse.json(
        {
          success: false,
          message: "Họ tên Hội viên không được để trống",
        },
        { status: 400 },
      );
    }

    if (!chiHoiId) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng chọn Chi hội",
        },
        { status: 400 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(chiHoiId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Chi hội không hợp lệ",
        },
        { status: 400 },
      );
    }

    if (
      gioiTinh &&
      !["NAM", "NU", "KHAC"].includes(gioiTinh)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Giới tính không hợp lệ",
        },
        { status: 400 },
      );
    }

    if (
      !["DANG_HOAT_DONG", "TAM_NGUNG"].includes(trangThai)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Trạng thái Hội viên không hợp lệ",
        },
        { status: 400 },
      );
    }

    let parsedNgaySinh: Date | undefined;

    if (ngaySinh) {
      parsedNgaySinh = new Date(ngaySinh);

      if (Number.isNaN(parsedNgaySinh.getTime())) {
        return NextResponse.json(
          {
            success: false,
            message: "Ngày sinh không hợp lệ",
          },
          { status: 400 },
        );
      }

      if (parsedNgaySinh > new Date()) {
        return NextResponse.json(
          {
            success: false,
            message: "Ngày sinh không được lớn hơn ngày hiện tại",
          },
          { status: 400 },
        );
      }
    }

    await connectMongoDB();

    const [chiHoiTonTai, maHoiVienTonTai] = await Promise.all([
      ChiHoi.exists({
        _id: chiHoiId,
      }),
      HoiVien.exists({
        maHoiVien,
      }),
    ]);

    if (!chiHoiTonTai) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Chi hội",
        },
        { status: 404 },
      );
    }

    if (maHoiVienTonTai) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Hội viên đã tồn tại",
        },
        { status: 409 },
      );
    }

    const hoiVienMoi = await HoiVien.create({
      maHoiVien,
      hoTen,
      ngaySinh: parsedNgaySinh,
      gioiTinh: gioiTinh || undefined,
      email: normalizeOptionalString(body.email),
      soDienThoai: normalizeOptionalString(body.soDienThoai),
      lop: normalizeOptionalString(body.lop),
      khoaHoc: normalizeOptionalString(body.khoaHoc),
      diaChi: normalizeOptionalString(body.diaChi),
      chiHoiId,
      trangThai,
    });

    const hoiVienDaTao = await HoiVien.findById(hoiVienMoi._id)
      .populate({
        path: "chiHoiId",
        model: ChiHoi,
        select: "maChiHoi tenChiHoi",
      })
      .populate({
        path: "taiKhoanId",
        model: User,
        select: "username role isActive",
      })
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Thêm Hội viên thành công",
        data: {
          ...hoiVienDaTao,
          danhGia: null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Lỗi thêm Hội viên:", error);

    const message = getErrorMessage(error);

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status:
          message === "Mã Hội viên đã tồn tại"
            ? 409
            : 500,
      },
    );
  }
}