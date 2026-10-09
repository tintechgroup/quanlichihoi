import { NextResponse } from "next/server";
import type { PipelineStage } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import ChiHoi from "@/models/ChiHoi";

export const dynamic = "force-dynamic";

/* =========================================================
   GET /api/chi-hoi
   - Danh sách Chi hội
   - Tìm kiếm theo mã / tên
   - Đếm số lượng Hội viên
========================================================= */

export async function GET(
  request: Request,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập",
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
            "Bạn không có quyền xem danh sách Chi hội",
        },
        {
          status: 403,
        },
      );
    }

    await connectDB();

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const pipeline: PipelineStage[] = [];

    /* =====================================================
       SEARCH
    ===================================================== */

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            {
              maChiHoi: {
                $regex: search,
                $options: "i",
              },
            },

            {
              tenChiHoi: {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      });
    }

    /* =====================================================
       SORT
    ===================================================== */

    pipeline.push({
      $sort: {
        createdAt: -1,
      },
    });

    /* =====================================================
       ĐÁNH GIÁ CHI HỘI
    ===================================================== */

    pipeline.push({
      $lookup: {
        from:
          "danh_gia_chi_hoi",

        localField: "_id",

        foreignField:
          "chiHoiId",

        as: "danhGiaList",
      },
    });

    /* =====================================================
       ĐẾM HỘI VIÊN

       models/HoiVien.ts dùng:
       collection: "hoi_vien"
    ===================================================== */

    pipeline.push({
      $lookup: {
        from: "hoi_vien",

        let: {
          chiHoiId: "$_id",
        },

        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  "$chiHoiId",
                  "$$chiHoiId",
                ],
              },
            },
          },

          {
            $count: "total",
          },
        ],

        as: "thanhVienThongKe",
      },
    });

    /* =====================================================
       ADD FIELDS
    ===================================================== */

    pipeline.push({
      $addFields: {
        danhGia: {
          $arrayElemAt: [
            "$danhGiaList",
            0,
          ],
        },

        soLuongThanhVien: {
          $ifNull: [
            {
              $arrayElemAt: [
                "$thanhVienThongKe.total",
                0,
              ],
            },
            0,
          ],
        },
      },
    });

    /* =====================================================
       HIDE TEMP DATA
    ===================================================== */

    pipeline.push({
      $project: {
        danhGiaList: 0,

        thanhVienThongKe: 0,
      },
    });

    const chiHoiList =
      await ChiHoi.aggregate(
        pipeline,
      );

    return NextResponse.json({
      success: true,

      data: chiHoiList,

      filters: {
        search,
      },
    });
  } catch (error) {
    console.error(
      "Lỗi lấy danh sách Chi hội:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể tải danh sách Chi hội",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST /api/chi-hoi
========================================================= */

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
          message:
            "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    if (
      session.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Chỉ Quản trị viên được thêm Chi hội",
        },
        {
          status: 403,
        },
      );
    }

    const body =
      await request.json();

    const maChiHoi =
      typeof body.maChiHoi ===
      "string"
        ? body.maChiHoi
            .trim()
            .toUpperCase()
        : "";

    const tenChiHoi =
      typeof body.tenChiHoi ===
      "string"
        ? body.tenChiHoi.trim()
        : "";

    const moTa =
      typeof body.moTa ===
      "string"
        ? body.moTa.trim()
        : "";

    if (
      !maChiHoi ||
      !tenChiHoi
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Vui lòng nhập mã và tên Chi hội",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const existingChiHoi =
      await ChiHoi.findOne({
        maChiHoi,
      }).lean();

    if (existingChiHoi) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Mã Chi hội đã tồn tại",
        },
        {
          status: 409,
        },
      );
    }

    const newChiHoi =
      await ChiHoi.create({
        maChiHoi,
        tenChiHoi,
        moTa,
      });

    await writeSystemLog({
      userId:
        session.userId,

      username:
        session.username,

      fullName:
        session.fullName,

      role:
        session.role,

      action: "CREATE",

      module: "CHI_HOI",

      description:
        `${session.fullName} đã thêm Chi hội ${maChiHoi} - ${tenChiHoi}`,

      targetId:
        newChiHoi._id.toString(),

      targetName:
        `${maChiHoi} - ${tenChiHoi}`,

      metadata: {
        maChiHoi,
        tenChiHoi,
        moTa,
      },

      ipAddress:
        getRequestIp(request),

      userAgent:
        getUserAgent(request),
    });

    return NextResponse.json(
      {
        success: true,

        message:
          "Thêm Chi hội thành công",

        data: newChiHoi,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Lỗi thêm Chi hội:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể thêm Chi hội",
      },
      {
        status: 500,
      },
    );
  }
}
