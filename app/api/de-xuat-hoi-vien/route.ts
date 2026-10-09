import "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import DeXuatHoiVien from "@/models/DeXuatHoiVien";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

export const dynamic =
  "force-dynamic";

const PHONE_REGEX =
  /^0\d{9}$/;

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* =========================================================
   GET
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

    await connectDB();

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const status =
      searchParams
        .get("status")
        ?.trim() || "";

    const filter: Record<
      string,
      unknown
    > = {};

    /*
     * Chi hội trưởng chỉ được
     * nhìn đề xuất Chi hội mình.
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
    } else if (
      session.role !==
        "ADMIN" &&
      session.role !==
        "BAN_CHAP_HANH"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền xem đề xuất Hội viên",
        },
        {
          status: 403,
        },
      );
    }

    if (
      [
        "CHO_XU_LY",
        "DA_PHE_DUYET",
        "TU_CHOI",
      ].includes(status)
    ) {
      filter.trangThai =
        status;
    }

    if (search) {
      filter.$or = [
        {
          maHoiVien: {
            $regex: search,

            $options: "i",
          },
        },

        {
          hoTen: {
            $regex: search,

            $options: "i",
          },
        },

        {
          email: {
            $regex: search,

            $options: "i",
          },
        },

        {
          soDienThoai: {
            $regex: search,

            $options: "i",
          },
        },
      ];
    }

    const data =
      await DeXuatHoiVien.find(
        filter,
      )
        .populate(
          "chiHoiId",
          "maChiHoi tenChiHoi",
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
      "GET /api/de-xuat-hoi-vien:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể tải danh sách đề xuất",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST
   Chi hội trưởng gửi đề xuất
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
            "Chỉ Chi hội trưởng được gửi đề xuất Hội viên mới",
        },
        {
          status: 403,
        },
      );
    }

    const body =
      await request.json();

    const maHoiVien =
      typeof body.maHoiVien ===
      "string"
        ? body.maHoiVien
            .trim()
            .toUpperCase()
        : "";

    const hoTen =
      typeof body.hoTen ===
      "string"
        ? body.hoTen.trim()
        : "";

    const email =
      typeof body.email ===
      "string"
        ? body.email
            .trim()
            .toLowerCase()
        : "";

    const soDienThoai =
      typeof body.soDienThoai ===
      "string"
        ? body.soDienThoai.trim()
        : "";

    const lop =
      typeof body.lop ===
      "string"
        ? body.lop.trim()
        : "";

    const khoaHoc =
      typeof body.khoaHoc ===
      "string"
        ? body.khoaHoc.trim()
        : "";

    const diaChi =
      typeof body.diaChi ===
      "string"
        ? body.diaChi.trim()
        : "";

    const gioiTinh =
      typeof body.gioiTinh ===
      "string"
        ? body.gioiTinh
        : "";

    const ngaySinh =
      typeof body.ngaySinh ===
        "string" &&
      body.ngaySinh
        ? new Date(
            body.ngaySinh,
          )
        : undefined;

    if (
      !maHoiVien ||
      !hoTen
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Vui lòng nhập mã Hội viên và họ tên",
        },
        {
          status: 400,
        },
      );
    }

    if (
      email &&
      !EMAIL_REGEX.test(
        email,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Email không đúng định dạng",
        },
        {
          status: 400,
        },
      );
    }

    if (
      soDienThoai &&
      !PHONE_REGEX.test(
        soDienThoai,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0",
        },
        {
          status: 400,
        },
      );
    }

    if (
      gioiTinh &&
      ![
        "NAM",
        "NU",
        "KHAC",
      ].includes(gioiTinh)
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Giới tính không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      ngaySinh &&
      Number.isNaN(
        ngaySinh.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Ngày sinh không hợp lệ",
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

    const existingMember =
      await HoiVien.findOne({
        maHoiVien,
      }).lean();

    if (existingMember) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Mã Hội viên đã tồn tại trong hệ thống",
        },
        {
          status: 409,
        },
      );
    }

    const existingProposal =
      await DeXuatHoiVien.findOne({
        maHoiVien,

        trangThai:
          "CHO_XU_LY",
      }).lean();

    if (existingProposal) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Mã Hội viên đang có một đề xuất chờ xử lý",
        },
        {
          status: 409,
        },
      );
    }

    const record =
      await DeXuatHoiVien.create({
        maHoiVien,

        hoTen,

        ngaySinh,

        gioiTinh:
          gioiTinh ||
          undefined,

        email:
          email ||
          undefined,

        soDienThoai:
          soDienThoai ||
          undefined,

        lop:
          lop ||
          undefined,

        khoaHoc:
          khoaHoc ||
          undefined,

        diaChi:
          diaChi ||
          undefined,

        chiHoiId:
          currentUser.chiHoiId,

        trangThaiHoiVien:
          "DANG_HOAT_DONG",

        trangThai:
          "CHO_XU_LY",

        nguoiDeXuatId:
          currentUser._id,

        nguoiDeXuatTen:
          currentUser.fullName,
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
        "HOI_VIEN",

      description:
        `${session.fullName} đã gửi đề xuất thêm Hội viên ${maHoiVien} - ${hoTen}`,

      targetId:
        record._id.toString(),

      targetName:
        `${maHoiVien} - ${hoTen}`,

      metadata: {
        loai:
          "DE_XUAT_HOI_VIEN",

        maHoiVien,

        hoTen,

        chiHoiId:
          currentUser.chiHoiId.toString(),
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
          "Gửi đề xuất Hội viên thành công",

        data: record,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/de-xuat-hoi-vien:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể gửi đề xuất Hội viên",
      },
      {
        status: 500,
      },
    );
  }
}