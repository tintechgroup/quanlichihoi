import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import DangKyTapTheHoatDong from "@/models/DangKyTapTheHoatDong";
import HoatDong from "@/models/HoatDong";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

export const dynamic =
  "force-dynamic";

/* =========================================================
   GET /api/dang-ky-tap-the
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
      session.role !==
        "CHI_HOI_TRUONG" &&
      session.role !==
        "ADMIN" &&
      session.role !==
        "BAN_CHAP_HANH"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền xem đăng ký tập thể",
        },
        {
          status: 403,
        },
      );
    }

    await connectDB();

    const { searchParams } =
      new URL(request.url);

    const status =
      searchParams
        .get("status")
        ?.trim() || "";

    const filter: Record<
      string,
      unknown
    > = {};

    if (
      status === "DA_GUI" ||
      status ===
        "DA_TIEP_NHAN"
    ) {
      filter.trangThai =
        status;
    }

    /*
     * Chi hội trưởng chỉ xem
     * dữ liệu của Chi hội mình.
     */
    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      const user =
        await User.findById(
          session.userId,
        )
          .select(
            "chiHoiId",
          )
          .lean();

      if (!user?.chiHoiId) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      filter.chiHoiId =
        user.chiHoiId;
    }

    const data =
      await DangKyTapTheHoatDong.find(
        filter,
      )
        .populate(
          "hoatDongId",
          [
            "maHoatDong",
            "tenHoatDong",
            "phamVi",
            "diaDiem",
            "thoiGianBatDau",
            "thoiGianKetThuc",
            "hanDangKy",
            "soLuongToiDa",
            "trangThai",
          ].join(" "),
        )
        .populate(
          "chiHoiId",
          "maChiHoi tenChiHoi",
        )
        .populate(
          "hoiVienIds",
          [
            "maHoiVien",
            "hoTen",
            "lop",
            "email",
            "soDienThoai",
            "trangThai",
          ].join(" "),
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET /api/dang-ky-tap-the:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể tải danh sách đăng ký tập thể",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST /api/dang-ky-tap-the
   Chi hội trưởng gửi danh sách
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
      session.role !==
      "CHI_HOI_TRUONG"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Chỉ Chi hội trưởng được gửi danh sách đăng ký tập thể",
        },
        {
          status: 403,
        },
      );
    }

    const body =
      await request.json();

    const hoatDongId =
      typeof body.hoatDongId ===
      "string"
        ? body.hoatDongId.trim()
        : "";

    const hoiVienIds =
      Array.isArray(
        body.hoiVienIds,
      )
        ? Array.from(
            new Set<string>(
              body.hoiVienIds.filter(
                (
                  value: unknown,
                ) =>
                  typeof value ===
                    "string" &&
                  mongoose.isValidObjectId(
                    value,
                  ),
              ),
            ),
          )
        : [];

    const ghiChu =
      typeof body.ghiChu ===
      "string"
        ? body.ghiChu.trim()
        : "";

    if (
      !mongoose.isValidObjectId(
        hoatDongId,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Hoạt động không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      hoiVienIds.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Vui lòng chọn ít nhất một Hội viên",
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
      )
        .select(
          "fullName chiHoiId",
        );

    if (
      !currentUser ||
      !currentUser.chiHoiId
    ) {
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

    const activity =
      await HoatDong.findById(
        hoatDongId,
      ).lean();

    if (!activity) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy hoạt động",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Chỉ hoạt động cấp Liên Chi.
     */
    if (
      activity.phamVi !==
      "LIEN_CHI_HOI"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Chỉ được đăng ký tập thể cho hoạt động cấp Liên Chi",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Cổng đăng ký chỉ mở với
     * hoạt động đã duyệt / sắp diễn ra.
     */
    if (
      activity.trangThai !==
        "DA_DUYET" &&
      activity.trangThai !==
        "SAP_DIEN_RA"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Hoạt động hiện không mở đăng ký",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Kiểm tra deadline.
     */
    if (
      activity.hanDangKy
    ) {
      const deadline =
        new Date(
          activity.hanDangKy,
        );

      if (
        !Number.isNaN(
          deadline.getTime(),
        ) &&
        deadline.getTime() <
          Date.now()
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Hoạt động đã đóng cổng đăng ký",
          },
          {
            status: 409,
          },
        );
      }
    }

    /*
     * Mỗi Chi hội chỉ gửi một danh sách.
     */
    const existing =
      await DangKyTapTheHoatDong.findOne({
        hoatDongId,

        chiHoiId:
          currentUser.chiHoiId,
      }).lean();

    if (existing) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Chi hội đã gửi danh sách đăng ký cho hoạt động này",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Tất cả Hội viên phải:
     * - tồn tại
     * - thuộc đúng Chi hội
     * - đang hoạt động
     */
    const members =
      await HoiVien.find({
        _id: {
          $in: hoiVienIds,
        },

        chiHoiId:
          currentUser.chiHoiId,

        trangThai:
          "DANG_HOAT_DONG",
      })
        .select(
          "_id maHoiVien hoTen",
        )
        .lean();

    if (
      members.length !==
      hoiVienIds.length
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Danh sách có Hội viên không thuộc Chi hội hoặc không còn hoạt động",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Kiểm tra giới hạn toàn hoạt động.
     *
     * Tổng số đã gửi từ tất cả Chi hội
     * + danh sách hiện tại
     * không được vượt quá soLuongToiDa.
     */
    if (
      typeof activity.soLuongToiDa ===
        "number" &&
      activity.soLuongToiDa >
        0
    ) {
      const aggregate =
        await DangKyTapTheHoatDong.aggregate([
          {
            $match: {
              hoatDongId:
                new mongoose.Types.ObjectId(
                  hoatDongId,
                ),
            },
          },

          {
            $project: {
              total: {
                $size:
                  "$hoiVienIds",
              },
            },
          },

          {
            $group: {
              _id: null,

              total: {
                $sum:
                  "$total",
              },
            },
          },
        ]);

      const registered =
        Number(
          aggregate?.[0]
            ?.total || 0,
        );

      if (
        registered +
          hoiVienIds.length >
        activity.soLuongToiDa
      ) {
        const remaining =
          Math.max(
            0,
            activity.soLuongToiDa -
              registered,
          );

        return NextResponse.json(
          {
            success: false,

            message:
              `Số lượng đăng ký vượt quá giới hạn. Hoạt động chỉ còn ${remaining} vị trí.`,
          },
          {
            status: 409,
          },
        );
      }
    }

    const record =
      await DangKyTapTheHoatDong.create({
        hoatDongId,

        chiHoiId:
          currentUser.chiHoiId,

        hoiVienIds,

        nguoiGuiId:
          currentUser._id,

        nguoiGuiTen:
          currentUser.fullName,

        trangThai:
          "DA_GUI",

        ghiChu,
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

      action:
        "CREATE",

      module:
        "HOAT_DONG",

      description:
        `${session.fullName} đã gửi danh sách ${hoiVienIds.length} Hội viên đăng ký hoạt động ${activity.maHoatDong} - ${activity.tenHoatDong}`,

      targetId:
        record._id.toString(),

      targetName:
        `${activity.maHoatDong} - ${activity.tenHoatDong}`,

      metadata: {
        loai:
          "DANG_KY_TAP_THE",

        hoatDongId,

        chiHoiId:
          currentUser.chiHoiId.toString(),

        soLuongHoiVien:
          hoiVienIds.length,

        hoiVienIds,
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
          "Gửi danh sách đăng ký thành công",

        data: record,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/dang-ky-tap-the:",
      error,
    );

    if (
      error instanceof
        Error &&
      error.message.includes(
        "E11000",
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Chi hội đã đăng ký hoạt động này",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể gửi danh sách đăng ký",
      },
      {
        status: 500,
      },
    );
  }
}
