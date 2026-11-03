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
  type ITepDinhKemHoTro,
  type TrangThaiHoTro,
  type VaiTroNguoiGui,
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

  tepDinhKem?:
    unknown;

  danhDauDaXuLy?:
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

const MAX_FILES =
  5;

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_EXTENSIONS =
  new Set([
    "png",
    "jpg",
    "jpeg",
    "webp",
    "pdf",
  ]);

/* =========================================================
   HELPERS
========================================================= */

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

function normalizeLegacyArrays(
  ticket:
    InstanceType<
      typeof YeuCauHoTro
    >,
) {
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

function getExtension(
  filename: string,
) {
  return (
    filename
      .split(".")
      .pop()
      ?.toLowerCase() ||
    ""
  );
}

function parseAttachments(
  value: unknown,
  userId: string,
):
  ITepDinhKemHoTro[] {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return [];
  }

  if (
    !Array.isArray(
      value,
    )
  ) {
    throw new Error(
      "Danh sách tệp đính kèm không hợp lệ",
    );
  }

  if (
    value.length >
    MAX_FILES
  ) {
    throw new Error(
      `Mỗi phản hồi chỉ được đính kèm tối đa ${MAX_FILES} tệp`,
    );
  }

  return value.map(
    (
      raw,
      index,
    ) => {
      if (
        !raw ||
        typeof raw !==
          "object"
      ) {
        throw new Error(
          `Tệp đính kèm thứ ${index + 1} không hợp lệ`,
        );
      }

      const item =
        raw as Record<
          string,
          unknown
        >;

      const tenTep =
        typeof item.tenTep ===
        "string"
          ? item.tenTep.trim()
          : "";

      const duongDan =
        typeof item.duongDan ===
        "string"
          ? item.duongDan.trim()
          : "";

      const pathname =
        typeof item.pathname ===
        "string"
          ? item.pathname.trim()
          : "";

      const mimeType =
        typeof item.mimeType ===
        "string"
          ? item.mimeType.trim()
          : "";

      const kichThuoc =
        Number(
          item.kichThuoc ||
            0,
        );

      if (
        !tenTep ||
        !duongDan ||
        !pathname
      ) {
        throw new Error(
          `Tệp đính kèm thứ ${index + 1} thiếu thông tin`,
        );
      }

      const extension =
        getExtension(
          tenTep,
        );

      if (
        !ALLOWED_EXTENSIONS.has(
          extension,
        )
      ) {
        throw new Error(
          `Tệp "${tenTep}" không đúng định dạng cho phép`,
        );
      }

      if (
        !Number.isFinite(
          kichThuoc,
        ) ||
        kichThuoc <
          0 ||
        kichThuoc >
          MAX_FILE_SIZE
      ) {
        throw new Error(
          `Dung lượng tệp "${tenTep}" không hợp lệ`,
        );
      }

      /*
       * Tệp của phản hồi bắt buộc phải là
       * tệp vừa upload bởi chính tài khoản hiện tại.
       *
       * Upload route lưu dạng:
       * ho-tro/<userId>/...
       */
      if (
        !pathname.startsWith(
          `ho-tro/${userId}/`,
        )
      ) {
        throw new Error(
          `Bạn không có quyền sử dụng tệp "${tenTep}"`,
        );
      }

      return {
        tenTep,
        duongDan,
        pathname,
        mimeType,
        kichThuoc,
      };
    },
  );
}

