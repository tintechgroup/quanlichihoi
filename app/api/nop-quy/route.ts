import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import ChiHoi from "@/models/ChiHoi";
import NopQuyChiHoi from "@/models/NopQuyChiHoi";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getCurrentSession();

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
          message: "Bạn không có quyền truy cập",
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

    const filter: Record<string, unknown> = {};

    if (session.role === "CHI_HOI_TRUONG") {
      if (!user.chiHoiId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Tài khoản chưa được gán Chi hội",
          },
          {
            status: 400,
          },
        );
      }

      filter.chiHoiId = user.chiHoiId;
    }

    const data = await NopQuyChiHoi.find(
      filter,
    )
      .sort({
        createdAt: -1,
      })
      .lean();

    return NextResponse.json({
      success: true,

      data,

      permissions: {
        canCreate:
          session.role ===
          "CHI_HOI_TRUONG",

        canApprove:
          session.role === "ADMIN" ||
          session.role ===
            "BAN_CHAP_HANH",
      },
    });
  } catch (error) {
    console.error(
      "GET /api/nop-quy:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tải danh sách nộp quỹ",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const session = await getCurrentSession();

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

    if (
      session.role !==
      "CHI_HOI_TRUONG"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chỉ Chi hội trưởng mới được tạo phiếu nộp quỹ",
        },
        {
          status: 403,
        },
      );
    }

    const body = await request.json();

    const soTien = Number(body.soTien);

    const noiDung =
      typeof body.noiDung === "string"
        ? body.noiDung.trim()
        : "";

    const ghiChu =
      typeof body.ghiChu === "string"
        ? body.ghiChu.trim()
        : "";

    const ngayNop =
      typeof body.ngayNop === "string" &&
      body.ngayNop
        ? new Date(body.ngayNop)
        : new Date();

    if (
      !Number.isFinite(soTien) ||
      soTien <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Số tiền phải lớn hơn 0",
        },
        {
          status: 400,
        },
      );
    }

    if (!noiDung) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nội dung nộp quỹ không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (
      Number.isNaN(ngayNop.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Ngày nộp không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const user = await User.findById(
      session.userId,
    );

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

    if (!user.chiHoiId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tài khoản chưa được gán Chi hội",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !mongoose.isValidObjectId(
        user.chiHoiId,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thông tin Chi hội không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const chiHoi =
      await ChiHoi.findById(
        user.chiHoiId,
      ).lean();

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

    const tenChiHoi =
      (chiHoi as {
        tenChiHoi?: string;
        ten?: string;
      }).tenChiHoi ||
      (chiHoi as {
        tenChiHoi?: string;
        ten?: string;
      }).ten ||
      "Chi hội";

    const record =
      await NopQuyChiHoi.create({
        chiHoiId: user.chiHoiId,

        tenChiHoiSnapshot:
          tenChiHoi,

        soTien,

        noiDung,

        ghiChu,

        ngayNop,

        trangThai: "CHO_DUYET",

        nguoiTaoId: user._id,

        nguoiTaoTen:
          user.fullName,
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Tạo phiếu nộp quỹ thành công, đang chờ duyệt",
        data: record,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/nop-quy:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tạo phiếu nộp quỹ",
      },
      {
        status: 500,
      },
    );
  }
}