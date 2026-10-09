import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import HoiPhi from "@/models/HoiPhi";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

type RouteContext = {
  params: Promise<{
    hoiVienId: string;
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

    if (session.role === "HOI_VIEN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền cập nhật hội phí",
        },
        {
          status: 403,
        },
      );
    }

    const { hoiVienId } =
      await context.params;

    const body = await request.json();

    const namHoc =
      typeof body.namHoc === "string"
        ? body.namHoc.trim()
        : "";

    const soTien = Number(body.soTien);

    const trangThai =
      body.trangThai === "DA_NOP"
        ? "DA_NOP"
        : "CHUA_NOP";

    const ghiChu =
      typeof body.ghiChu === "string"
        ? body.ghiChu.trim()
        : "";

    if (!namHoc) {
      return NextResponse.json(
        {
          success: false,
          message: "Năm học không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(soTien) ||
      soTien < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Số tiền hội phí không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const currentUser = await User.findById(
      session.userId,
    );

    if (!currentUser) {
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

    const hoiVien = await HoiVien.findById(
      hoiVienId,
    );

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

    const hoiVienChiHoiId =
      hoiVien.chiHoiId;

    if (!hoiVienChiHoiId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hội viên chưa thuộc Chi hội",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Chi hội trưởng chỉ được cập nhật
     * hội viên thuộc Chi hội của mình.
     */
    if (
      session.role === "CHI_HOI_TRUONG"
    ) {
      if (!currentUser.chiHoiId) {
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
        currentUser.chiHoiId.toString() !==
        hoiVienChiHoiId.toString()
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Bạn không có quyền cập nhật Hội viên thuộc Chi hội khác",
          },
          {
            status: 403,
          },
        );
      }
    }

    const ngayNop =
      trangThai === "DA_NOP"
        ? new Date()
        : null;

    const record =
      await HoiPhi.findOneAndUpdate(
        {
          hoiVienId,
          namHoc,
        },
        {
          $set: {
            chiHoiId:
              hoiVienChiHoiId,

            soTien,

            trangThai,

            ngayNop,

            nguoiXacNhanId:
              trangThai === "DA_NOP"
                ? currentUser._id
                : null,

            ghiChu,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        },
      );

    return NextResponse.json({
      success: true,

      message:
        trangThai === "DA_NOP"
          ? "Đã xác nhận Hội viên nộp hội phí"
          : "Đã chuyển trạng thái về chưa nộp",

      data: record,
    });
  } catch (error) {
    console.error(
      "PATCH /api/hoi-phi/[hoiVienId]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể cập nhật hội phí",
      },
      {
        status: 500,
      },
    );
  }
}