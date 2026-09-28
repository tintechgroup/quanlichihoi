import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";
import ChiHoi from "@/models/ChiHoi";
import HoatDong from "@/models/HoatDong";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const PHAM_VI_VALUES = [
  "LIEN_CHI_HOI",
  "CHI_HOI",
];

const TRANG_THAI_VALUES = [
  "CHO_DUYET",
  "DA_DUYET",
  "SAP_DIEN_RA",
  "DANG_DIEN_RA",
  "DA_KET_THUC",
  "DA_HUY",
];

const UPDATE_ROLES = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

function parseDate(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseMaximumMembers(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  const numberValue = Number(value);

  if (
    !Number.isInteger(numberValue) ||
    numberValue < 0
  ) {
    return null;
  }

  return numberValue;
}

function hasField(
  body: Record<string, unknown>,
  field: string
) {
  return Object.prototype.hasOwnProperty.call(
    body,
    field
  );
}

async function populateActivity(id: string) {
  return HoatDong.findById(id)
    .populate({
      path: "chiHoiId",
      select: "maChiHoi tenChiHoi",
    })
    .populate({
      path: "nguoiTaoId",
      select: "username fullName role",
    })
    .populate({
      path: "nguoiDuyetId",
      select: "username fullName role",
    })
    .lean();
}

export async function GET(
  request: Request,
  context: RouteContext
) {
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

    const { id } = await context.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const activity =
      await populateActivity(id);

    if (!activity) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy hoạt động",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Lấy thông tin hoạt động thành công",
      data: activity,
    });
  } catch (error) {
    console.error(
      "Lỗi lấy thông tin hoạt động:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi lấy thông tin hoạt động",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
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
      !UPDATE_ROLES.includes(session.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền cập nhật hoạt động",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    const body = (await request.json()) as Record<
      string,
      unknown
    >;

    await connectDB();

    const activity =
      await HoatDong.findById(id);

    if (!activity) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy hoạt động",
        },
        { status: 404 }
      );
    }

    const isAdmin =
      session.role === "ADMIN";

    const isOwner =
      String(activity.nguoiTaoId) ===
      String(session.userId);

    /*
     * BCH và Chi hội trưởng chỉ được sửa
     * hoạt động do chính mình tạo và còn chờ duyệt.
     */
    if (
      !isAdmin &&
      (!isOwner ||
        activity.trangThai !== "CHO_DUYET")
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chỉ được cập nhật hoạt động do mình tạo và đang chờ duyệt",
        },
        { status: 403 }
      );
    }

    const maHoatDong = hasField(
      body,
      "maHoatDong"
    )
      ? typeof body.maHoatDong === "string"
        ? body.maHoatDong
            .trim()
            .toUpperCase()
        : ""
      : activity.maHoatDong;

    const tenHoatDong = hasField(
      body,
      "tenHoatDong"
    )
      ? typeof body.tenHoatDong === "string"
        ? body.tenHoatDong.trim()
        : ""
      : activity.tenHoatDong;

    const moTa = hasField(body, "moTa")
      ? typeof body.moTa === "string"
        ? body.moTa.trim()
        : ""
      : activity.moTa;

    const noiDung = hasField(
      body,
      "noiDung"
    )
      ? typeof body.noiDung === "string"
        ? body.noiDung.trim()
        : ""
      : activity.noiDung;

    const phamVi = hasField(
      body,
      "phamVi"
    )
      ? typeof body.phamVi === "string"
        ? body.phamVi.trim()
        : ""
      : activity.phamVi;

    const donViToChuc = hasField(
      body,
      "donViToChuc"
    )
      ? typeof body.donViToChuc === "string"
        ? body.donViToChuc.trim()
        : ""
      : activity.donViToChuc;

    const diaDiem = hasField(
      body,
      "diaDiem"
    )
      ? typeof body.diaDiem === "string"
        ? body.diaDiem.trim()
        : ""
      : activity.diaDiem;

    const ngayBatDauValue = hasField(
      body,
      "thoiGianBatDau"
    )
      ? body.thoiGianBatDau
      : activity.thoiGianBatDau.toISOString();

    const ngayKetThucValue = hasField(
      body,
      "thoiGianKetThuc"
    )
      ? body.thoiGianKetThuc
      : activity.thoiGianKetThuc.toISOString();

    const hanDangKyValue = hasField(
      body,
      "hanDangKy"
    )
      ? body.hanDangKy
      : activity.hanDangKy?.toISOString();

    const thoiGianBatDau =
      parseDate(ngayBatDauValue);

    const thoiGianKetThuc =
      parseDate(ngayKetThucValue);

    const hanDangKy =
      parseDate(hanDangKyValue);

    const soLuongToiDa = hasField(
      body,
      "soLuongToiDa"
    )
      ? parseMaximumMembers(
          body.soLuongToiDa
        )
      : activity.soLuongToiDa;

    let chiHoiId = "";

    if (hasField(body, "chiHoiId")) {
      chiHoiId =
        typeof body.chiHoiId === "string"
          ? body.chiHoiId.trim()
          : "";
    } else if (activity.chiHoiId) {
      chiHoiId = String(
        activity.chiHoiId
      );
    }

    let trangThai =
      activity.trangThai;

    if (
      hasField(body, "trangThai") &&
      typeof body.trangThai === "string"
    ) {
      const requestedStatus =
        body.trangThai.trim();

      if (
        !TRANG_THAI_VALUES.includes(
          requestedStatus
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Trạng thái hoạt động không hợp lệ",
          },
          { status: 400 }
        );
      }

      /*
       * Chỉ Quản trị viên được thay đổi
       * trạng thái hoạt động.
       */
      if (
        !isAdmin &&
        requestedStatus !==
          activity.trangThai
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Bạn không có quyền thay đổi trạng thái hoạt động",
          },
          { status: 403 }
        );
      }

      trangThai = requestedStatus as typeof activity.trangThai;
    }

    const lyDoHuy = hasField(
      body,
      "lyDoHuy"
    )
      ? typeof body.lyDoHuy === "string"
        ? body.lyDoHuy.trim()
        : ""
      : activity.lyDoHuy || "";

    if (!maHoatDong) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã hoạt động không được để trống",
        },
        { status: 400 }
      );
    }

    if (!tenHoatDong) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tên hoạt động không được để trống",
        },
        { status: 400 }
      );
    }

    if (
      !PHAM_VI_VALUES.includes(phamVi)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phạm vi hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (!donViToChuc) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Đơn vị tổ chức không được để trống",
        },
        { status: 400 }
      );
    }

    if (!diaDiem) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Địa điểm không được để trống",
        },
        { status: 400 }
      );
    }

    if (!thoiGianBatDau) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thời gian bắt đầu không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (!thoiGianKetThuc) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thời gian kết thúc không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (!hanDangKy) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hạn đăng ký không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (
      thoiGianKetThuc <=
      thoiGianBatDau
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thời gian kết thúc phải sau thời gian bắt đầu",
        },
        { status: 400 }
      );
    }

    if (
      hanDangKy > thoiGianBatDau
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hạn đăng ký không được sau thời gian bắt đầu",
        },
        { status: 400 }
      );
    }

    if (soLuongToiDa === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Số lượng tối đa phải là số nguyên không âm",
        },
        { status: 400 }
      );
    }

    if (
      phamVi === "CHI_HOI" &&
      !chiHoiId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hoạt động cấp Chi hội phải chọn Chi hội tổ chức",
        },
        { status: 400 }
      );
    }

    if (
      chiHoiId &&
      !mongoose.Types.ObjectId.isValid(
        chiHoiId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã Chi hội không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (
      trangThai === "DA_HUY" &&
      !lyDoHuy
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng nhập lý do hủy hoạt động",
        },
        { status: 400 }
      );
    }

    if (
      phamVi === "CHI_HOI"
    ) {
      const chiHoiExists =
        await ChiHoi.exists({
          _id: chiHoiId,
        });

      if (!chiHoiExists) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Không tìm thấy Chi hội tổ chức",
          },
          { status: 404 }
        );
      }
    }

    const duplicate =
      await HoatDong.findOne({
        _id: {
          $ne: activity._id,
        },
        maHoatDong,
      })
        .select("_id")
        .lean();

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã hoạt động đã tồn tại",
        },
        { status: 409 }
      );
    }

    activity.maHoatDong =
      maHoatDong;

    activity.tenHoatDong =
      tenHoatDong;

    activity.moTa = moTa;
    activity.noiDung = noiDung;
    activity.phamVi =
      phamVi as typeof activity.phamVi;

    activity.chiHoiId =
      phamVi === "CHI_HOI"
        ? new mongoose.Types.ObjectId(
            chiHoiId
          )
        : null;

    activity.donViToChuc =
      donViToChuc;

    activity.diaDiem = diaDiem;

    activity.thoiGianBatDau =
      thoiGianBatDau;

    activity.thoiGianKetThuc =
      thoiGianKetThuc;

    activity.hanDangKy =
      hanDangKy;

    activity.soLuongToiDa =
      soLuongToiDa;

    activity.trangThai =
      trangThai as typeof activity.trangThai;

    activity.lyDoHuy = lyDoHuy;

    if (
      isAdmin &&
      trangThai === "DA_DUYET" &&
      activity.trangThai !== "DA_HUY"
    ) {
      activity.nguoiDuyetId =
        new mongoose.Types.ObjectId(
          session.userId
        );

      activity.ngayDuyet =
        new Date();
    }

    if (
      trangThai === "CHO_DUYET"
    ) {
      activity.nguoiDuyetId =
        null;

      activity.ngayDuyet =
        null;
    }

    await activity.save();

    const updatedActivity =
      await populateActivity(id);

    return NextResponse.json({
      success: true,
      message:
        "Cập nhật hoạt động thành công",
      data: updatedActivity,
    });
  } catch (error) {
    console.error(
      "Lỗi cập nhật hoạt động:",
      error
    );

    if (
      error instanceof
      mongoose.Error.ValidationError
    ) {
      const firstError =
        Object.values(error.errors)[0];

      return NextResponse.json(
        {
          success: false,
          message:
            firstError?.message ||
            "Dữ liệu hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number })
        .code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã hoạt động đã tồn tại",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi cập nhật hoạt động",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
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
          message:
            "Bạn không có quyền xóa hoặc hủy hoạt động",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    let lyDoHuy = "";

    try {
      const text = await request.text();

      if (text) {
        const body = JSON.parse(text);

        lyDoHuy =
          typeof body.lyDoHuy === "string"
            ? body.lyDoHuy.trim()
            : "";
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Dữ liệu gửi lên không hợp lệ",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const activity =
      await HoatDong.findById(id);

    if (!activity) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy hoạt động",
        },
        { status: 404 }
      );
    }

    /*
     * Hoạt động chưa duyệt hoặc đã hủy:
     * cho phép xóa hoàn toàn.
     */
    if (
      activity.trangThai ===
        "CHO_DUYET" ||
      activity.trangThai === "DA_HUY"
    ) {
      await HoatDong.deleteOne({
        _id: activity._id,
      });

      return NextResponse.json({
        success: true,
        message:
          "Xóa hoạt động thành công",
        action: "DELETED",
      });
    }

    /*
     * Hoạt động đã được duyệt hoặc đã diễn ra:
     * không xóa lịch sử, chỉ chuyển sang trạng thái hủy.
     */
    if (!lyDoHuy) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng nhập lý do hủy hoạt động",
        },
        { status: 400 }
      );
    }

    activity.trangThai = "DA_HUY";
    activity.lyDoHuy = lyDoHuy;

    await activity.save();

    const cancelledActivity =
      await populateActivity(id);

    return NextResponse.json({
      success: true,
      message:
        "Hủy hoạt động thành công",
      action: "CANCELLED",
      data: cancelledActivity,
    });
  } catch (error) {
    console.error(
      "Lỗi xóa hoặc hủy hoạt động:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi xóa hoặc hủy hoạt động",
      },
      { status: 500 }
    );
  }
}