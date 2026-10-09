import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import GiaoDichTaiChinh from "@/models/GiaoDichTaiChinh";
import User from "@/models/User";

export async function GET(request: Request) {
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
          message: "Bạn không có quyền xem báo cáo tài chính",
        },
        {
          status: 403,
        },
      );
    }

    await connectDB();

    const currentUser = await User.findById(
      session.userId,
    ).lean();

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

    const { searchParams } = new URL(request.url);

    const tuNgay =
      searchParams.get("tuNgay")?.trim() || "";

    const denNgay =
      searchParams.get("denNgay")?.trim() || "";

    const loai =
      searchParams.get("loai")?.trim() || "";

    const phamVi =
      searchParams.get("phamVi")?.trim() || "";

    const chiHoiId =
      searchParams.get("chiHoiId")?.trim() || "";

    const filter: Record<string, unknown> = {};

    if (
      loai === "THU" ||
      loai === "CHI"
    ) {
      filter.loai = loai;
    }

    if (
      phamVi === "LIEN_CHI_HOI" ||
      phamVi === "CHI_HOI"
    ) {
      filter.phamVi = phamVi;
    }

    /*
     * Chi hội trưởng chỉ được xem
     * dữ liệu Chi hội của mình.
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

      filter.phamVi = "CHI_HOI";
      filter.chiHoiId =
        currentUser.chiHoiId;
    } else if (chiHoiId) {
      if (
        !mongoose.isValidObjectId(
          chiHoiId,
        )
      ) {
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

      filter.chiHoiId =
        new mongoose.Types.ObjectId(
          chiHoiId,
        );
    }

    if (tuNgay || denNgay) {
      const ngayFilter: {
        $gte?: Date;
        $lte?: Date;
      } = {};

      if (tuNgay) {
        const start =
          new Date(
            `${tuNgay}T00:00:00.000`,
          );

        if (
          Number.isNaN(
            start.getTime(),
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Từ ngày không hợp lệ",
            },
            {
              status: 400,
            },
          );
        }

        ngayFilter.$gte = start;
      }

      if (denNgay) {
        const end =
          new Date(
            `${denNgay}T23:59:59.999`,
          );

        if (
          Number.isNaN(
            end.getTime(),
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Đến ngày không hợp lệ",
            },
            {
              status: 400,
            },
          );
        }

        ngayFilter.$lte = end;
      }

      filter.ngayGiaoDich =
        ngayFilter;
    }

    const data =
      await GiaoDichTaiChinh.find(
        filter,
      )
        .populate(
          "chiHoiId",
          "tenChiHoi maChiHoi",
        )
        .sort({
          ngayGiaoDich: -1,
          createdAt: -1,
        })
        .lean();

    let tongThu = 0;
    let tongChi = 0;

    let soKhoanThu = 0;
    let soKhoanChi = 0;

    for (const item of data) {
      const soTien =
        Number(item.soTien) || 0;

      if (item.loai === "THU") {
        tongThu += soTien;
        soKhoanThu += 1;
      }

      if (item.loai === "CHI") {
        tongChi += soTien;
        soKhoanChi += 1;
      }
    }

    return NextResponse.json({
      success: true,

      data,

      summary: {
        tongThu,
        tongChi,
        soDu: tongThu - tongChi,

        soKhoanThu,
        soKhoanChi,

        tongGiaoDich: data.length,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/tai-chinh/bao-cao:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tải báo cáo tài chính",
      },
      {
        status: 500,
      },
    );
  }
}