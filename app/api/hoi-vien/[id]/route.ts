import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB as connectMongoDB } from "@/lib/mongodb";
import { getCurrentSession as getSession } from "@/lib/session";
import ChiHoi from "@/models/ChiHoi";
import DanhGiaHoiVien from "@/models/DanhGiaHoiVien";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const ALLOWED_STATUS = ["DANG_HOAT_DONG", "TAM_NGUNG"] as const;
const ALLOWED_GENDER = ["NAM", "NU", "KHAC"] as const;

async function checkAdmin() {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      ),
    };
  }

  if (session.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền thực hiện thao tác này",
        },
        {
          status: 403,
        },
      ),
    };
  }

  return {
    session,
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const authorization = await checkAdmin();

    if (authorization.error) {
      return authorization.error;
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Hội viên không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    const hoiVien = await HoiVien.findById(id)
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

    if (!hoiVien) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Hội viên",
        },
        {
          status: 404,
        },
      );
    }

    const danhGia = await DanhGiaHoiVien.findOne({
      hoiVienId: id,
    })
      .select("xepLoai nhanXet nguoiDanhGiaId createdAt updatedAt")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Lấy thông tin Hội viên thành công",
        data: {
          ...hoiVien,
          danhGia: danhGia || null,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Lỗi lấy thông tin Hội viên:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Đã xảy ra lỗi khi lấy thông tin Hội viên",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const authorization = await checkAdmin();

    if (authorization.error) {
      return authorization.error;
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Hội viên không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();

    const maHoiVien =
      typeof body.maHoiVien === "string"
        ? body.maHoiVien.trim().toUpperCase()
        : "";

    const hoTen =
      typeof body.hoTen === "string" ? body.hoTen.trim() : "";

    const chiHoiId =
      typeof body.chiHoiId === "string" ? body.chiHoiId.trim() : "";

    const gioiTinh =
      typeof body.gioiTinh === "string" ? body.gioiTinh : "NAM";

    const trangThai =
      typeof body.trangThai === "string"
        ? body.trangThai
        : "DANG_HOAT_DONG";

    if (!maHoiVien) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Hội viên không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (!hoTen) {
      return NextResponse.json(
        {
          success: false,
          message: "Họ và tên không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(chiHoiId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Chi hội không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !ALLOWED_GENDER.includes(
        gioiTinh as (typeof ALLOWED_GENDER)[number],
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Giới tính không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !ALLOWED_STATUS.includes(
        trangThai as (typeof ALLOWED_STATUS)[number],
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Trạng thái Hội viên không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    const [currentMember, branch, duplicatedCode] = await Promise.all([
      HoiVien.findById(id).select("taiKhoanId").lean(),
      ChiHoi.findById(chiHoiId).select("_id").lean(),
      HoiVien.findOne({
        _id: {
          $ne: id,
        },
        maHoiVien,
      })
        .select("_id")
        .lean(),
    ]);

    if (!currentMember) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Hội viên",
        },
        {
          status: 404,
        },
      );
    }

    if (!branch) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Chi hội",
        },
        {
          status: 404,
        },
      );
    }

    if (duplicatedCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Hội viên đã tồn tại",
        },
        {
          status: 409,
        },
      );
    }

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (email) {
      const duplicatedEmail = await HoiVien.findOne({
        _id: {
          $ne: id,
        },
        email,
      })
        .select("_id")
        .lean();

      if (duplicatedEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "Email đã được sử dụng bởi Hội viên khác",
          },
          {
            status: 409,
          },
        );
      }
    }

    let ngaySinh: Date | null = null;

    if (body.ngaySinh) {
      const parsedDate = new Date(body.ngaySinh);

      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            message: "Ngày sinh không hợp lệ",
          },
          {
            status: 400,
          },
        );
      }

      ngaySinh = parsedDate;
    }

    const updatedMember = await HoiVien.findByIdAndUpdate(
      id,
      {
        $set: {
          maHoiVien,
          hoTen,
          ngaySinh,
          gioiTinh,
          email,
          soDienThoai:
            typeof body.soDienThoai === "string"
              ? body.soDienThoai.trim()
              : "",
          lop:
            typeof body.lop === "string" ? body.lop.trim() : "",
          khoaHoc:
            typeof body.khoaHoc === "string"
              ? body.khoaHoc.trim()
              : "",
          diaChi:
            typeof body.diaChi === "string"
              ? body.diaChi.trim()
              : "",
          chiHoiId,
          trangThai,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate({
        path: "chiHoiId",
        model: ChiHoi,
        select: "maChiHoi tenChiHoi",
      })
      .populate({
        path: "taiKhoanId",
        model: User,
        select: "username role isActive",
      });

    if (!updatedMember) {
      return NextResponse.json(
        {
          success: false,
          message: "Không thể cập nhật Hội viên",
        },
        {
          status: 404,
        },
      );
    }

    if (currentMember.taiKhoanId) {
      await User.updateOne(
        {
          _id: currentMember.taiKhoanId,
        },
        {
          $set: {
            isActive: trangThai === "DANG_HOAT_DONG",
          },
        },
      );
    }

    const danhGia = await DanhGiaHoiVien.findOne({
      hoiVienId: id,
    })
      .select("xepLoai nhanXet nguoiDanhGiaId createdAt updatedAt")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Cập nhật Hội viên thành công",
        data: {
          ...updatedMember.toObject(),
          danhGia: danhGia || null,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Lỗi cập nhật Hội viên:", error);

    if (
      error instanceof Error &&
      error.name === "ValidationError"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Đã xảy ra lỗi khi cập nhật Hội viên",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const authorization = await checkAdmin();

    if (authorization.error) {
      return authorization.error;
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Hội viên không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    const hoiVien = await HoiVien.findById(id)
      .select("_id maHoiVien hoTen taiKhoanId")
      .lean();

    if (!hoiVien) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Hội viên cần xóa",
        },
        {
          status: 404,
        },
      );
    }

    const taiKhoanId = hoiVien.taiKhoanId
      ? String(hoiVien.taiKhoanId)
      : null;

    await DanhGiaHoiVien.deleteMany({
      hoiVienId: id,
    });

    await HoiVien.deleteOne({
      _id: id,
    });

    if (
      taiKhoanId &&
      mongoose.Types.ObjectId.isValid(taiKhoanId)
    ) {
      await User.deleteOne({
        _id: taiKhoanId,
        role: "HOI_VIEN",
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Xóa Hội viên ${hoiVien.maHoiVien} - ${hoiVien.hoTen} thành công`,
        data: {
          deletedId: id,
          deletedAccount: Boolean(taiKhoanId),
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Lỗi xóa Hội viên:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Đã xảy ra lỗi khi xóa Hội viên",
      },
      {
        status: 500,
      },
    );
  }
}