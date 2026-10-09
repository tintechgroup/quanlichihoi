import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import GiaoDichTaiChinh from "@/models/GiaoDichTaiChinh";
import NopQuyChiHoi from "@/models/NopQuyChiHoi";
import User from "@/models/User";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
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
          message: "Bạn chưa đăng nhập",
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
            "Bạn không có quyền duyệt phiếu nộp quỹ",
        },
        {
          status: 403,
        },
      );
    }

    const { id } =
      await context.params;

    if (
      !mongoose.isValidObjectId(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã phiếu không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();

    const action =
      body.action === "APPROVE"
        ? "APPROVE"
        : body.action === "REJECT"
          ? "REJECT"
          : "";

    const lyDoTuChoi =
      typeof body.lyDoTuChoi === "string"
        ? body.lyDoTuChoi.trim()
        : "";

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thao tác không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      action === "REJECT" &&
      !lyDoTuChoi
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng nhập lý do từ chối",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const currentUser =
      await User.findById(
        session.userId,
      );

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy tài khoản",
        },
        {
          status: 404,
        },
      );
    }

    const record =
      await NopQuyChiHoi.findById(id);

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy phiếu nộp quỹ",
        },
        {
          status: 404,
        },
      );
    }

    if (
      record.trangThai !==
      "CHO_DUYET"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phiếu này đã được xử lý trước đó",
        },
        {
          status: 409,
        },
      );
    }

    if (action === "REJECT") {
      record.trangThai =
        "TU_CHOI";

      record.nguoiDuyetId =
        currentUser._id;

      record.nguoiDuyetTen =
        currentUser.fullName;

      record.ngayDuyet =
        new Date();

      record.lyDoTuChoi =
        lyDoTuChoi;

      await record.save();

      return NextResponse.json({
        success: true,
        message:
          "Đã từ chối phiếu nộp quỹ",
      });
    }

    /*
     * Nếu vì một lý do nào đó giao dịch
     * đã được tạo trước đó thì không tạo
     * thêm lần nữa.
     */
    if (
      record.giaoDichTaiChinhId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phiếu này đã được ghi nhận vào tài chính",
        },
        {
          status: 409,
        },
      );
    }

    const giaoDich =
      await GiaoDichTaiChinh.create({
        loai: "THU",

        phamVi: "LIEN_CHI_HOI",

        chiHoiId: null,

        soTien: record.soTien,

        noiDung:
          `Nộp quỹ từ ${record.tenChiHoiSnapshot}: ${record.noiDung}`,

        ngayGiaoDich:
          record.ngayNop,

        ghiChu:
          record.ghiChu || "",

        nguoiTaoId:
          currentUser._id,

        nguoiTaoTen:
          currentUser.fullName,
      });

    record.trangThai =
      "DA_DUYET";

    record.nguoiDuyetId =
      currentUser._id;

    record.nguoiDuyetTen =
      currentUser.fullName;

    record.ngayDuyet =
      new Date();

    record.giaoDichTaiChinhId =
      giaoDich._id;

    await record.save();

    return NextResponse.json({
      success: true,
      message:
        "Duyệt phiếu thành công và đã ghi nhận vào quỹ Liên Chi hội",
    });
  } catch (error) {
    console.error(
      "PATCH /api/nop-quy/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể xử lý phiếu nộp quỹ",
      },
      {
        status: 500,
      },
    );
  }
}