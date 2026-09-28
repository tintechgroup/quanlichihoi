import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";
import ChiHoi from "@/models/ChiHoi";

export const dynamic = "force-dynamic";

export async function GET() {
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

    if (
      session.role !== "ADMIN" &&
      session.role !== "BAN_CHAP_HANH"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền xem danh sách Chi hội",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const chiHoiList = await ChiHoi.aggregate([
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $lookup: {
          from: "danh_gia_chi_hoi",
          localField: "_id",
          foreignField: "chiHoiId",
          as: "danhGiaList",
        },
      },
      {
        $addFields: {
          danhGia: {
            $arrayElemAt: ["$danhGiaList", 0],
          },
        },
      },
      {
        $project: {
          danhGiaList: 0,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: chiHoiList,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách Chi hội:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể tải danh sách Chi hội",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
          message: "Chỉ Quản trị viên được thêm Chi hội",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const maChiHoi =
      typeof body.maChiHoi === "string"
        ? body.maChiHoi.trim().toUpperCase()
        : "";

    const tenChiHoi =
      typeof body.tenChiHoi === "string"
        ? body.tenChiHoi.trim()
        : "";

    const moTa =
      typeof body.moTa === "string"
        ? body.moTa.trim()
        : "";

    if (!maChiHoi || !tenChiHoi) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng nhập mã và tên Chi hội",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existingChiHoi = await ChiHoi.findOne({
      maChiHoi,
    }).lean();

    if (existingChiHoi) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Chi hội đã tồn tại",
        },
        { status: 409 }
      );
    }

    const newChiHoi = await ChiHoi.create({
      maChiHoi,
      tenChiHoi,
      moTa,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Thêm Chi hội thành công",
        data: newChiHoi,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lỗi thêm Chi hội:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể thêm Chi hội",
      },
      { status: 500 }
    );
  }
}