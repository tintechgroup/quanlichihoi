import mongoose from "mongoose";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import MinhChungHoatDong from "@/models/MinhChungHoatDong";

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

type TepDinhKemBody = {
  tenTep: string;

  duongDan: string;

  pathname?: string;

  mimeType?: string;

  kichThuoc?: number;
};

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_FILES = 10;

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_EXTENSIONS =
  new Set([
    "png",
    "jpg",
    "jpeg",

    "pdf",

    "doc",
    "docx",

    "xls",
    "xlsx",
  ]);

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

/* =========================================================
   LEGACY STATUS
========================================================= */

function normalizeStatus(
  status: string,
) {
  if (
    status ===
    "CHO_DUYET"
  ) {
    return "DA_GUI";
  }

  if (
    status ===
    "DA_DUYET"
  ) {
    return "DA_XET_DUYET";
  }

  if (
    status ===
    "TU_CHOI"
  ) {
    return "YEU_CAU_BO_SUNG";
  }

  return status;
}

/* =========================================================
   FILE PARSER
========================================================= */

function parseFiles(
  value: unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  const result:
    TepDinhKemBody[] =
    [];

  for (
    const raw
    of value
  ) {
    if (
      !raw ||
      typeof raw !==
        "object"
    ) {
      continue;
    }

    const item =
      raw as Record<
        string,
        unknown
      >;

    const tenTep =
      getString(
        item.tenTep,
      );

    const duongDan =
      getString(
        item.duongDan,
      );

    const pathname =
      getString(
        item.pathname,
      );

    const mimeType =
      getString(
        item.mimeType,
      );

    const rawSize =
      Number(
        item.kichThuoc ??
          0,
      );

    const kichThuoc =
      Number.isFinite(
        rawSize,
      )
        ? rawSize
        : 0;

    if (
      !tenTep ||
      !duongDan
    ) {
      continue;
    }

    result.push({
      tenTep,

      duongDan,

      pathname,

      mimeType,

      kichThuoc,
    });
  }

  return result;
}

/* =========================================================
   VALIDATE FILES
========================================================= */

