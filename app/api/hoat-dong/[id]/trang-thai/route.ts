import mongoose from "mongoose";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import ChiHoi from "@/models/ChiHoi";
import HoatDong from "@/models/HoatDong";
import User from "@/models/User";

export const dynamic =
  "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TrangThaiHoatDong =
  | "CHO_DUYET"
  | "DA_DUYET"
  | "TU_CHOI"
  | "SAP_DIEN_RA"
  | "DANG_DIEN_RA"
  | "DA_KET_THUC"
  | "DA_HUY";

type UpdateStatusBody = {
  trangThai?: TrangThaiHoatDong;

  lyDoHuy?: string;

  lyDoTuChoi?: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const TRANG_THAI_HOP_LE:
  TrangThaiHoatDong[] = [
    "CHO_DUYET",

    "DA_DUYET",

    "TU_CHOI",

    "SAP_DIEN_RA",

    "DANG_DIEN_RA",

    "DA_KET_THUC",

    "DA_HUY",
  ];

const VAI_TRO_DUOC_XU_LY = [
  "ADMIN",

  "BAN_CHAP_HANH",
];

/* =========================================================
   HELPERS
========================================================= */

function getString(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function errorResponse(
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
    },
  );
}

/* =========================================================
   VALIDATE CHUYỂN TRẠNG THÁI
========================================================= */

function validateTransition({
  currentStatus,

  nextStatus,

  laDeXuatChiHoi,
}: {
  currentStatus:
    TrangThaiHoatDong;

  nextStatus:
    TrangThaiHoatDong;

  laDeXuatChiHoi:
    boolean;
}) {
  if (
    currentStatus ===
    nextStatus
  ) {
    return "Hoạt động hiện đã ở trạng thái này";
  }

  /* =======================================================
     ĐỀ XUẤT CHI HỘI
  ======================================================= */

  if (
    laDeXuatChiHoi &&
    currentStatus ===
      "CHO_DUYET"
  ) {
    if (
      nextStatus ===
        "DA_DUYET" ||
      nextStatus ===
        "TU_CHOI"
    ) {
      return "";
    }

    return (
      "Đề xuất đang chờ duyệt chỉ có thể được phê duyệt hoặc từ chối"
    );
  }

  /*
   * Đề xuất đã từ chối:
   * sau này có thể được chỉnh sửa
   * và gửi lại về CHO_DUYET.
   */
  if (
    laDeXuatChiHoi &&
    currentStatus ===
      "TU_CHOI"
  ) {
    if (
      nextStatus ===
      "CHO_DUYET"
    ) {
      return "";
    }

    return (
      "Đề xuất đã bị từ chối chỉ có thể được gửi lại để chờ duyệt"
    );
  }

  /* =======================================================
     HOẠT ĐỘNG THÔNG THƯỜNG
  ======================================================= */

  const allowed:
    Record<
      TrangThaiHoatDong,
      TrangThaiHoatDong[]
    > = {
      CHO_DUYET: [
        "DA_DUYET",

        "TU_CHOI",

        "DA_HUY",
      ],

      DA_DUYET: [
        "SAP_DIEN_RA",

        "DANG_DIEN_RA",

        "DA_HUY",
      ],

      TU_CHOI: [
        "CHO_DUYET",
      ],

      SAP_DIEN_RA: [
        "DANG_DIEN_RA",

        "DA_KET_THUC",

        "DA_HUY",
      ],

      DANG_DIEN_RA: [
        "DA_KET_THUC",

        "DA_HUY",
      ],

      DA_KET_THUC: [],

      DA_HUY: [],
    };

  if (
    allowed[
      currentStatus
    ]?.includes(
      nextStatus,
    )
  ) {
    return "";
  }

  return (
    `Không thể chuyển trạng thái từ ${currentStatus} sang ${nextStatus}`
  );
}

