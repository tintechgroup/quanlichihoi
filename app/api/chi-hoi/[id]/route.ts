import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import ChiHoi from "@/models/ChiHoi";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   GET /api/chi-hoi/:id

   Chi tiết Chi hội +
   danh sách Hội viên trực thuộc
========================================================= */

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    if (
      session.role !== "ADMIN" &&
      session.role !==
        "BAN_CHAP_HANH"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền xem Chi hội",
        },
        {
          status: 403,
        },
      );
    }

    const { id } =
      await context.params;

    if (
      !mongoose.isValidObjectId(
        id,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Mã định danh Chi hội không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const [
      chiHoi,
      danhSachHoiVien,
    ] = await Promise.all([
      ChiHoi.findById(id)
        .lean(),

      HoiVien.find({
        chiHoiId: id,
      })
        .select(
          [
            "maHoiVien",
            "hoTen",
            "ngaySinh",
            "gioiTinh",
            "email",
            "soDienThoai",
            "lop",
            "khoaHoc",
            "diaChi",
            "trangThai",
            "taiKhoanId",
            "createdAt",
          ].join(" "),
        )
        .sort({
          hoTen: 1,
        })
        .lean(),
    ]);

    if (!chiHoi) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy Chi hội",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,

      data: {
        ...chiHoi,

        soLuongThanhVien:
          danhSachHoiVien.length,

        danhSachHoiVien,
      },
    });
  } catch (error) {
    console.error(
      "Lỗi xem Chi hội:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể xem thông tin Chi hội",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PUT /api/chi-hoi/:id
========================================================= */

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    if (
      session.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Chỉ Quản trị viên được cập nhật Chi hội",
        },
        {
          status: 403,
        },
      );
    }

    const { id } =
      await context.params;

    if (
      !mongoose.isValidObjectId(
        id,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Mã định danh Chi hội không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    const maChiHoi =
      typeof body.maChiHoi ===
      "string"
        ? body.maChiHoi
            .trim()
            .toUpperCase()
        : "";

    const tenChiHoi =
      typeof body.tenChiHoi ===
      "string"
        ? body.tenChiHoi.trim()
        : "";

    const moTa =
      typeof body.moTa ===
      "string"
        ? body.moTa.trim()
        : "";

    if (
      !maChiHoi ||
      !tenChiHoi
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Vui lòng nhập mã Chi hội và tên Chi hội",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const currentChiHoi =
      await ChiHoi.findById(id);

    if (!currentChiHoi) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy Chi hội",
        },
        {
          status: 404,
        },
      );
    }

    const duplicateCode =
      await ChiHoi.findOne({
        maChiHoi,

        _id: {
          $ne: id,
        },
      }).lean();

    if (duplicateCode) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Mã Chi hội đã được sử dụng",
        },
        {
          status: 409,
        },
      );
    }

    const oldData = {
      maChiHoi:
        currentChiHoi.maChiHoi,

      tenChiHoi:
        currentChiHoi.tenChiHoi,

      moTa:
        currentChiHoi.moTa || "",
    };

    currentChiHoi.maChiHoi =
      maChiHoi;

    currentChiHoi.tenChiHoi =
      tenChiHoi;

    currentChiHoi.moTa =
      moTa;

    await currentChiHoi.save();

    await writeSystemLog({
      userId:
        session.userId,

      username:
        session.username,

      fullName:
        session.fullName,

      role:
        session.role,

      action: "UPDATE",

      module: "CHI_HOI",

      description:
        `${session.fullName} đã cập nhật Chi hội ${maChiHoi} - ${tenChiHoi}`,

      targetId:
        currentChiHoi._id.toString(),

      targetName:
        `${maChiHoi} - ${tenChiHoi}`,

      metadata: {
        before: oldData,

        after: {
          maChiHoi,
          tenChiHoi,
          moTa,
        },
      },

      ipAddress:
        getRequestIp(request),

      userAgent:
        getUserAgent(request),
    });

    return NextResponse.json({
      success: true,

      message:
        "Cập nhật Chi hội thành công",

      data: currentChiHoi,
    });
  } catch (error) {
    console.error(
      "Lỗi cập nhật Chi hội:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể cập nhật Chi hội",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   DELETE /api/chi-hoi/:id
========================================================= */

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    if (
      session.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Chỉ Quản trị viên được xóa Chi hội",
        },
        {
          status: 403,
        },
      );
    }

    const { id } =
      await context.params;

    if (
      !mongoose.isValidObjectId(
        id,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Mã định danh Chi hội không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const chiHoi =
      await ChiHoi.findById(id);

    if (!chiHoi) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy Chi hội",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Kiểm tra cả bảng Hội viên thật.
     */
    const hoiVienCount =
      await HoiVien.countDocuments({
        chiHoiId: id,
      });

    if (hoiVienCount > 0) {
      return NextResponse.json(
        {
          success: false,

          message:
            `Không thể xóa Chi hội vì đang có ${hoiVienCount} Hội viên trực thuộc`,
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Giữ kiểm tra User để tránh
     * tài khoản mồ côi.
     */
    const hasUsers =
      await User.exists({
        chiHoiId: id,
      });

    if (hasUsers) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không thể xóa Chi hội đang có tài khoản liên kết",
        },
        {
          status: 409,
        },
      );
    }

    const deletedData = {
      id:
        chiHoi._id.toString(),

      maChiHoi:
        chiHoi.maChiHoi,

      tenChiHoi:
        chiHoi.tenChiHoi,

      moTa:
        chiHoi.moTa || "",
    };

    await ChiHoi.findByIdAndDelete(
      id,
    );

    await writeSystemLog({
      userId:
        session.userId,

      username:
        session.username,

      fullName:
        session.fullName,

      role:
        session.role,

      action: "DELETE",

      module: "CHI_HOI",

      description:
        `${session.fullName} đã xóa Chi hội ${deletedData.maChiHoi} - ${deletedData.tenChiHoi}`,

      targetId:
        deletedData.id,

      targetName:
        `${deletedData.maChiHoi} - ${deletedData.tenChiHoi}`,

      metadata: {
        deletedData,
      },

      ipAddress:
        getRequestIp(request),

      userAgent:
        getUserAgent(request),
    });

    return NextResponse.json({
      success: true,

      message:
        "Xóa Chi hội thành công",
    });
  } catch (error) {
    console.error(
      "Lỗi xóa Chi hội:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể xóa Chi hội",
      },
      {
        status: 500,
      },
    );
  }
}