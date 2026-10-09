import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import GiaoDichTaiChinh from "@/models/GiaoDichTaiChinh";
import User from "@/models/User";

export async function GET() {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    if (session.role === "HOI_VIEN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền truy cập",
        },
        {
          status: 403,
        },
      );
    }

    await connectDB();

    const user = await User.findById(
      session.userId,
    ).lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy tài khoản",
        },
        {
          status: 404,
        },
      );
    }

    let match: Record<string, unknown> = {};

    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      match = {
        phamVi: "CHI_HOI",
        chiHoiId: user.chiHoiId,
      };
    }

    const result =
      await GiaoDichTaiChinh.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: "$loai",
            tongTien: {
              $sum: "$soTien",
            },
            soGiaoDich: {
              $sum: 1,
            },
          },
        },
      ]);

    let tongThu = 0;
    let tongChi = 0;
    let soKhoanThu = 0;
    let soKhoanChi = 0;

    for (const item of result) {
      if (item._id === "THU") {
        tongThu = item.tongTien;
        soKhoanThu =
          item.soGiaoDich;
      }

      if (item._id === "CHI") {
        tongChi = item.tongTien;
        soKhoanChi =
          item.soGiaoDich;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tongThu,
        tongChi,
        soDu: tongThu - tongChi,
        soKhoanThu,
        soKhoanChi,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/tai-chinh/tong-quan:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tải tổng quan tài chính",
      },
      {
        status: 500,
      },
    );
  }
}