/* =========================================================
   PATCH
========================================================= */

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    /* =====================================================
       SESSION
    ===================================================== */

    const session =
      await getCurrentSession();

    if (!session) {
      return errorResponse(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    if (
      !VAI_TRO_DUOC_XU_LY.includes(
        session.role,
      )
    ) {
      return errorResponse(
        "Bạn không có quyền cập nhật trạng thái hoạt động",
        403,
      );
    }

    if (
      !session.userId ||
      !mongoose.Types.ObjectId.isValid(
        session.userId,
      )
    ) {
      return errorResponse(
        "Thông tin tài khoản đăng nhập không hợp lệ",
        401,
      );
    }

    /* =====================================================
       PARAM
    ===================================================== */

    const { id } =
      await context.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id,
      )
    ) {
      return errorResponse(
        "Mã hoạt động không hợp lệ",
        400,
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body:
      UpdateStatusBody;

    try {
      body =
        (await request.json()) as
          UpdateStatusBody;
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
        400,
      );
    }

    const trangThai =
      typeof body.trangThai ===
      "string"
        ? body.trangThai
            .trim()
            .toUpperCase() as
            TrangThaiHoatDong
        : "";

    const lyDoHuy =
      getString(
        body.lyDoHuy,
      );

    const lyDoTuChoi =
      getString(
        body.lyDoTuChoi,
      );

    /* =====================================================
       VALIDATE STATUS
    ===================================================== */

    if (
      !TRANG_THAI_HOP_LE.includes(
        trangThai as
          TrangThaiHoatDong,
      )
    ) {
      return errorResponse(
        "Trạng thái hoạt động không hợp lệ",
        400,
      );
    }

    /* =====================================================
       REJECT VALIDATION
    ===================================================== */

    if (
      trangThai ===
        "TU_CHOI" &&
      !lyDoTuChoi
    ) {
      return errorResponse(
        "Vui lòng nhập lý do từ chối đề xuất",
        400,
      );
    }

    if (
      lyDoTuChoi.length >
      2000
    ) {
      return errorResponse(
        "Lý do từ chối không được vượt quá 2000 ký tự",
        400,
      );
    }

    /* =====================================================
       CANCEL VALIDATION
    ===================================================== */

    if (
      trangThai ===
        "DA_HUY" &&
      !lyDoHuy
    ) {
      return errorResponse(
        "Vui lòng nhập lý do hủy hoạt động",
        400,
      );
    }

    if (
      lyDoHuy.length >
      1000
    ) {
      return errorResponse(
        "Lý do hủy không được vượt quá 1000 ký tự",
        400,
      );
    }

    /* =====================================================
       DATABASE
    ===================================================== */

    await connectDB();

    const hoatDong =
      await HoatDong.findById(
        id,
      );

    if (!hoatDong) {
      return errorResponse(
        "Không tìm thấy hoạt động",
        404,
      );
    }

    /* =====================================================
       CURRENT STATUS
    ===================================================== */

    const trangThaiCu =
      hoatDong.trangThai as
        TrangThaiHoatDong;

    const laDeXuatChiHoi =
      Boolean(
        hoatDong.laDeXuatChiHoi,
      );

    /* =====================================================
       TRANSITION
    ===================================================== */

    const transitionError =
      validateTransition({
        currentStatus:
          trangThaiCu,

        nextStatus:
          trangThai as
            TrangThaiHoatDong,

        laDeXuatChiHoi,
      });

    if (
      transitionError
    ) {
      return errorResponse(
        transitionError,

        trangThaiCu ===
        trangThai
          ? 409
          : 400,
      );
    }

    /* =====================================================
       NGƯỜI XỬ LÝ
    ===================================================== */

    const currentUser =
      await User.findById(
        session.userId,
      )
        .select(
          "_id username fullName role",
        )
        .lean();

    if (!currentUser) {
      return errorResponse(
        "Không tìm thấy tài khoản xử lý",
        404,
      );
    }

    /*
     * Không để người tạo đề xuất
     * tự duyệt chính đề xuất của mình.
     *
     * Trường hợp thực tế CHT không thuộc
     * REVIEW_ROLES nên vốn đã bị chặn,
     * nhưng giữ kiểm tra này để bảo vệ
     * dữ liệu lâu dài.
     */
    if (
      laDeXuatChiHoi &&
      String(
        hoatDong.nguoiTaoId,
      ) ===
        String(
          session.userId,
        ) &&
      (
        trangThai ===
          "DA_DUYET" ||
        trangThai ===
          "TU_CHOI"
      )
    ) {
      return errorResponse(
        "Người tạo đề xuất không được tự phê duyệt đề xuất của mình",
        403,
      );
    }

    /* =====================================================
       SNAPSHOT TRƯỚC CẬP NHẬT
    ===================================================== */

    const before = {
      trangThai:
        trangThaiCu,

      nguoiDuyetId:
        hoatDong.nguoiDuyetId
          ? String(
              hoatDong.nguoiDuyetId,
            )
          : null,

      ngayDuyet:
        hoatDong.ngayDuyet ??
        null,

      lyDoTuChoi:
        hoatDong.lyDoTuChoi ||
        "",

      lyDoHuy:
        hoatDong.lyDoHuy ||
        "",
    };

    /* =====================================================
       CẬP NHẬT TRẠNG THÁI
    ===================================================== */

    hoatDong.trangThai =
      trangThai as
        TrangThaiHoatDong;

    /* =====================================================
       APPROVE
    ===================================================== */

    if (
      trangThai ===
      "DA_DUYET"
    ) {
      hoatDong.nguoiDuyetId =
        new mongoose.Types.ObjectId(
          session.userId,
        );

      hoatDong.ngayDuyet =
        new Date();

      hoatDong.lyDoTuChoi =
        "";

      hoatDong.lyDoHuy =
        "";
    }

    /* =====================================================
       REJECT
    ===================================================== */

    if (
      trangThai ===
      "TU_CHOI"
    ) {
      hoatDong.nguoiDuyetId =
        new mongoose.Types.ObjectId(
          session.userId,
        );

      hoatDong.ngayDuyet =
        new Date();

      hoatDong.lyDoTuChoi =
        lyDoTuChoi;

      hoatDong.lyDoHuy =
        "";
    }

    /* =====================================================
       RETURN TO WAITING
    ===================================================== */

    if (
      trangThai ===
      "CHO_DUYET"
    ) {
      hoatDong.nguoiDuyetId =
        null;

      hoatDong.ngayDuyet =
        null;

      hoatDong.lyDoTuChoi =
        "";

      hoatDong.lyDoHuy =
        "";

      /*
       * Nếu là đề xuất của Chi hội,
       * cập nhật lại ngày gửi.
       */
      if (
        hoatDong.laDeXuatChiHoi
      ) {
        hoatDong.ngayGuiPheDuyet =
          new Date();
      }
    }

    /* =====================================================
       NORMAL OPERATION
    ===================================================== */

    if (
      trangThai ===
        "SAP_DIEN_RA" ||
      trangThai ===
        "DANG_DIEN_RA" ||
      trangThai ===
        "DA_KET_THUC"
    ) {
      hoatDong.lyDoHuy =
        "";
    }

    /* =====================================================
       CANCEL
    ===================================================== */

    if (
      trangThai ===
      "DA_HUY"
    ) {
      hoatDong.lyDoHuy =
        lyDoHuy;
    }

    /* =====================================================
       SAVE
    ===================================================== */

    await hoatDong.save();

    /* =====================================================
       SYSTEM LOG
    ===================================================== */

    let logAction:
      | "APPROVE"
      | "REJECT"
      | "UPDATE" =
      "UPDATE";

    if (
      trangThai ===
      "DA_DUYET"
    ) {
      logAction =
        "APPROVE";
    }

    if (
      trangThai ===
      "TU_CHOI"
    ) {
      logAction =
        "REJECT";
    }

    let description =
      `${session.fullName} đã cập nhật trạng thái hoạt động ${hoatDong.maHoatDong} từ ${trangThaiCu} sang ${trangThai}`;

    if (
      trangThai ===
        "DA_DUYET" &&
      hoatDong.laDeXuatChiHoi
    ) {
      description =
        `${session.fullName} đã phê duyệt đề xuất hoạt động ${hoatDong.maHoatDong} - ${hoatDong.tenHoatDong}`;
    }

    if (
      trangThai ===
      "TU_CHOI"
    ) {
      description =
        `${session.fullName} đã từ chối đề xuất hoạt động ${hoatDong.maHoatDong} - ${hoatDong.tenHoatDong}`;
    }

    if (
      trangThai ===
      "DA_HUY"
    ) {
      description =
        `${session.fullName} đã hủy hoạt động ${hoatDong.maHoatDong} - ${hoatDong.tenHoatDong}`;
    }

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
        logAction,

      module:
        "HOAT_DONG",

      description,

      targetId:
        hoatDong._id.toString(),

      targetName:
        `${hoatDong.maHoatDong} - ${hoatDong.tenHoatDong}`,

      metadata: {
        before,

        after: {
          trangThai,

          nguoiDuyetId:
            hoatDong.nguoiDuyetId
              ? String(
                  hoatDong.nguoiDuyetId,
                )
              : null,

          ngayDuyet:
            hoatDong.ngayDuyet ??
            null,

          lyDoTuChoi:
            hoatDong.lyDoTuChoi ||
            "",

          lyDoHuy:
            hoatDong.lyDoHuy ||
            "",
        },

        laDeXuatChiHoi:
          Boolean(
            hoatDong.laDeXuatChiHoi,
          ),

        lyDoTuChoi:
          trangThai ===
          "TU_CHOI"
            ? lyDoTuChoi
            : "",

        lyDoHuy:
          trangThai ===
          "DA_HUY"
            ? lyDoHuy
            : "",
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

    /* =====================================================
       POPULATE
    ===================================================== */

    const ketQua =
      await HoatDong.findById(
        id,
      )
        .populate({
          path:
            "chiHoiId",

          model:
            ChiHoi,

          select:
            "maChiHoi tenChiHoi",
        })
        .populate({
          path:
            "nguoiTaoId",

          model:
            User,

          select:
            "username fullName role",
        })
        .populate({
          path:
            "nguoiDuyetId",

          model:
            User,

          select:
            "username fullName role",
        })
        .lean();

    /* =====================================================
       MESSAGE
    ===================================================== */

    let message =
      "Cập nhật trạng thái hoạt động thành công";

    if (
      trangThai ===
      "DA_DUYET"
    ) {
      message =
        hoatDong.laDeXuatChiHoi
          ? "Phê duyệt đề xuất hoạt động thành công"
          : "Phê duyệt hoạt động thành công";
    }

    if (
      trangThai ===
      "TU_CHOI"
    ) {
      message =
        "Từ chối đề xuất hoạt động thành công";
    }

    if (
      trangThai ===
      "SAP_DIEN_RA"
    ) {
      message =
        "Đã chuyển hoạt động sang trạng thái sắp diễn ra";
    }

    if (
      trangThai ===
      "DANG_DIEN_RA"
    ) {
      message =
        "Đã chuyển hoạt động sang trạng thái đang diễn ra";
    }

    if (
      trangThai ===
      "DA_KET_THUC"
    ) {
      message =
        "Đã kết thúc hoạt động";
    }

    if (
      trangThai ===
      "DA_HUY"
    ) {
      message =
        "Đã hủy hoạt động";
    }

    if (
      trangThai ===
      "CHO_DUYET"
    ) {
      message =
        "Đề xuất đã được gửi lại để chờ phê duyệt";
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      message,

      data:
        ketQua,
    });
  } catch (error) {
    console.error(
      "PATCH /api/hoat-dong/[id]/trang-thai:",
      error,
    );

    /* =====================================================
       VALIDATION ERROR
    ===================================================== */

    if (
      error instanceof
      mongoose.Error
        .ValidationError
    ) {
      const firstError =
        Object.values(
          error.errors,
        )[0];

      return NextResponse.json(
        {
          success: false,

          message:
            firstError?.message ||
            "Dữ liệu trạng thái hoạt động không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       UNKNOWN ERROR
    ===================================================== */

    return NextResponse.json(
      {
        success: false,

        message:
          process.env
            .NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? `Không thể cập nhật trạng thái: ${error.message}`
              : "Không thể cập nhật trạng thái hoạt động"
            : "Đã xảy ra lỗi khi cập nhật trạng thái hoạt động",
      },
      {
        status: 500,
      },
    );
  }
}