/* =========================================================
   GET
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

    return errorResponse(
      process.env.NODE_ENV ===
        "development" &&
      error instanceof
        Error
        ? error.message
        : "Không thể tải yêu cầu hỗ trợ",
      500,
    );
  }
}

/* =========================================================
   PATCH
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
      );
    }

    let body:
      PatchBody;

    try {
      body =
        await request.json() as
          PatchBody;
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
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

    const currentRole =
      currentUser.role as
        VaiTroNguoiGui;

    /* =====================================================
       ADD REPLY
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
        );
      }

      const noiDung =
        typeof body.noiDung ===
        "string"
          ? body.noiDung.trim()
          : "";

      if (
        noiDung.length >
        3000
      ) {
        return errorResponse(
          "Nội dung phản hồi không được vượt quá 3000 ký tự",
        );
      }

      let tepDinhKem:
        ITepDinhKemHoTro[];

      try {
        tepDinhKem =
          parseAttachments(
            body.tepDinhKem,
            currentUser._id.toString(),
          );
      } catch (
        error
      ) {
        return errorResponse(
          error instanceof
            Error
            ? error.message
            : "Tệp đính kèm không hợp lệ",
        );
      }

      if (
        !noiDung &&
        tepDinhKem.length ===
          0
      ) {
        return errorResponse(
          "Vui lòng nhập nội dung hoặc đính kèm ít nhất một tệp",
        );
      }

      const oldStatus =
        ticket.trangThai;

      ticket.phanHoi.push({
        nguoiGuiId:
          currentUser._id,

        nguoiGuiTen:
          currentUser.fullName,

        vaiTro:
          currentRole,

        noiDung,

        tepDinhKem,

        createdAt:
          new Date(),
      });

      /* ===================================================
         AUTO STATUS
      =================================================== */

      if (isManager) {
        if (
          !ticket.nguoiXuLyId
        ) {
          ticket.nguoiXuLyId =
            currentUser._id;

          ticket.nguoiXuLyTen =
            currentUser.fullName;
        }

        if (
          !ticket.thoiGianTiepNhan
        ) {
          ticket.thoiGianTiepNhan =
            new Date();
        }

        /*
         * Có thể chọn "Gửi & hoàn tất".
         */
        if (
          body.danhDauDaXuLy ===
          true
        ) {
          ticket.trangThai =
            "DA_XU_LY";

          ticket.thoiGianXuLyXong =
            new Date();
        } else if (
          ticket.trangThai ===
            "MOI" ||
          ticket.trangThai ===
            "DA_TIEP_NHAN" ||
          ticket.trangThai ===
            "CHO_BO_SUNG"
        ) {
          ticket.trangThai =
            "DANG_XU_LY";

          ticket.thoiGianXuLyXong =
            null;
        }
      } else if (
        ticket.trangThai ===
        "CHO_BO_SUNG"
      ) {
        /*
         * Người gửi bổ sung xong thì đưa lại
         * về hàng chờ xử lý.
         */
        ticket.trangThai =
          "DANG_XU_LY";

        ticket.thoiGianXuLyXong =
          null;
      }

      ticket.lichSuXuLy.push({
        nguoiThucHienId:
          currentUser._id,

        nguoiThucHienTen:
          currentUser.fullName,

        vaiTro:
          currentRole,

        hanhDong:
          "PHAN_HOI",

        trangThaiCu:
          oldStatus,

        trangThaiMoi:
          ticket.trangThai,

        ghiChu:
          [
            noiDung
              ? noiDung.length >
                180
                ? `${noiDung.slice(
                    0,
                    180,
                  )}...`
                : noiDung
              : "Gửi tệp đính kèm",

            tepDinhKem.length >
            0
              ? `${tepDinhKem.length} tệp đính kèm`
              : "",
          ]
            .filter(
              Boolean,
            )
            .join(
              " · ",
            ),

        createdAt:
          new Date(),
      });

      await ticket.save();

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

          soTepDinhKem:
            tepDinhKem.length,

          danhDauDaXuLy:
            body.danhDauDaXuLy ===
            true,
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
          body.danhDauDaXuLy ===
            true
            ? "Đã gửi phản hồi và đánh dấu yêu cầu đã xử lý"
            : "Đã gửi phản hồi",

        data:
          ticket,
      });
    }

    /* =====================================================
       UPDATE STATUS
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

      const rawStatus =
        typeof body.trangThai ===
        "string"
          ? body.trangThai.trim()
          : "";

      if (
        !rawStatus ||
        !VALID_STATUSES.includes(
          rawStatus as TrangThaiHoTro,
        )
      ) {
        return errorResponse(
          "Trạng thái không hợp lệ",
        );
      }

      const newStatus =
        rawStatus as
          TrangThaiHoTro;

      const oldStatus =
        ticket.trangThai;

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

      ticket.nguoiXuLyId =
        currentUser._id;

      ticket.nguoiXuLyTen =
        currentUser.fullName;

      ticket.trangThai =
        newStatus as
          TrangThaiHoTro;

      if (
        !ticket.thoiGianTiepNhan &&
        newStatus !==
          "MOI"
      ) {
        ticket.thoiGianTiepNhan =
          new Date();
      }

      if (
        newStatus ===
        "MOI"
      ) {
        ticket.thoiGianTiepNhan =
          null;
      }

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
        ticket.thoiGianXuLyXong =
          null;
      }

      if (
        newStatus ===
        "DONG"
      ) {
        ticket.thoiGianDong =
          new Date();

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

      ticket.lichSuXuLy.push({
        nguoiThucHienId:
          currentUser._id,

        nguoiThucHienTen:
          currentUser.fullName,

        vaiTro:
          currentRole,

        hanhDong:
          historyAction,

        trangThaiCu:
          oldStatus,

        trangThaiMoi:
          newStatus,

        ghiChu:
          `Chuyển trạng thái từ ${oldStatus} sang ${newStatus}`,

        createdAt:
          new Date(),
      });

      await ticket.save();

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
          `${currentUser.fullName} cập nhật trạng thái yêu cầu hỗ trợ ${ticket.maYeuCau}`,

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

    return errorResponse(
      "Thao tác không được hỗ trợ",
    );
  } catch (
    error
  ) {
    console.error(
      "PATCH /api/ho-tro/[id]:",
      error,
    );

    if (
      error instanceof
      mongoose.Error
        .ValidationError
    ) {
      const first =
        Object.values(
          error.errors,
        )[0];

      return errorResponse(
        first?.message ||
          "Dữ liệu không hợp lệ",
      );
    }

    return errorResponse(
      process.env.NODE_ENV ===
        "development" &&
      error instanceof
        Error
        ? error.message
        : "Không thể cập nhật yêu cầu hỗ trợ",
      500,
    );
  }
}