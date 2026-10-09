import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import User from "@/models/User";
import DanhGiaHeThong from "@/models/DanhGiaHeThong";

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
          message: "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    await connectDB();

    const { searchParams } =
      new URL(request.url);

    const soSao =
      searchParams.get("soSao");

    const nhom =
      searchParams
        .get("nhom")
        ?.trim() || "";

    const trangThai =
      searchParams
        .get("trangThai")
        ?.trim() || "";

    const filter: Record<
      string,
      unknown
    > = {};

    const canManage =
      session.role === "ADMIN" ||
      session.role ===
        "BAN_CHAP_HANH";

    if (!canManage) {
      filter.nguoiDanhGiaId =
        session.userId;
    }

    if (
      soSao &&
      ["1", "2", "3", "4", "5"].includes(
        soSao,
      )
    ) {
      filter.soSao =
        Number(soSao);
    }

    const validGroups = [
      "GIAO_DIEN",
      "TINH_NANG",
      "HIEU_NANG",
      "DE_XUAT",
      "KHAC",
    ];

    if (
      nhom &&
      validGroups.includes(nhom)
    ) {
      filter.nhom = nhom;
    }

    const validStatuses = [
      "MOI",
      "DA_XEM",
      "DA_GHI_NHAN",
    ];

    if (
      trangThai &&
      validStatuses.includes(
        trangThai,
      )
    ) {
      filter.trangThai =
        trangThai;
    }

    const data =
      await DanhGiaHeThong.find(
        filter,
      )
        .sort({
          createdAt: -1,
        })
        .lean();

    /*
     * Thống kê toàn hệ thống
     * chỉ hiển thị cho Admin/BCH.
     *
     * Với user thường, thống kê trên
     * chính dữ liệu của họ.
     */
    const summaryData =
      await DanhGiaHeThong.aggregate([
        {
          $match: canManage
            ? {}
            : {
                nguoiDanhGiaId:
                  new (
                    await import(
                      "mongoose"
                    )
                  ).default.Types.ObjectId(
                    session.userId,
                  ),
              },
        },

        {
          $group: {
            _id: null,

            tongDanhGia: {
              $sum: 1,
            },

            diemTrungBinh: {
              $avg: "$soSao",
            },

            motSao: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$soSao",
                      1,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            haiSao: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$soSao",
                      2,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            baSao: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$soSao",
                      3,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            bonSao: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$soSao",
                      4,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            namSao: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$soSao",
                      5,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

    const summary =
      summaryData[0] || {
        tongDanhGia: 0,
        diemTrungBinh: 0,
        motSao: 0,
        haiSao: 0,
        baSao: 0,
        bonSao: 0,
        namSao: 0,
      };

    return NextResponse.json({
      success: true,

      data,

      summary: {
        tongDanhGia:
          Number(
            summary.tongDanhGia,
          ) || 0,

        diemTrungBinh:
          Number(
            Number(
              summary.diemTrungBinh ||
                0,
            ).toFixed(1),
          ),

        motSao:
          Number(
            summary.motSao,
          ) || 0,

        haiSao:
          Number(
            summary.haiSao,
          ) || 0,

        baSao:
          Number(
            summary.baSao,
          ) || 0,

        bonSao:
          Number(
            summary.bonSao,
          ) || 0,

        namSao:
          Number(
            summary.namSao,
          ) || 0,
      },

      permissions: {
        canManage,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/danh-gia-he-thong:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tải đánh giá hệ thống",
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

    const body =
      await request.json();

    const soSao =
      Number(body.soSao);

    const noiDung =
      typeof body.noiDung ===
      "string"
        ? body.noiDung.trim()
        : "";

    const validGroups = [
      "GIAO_DIEN",
      "TINH_NANG",
      "HIEU_NANG",
      "DE_XUAT",
      "KHAC",
    ];

    const nhom =
      validGroups.includes(
        body.nhom,
      )
        ? body.nhom
        : "KHAC";

    if (
      !Number.isInteger(
        soSao,
      ) ||
      soSao < 1 ||
      soSao > 5
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Số sao phải từ 1 đến 5",
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
            "Vui lòng nhập nội dung đánh giá",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const user =
      await User.findById(
        session.userId,
      );

    if (!user) {
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
      await DanhGiaHeThong.create({
        nguoiDanhGiaId:
          user._id,

        nguoiDanhGiaTen:
          user.fullName,

        vaiTro:
          user.role,

        soSao,

        nhom,

        noiDung,

        trangThai: "MOI",
      });

    return NextResponse.json(
      {
        success: true,

        message:
          "Cảm ơn bạn đã gửi đánh giá",

        data: record,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/danh-gia-he-thong:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể gửi đánh giá",
      },
      {
        status: 500,
      },
    );
  }
}