import mongoose from "mongoose";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import HoatDong from "@/models/HoatDong";

import HoiVien from "@/models/HoiVien";

import MinhChungHoatDong, {
  type IMinhChungHoatDong,
} from "@/models/MinhChungHoatDong";

import User from "@/models/User";

export const dynamic =
  "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type TepDinhKemBody = {
  tenTep: string;

  duongDan: string;

  pathname: string;

  mimeType: string;

  kichThuoc: number;
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

function getFileExtension(
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
  value: string,
) {
  if (
    value ===
    "CHO_DUYET"
  ) {
    return "DA_GUI";
  }

  if (
    value ===
    "DA_DUYET"
  ) {
    return "DA_XET_DUYET";
  }

  if (
    value ===
    "TU_CHOI"
  ) {
    return "YEU_CAU_BO_SUNG";
  }

  return value;
}

/* =========================================================
   NORMALIZE RECORD
========================================================= */

function normalizeRecord<T extends IMinhChungHoatDong>(
  item: T,
) {
  const files =
    Array.isArray(
      item.tepDinhKem,
    )
      ? [
          ...item.tepDinhKem,
        ]
      : [];

  /*
   * Hỗ trợ dữ liệu cũ.
   */
  if (
    files.length === 0 &&
    item.fileUrl
  ) {
    files.push({
      tenTep:
        item.tenFile ||
        "Minh chứng",

      duongDan:
        item.fileUrl,

      pathname: "",

      mimeType: "",

      kichThuoc: 0,
    });
  }

  return {
    ...item,

    tepDinhKem:
      files,

    trangThai:
      normalizeStatus(
        String(
          item.trangThai ||
            "DA_GUI",
        ),
      ),
  };
}

/* =========================================================
   PARSE FILES
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

  const files:
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

    const kichThuoc =
      Number(
        item.kichThuoc ??
          0,
      );

    if (
      !tenTep ||
      !duongDan
    ) {
      continue;
    }

    files.push({
      tenTep,

      duongDan,

      pathname,

      mimeType,

      kichThuoc:
        Number.isFinite(
          kichThuoc,
        )
          ? kichThuoc
          : 0,
    });
  }

  return files;
}

/* =========================================================
   MONGOOSE ERROR
========================================================= */

function getDatabaseError(
  error: unknown,
) {
  if (
    error instanceof
    mongoose.Error
      .ValidationError
  ) {
    const firstError =
      Object.values(
        error.errors,
      )[0];

    return (
      firstError?.message ||
      "Dữ liệu minh chứng không hợp lệ"
    );
  }

  if (
    error &&
    typeof error ===
      "object" &&
    "code" in error &&
    error.code === 11000
  ) {
    return "Dữ liệu minh chứng đã tồn tại";
  }

  if (
    error instanceof
    Error
  ) {
    return error.message;
  }

  return "Không thể gửi minh chứng";
}

