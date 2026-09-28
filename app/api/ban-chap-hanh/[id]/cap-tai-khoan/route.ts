import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession as getSession } from "@/lib/session";
import BanChapHanh from "@/models/BanChapHanh";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
          message:
            "Bạn không có quyền cấp tài khoản Ban Chấp hành",
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

export async function POST(
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
          message: "Mã Ban Chấp hành không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    await connectDB();

    const banChapHanh = await BanChapHanh.findById(id)
      .select(
        "_id maBanChapHanh hoiVienId taiKhoanId chucVu nhiemKy trangThai",
      )
      .lean();

    if (!banChapHanh) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy thành viên Ban Chấp hành",
        },
        {
          status: 404,
        },
      );
    }

    if (banChapHanh.trangThai !== "DANG_DUONG_NHIEM") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể cấp tài khoản cho thành viên đã kết thúc nhiệm kỳ",
        },
        {
          status: 400,
        },
      );
    }

    const hoiVien = await HoiVien.findById(
      banChapHanh.hoiVienId,
    )
      .select(
        "_id maHoiVien hoTen email taiKhoanId trangThai",
      )
      .lean();

    if (!hoiVien) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy hồ sơ Hội viên liên kết",
        },
        {
          status: 404,
        },
      );
    }

    if (hoiVien.trangThai !== "DANG_HOAT_DONG") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể cấp tài khoản cho Hội viên đang tạm ngừng",
        },
        {
          status: 400,
        },
      );
    }

    const linkedAccountId =
      banChapHanh.taiKhoanId || hoiVien.taiKhoanId;

    /*
     * Trường hợp Hội viên đã có tài khoản:
     * giữ nguyên tên đăng nhập và mật khẩu,
     * chỉ nâng quyền thành BAN_CHAP_HANH.
     */
    if (linkedAccountId) {
      const existingAccount = await User.findById(
        linkedAccountId,
      ).select(
        "_id username fullName role isActive",
      );

      if (!existingAccount) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Không tìm thấy tài khoản đang liên kết với Hội viên",
          },
          {
            status: 404,
          },
        );
      }

      if (existingAccount.role === "ADMIN") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Không thể thay đổi quyền của tài khoản Quản trị viên",
          },
          {
            status: 403,
          },
        );
      }

      existingAccount.role = "BAN_CHAP_HANH";
      existingAccount.isActive = true;

      await existingAccount.save();

      await Promise.all([
        BanChapHanh.updateOne(
          {
            _id: id,
          },
          {
            $set: {
              taiKhoanId: existingAccount._id,
            },
          },
        ),

        HoiVien.updateOne(
          {
            _id: hoiVien._id,
          },
          {
            $set: {
              taiKhoanId: existingAccount._id,
            },
          },
        ),
      ]);

      return NextResponse.json(
        {
          success: true,
          message:
            "Cấp quyền Ban Chấp hành cho tài khoản hiện có thành công",
          data: {
            accountId: existingAccount._id,
            username: existingAccount.username,
            fullName: existingAccount.fullName,
            role: existingAccount.role,
            isActive: existingAccount.isActive,
            createdNewAccount: false,
          },
        },
        {
          status: 200,
        },
      );
    }

    /*
     * Trường hợp Hội viên chưa có tài khoản:
     * cần nhập tên đăng nhập và mật khẩu để tạo mới.
     */
    if (!username) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên đăng nhập không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (!/^[a-z0-9._-]+$/.test(username)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tên đăng nhập chỉ được chứa chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang",
        },
        {
          status: 400,
        },
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tên đăng nhập phải có từ 3 đến 50 ký tự",
        },
        {
          status: 400,
        },
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: "Mật khẩu không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Mật khẩu phải có ít nhất 6 ký tự",
        },
        {
          status: 400,
        },
      );
    }

    if (password.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mật khẩu không được vượt quá 100 ký tự",
        },
        {
          status: 400,
        },
      );
    }

    const duplicatedUsername = await User.findOne({
      username,
    })
      .select("_id")
      .lean();

    if (duplicatedUsername) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên đăng nhập đã được sử dụng",
        },
        {
          status: 409,
        },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newAccount = await User.create({
      username,
      password: hashedPassword,
      fullName: hoiVien.hoTen,
      role: "BAN_CHAP_HANH",
      isActive: true,
    });

    try {
      await Promise.all([
        BanChapHanh.updateOne(
          {
            _id: id,
          },
          {
            $set: {
              taiKhoanId: newAccount._id,
            },
          },
        ),

        HoiVien.updateOne(
          {
            _id: hoiVien._id,
          },
          {
            $set: {
              taiKhoanId: newAccount._id,
            },
          },
        ),
      ]);
    } catch (linkError) {
      /*
       * Nếu không liên kết được tài khoản với hồ sơ,
       * xóa tài khoản vừa tạo để tránh dữ liệu thừa.
       */
      await User.deleteOne({
        _id: newAccount._id,
      });

      throw linkError;
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Tạo và cấp tài khoản Ban Chấp hành thành công",
        data: {
          accountId: newAccount._id,
          username: newAccount.username,
          fullName: newAccount.fullName,
          role: newAccount.role,
          isActive: newAccount.isActive,
          createdNewAccount: true,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Lỗi cấp tài khoản Ban Chấp hành:",
      error,
    );

    if (
      error instanceof Error &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên đăng nhập đã được sử dụng",
        },
        {
          status: 409,
        },
      );
    }

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
        message:
          "Đã xảy ra lỗi khi cấp tài khoản Ban Chấp hành",
      },
      {
        status: 500,
      },
    );
  }
}