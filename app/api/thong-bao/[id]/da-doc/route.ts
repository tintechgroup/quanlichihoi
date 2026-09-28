import mongoose from "mongoose";
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import DaDocThongBao from "@/models/DaDocThongBao";
import HoiVien from "@/models/HoiVien";
import ThongBao, {
  type PhamViThongBao,
  type TrangThaiThongBao,
  type VaiTroNhanThongBao,
} from "@/models/ThongBao";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

function objectIdEquals(
  first: unknown,
  second: unknown,
) {
  return String(first || "") === String(second || "");
}

async function getUserChiHoiId(userId: string) {
  const hoiVien = await HoiVien.findOne({
    taiKhoanId: userId,
  })
    .select("chiHoiId")
    .lean();

  return hoiVien?.chiHoiId?.toString() || null;
}

function isWithinDisplayTime(
  ngayBatDau?: Date,
  ngayKetThuc?: Date,
) {
  const now = Date.now();

  if (
    ngayBatDau &&
    ngayBatDau.getTime() > now
  ) {
    return false;
  }

  if (
    ngayKetThuc &&
    ngayKetThuc.getTime() < now
  ) {
    return false;
  }

  return true;
}

async function canViewAnnouncement(
  announcement: {
    phamVi: PhamViThongBao;
    trangThai: TrangThaiThongBao;
    chiHoiIds?: mongoose.Types.ObjectId[];
    vaiTroNhan?: VaiTroNhanThongBao[];
    nguoiNhanIds?: mongoose.Types.ObjectId[];
    ngayBatDau?: Date;
    ngayKetThuc?: Date;
    nguoiTaoId: mongoose.Types.ObjectId;
  },
  session: {
    userId: string;
    role: string;
  },
) {
  /*
   * Admin và Ban Chấp hành có thể xem tất cả
   * thông báo trong màn hình quản lý.
   */
  if (
    session.role === "ADMIN" ||
    session.role === "BAN_CHAP_HANH"
  ) {
    return true;
  }

  /*
   * Chi hội trưởng được xem thông báo do mình tạo.
   */
  if (
    session.role === "CHI_HOI_TRUONG" &&
    objectIdEquals(
      announcement.nguoiTaoId,
      session.userId,
    )
  ) {
    return true;
  }

  if (
    announcement.trangThai !== "DA_DANG"
  ) {
    return false;
  }

  if (
    !isWithinDisplayTime(
      announcement.ngayBatDau,
      announcement.ngayKetThuc,
    )
  ) {
    return false;
  }

  if (announcement.phamVi === "TAT_CA") {
    return true;
  }

  if (announcement.phamVi === "VAI_TRO") {
    return (
      announcement.vaiTroNhan?.includes(
        session.role as VaiTroNhanThongBao,
      ) ?? false
    );
  }

  if (announcement.phamVi === "CA_NHAN") {
    return (
      announcement.nguoiNhanIds?.some((id) =>
        objectIdEquals(id, session.userId),
      ) ?? false
    );
  }

  if (announcement.phamVi === "CHI_HOI") {
    const chiHoiId = await getUserChiHoiId(
      session.userId,
    );

    if (!chiHoiId) {
      return false;
    }

    return (
      announcement.chiHoiIds?.some((id) =>
        objectIdEquals(id, chiHoiId),
      ) ?? false
    );
  }

  return false;
}

/*
 * PATCH /api/thong-bao/[id]/da-doc
 *
 * Body:
 * {
 *   "daDoc": true
 * }
 *
 * hoặc:
 *
 * {
 *   "daDoc": false
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getCurrentSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng đăng nhập để tiếp tục",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã thông báo không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Dữ liệu gửi lên không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Dữ liệu gửi lên không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const requestBody = body as {
      daDoc?: unknown;
    };

    if (typeof requestBody.daDoc !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trạng thái đã đọc phải là true hoặc false",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const announcement =
      await ThongBao.findById(id);

    if (!announcement) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy thông báo",
        },
        {
          status: 404,
        },
      );
    }

    const allowed = await canViewAnnouncement(
      announcement,
      session,
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền xem thông báo này",
        },
        {
          status: 403,
        },
      );
    }

    const existingRecord =
      await DaDocThongBao.findOne({
        thongBaoId: announcement._id,
        nguoiDungId: session.userId,
      });

    /*
     * Đánh dấu đã đọc.
     */
    if (requestBody.daDoc) {
      const wasAlreadyRead =
        existingRecord?.daDoc === true;

      const readRecord =
        await DaDocThongBao.findOneAndUpdate(
          {
            thongBaoId: announcement._id,
            nguoiDungId: session.userId,
          },
          {
            $set: {
              daDoc: true,
              thoiGianDoc: new Date(),
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          },
        );

      /*
       * Chỉ tăng lượt xem khi chuyển từ
       * chưa đọc sang đã đọc.
       */
      if (!wasAlreadyRead) {
        await ThongBao.updateOne(
          {
            _id: announcement._id,
          },
          {
            $inc: {
              soLuotXem: 1,
            },
          },
        );
      }

      const updatedAnnouncement =
        await ThongBao.findById(
          announcement._id,
        )
          .select("soLuotXem")
          .lean();

      return NextResponse.json({
        success: true,
        message:
          "Đã đánh dấu thông báo là đã đọc",
        data: {
          thongBaoId:
            announcement._id.toString(),
          daDoc: true,
          thoiGianDoc:
            readRecord?.thoiGianDoc ||
            new Date(),
          soLuotXem:
            updatedAnnouncement?.soLuotXem ||
            0,
        },
      });
    }

    /*
     * Đánh dấu chưa đọc.
     */
    const wasRead =
      existingRecord?.daDoc === true;

    const unreadRecord =
      await DaDocThongBao.findOneAndUpdate(
        {
          thongBaoId: announcement._id,
          nguoiDungId: session.userId,
        },
        {
          $set: {
            daDoc: false,
          },
          $unset: {
            thoiGianDoc: 1,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

    /*
     * Nếu trước đó đã đọc thì giảm số lượt xem.
     */
    if (wasRead) {
      await ThongBao.updateOne(
        {
          _id: announcement._id,
          soLuotXem: {
            $gt: 0,
          },
        },
        {
          $inc: {
            soLuotXem: -1,
          },
        },
      );
    }

    const updatedAnnouncement =
      await ThongBao.findById(
        announcement._id,
      )
        .select("soLuotXem")
        .lean();

    return NextResponse.json({
      success: true,
      message:
        "Đã đánh dấu thông báo là chưa đọc",
      data: {
        thongBaoId:
          announcement._id.toString(),
        daDoc: false,
        thoiGianDoc:
          unreadRecord?.thoiGianDoc || null,
        soLuotXem:
          updatedAnnouncement?.soLuotXem ||
          0,
      },
    });
  } catch (error) {
    console.error(
      "Lỗi cập nhật trạng thái đọc:",
      error,
    );

    const databaseError = error as {
      code?: number;
    };

    /*
     * Trường hợp hai yêu cầu đồng thời tạo
     * cùng một trạng thái đọc.
     */
    if (databaseError.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trạng thái đọc đang được cập nhật, vui lòng thử lại",
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
          "Đã xảy ra lỗi khi cập nhật trạng thái đọc",
      },
      {
        status: 500,
      },
    );
  }
}