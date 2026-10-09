import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import HoiPhi from "@/models/HoiPhi";
import HoiVien from "@/models/HoiVien";
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

    await connectDB();

    const { searchParams } = new URL(request.url);

    const namHoc =
      searchParams.get("namHoc")?.trim() || "";

    const chiHoiIdFromQuery =
      searchParams.get("chiHoiId")?.trim() || "";

    if (!namHoc) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng chọn năm học",
        },
        {
          status: 400,
        },
      );
    }

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

    let chiHoiId = chiHoiIdFromQuery;

    if (session.role === "CHI_HOI_TRUONG") {
      if (!currentUser.chiHoiId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Tài khoản Chi hội trưởng chưa được gán Chi hội",
          },
          {
            status: 400,
          },
        );
      }

      chiHoiId = currentUser.chiHoiId.toString();
    }

    if (!chiHoiId) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng chọn Chi hội",
        },
        {
          status: 400,
        },
      );
    }

    const hoiVien = await HoiVien.find({
      chiHoiId,
    })
      .sort({
        hoTen: 1,
      })
      .lean();

    const hoiVienIds = hoiVien.map(
      (item) => item._id,
    );

    const hoiPhi = await HoiPhi.find({
      chiHoiId,
      namHoc,
      hoiVienId: {
        $in: hoiVienIds,
      },
    }).lean();

    const hoiPhiMap = new Map(
      hoiPhi.map((item) => [
        item.hoiVienId.toString(),
        item,
      ]),
    );

    const data = hoiVien.map((item) => {
      const record = hoiPhiMap.get(
        item._id.toString(),
      );

      return {
        hoiVienId: item._id.toString(),

        hoTen:
          (item as typeof item & { fullName?: string; maSinhVien?: string; mssv?: string }).hoTen ??
          (item as typeof item & { fullName?: string; maSinhVien?: string; mssv?: string }).fullName ??
          "",

        maSinhVien:
          (item as typeof item & { fullName?: string; maSinhVien?: string; mssv?: string }).maSinhVien ??
          (item as typeof item & { fullName?: string; maSinhVien?: string; mssv?: string }).mssv ??
          "",

        chiHoiId,

        namHoc,

        hoiPhiId: record
          ? record._id.toString()
          : null,

        soTien: record?.soTien ?? 0,

        trangThai:
          record?.trangThai ?? "CHUA_NOP",

        ngayNop: record?.ngayNop ?? null,

        ghiChu: record?.ghiChu ?? "",
      };
    });

    const tongHoiVien = data.length;

    const daNop = data.filter(
      (item) =>
        item.trangThai === "DA_NOP",
    );

    const chuaNop =
      tongHoiVien - daNop.length;

    const tongDaThu = daNop.reduce(
      (total, item) =>
        total + Number(item.soTien || 0),
      0,
    );

    return NextResponse.json({
      success: true,

      data,

      summary: {
        tongHoiVien,
        daNop: daNop.length,
        chuaNop,
        tongDaThu,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/hoi-phi:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tải danh sách hội phí",
      },
      {
        status: 500,
      },
    );
  }
}