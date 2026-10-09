import {
  NextResponse,
} from "next/server";

import {
  Types,
} from "mongoose";

import {
  connectDB,
} from "@/lib/mongodb";

import {
  getCurrentSession,
} from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import DiemRenLuyen from "@/models/DiemRenLuyen";

type RouteContext = {
  params:
    Promise<{
      id: string;
    }>;
};

function errorResponse(
  message: string,
  status = 400,
) {
  return NextResponse.json(
    {
      success:
        false,

      message,
    },
    {
      status,
    },
  );
}

/* =========================================================
   PATCH - DUYET / TU CHOI
========================================================= */

export async function PATCH(
  request: Request,
  context:
    RouteContext,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return errorResponse(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    if (
      ![
        "ADMIN",
        "BAN_CHAP_HANH",
      ].includes(
        session.role,
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xét duyệt điểm rèn luyện",
        403,
      );
    }

    const {
      id,
    } =
      await context.params;

    if (
      !Types.ObjectId.isValid(
        id,
      )
    ) {
      return errorResponse(
        "Mã điểm rèn luyện không hợp lệ",
      );
    }

    await connectDB();

    const body =
      await request.json() as
        Record<
          string,
          unknown
        >;

    const trangThai =
      typeof body.trangThai ===
      "string"
        ? body.trangThai.trim()
        : "";

    const lyDoTuChoi =
      typeof body.lyDoTuChoi ===
      "string"
        ? body.lyDoTuChoi.trim()
        : "";

    if (
      ![
        "DA_DUYET",
        "TU_CHOI",
      ].includes(
        trangThai,
      )
    ) {
      return errorResponse(
        "Trạng thái xét duyệt không hợp lệ",
      );
    }

    if (
      trangThai ===
        "TU_CHOI" &&
      !lyDoTuChoi
    ) {
      return errorResponse(
        "Vui lòng nhập lý do từ chối",
      );
    }

    const item =
      await DiemRenLuyen.findById(
        id,
      )
        .populate(
          "hoiVienId",

          "maHoiVien hoTen",
        );

    if (!item) {
      return errorResponse(
        "Không tìm thấy điểm rèn luyện",
        404,
      );
    }

    item.trangThai =
      trangThai as
        "DA_DUYET"
        | "TU_CHOI";

    item.nguoiDuyetId =
      new Types.ObjectId(
        session.userId,
      );

    item.ngayDuyet =
      new Date();

    item.lyDoTuChoi =
      trangThai ===
      "TU_CHOI"
        ? lyDoTuChoi
        : "";

    await item.save();

    const populatedMember =
      item.hoiVienId as unknown as
        {
          hoTen?:
            string;

          maHoiVien?:
            string;
        };

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
        trangThai ===
        "DA_DUYET"
          ? "APPROVE"
          : "REJECT",

      module:
        "DANH_GIA",

      description:
        trangThai ===
        "DA_DUYET"
          ? `Duyệt điểm rèn luyện của ${populatedMember.hoTen || "Hội viên"}`
          : `Từ chối điểm rèn luyện của ${populatedMember.hoTen || "Hội viên"}`,

      targetId:
        id,

      targetName:
        populatedMember.hoTen ||
        populatedMember.maHoiVien ||
        "Điểm rèn luyện",

      metadata: {
        diem:
          item.diem,

        hocKy:
          item.hocKy,

        namHoc:
          item.namHoc,

        trangThai,

        lyDoTuChoi,
      },

      ipAddress:
        getRequestIp(
          request,
        ),

      userAgent:
        getUserAgent(
          request,
        ),
    });

    return NextResponse.json({
      success:
        true,

      message:
        trangThai ===
        "DA_DUYET"
          ? "Duyệt điểm rèn luyện thành công"
          : "Đã từ chối điểm rèn luyện",

      data:
        item,
    });
  } catch (
    error
  ) {
    console.error(
      "PATCH /api/diem-ren-luyen/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof
          Error
            ? error.message
            : "Không thể xét duyệt điểm rèn luyện",
      },
      {
        status:
          500,
      },
    );
  }
}