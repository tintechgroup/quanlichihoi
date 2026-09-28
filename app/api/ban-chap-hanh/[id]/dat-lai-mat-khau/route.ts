import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";
import BanChapHanh from "@/models/BanChapHanh";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền đặt lại mật khẩu Ban Chấp hành",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã thành viên Ban Chấp hành không hợp lệ",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const password =
      typeof body.password === "string"
        ? body.password
        : typeof body.newPassword === "string"
          ? body.newPassword
          : "";

    const confirmPassword =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : password;

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng nhập mật khẩu mới",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Mật khẩu mới phải có ít nhất 6 ký tự",
        },
        { status: 400 }
      );
    }

    if (password.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Mật khẩu mới không được vượt quá 100 ký tự",
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Mật khẩu xác nhận không khớp",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const banChapHanh = await BanChapHanh.findById(id)
      .select(
        "maBanChapHanh hoiVienId taiKhoanId chucVu trangThai"
      )
      .lean();

    if (!banChapHanh) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy thành viên Ban Chấp hành",
        },
        { status: 404 }
      );
    }

    let taiKhoanId = banChapHanh.taiKhoanId
      ? String(banChapHanh.taiKhoanId)
      : "";

    /*
     * Một số dữ liệu cũ chỉ lưu tài khoản trong Hội viên.
     * Vì vậy nếu Ban Chấp hành chưa có taiKhoanId,
     * hệ thống sẽ tìm tài khoản qua hồ sơ Hội viên.
     */
    if (!taiKhoanId && banChapHanh.hoiVienId) {
      const hoiVien = await HoiVien.findById(
        banChapHanh.hoiVienId
      )
        .select("taiKhoanId")
        .lean();

      if (hoiVien?.taiKhoanId) {
        taiKhoanId = String(hoiVien.taiKhoanId);
      }
    }

    if (
      !taiKhoanId ||
      !mongoose.Types.ObjectId.isValid(taiKhoanId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thành viên Ban Chấp hành chưa được cấp tài khoản",
        },
        { status: 400 }
      );
    }

    const user = await User.findById(taiKhoanId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy tài khoản của thành viên Ban Chấp hành",
        },
        { status: 404 }
      );
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể đặt lại mật khẩu tài khoản Quản trị viên tại đây",
        },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    user.password = passwordHash;

    /*
     * Thành viên vẫn phải giữ trạng thái hiện tại.
     * Đặt lại mật khẩu không tự động mở lại tài khoản bị khóa.
     */
    await user.save();

    /*
     * Đồng bộ liên kết tài khoản với Ban Chấp hành
     * đối với dữ liệu cũ chưa có taiKhoanId.
     */
    if (!banChapHanh.taiKhoanId) {
      await BanChapHanh.findByIdAndUpdate(id, {
        $set: {
          taiKhoanId: user._id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Đặt lại mật khẩu Ban Chấp hành thành công",
      data: {
        username: user.username,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    console.error(
      "Lỗi đặt lại mật khẩu Ban Chấp hành:",
      error
    );

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu gửi lên không hợp lệ",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi đặt lại mật khẩu Ban Chấp hành",
      },
      { status: 500 }
    );
  }
}