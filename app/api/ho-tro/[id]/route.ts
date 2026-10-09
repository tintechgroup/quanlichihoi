import mongoose from "mongoose";

import {
  NextResponse,
} from "next/server";

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

import User from "@/models/User";

import YeuCauHoTro, {
  TrangThaiHoTro,
} from "@/models/YeuCauHoTro";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params:
    Promise<{
      id:
        string;
    }>;
};

type PatchBody = {
  action?:
    unknown;

  noiDung?:
    unknown;

  trangThai?:
    unknown;
};

/* =========================================================
   CONSTANTS
========================================================= */

const VALID_STATUSES:
  TrangThaiHoTro[] = [
  "MOI",
  "DA_TIEP_NHAN",
  "DANG_XU_LY",
  "CHO_BO_SUNG",
  "DA_XU_LY",
  "DONG",
];

/* =========================================================
   HELPERS
========================================================= */

function errorResponse(
  message: string,
  status =
    400,
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

function normalizeLegacyArrays(
  ticket:
    InstanceType<
      typeof YeuCauHoTro
    >,
) {
  /*
   * Ticket cũ được tạo trước khi bổ sung
   * các field mới có thể chưa có mảng này.
   *
   * Nếu gọi .push() trực tiếp sẽ phát sinh:
   * Cannot read properties of undefined (reading 'push')
   */

  if (
    !Array.isArray(
      ticket.phanHoi,
    )
  ) {
    ticket.phanHoi =
      [];
  }

  if (
    !Array.isArray(
      ticket.lichSuXuLy,
    )
  ) {
    ticket.lichSuXuLy =
      [];
  }

  if (
    !Array.isArray(
      ticket.tepDinhKem,
    )
  ) {
    ticket.tepDinhKem =
      [];
  }
}

function isManagerRole(
  role:
    string,
) {
  return (
    role ===
      "ADMIN" ||
    role ===
      "BAN_CHAP_HANH"
  );
}

/* =========================================================
   GET /api/ho-tro/[id]
========================================================= */

export async function GET(
  _request:
    Request,

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

    const {
      id,
    } =
      await context.params;

    if (
      !mongoose.isValidObjectId(
        id,
      )
    ) {
      return errorResponse(
        "Mã yêu cầu không hợp lệ",
        400,
      );
    }

    await connectDB();

    const currentUser =
      await User.findById(
        session.userId,
      )
        .select(
          "_id role isActive",
        )
        .lean();

    if (!currentUser) {
      return errorResponse(
        "Không tìm thấy tài khoản",
        404,
      );
    }

    if (
      currentUser.isActive ===
      false
    ) {
      return errorResponse(
        "Tài khoản đã ngừng hoạt động",
        403,
      );
    }

    const ticket =
      await YeuCauHoTro.findById(
        id,
      ).lean();

    if (!ticket) {
      return errorResponse(
        "Không tìm thấy yêu cầu hỗ trợ",
        404,
      );
    }

    const isManager =
      isManagerRole(
        session.role,
      );

    const isOwner =
      ticket.nguoiGuiId.toString() ===
      currentUser._id.toString();

    if (
      !isManager &&
      !isOwner
    ) {
      return errorResponse(
        "Bạn không có quyền xem yêu cầu này",
        403,
      );
    }

    return NextResponse.json({
      success:
        true,

      data:
        ticket,

      permissions: {
        canManage:
          isManager,

        isOwner,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/ho-tro/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          process.env.NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? error.message
              : "Không thể tải yêu cầu hỗ trợ"
            : "Không thể tải yêu cầu hỗ trợ",
      },
      {
        status:
          500,
      },
    );
  }
}

/* =========================================================
   PATCH /api/ho-tro/[id]
========================================================= */

export async function PATCH(
  request:
    Request,

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

    const {
      id,
    } =
      await context.params;

    if (
      !mongoose.isValidObjectId(
        id,
      )
    ) {
      return errorResponse(
        "Mã yêu cầu không hợp lệ",
        400,
      );
    }

    let body:
      PatchBody;

    try {
      body =
        await request.json();
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
        400,
      );
    }

    const action =
      typeof body.action ===
      "string"
        ? body.action.trim()
        : "";

    if (!action) {
      return errorResponse(
        "Thiếu thao tác cần thực hiện",
        400,
      );
    }

    await connectDB();

    const currentUser =
      await User.findById(
        session.userId,
      );

    if (!currentUser) {
      return errorResponse(
        "Không tìm thấy tài khoản",
        404,
      );
    }

    if (
      currentUser.isActive ===
      false
    ) {
      return errorResponse(
        "Tài khoản đã ngừng hoạt động",
        403,
      );
    }

    const ticket =
      await YeuCauHoTro.findById(
        id,
      );

    if (!ticket) {
      return errorResponse(
        "Không tìm thấy yêu cầu hỗ trợ",
        404,
      );
    }

    /*
     * Quan trọng:
     * đảm bảo dữ liệu cũ luôn có đủ mảng
     * trước khi gọi .push().
     */
    normalizeLegacyArrays(
      ticket,
    );

    const isManager =
      isManagerRole(
        session.role,
      );

    const isOwner =
      ticket.nguoiGuiId.toString() ===
      currentUser._id.toString();

    if (
      !isManager &&
      !isOwner
    ) {
      return errorResponse(
        "Bạn không có quyền thao tác yêu cầu này",
        403,
      );
    }

    /* =====================================================
       ACTION: ADD_REPLY
    ===================================================== */

    if (
      action ===
      "ADD_REPLY"
    ) {
      if (
        ticket.trangThai ===
        "DONG"
      ) {
        return errorResponse(
          "Yêu cầu đã đóng, không thể phản hồi thêm",
          400,
        );
      }

      const noiDung =
        typeof body.noiDung ===
        "string"
          ? body.noiDung.trim()
          : "";

      if (!noiDung) {
        return errorResponse(
          "Vui lòng nhập nội dung phản hồi",
          400,
        );
      }

      if (
        noiDung.length >
        3000
      ) {
        return errorResponse(
          "Nội dung phản hồi không được vượt quá 3000 ký tự",
          400,
        );
      }

      const oldStatus =
        ticket.trangThai;

      /* ===============================================
         ADD MESSAGE
      =============================================== */

      ticket.phanHoi.push({
        nguoiGuiId:
          currentUser._id,

        nguoiGuiTen:
          currentUser.fullName,

        vaiTro:
          currentUser.role,

        noiDung,

        createdAt:
          new Date(),
      });

      /* ===============================================
         MANAGER AUTO TAKE OWNERSHIP
      =============================================== */

      if (
        isManager
      ) {
        /*
         * Khi BCH/Admin phản hồi lần đầu,
         * tự nhận là người xử lý.
         */
        if (
          !ticket.nguoiXuLyId
        ) {
          ticket.nguoiXuLyId =
            currentUser._id;

          ticket.nguoiXuLyTen =
            currentUser.fullName;
        }

        /*
         * Ticket mới / đã tiếp nhận:
         * chuyển sang đang xử lý.
         */
        if (
          ticket.trangThai ===
            "MOI" ||
          ticket.trangThai ===
            "DA_TIEP_NHAN"
        ) {
          ticket.trangThai =
            "DANG_XU_LY";
        }

        if (
          !ticket.thoiGianTiepNhan
        ) {
          ticket.thoiGianTiepNhan =
            new Date();
        }
      }

      /* ===============================================
         OWNER PROVIDES MORE INFORMATION
      =============================================== */

      if (
        !isManager &&
        ticket.trangThai ===
          "CHO_BO_SUNG"
      ) {
        /*
         * Người gửi đã bổ sung thông tin,
         * ticket quay lại trạng thái đang xử lý.
         */
        ticket.trangThai =
          "DANG_XU_LY";
      }

      /* ===============================================
         HISTORY
      =============================================== */

      ticket.lichSuXuLy.push({
        nguoiThucHienId:
          currentUser._id,

        nguoiThucHienTen:
          currentUser.fullName,

        vaiTro:
          currentUser.role,

        hanhDong:
          "PHAN_HOI",

        trangThaiCu:
          oldStatus,

        trangThaiMoi:
          ticket.trangThai,

        ghiChu:
          noiDung.length >
          200
            ? `${noiDung.slice(
                0,
                200,
              )}...`
            : noiDung,

        createdAt:
          new Date(),
      });

      await ticket.save();

      /* ===============================================
         SYSTEM LOG
      =============================================== */

      await writeSystemLog({
        userId:
          currentUser._id.toString(),

        username:
          currentUser.username,

        fullName:
          currentUser.fullName,

        role:
          currentUser.role,

        action:
          "UPDATE",

        module:
          "HO_TRO",

        description:
          `${currentUser.fullName} phản hồi yêu cầu hỗ trợ ${ticket.maYeuCau}`,

        targetId:
          ticket._id.toString(),

        targetName:
          ticket.tieuDe,

        metadata: {
          action:
            "ADD_REPLY",

          maYeuCau:
            ticket.maYeuCau,

          oldStatus,

          newStatus:
            ticket.trangThai,

          manager:
            isManager,
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
          "Đã gửi phản hồi",

        data:
          ticket,
      });
    }

    /* =====================================================
       ACTION: UPDATE_STATUS
    ===================================================== */

    if (
      action ===
      "UPDATE_STATUS"
    ) {
      if (!isManager) {
        return errorResponse(
          "Bạn không có quyền thay đổi trạng thái",
          403,
        );
      }

      const newStatus =
        typeof body.trangThai ===
        "string"
          ? body.trangThai.trim() as
              TrangThaiHoTro
          : "";

      if (
        !VALID_STATUSES.includes(
          newStatus as
            TrangThaiHoTro,
        )
      ) {
        return errorResponse(
          "Trạng thái không hợp lệ",
          400,
        );
      }

      const oldStatus =
        ticket.trangThai;

      /*
       * Không ghi history rác nếu trạng thái
       * thực tế không thay đổi.
       */
      if (
        oldStatus ===
        newStatus
      ) {
        return NextResponse.json({
          success:
            true,

          message:
            "Trạng thái không thay đổi",

          data:
            ticket,
        });
      }

      /* ===============================================
         ASSIGN PROCESSOR
      =============================================== */

      ticket.nguoiXuLyId =
        currentUser._id;

      ticket.nguoiXuLyTen =
        currentUser.fullName;

      /* ===============================================
         APPLY NEW STATUS
      =============================================== */

      ticket.trangThai =
        newStatus as
          TrangThaiHoTro;

      /* ===============================================
         RECEIVE TIME
      =============================================== */

      if (
        !ticket.thoiGianTiepNhan &&
        newStatus !==
          "MOI"
      ) {
        ticket.thoiGianTiepNhan =
          new Date();
      }

      /*
       * Nếu manager chuyển ticket về MOI
       * thì coi như chưa tiếp nhận lại.
       */
      if (
        newStatus ===
        "MOI"
      ) {
        ticket.thoiGianTiepNhan =
          null;
      }

      /* ===============================================
         COMPLETED TIME
      =============================================== */

      if (
        newStatus ===
        "DA_XU_LY"
      ) {
        ticket.thoiGianXuLyXong =
          new Date();
      } else if (
        oldStatus ===
          "DA_XU_LY"
      ) {
        /*
         * Ticket đã xử lý nhưng được mở lại
         * thì xóa thời điểm hoàn thành cũ.
         */
        ticket.thoiGianXuLyXong =
          null;
      }

      /* ===============================================
         CLOSED TIME
      =============================================== */

      if (
        newStatus ===
        "DONG"
      ) {
        ticket.thoiGianDong =
          new Date();

        /*
         * Có thể đóng trực tiếp từ DANG_XU_LY.
         * Trong trường hợp chưa ghi thời điểm xử lý xong,
         * đánh dấu tại thời điểm đóng.
         */
        if (
          !ticket.thoiGianXuLyXong
        ) {
          ticket.thoiGianXuLyXong =
            new Date();
        }
      } else if (
        oldStatus ===
          "DONG"
      ) {
        /*
         * Mở lại ticket.
         */
        ticket.thoiGianDong =
          null;

        if (
          newStatus !==
          "DA_XU_LY"
        ) {
          ticket.thoiGianXuLyXong =
            null;
        }
      }

      /* ===============================================
         DETERMINE HISTORY ACTION
      =============================================== */

      let historyAction:
        | "TIEP_NHAN"
        | "CAP_NHAT_TRANG_THAI"
        | "DONG_YEU_CAU"
        | "MO_LAI" =
        "CAP_NHAT_TRANG_THAI";

      if (
        oldStatus ===
          "MOI" &&
        newStatus ===
          "DA_TIEP_NHAN"
      ) {
        historyAction =
          "TIEP_NHAN";
      }

      if (
        newStatus ===
        "DONG"
      ) {
        historyAction =
          "DONG_YEU_CAU";
      }

      if (
        oldStatus ===
          "DONG" &&
        newStatus !==
          "DONG"
      ) {
        historyAction =
          "MO_LAI";
      }

      /* ===============================================
         HISTORY
      =============================================== */

      ticket.lichSuXuLy.push({
        nguoiThucHienId:
          currentUser._id,

        nguoiThucHienTen:
          currentUser.fullName,

        vaiTro:
          currentUser.role,

        hanhDong:
          historyAction,

        trangThaiCu:
          oldStatus,

        trangThaiMoi:
          newStatus as
            TrangThaiHoTro,

        ghiChu:
          `Chuyển trạng thái từ ${oldStatus} sang ${newStatus}`,

        createdAt:
          new Date(),
      });

      await ticket.save();

      /* ===============================================
         SYSTEM LOG
      =============================================== */

      await writeSystemLog({
        userId:
          currentUser._id.toString(),

        username:
          currentUser.username,

        fullName:
          currentUser.fullName,

        role:
          currentUser.role,

        action:
          "UPDATE",

        module:
          "HO_TRO",

        description:
          `${currentUser.fullName} cập nhật trạng thái yêu cầu ${ticket.maYeuCau}: ${oldStatus} → ${newStatus}`,

        targetId:
          ticket._id.toString(),

        targetName:
          ticket.tieuDe,

        metadata: {
          action:
            "UPDATE_STATUS",

          maYeuCau:
            ticket.maYeuCau,

          oldStatus,

          newStatus,

          nguoiXuLyId:
            currentUser._id.toString(),

          nguoiXuLyTen:
            currentUser.fullName,
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
          "Cập nhật trạng thái thành công",

        data:
          ticket,
      });
    }

    /* =====================================================
       INVALID ACTION
    ===================================================== */

    return errorResponse(
      "Thao tác không hợp lệ",
      400,
    );
  } catch (
    error
  ) {
    console.error(
      "PATCH /api/ho-tro/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          process.env.NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? error.message
              : "Không thể xử lý yêu cầu hỗ trợ"
            : "Không thể xử lý yêu cầu hỗ trợ",
      },
      {
        status:
          500,
      },
    );
  }
}