function validateFiles(
  files:
    TepDinhKemBody[],
) {
  if (
    files.length ===
    0
  ) {
    return (
      "Vui lòng tải lên ít nhất một tệp bổ sung"
    );
  }

  if (
    files.length >
    MAX_FILES
  ) {
    return `Chỉ được gửi tối đa ${MAX_FILES} tệp`;
  }

  for (
    const file
    of files
  ) {
    const extension =
      getExtension(
        file.tenTep,
      );

    if (
      !ALLOWED_EXTENSIONS.has(
        extension,
      )
    ) {
      return `Tệp "${file.tenTep}" không đúng định dạng cho phép`;
    }

    if (
      Number(
        file.kichThuoc ??
          0,
      ) >
      MAX_FILE_SIZE
    ) {
      return `Tệp "${file.tenTep}" vượt quá 10MB`;
    }

    try {
      const url =
        new URL(
          file.duongDan,
        );

      if (
        url.protocol !==
        "https:"
      ) {
        return `Đường dẫn tệp "${file.tenTep}" không hợp lệ`;
      }
    } catch {
      return `Đường dẫn tệp "${file.tenTep}" không hợp lệ`;
    }
  }

  return "";
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

    /* =====================================================
       ID
    ===================================================== */

    const { id } =
      await context.params;

    if (
      !mongoose.isValidObjectId(
        id,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "ID minh chứng không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body:
      Record<
        string,
        unknown
      >;

    try {
      body =
        (await request.json()) as Record<
          string,
          unknown
        >;
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

    const action =
      getString(
        body.action,
      );

    const noiDungYeuCauBoSung =
      getString(
        body.noiDungYeuCauBoSung,
      );

    const ghiChu =
      getString(
        body.ghiChu,
      );

    const tepDinhKemMoi =
      parseFiles(
        body.tepDinhKem,
      );

    /* =====================================================
       ACTION VALIDATION
    ===================================================== */

    if (
      ![
        "RECEIVE",
        "APPROVE",
        "REQUEST_SUPPLEMENT",
        "SUPPLEMENT",
      ].includes(
        action,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Thao tác không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       ROLE VALIDATION
    ===================================================== */

    const isReviewer =
      session.role ===
        "ADMIN" ||
      session.role ===
        "BAN_CHAP_HANH";

    const isSenderRole =
      session.role ===
        "CHI_HOI_TRUONG" ||
      session.role ===
        "HOI_VIEN";

    /*
     * Admin / BCH:
     * RECEIVE
     * APPROVE
     * REQUEST_SUPPLEMENT
     */
    if (
      [
        "RECEIVE",
        "APPROVE",
        "REQUEST_SUPPLEMENT",
      ].includes(
        action,
      ) &&
      !isReviewer
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền xử lý minh chứng",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * CHT / Hội viên:
     * SUPPLEMENT
     */
    if (
      action ===
        "SUPPLEMENT" &&
      !isSenderRole
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền bổ sung minh chứng",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       REQUEST SUPPLEMENT VALIDATION
    ===================================================== */

    if (
      action ===
        "REQUEST_SUPPLEMENT" &&
      !noiDungYeuCauBoSung
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Vui lòng nhập nội dung yêu cầu bổ sung",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       SUPPLEMENT FILE VALIDATION
    ===================================================== */

    if (
      action ===
      "SUPPLEMENT"
    ) {
      const fileError =
        validateFiles(
          tepDinhKemMoi,
        );

      if (fileError) {
        return NextResponse.json(
          {
            success: false,

            message:
              fileError,
          },
          {
            status: 400,
          },
        );
      }
    }

    /* =====================================================
       DATABASE
    ===================================================== */

    await connectDB();

    const record =
      await MinhChungHoatDong.findById(
        id,
      ).populate(
        "hoatDongId",
        "maHoatDong tenHoatDong",
      );

    if (!record) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy minh chứng",
        },
        {
          status: 404,
        },
      );
    }

    const normalizedCurrentStatus =
      normalizeStatus(
        String(
          record.trangThai,
        ),
      );

    /* =====================================================
       SUPPLEMENT
       Chi hội trưởng / Hội viên gửi lại
    ===================================================== */

    if (
      action ===
      "SUPPLEMENT"
    ) {
      /*
       * Chỉ người gửi ban đầu
       * mới được bổ sung hồ sơ.
       */
      if (
        String(
          record.nguoiGuiId,
        ) !==
        String(
          session.userId,
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Bạn chỉ được bổ sung hồ sơ minh chứng do chính mình gửi",
          },
          {
            status: 403,
          },
        );
      }

      /*
       * Chỉ hồ sơ đang yêu cầu bổ sung
       * mới cho gửi bổ sung.
       */
      if (
        normalizedCurrentStatus !==
        "YEU_CAU_BO_SUNG"
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Hồ sơ hiện không ở trạng thái yêu cầu bổ sung",
          },
          {
            status: 409,
          },
        );
      }

      /* ===================================================
         EXISTING FILES
      =================================================== */

      const existingFiles =
        Array.isArray(
          record.tepDinhKem,
        )
          ? record.tepDinhKem
          : [];

      /*
       * Tổng cũ + mới không vượt quá 10.
       */
      if (
        existingFiles.length +
          tepDinhKemMoi.length >
        MAX_FILES
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              `Tổng số tệp minh chứng không được vượt quá ${MAX_FILES} tệp`,
          },
          {
            status: 400,
          },
        );
      }

      /* ===================================================
         REMOVE DUPLICATE FILES
      =================================================== */

      const existingKeys =
        new Set(
          existingFiles.map(
            (file) =>
              String(
                file.pathname ||
                  file.duongDan,
              ),
          ),
        );

      const uniqueNewFiles =
        tepDinhKemMoi.filter(
          (file) => {
            const key =
              String(
                file.pathname ||
                  file.duongDan,
              );

            return (
              key &&
              !existingKeys.has(
                key,
              )
            );
          },
        );

      if (
        uniqueNewFiles.length ===
        0
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Không có tệp bổ sung mới",
          },
          {
            status: 400,
          },
        );
      }

      /* ===================================================
         APPEND FILES
      =================================================== */

      record.tepDinhKem.push(
        ...uniqueNewFiles,
      );

      /*
       * Nếu có ghi chú mới,
       * nối vào ghi chú cũ.
       */
      if (ghiChu) {
        const time =
          new Intl.DateTimeFormat(
            "vi-VN",
            {
              hour: "2-digit",

              minute:
                "2-digit",

              day:
                "2-digit",

              month:
                "2-digit",

              year:
                "numeric",
            },
          ).format(
            new Date(),
          );

        const supplementNote =
          `[Bổ sung ${time}] ${ghiChu}`;

        record.ghiChu =
          record.ghiChu
            ? `${record.ghiChu}\n\n${supplementNote}`
            : supplementNote;
      }

      /* ===================================================
         RESET WORKFLOW
      =================================================== */

      record.trangThai =
        "DA_GUI";

      /*
       * Yêu cầu bổ sung đã được xử lý,
       * nên xóa nội dung cảnh báo cũ.
       */
      record.noiDungYeuCauBoSung =
        "";

      /*
       * Hồ sơ quay lại đầu quy trình.
       */
      record.nguoiXuLyId =
        null;

      record.nguoiXuLyTen =
        "";

      record.ngayNhan =
        null;

      record.ngayXetDuyet =
        null;

      await record.save();

      /* ===================================================
         LOG
      =================================================== */

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
          "UPDATE",

        module:
          "MINH_CHUNG",

        description:
          `${session.fullName} đã bổ sung minh chứng ${record.tieuDe}`,

        targetId:
          record._id.toString(),

        targetName:
          record.tieuDe,

        metadata: {
          action:
            "SUPPLEMENT",

          soTepBoSung:
            uniqueNewFiles.length,

          tongSoTep:
            record.tepDinhKem.length,

          tepBoSung:
            uniqueNewFiles.map(
              (file) => ({
                tenTep:
                  file.tenTep,

                pathname:
                  file.pathname,

                kichThuoc:
                  file.kichThuoc,
              }),
            ),

          ghiChu:
            ghiChu ||
            "",
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
        success: true,

        message:
          "Bổ sung minh chứng thành công. Hồ sơ đã được gửi lại để xét duyệt.",

        data:
          record,
      });
    }

    /* =====================================================
       REVIEWER USER
    ===================================================== */

    const currentUser =
      await User.findById(
        session.userId,
      ).select(
        "_id fullName username",
      );

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy người xử lý",
        },
        {
          status: 404,
        },
      );
    }

    const reviewerName =
      currentUser.fullName ||
      currentUser.username ||
      session.fullName;

    /* =====================================================
       RECEIVE
    ===================================================== */

    if (
      action ===
      "RECEIVE"
    ) {
      if (
        normalizedCurrentStatus !==
        "DA_GUI"
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Minh chứng không ở trạng thái chờ tiếp nhận",
          },
          {
            status: 409,
          },
        );
      }

      record.trangThai =
        "DA_NHAN";

      record.nguoiXuLyId =
        currentUser._id;

      record.nguoiXuLyTen =
        reviewerName;

      record.ngayNhan =
        new Date();

      record.noiDungYeuCauBoSung =
        "";

      await record.save();

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
          "APPROVE",

        module:
          "MINH_CHUNG",

        description:
          `${session.fullName} đã tiếp nhận minh chứng ${record.tieuDe}`,

        targetId:
          record._id.toString(),

        targetName:
          record.tieuDe,

        metadata: {
          action:
            "RECEIVE",
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
        success: true,

        message:
          "Tiếp nhận minh chứng thành công",

        data:
          record,
      });
    }

    /* =====================================================
       APPROVE
    ===================================================== */

    if (
      action ===
      "APPROVE"
    ) {
      if (
        normalizedCurrentStatus !==
        "DA_NHAN"
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Minh chứng cần được tiếp nhận trước khi xét duyệt",
          },
          {
            status: 409,
          },
        );
      }

      record.trangThai =
        "DA_XET_DUYET";

      record.nguoiXuLyId =
        currentUser._id;

      record.nguoiXuLyTen =
        reviewerName;

      record.ngayXetDuyet =
        new Date();

      record.noiDungYeuCauBoSung =
        "";

      await record.save();

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
          "APPROVE",

        module:
          "MINH_CHUNG",

        description:
          `${session.fullName} đã xét duyệt minh chứng ${record.tieuDe}`,

        targetId:
          record._id.toString(),

        targetName:
          record.tieuDe,

        metadata: {
          action:
            "APPROVE",
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
        success: true,

        message:
          "Xét duyệt minh chứng thành công",

        data:
          record,
      });
    }

    /* =====================================================
       REQUEST SUPPLEMENT
    ===================================================== */

    if (
      normalizedCurrentStatus !==
        "DA_GUI" &&
      normalizedCurrentStatus !==
        "DA_NHAN"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Minh chứng hiện không thể yêu cầu bổ sung",
        },
        {
          status: 409,
        },
      );
    }

    record.trangThai =
      "YEU_CAU_BO_SUNG";

    record.nguoiXuLyId =
      currentUser._id;

    record.nguoiXuLyTen =
      reviewerName;

    record.noiDungYeuCauBoSung =
      noiDungYeuCauBoSung;

    /*
     * Đây là thời điểm BCH/Admin
     * ra yêu cầu xử lý hồ sơ.
     */
    record.ngayXetDuyet =
      new Date();

    await record.save();

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
        "REJECT",

      module:
        "MINH_CHUNG",

      description:
        `${session.fullName} đã yêu cầu bổ sung minh chứng ${record.tieuDe}`,

      targetId:
        record._id.toString(),

      targetName:
        record.tieuDe,

      metadata: {
        action:
          "REQUEST_SUPPLEMENT",

        noiDungYeuCauBoSung,
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
      success: true,

      message:
        "Đã gửi yêu cầu bổ sung minh chứng",

      data:
        record,
    });
  } catch (error) {
    console.error(
      "PATCH /api/minh-chung/[id]:",
      error,
    );

    /* =====================================================
       MONGOOSE VALIDATION
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
            "Dữ liệu minh chứng không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          process.env
            .NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? error.message
              : "Không thể xử lý minh chứng"
            : "Không thể xử lý minh chứng",
      },
      {
        status: 500,
      },
    );
  }
}