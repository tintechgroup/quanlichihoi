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

    let filter: Record<string, unknown> = {};

    /*
     * Chi hội trưởng chỉ xem
     * tài chính của Chi hội mình.
     */
    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      filter = {
        phamVi: "CHI_HOI",
        chiHoiId: user.chiHoiId,
      };
    }

    /*
     * Hội viên không được
     * vào module quản trị tài chính.
     */
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

    const giaoDich =
      await GiaoDichTaiChinh.find(filter)
        .populate(
          "chiHoiId",
          "tenChiHoi maChiHoi",
        )
        .sort({
          ngayGiaoDich: -1,
          createdAt: -1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      data: giaoDich,
    });
  } catch (error) {
    console.error(
      "GET /api/tai-chinh:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tải dữ liệu tài chính",
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
            "Bạn không có quyền thực hiện thao tác này",
        },
        {
          status: 403,
        },
      );
    }

    const body = await request.json();

    const loai =
      body.loai === "THU" ||
      body.loai === "CHI"
        ? body.loai
        : "";

    const soTien = Number(body.soTien);

    const noiDung =
      typeof body.noiDung === "string"
        ? body.noiDung.trim()
        : "";

    const ghiChu =
      typeof body.ghiChu === "string"
        ? body.ghiChu.trim()
        : "";

    const ngayGiaoDich =
      body.ngayGiaoDich
        ? new Date(body.ngayGiaoDich)
        : new Date();

    if (!loai) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Loại giao dịch không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(soTien) ||
      soTien <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Số tiền phải lớn hơn 0",
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
            "Nội dung giao dịch không được để trống",
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

    let phamVi:
      | "LIEN_CHI_HOI"
      | "CHI_HOI";

    let chiHoiId = null;

    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
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

      phamVi = "CHI_HOI";
      chiHoiId = user.chiHoiId;
    } else {
      phamVi =
        body.phamVi === "CHI_HOI"
          ? "CHI_HOI"
          : "LIEN_CHI_HOI";

      chiHoiId =
        phamVi === "CHI_HOI"
          ? body.chiHoiId || null
          : null;

      if (
        phamVi === "CHI_HOI" &&
        !chiHoiId
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Vui lòng chọn Chi hội",
          },
          {
            status: 400,
          },
        );
      }
    }

    const giaoDich =
      await GiaoDichTaiChinh.create({
        loai,
        phamVi,
        chiHoiId,
        soTien,
        noiDung,
        ngayGiaoDich,
        ghiChu,
        nguoiTaoId: user._id,
        nguoiTaoTen: user.fullName,
      });

    return NextResponse.json(
      {
        success: true,
        message:
          loai === "THU"
            ? "Thêm khoản thu thành công"
            : "Thêm khoản chi thành công",
        data: giaoDich,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/tai-chinh:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tạo giao dịch tài chính",
      },
      {
        status: 500,
      },
    );
  }
}