/* =========================================================
   GET /api/minh-chung
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

    const allowedRoles = [
      "ADMIN",
      "BAN_CHAP_HANH",
      "CHI_HOI_TRUONG",
      "HOI_VIEN",
    ];

    if (
      !allowedRoles.includes(
        session.role,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền xem minh chứng",
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
        ?.trim() ||
      "";

    const search =
      searchParams
        .get("search")
        ?.trim() ||
      "";

    const filter:
      Record<
        string,
        unknown
      > = {};

    /* =====================================================
       HỘI VIÊN
    ===================================================== */

    if (
      session.role ===
      "HOI_VIEN"
    ) {
      filter.nguoiGuiId =
        new mongoose.Types.ObjectId(
          session.userId,
        );
    }

    /* =====================================================
       CHI HỘI TRƯỞNG
    ===================================================== */

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

      if (
        !user?.chiHoiId
      ) {
        return NextResponse.json({
          success: true,

          data: [],
        });
      }

      filter.chiHoiId =
        user.chiHoiId;
    }

    /* =====================================================
       STATUS
    ===================================================== */

    if (status) {
      if (
        status ===
        "DA_GUI"
      ) {
        filter.trangThai = {
          $in: [
            "DA_GUI",

            /*
             * Legacy.
             */
            "CHO_DUYET",
          ],
        };
      } else if (
        status ===
        "DA_XET_DUYET"
      ) {
        filter.trangThai = {
          $in: [
            "DA_XET_DUYET",

            /*
             * Legacy.
             */
            "DA_DUYET",
          ],
        };
      } else if (
        status ===
        "YEU_CAU_BO_SUNG"
      ) {
        filter.trangThai = {
          $in: [
            "YEU_CAU_BO_SUNG",

            /*
             * Legacy.
             */
            "TU_CHOI",
          ],
        };
      } else if (
        status ===
        "DA_NHAN"
      ) {
        filter.trangThai =
          "DA_NHAN";
      }
    }

    /* =====================================================
       SEARCH
    ===================================================== */

    if (search) {
      filter.$or = [
        {
          tieuDe: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          nguoiGuiTen: {
            $regex:
              search,

            $options:
              "i",
          },
        },
      ];
    }

    /* =====================================================
       QUERY
    ===================================================== */

    const records =
      await MinhChungHoatDong.find(
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
            "trangThai",
          ].join(" "),
        )
        .populate(
          "chiHoiId",

          "maChiHoi tenChiHoi",
        )
        .populate(
          "nguoiGuiId",

          "username fullName role",
        )
        .populate(
          "nguoiXuLyId",

          "username fullName role",
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return NextResponse.json({
      success: true,

      data:
        records.map(
          normalizeRecord,
        ),
    });
  } catch (error) {
    console.error(
      "GET /api/minh-chung:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể tải danh sách minh chứng",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST /api/minh-chung
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       AUTH
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

    if (
      session.role !==
        "CHI_HOI_TRUONG" &&
      session.role !==
        "HOI_VIEN"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền gửi minh chứng",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    const body =
      await request.json();

    const hoatDongId =
      getString(
        body.hoatDongId,
      );

    const tieuDe =
      getString(
        body.tieuDe,
      );

    const moTa =
      getString(
        body.moTa,
      );

    const ghiChu =
      getString(
        body.ghiChu,
      );

    const tepDinhKem =
      parseFiles(
        body.tepDinhKem,
      );

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      !mongoose
        .Types
        .ObjectId
        .isValid(
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

    if (!tieuDe) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Vui lòng nhập tiêu đề minh chứng",
        },
        {
          status: 400,
        },
      );
    }

    if (
      tieuDe.length >
      255
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Tiêu đề minh chứng không được vượt quá 255 ký tự",
        },
        {
          status: 400,
        },
      );
    }

    if (
      tepDinhKem.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Vui lòng tải lên ít nhất một tệp minh chứng",
        },
        {
          status: 400,
        },
      );
    }

    if (
      tepDinhKem.length >
      MAX_FILES
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            `Chỉ được gửi tối đa ${MAX_FILES} tệp minh chứng`,
        },
        {
          status: 400,
        },
      );
    }

    for (
      const file
      of tepDinhKem
    ) {
      const extension =
        getFileExtension(
          file.tenTep,
        );

      if (
        !ALLOWED_EXTENSIONS.has(
          extension,
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              `Tệp "${file.tenTep}" không đúng định dạng cho phép`,
          },
          {
            status: 400,
          },
        );
      }

      if (
        file.kichThuoc >
        MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              `Tệp "${file.tenTep}" vượt quá 10MB`,
          },
          {
            status: 400,
          },
        );
      }

      /*
       * Chỉ nhận URL Vercel Blob HTTPS.
       */
      try {
        const url =
          new URL(
            file.duongDan,
          );

        if (
          url.protocol !==
          "https:"
        ) {
          throw new Error();
        }
      } catch {
        return NextResponse.json(
          {
            success: false,

            message:
              `Đường dẫn tệp "${file.tenTep}" không hợp lệ`,
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

    /* =====================================================
       ACTIVITY
    ===================================================== */

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
     * Đề bài:
     * hoạt động phải kết thúc
     * mới nộp minh chứng.
     */
    if (
      activity.trangThai !==
      "DA_KET_THUC"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Chỉ được gửi minh chứng khi hoạt động đã kết thúc",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       CURRENT USER
    ===================================================== */

    const currentUser =
      await User.findById(
        session.userId,
      )
        .select(
          "_id username fullName role chiHoiId",
        )
        .lean();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy tài khoản gửi minh chứng",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       DETERMINE CHI HỘI
    ===================================================== */

    let chiHoiId:
      mongoose.Types.ObjectId
      | null = null;

    if (
      currentUser.chiHoiId
    ) {
      chiHoiId =
        currentUser.chiHoiId as mongoose.Types.ObjectId;
    }

    /*
     * Hội viên có thể lấy
     * Chi hội từ hồ sơ Hội viên.
     */
    if (
      !chiHoiId &&
      session.role ===
        "HOI_VIEN"
    ) {
      const member =
        await HoiVien.findOne({
          taiKhoanId:
            currentUser._id,
        })
          .select(
            "chiHoiId",
          )
          .lean();

      if (
        member?.chiHoiId
      ) {
        chiHoiId =
          member.chiHoiId;
      }
    }

    /*
     * Chi hội trưởng bắt buộc
     * phải thuộc một Chi hội.
     */
    if (
      session.role ===
        "CHI_HOI_TRUONG" &&
      !chiHoiId
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Tài khoản Chi hội trưởng chưa được gán vào Chi hội",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       PERMISSION FOR CHI HỘI ACTIVITY
    ===================================================== */

    if (
      activity.phamVi ===
      "CHI_HOI" &&
      activity.chiHoiId &&
      chiHoiId &&
      String(
        activity.chiHoiId,
      ) !==
        String(
          chiHoiId,
        )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không thuộc Chi hội của hoạt động này",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       CREATE
    ===================================================== */

    const record =
      await MinhChungHoatDong.create(
        {
          hoatDongId:
            activity._id,

          nguoiGuiId:
            currentUser._id,

          nguoiGuiTen:
            currentUser.fullName ||
            session.fullName ||
            currentUser.username,

          chiHoiId:
            chiHoiId ||
            null,

          tieuDe,

          moTa,

          ghiChu,

          tepDinhKem,

          trangThai:
            "DA_GUI",

          nguoiXuLyId:
            null,

          nguoiXuLyTen:
            "",

          noiDungYeuCauBoSung:
            "",

          ngayNhan:
            null,

          ngayXetDuyet:
            null,
        },
      );

    /* =====================================================
       SYSTEM LOG
    ===================================================== */

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
        "MINH_CHUNG",

      description:
        `${session.fullName} đã gửi minh chứng cho hoạt động ${activity.maHoatDong} - ${activity.tenHoatDong}`,

      targetId:
        record._id.toString(),

      targetName:
        tieuDe,

      metadata: {
        hoatDongId:
          activity._id.toString(),

        chiHoiId:
          chiHoiId
            ? String(
                chiHoiId,
              )
            : null,

        soTep:
          tepDinhKem.length,

        tepDinhKem:
          tepDinhKem.map(
            (file) => ({
              tenTep:
                file.tenTep,

              pathname:
                file.pathname,

              kichThuoc:
                file.kichThuoc,
            }),
          ),
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
       POPULATE RESPONSE
    ===================================================== */

    const populatedRecord =
      await MinhChungHoatDong.findById(
        record._id,
      )
        .populate(
          "hoatDongId",

          "maHoatDong tenHoatDong phamVi diaDiem thoiGianBatDau thoiGianKetThuc trangThai",
        )
        .populate(
          "chiHoiId",

          "maChiHoi tenChiHoi",
        )
        .lean();

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        message:
          "Nộp minh chứng thành công",

        data:
          populatedRecord
            ? normalizeRecord(
                populatedRecord,
              )
            : record,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/minh-chung:",
      error,
    );

    /*
     * Trong development:
     * trả đúng lỗi giúp debug.
     *
     * Production:
     * không lộ stack/database.
     */
    const message =
      getDatabaseError(
        error,
      );

    return NextResponse.json(
      {
        success: false,

        message:
          process.env
            .NODE_ENV ===
          "development"
            ? message
            : "Không thể gửi minh chứng",
      },
      {
        status: 500,
      },
    );
  }
}

