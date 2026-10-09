import mongoose, {
  Types,
} from "mongoose";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import ChiHoi from "@/models/ChiHoi";

import HoatDong, {

} from "@/models/HoatDong";

import HoiVien from "@/models/HoiVien";

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

type PhamViHoatDong =
  | "LIEN_CHI_HOI"
  | "CHI_HOI";

type TrangThaiHoatDong =
  | "CHO_DUYET"
  | "DA_DUYET"
  | "TU_CHOI"
  | "SAP_DIEN_RA"
  | "DANG_DIEN_RA"
  | "DA_KET_THUC"
  | "DA_HUY";

type FileKeHoachBody = {
  tenTep?: string;

  duongDan?: string;

  pathname?: string;

  mimeType?: string;

  kichThuoc?:
    | number
    | string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const PHAM_VI_VALUES:
  PhamViHoatDong[] = [
    "LIEN_CHI_HOI",
    "CHI_HOI",
  ];

const TRANG_THAI_VALUES:
  TrangThaiHoatDong[] = [
    "CHO_DUYET",

    "DA_DUYET",

    "TU_CHOI",

    "SAP_DIEN_RA",

    "DANG_DIEN_RA",

    "DA_KET_THUC",

    "DA_HUY",
  ];

const TRANG_THAI_CONG_KHAI:
  TrangThaiHoatDong[] = [
    "DA_DUYET",

    "SAP_DIEN_RA",

    "DANG_DIEN_RA",

    "DA_KET_THUC",
  ];

const UPDATE_ROLES = [
  "ADMIN",

  "BAN_CHAP_HANH",

  "CHI_HOI_TRUONG",
];

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_EXTENSIONS =
  new Set([
    "pdf",

    "doc",
    "docx",

    "xls",
    "xlsx",

    "ppt",
    "pptx",

    "png",
    "jpg",
    "jpeg",
  ]);

/* =========================================================
   HELPERS
========================================================= */

function hasField(
  body:
    Record<
      string,
      unknown
    >,

  field: string,
) {
  return Object.prototype.hasOwnProperty.call(
    body,
    field,
  );
}

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

function errorResponse(
  message: string,
  status = 400,
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
   DATE
========================================================= */

function parseRequiredDate(
  value: unknown,
) {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function parseOptionalDate(
  value: unknown,
): {
  valid: boolean;

  value:
    | Date
    | null;
} {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value === ""
  ) {
    return {
      valid: true,

      value: null,
    };
  }

  if (
    typeof value !==
    "string"
  ) {
    return {
      valid: false,

      value: null,
    };
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return {
      valid: true,

      value: null,
    };
  }

  const date =
    new Date(
      trimmed,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return {
      valid: false,

      value: null,
    };
  }

  return {
    valid: true,

    value: date,
  };
}

/* =========================================================
   MAX MEMBERS
========================================================= */

function parseMaximumMembers(
  value: unknown,
): {
  valid: boolean;

  value:
    | number
    | null;
} {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value === ""
  ) {
    return {
      valid: true,

      value: null,
    };
  }

  const numberValue =
    Number(value);

  if (
    !Number.isInteger(
      numberValue,
    ) ||
    numberValue <= 0
  ) {
    return {
      valid: false,

      value: null,
    };
  }

  return {
    valid: true,

    value:
      numberValue,
  };
}

/* =========================================================
   MONEY
========================================================= */

function parseMoney(
  value: unknown,
): {
  valid: boolean;

  value: number;
} {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value === ""
  ) {
    return {
      valid: true,

      value: 0,
    };
  }

  const numberValue =
    Number(value);

  if (
    !Number.isFinite(
      numberValue,
    ) ||
    numberValue < 0
  ) {
    return {
      valid: false,

      value: 0,
    };
  }

  return {
    valid: true,

    value:
      numberValue,
  };
}

/* =========================================================
   FILE KẾ HOẠCH
========================================================= */

function parseFileKeHoach(
  value: unknown,
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  if (
    typeof value !==
      "object"
  ) {
    return null;
  }

  const raw =
    value as FileKeHoachBody;

  const tenTep =
    getString(
      raw.tenTep,
    );

  const duongDan =
    getString(
      raw.duongDan,
    );

  const pathname =
    getString(
      raw.pathname,
    );

  const mimeType =
    getString(
      raw.mimeType,
    );

  const rawSize =
    Number(
      raw.kichThuoc ??
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
    return null;
  }

  return {
    tenTep,

    duongDan,

    pathname,

    mimeType,

    kichThuoc,
  };
}

function validateFileKeHoach(
  file:
    ReturnType<
      typeof parseFileKeHoach
    >,
) {
  if (!file) {
    return "";
  }

  const extension =
    getExtension(
      file.tenTep,
    );

  if (
    !ALLOWED_FILE_EXTENSIONS.has(
      extension,
    )
  ) {
    return (
      "File kế hoạch chỉ hỗ trợ PDF, Word, Excel, PowerPoint hoặc ảnh"
    );
  }

  if (
    file.kichThuoc <
    0
  ) {
    return (
      "Kích thước file kế hoạch không hợp lệ"
    );
  }

  if (
    file.kichThuoc >
    MAX_FILE_SIZE
  ) {
    return (
      "File kế hoạch không được vượt quá 10MB"
    );
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
      return (
        "Đường dẫn file kế hoạch không hợp lệ"
      );
    }
  } catch {
    return (
      "Đường dẫn file kế hoạch không hợp lệ"
    );
  }

  return "";
}

/* =========================================================
   POPULATE
========================================================= */

async function populateActivity(
  id: string,
) {
  return HoatDong.findById(
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
}

/* =========================================================
   CHI HỘI CỦA TÀI KHOẢN
========================================================= */

async function getUserChiHoiId({
  userId,

  role,
}: {
  userId: string;

  role: string;
}) {
  if (
    !Types.ObjectId.isValid(
      userId,
    )
  ) {
    return null;
  }

  /* =======================================================
     CHI HỘI TRƯỞNG
  ======================================================= */

  if (
    role ===
    "CHI_HOI_TRUONG"
  ) {
    const user =
      await User.findById(
        userId,
      )
        .select(
          "chiHoiId",
        )
        .lean();

    if (
      user?.chiHoiId
    ) {
      return new Types.ObjectId(
        String(
          user.chiHoiId,
        ),
      );
    }

    const member =
      await HoiVien.findOne({
        taiKhoanId:
          userId,
      })
        .select(
          "chiHoiId",
        )
        .lean();

    if (
      member?.chiHoiId
    ) {
      return new Types.ObjectId(
        String(
          member.chiHoiId,
        ),
      );
    }

    return null;
  }

  /* =======================================================
     HỘI VIÊN
  ======================================================= */

  if (
    role ===
    "HOI_VIEN"
  ) {
    const member =
      await HoiVien.findOne({
        taiKhoanId:
          userId,
      })
        .select(
          "chiHoiId",
        )
        .lean();

    if (
      member?.chiHoiId
    ) {
      return new Types.ObjectId(
        String(
          member.chiHoiId,
        ),
      );
    }

    const user =
      await User.findById(
        userId,
      )
        .select(
          "chiHoiId",
        )
        .lean();

    if (
      user?.chiHoiId
    ) {
      return new Types.ObjectId(
        String(
          user.chiHoiId,
        ),
      );
    }
  }

  return null;
}

/* =========================================================
   VIEW PERMISSION
========================================================= */

async function canViewActivity({
  activity,

  userId,

  role,
}: {
  activity: {
    phamVi: string;

    chiHoiId?:
      | Types.ObjectId
      | {
          _id?:
            Types.ObjectId;
        }
      | null;

    trangThai:
      TrangThaiHoatDong;
  };

  userId: string;

  role: string;
}) {
  /*
   * Admin/BCH xem toàn bộ.
   */
  if (
    role ===
      "ADMIN" ||
    role ===
      "BAN_CHAP_HANH"
  ) {
    return true;
  }

  /*
   * Hội viên chỉ xem
   * hoạt động công khai.
   */
  if (
    role ===
      "HOI_VIEN" &&
    !TRANG_THAI_CONG_KHAI.includes(
      activity.trangThai,
    )
  ) {
    return false;
  }

  if (
    role !==
      "CHI_HOI_TRUONG" &&
    role !==
      "HOI_VIEN"
  ) {
    return false;
  }

  /*
   * Hoạt động toàn LCH.
   */
  if (
    activity.phamVi ===
    "LIEN_CHI_HOI"
  ) {
    return true;
  }

  const ownChiHoiId =
    await getUserChiHoiId(
      {
        userId,

        role,
      },
    );

  if (
    !ownChiHoiId
  ) {
    return false;
  }

  const rawChiHoi =
    activity.chiHoiId;

  let activityChiHoiId =
    "";

  if (
    rawChiHoi &&
    typeof rawChiHoi ===
      "object" &&
    "_id" in rawChiHoi &&
    rawChiHoi._id
  ) {
    activityChiHoiId =
      String(
        rawChiHoi._id,
      );
  } else if (
    rawChiHoi
  ) {
    activityChiHoiId =
      String(
        rawChiHoi,
      );
  }

  return (
    activityChiHoiId ===
    ownChiHoiId.toString()
  );
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  _request: Request,

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
      !session.userId ||
      !Types.ObjectId.isValid(
        session.userId,
      )
    ) {
      return errorResponse(
        "Thông tin tài khoản đăng nhập không hợp lệ",
        401,
      );
    }

    const { id } =
      await context.params;

    if (
      !Types.ObjectId.isValid(
        id,
      )
    ) {
      return errorResponse(
        "Mã hoạt động không hợp lệ",
        400,
      );
    }

    await connectDB();

    const activity =
      await populateActivity(
        id,
      );

    if (!activity) {
      return errorResponse(
        "Không tìm thấy hoạt động",
        404,
      );
    }

    const allowed =
      await canViewActivity({
        activity: {
          phamVi:
            activity.phamVi,

          chiHoiId:
            activity.chiHoiId as
              | Types.ObjectId
              | {
                  _id?:
                    Types.ObjectId;
                }
              | null,

          trangThai:
            activity.trangThai as
              TrangThaiHoatDong,
        },

        userId:
          session.userId,

        role:
          session.role,
      });

    if (!allowed) {
      return errorResponse(
        "Bạn không có quyền xem hoạt động này",
        403,
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "Lấy thông tin hoạt động thành công",

      data:
        activity,
    });
  } catch (error) {
    console.error(
      "GET /api/hoat-dong/[id]:",
      error,
    );

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
              : "Không thể lấy thông tin hoạt động"
            : "Đã xảy ra lỗi khi lấy thông tin hoạt động",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PUT
========================================================= */

export async function PUT(
  request: Request,

  context:
    RouteContext,
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
      !UPDATE_ROLES.includes(
        session.role,
      )
    ) {
      return errorResponse(
        "Bạn không có quyền cập nhật hoạt động",
        403,
      );
    }

    if (
      !session.userId ||
      !Types.ObjectId.isValid(
        session.userId,
      )
    ) {
      return errorResponse(
        "Thông tin tài khoản đăng nhập không hợp lệ",
        401,
      );
    }

    const { id } =
      await context.params;

    if (
      !Types.ObjectId.isValid(
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
      Record<
        string,
        unknown
      >;

    try {
      body =
        (await request.json()) as
          Record<
            string,
            unknown
          >;
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
        400,
      );
    }

    await connectDB();

    const activity =
      await HoatDong.findById(
        id,
      );

    if (!activity) {
      return errorResponse(
        "Không tìm thấy hoạt động",
        404,
      );
    }

    /* =====================================================
       PERMISSION
    ===================================================== */

    const isAdmin =
      session.role ===
      "ADMIN";

    const isBCH =
      session.role ===
      "BAN_CHAP_HANH";

    const isCHT =
      session.role ===
      "CHI_HOI_TRUONG";

    const isOwner =
      String(
        activity.nguoiTaoId,
      ) ===
      String(
        session.userId,
      );

    const isProposal =
      Boolean(
        activity.laDeXuatChiHoi,
      );

    /*
     * Admin:
     * sửa mọi hoạt động.
     *
     * BCH:
     * sửa hoạt động mình tạo
     * khi đang CHO_DUYET.
     *
     * CHT:
     * sửa đề xuất mình tạo
     * khi CHO_DUYET hoặc TU_CHOI.
     */
    if (!isAdmin) {
      if (!isOwner) {
        return errorResponse(
          "Bạn chỉ được cập nhật hoạt động do mình tạo",
          403,
        );
      }

      if (isCHT) {
        if (
          !isProposal
        ) {
          return errorResponse(
            "Chi hội trưởng chỉ được cập nhật đề xuất hoạt động của Chi hội",
            403,
          );
        }

        if (
          activity.trangThai !==
            "CHO_DUYET" &&
          activity.trangThai !==
            "TU_CHOI"
        ) {
          return errorResponse(
            "Đề xuất chỉ được chỉnh sửa khi đang chờ duyệt hoặc đã bị từ chối",
            403,
          );
        }
      } else if (
        isBCH &&
        activity.trangThai !==
          "CHO_DUYET"
      ) {
        return errorResponse(
          "Bạn chỉ được cập nhật hoạt động do mình tạo và đang chờ duyệt",
          403,
        );
      }
    }

    /* =====================================================
       BASIC FIELDS
    ===================================================== */

    const maHoatDong =
      hasField(
        body,
        "maHoatDong",
      )
        ? getString(
            body.maHoatDong,
          ).toUpperCase()
        : activity.maHoatDong;

    const tenHoatDong =
      hasField(
        body,
        "tenHoatDong",
      )
        ? getString(
            body.tenHoatDong,
          )
        : activity.tenHoatDong;

    const moTa =
      hasField(
        body,
        "moTa",
      )
        ? getString(
            body.moTa,
          )
        : activity.moTa;

    const noiDung =
      hasField(
        body,
        "noiDung",
      )
        ? getString(
            body.noiDung,
          )
        : activity.noiDung;

    const mucDich =
      hasField(
        body,
        "mucDich",
      )
        ? getString(
            body.mucDich,
          )
        : activity.mucDich ||
          "";

    let phamVi =
      hasField(
        body,
        "phamVi",
      )
        ? getString(
            body.phamVi,
          ).toUpperCase()
        : activity.phamVi;

    let donViToChuc =
      hasField(
        body,
        "donViToChuc",
      )
        ? getString(
            body.donViToChuc,
          )
        : activity.donViToChuc;

    const diaDiem =
      hasField(
        body,
        "diaDiem",
      )
        ? getString(
            body.diaDiem,
          )
        : activity.diaDiem;

    /* =====================================================
       REQUIRED
    ===================================================== */

    if (!maHoatDong) {
      return errorResponse(
        "Mã hoạt động không được để trống",
      );
    }

    if (!tenHoatDong) {
      return errorResponse(
        "Tên hoạt động không được để trống",
      );
    }

    if (!diaDiem) {
      return errorResponse(
        "Địa điểm không được để trống",
      );
    }

    /* =====================================================
       DATE
    ===================================================== */

    const startValue =
      hasField(
        body,
        "thoiGianBatDau",
      )
        ? body.thoiGianBatDau
        : activity
            .thoiGianBatDau
            .toISOString();

    const endValue =
      hasField(
        body,
        "thoiGianKetThuc",
      )
        ? body.thoiGianKetThuc
        : activity
            .thoiGianKetThuc
            .toISOString();

    const thoiGianBatDau =
      parseRequiredDate(
        startValue,
      );

    const thoiGianKetThuc =
      parseRequiredDate(
        endValue,
      );

    if (
      !thoiGianBatDau
    ) {
      return errorResponse(
        "Thời gian bắt đầu không hợp lệ",
      );
    }

    if (
      !thoiGianKetThuc
    ) {
      return errorResponse(
        "Thời gian kết thúc không hợp lệ",
      );
    }

    if (
      thoiGianKetThuc <=
      thoiGianBatDau
    ) {
      return errorResponse(
        "Thời gian kết thúc phải sau thời gian bắt đầu",
      );
    }

    const deadlineResult =
      hasField(
        body,
        "hanDangKy",
      )
        ? parseOptionalDate(
            body.hanDangKy,
          )
        : {
            valid: true,

            value:
              activity.hanDangKy ??
              null,
          };

    if (
      !deadlineResult.valid
    ) {
      return errorResponse(
        "Hạn đăng ký không hợp lệ",
      );
    }

    if (
      deadlineResult.value &&
      deadlineResult.value >
        thoiGianBatDau
    ) {
      return errorResponse(
        "Hạn đăng ký không được sau thời gian bắt đầu",
      );
    }

    /* =====================================================
       MAX MEMBERS
    ===================================================== */

    const maximumResult =
      hasField(
        body,
        "soLuongToiDa",
      )
        ? parseMaximumMembers(
            body.soLuongToiDa,
          )
        : {
            valid: true,

            value:
              activity.soLuongToiDa ??
              null,
          };

    if (
      !maximumResult.valid
    ) {
      return errorResponse(
        "Số lượng tối đa phải là số nguyên lớn hơn 0",
      );
    }

    /* =====================================================
       MONEY
    ===================================================== */

    const moneyResult =
      hasField(
        body,
        "duTruKinhPhi",
      )
        ? parseMoney(
            body.duTruKinhPhi,
          )
        : {
            valid: true,

            value:
              Number(
                activity.duTruKinhPhi ??
                  0,
              ),
          };

    if (
      !moneyResult.valid
    ) {
      return errorResponse(
        "Dự trù kinh phí không hợp lệ",
      );
    }

    /* =====================================================
       FILE KẾ HOẠCH
    ===================================================== */

    let fileKeHoach =
      activity.fileKeHoach ??
      null;

    if (
      hasField(
        body,
        "fileKeHoach",
      )
    ) {
      if (
        body.fileKeHoach ===
        null
      ) {
        fileKeHoach =
          null;
      } else {
        const parsedFile =
          parseFileKeHoach(
            body.fileKeHoach,
          );

        if (!parsedFile) {
          return errorResponse(
            "Thông tin file kế hoạch không hợp lệ",
          );
        }

        const fileError =
          validateFileKeHoach(
            parsedFile,
          );

        if (fileError) {
          return errorResponse(
            fileError,
          );
        }

        fileKeHoach =
          parsedFile;
      }
    }

    /* =====================================================
       PHẠM VI + CHI HỘI
    ===================================================== */

    let chiHoiId =
      "";

    /*
     * CHT:
     * tuyệt đối không tin
     * phamVi/chiHoiId từ client.
     */
    if (isCHT) {
      phamVi =
        "CHI_HOI";

      const ownChiHoiId =
        await getUserChiHoiId({
          userId:
            session.userId,

          role:
            session.role,
        });

      if (
        !ownChiHoiId
      ) {
        return errorResponse(
          "Tài khoản Chi hội trưởng chưa được liên kết với Chi hội",
          403,
        );
      }

      chiHoiId =
        ownChiHoiId.toString();

      const chiHoi =
        await ChiHoi.findById(
          ownChiHoiId,
        )
          .select(
            "tenChiHoi",
          )
          .lean();

      if (!chiHoi) {
        return errorResponse(
          "Không tìm thấy Chi hội của tài khoản",
          404,
        );
      }

      if (
        !donViToChuc
      ) {
        donViToChuc =
          chiHoi.tenChiHoi ||
          "";
      }
    } else {
      if (
        !PHAM_VI_VALUES.includes(
          phamVi as
            PhamViHoatDong,
        )
      ) {
        return errorResponse(
          "Phạm vi hoạt động không hợp lệ",
        );
      }

      if (
        phamVi ===
        "CHI_HOI"
      ) {
        if (
          hasField(
            body,
            "chiHoiId",
          )
        ) {
          chiHoiId =
            getString(
              body.chiHoiId,
            );
        } else if (
          activity.chiHoiId
        ) {
          chiHoiId =
            String(
              activity.chiHoiId,
            );
        }

        if (
          !chiHoiId ||
          !Types.ObjectId.isValid(
            chiHoiId,
          )
        ) {
          return errorResponse(
            "Hoạt động cấp Chi hội phải chọn Chi hội hợp lệ",
          );
        }

        const exists =
          await ChiHoi.exists({
            _id:
              chiHoiId,
          });

        if (!exists) {
          return errorResponse(
            "Không tìm thấy Chi hội tổ chức",
            404,
          );
        }
      }
    }

    /* =====================================================
       PROPOSAL VALIDATION
    ===================================================== */

    if (
      isProposal
    ) {
      if (!mucDich) {
        return errorResponse(
          "Vui lòng nhập mục đích hoạt động",
        );
      }

      if (!fileKeHoach) {
        return errorResponse(
          "Vui lòng đính kèm file kế hoạch hoạt động",
        );
      }

      if (
        phamVi !==
        "CHI_HOI"
      ) {
        return errorResponse(
          "Đề xuất hoạt động của Chi hội phải có phạm vi Chi hội",
        );
      }
    }

    /* =====================================================
       DUPLICATE CODE
    ===================================================== */

    const duplicate =
      await HoatDong.findOne({
        _id: {
          $ne:
            activity._id,
        },

        maHoatDong,
      })
        .select("_id")
        .lean();

    if (duplicate) {
      return errorResponse(
        "Mã hoạt động đã tồn tại",
        409,
      );
    }

    /* =====================================================
       STATUS
    ===================================================== */

    const oldStatus =
      activity.trangThai as
        TrangThaiHoatDong;

    let nextStatus =
      oldStatus;

    /*
     * Admin vẫn có thể gửi trangThai
     * trong form cũ để tương thích.
     *
     * Việc đổi trạng thái thông thường
     * nên dùng /trang-thai.
     */
    if (
      hasField(
        body,
        "trangThai",
      )
    ) {
      const requestedStatus =
        getString(
          body.trangThai,
        ).toUpperCase() as
          TrangThaiHoatDong;

      if (
        !TRANG_THAI_VALUES.includes(
          requestedStatus,
        )
      ) {
        return errorResponse(
          "Trạng thái hoạt động không hợp lệ",
        );
      }

      if (
        isAdmin
      ) {
        nextStatus =
          requestedStatus;
      } else if (
        requestedStatus !==
        oldStatus
      ) {
        return errorResponse(
          "Bạn không có quyền thay đổi trạng thái hoạt động tại chức năng này",
          403,
        );
      }
    }

    /*
     * CHT sửa đề xuất đã bị từ chối
     * => tự gửi lại chờ duyệt.
     */
    const isResubmission =
      isCHT &&
      isProposal &&
      oldStatus ===
        "TU_CHOI";

    if (
      isResubmission
    ) {
      nextStatus =
        "CHO_DUYET";
    }

    /* =====================================================
       SNAPSHOT
    ===================================================== */

    const before = {
      maHoatDong:
        activity.maHoatDong,

      tenHoatDong:
        activity.tenHoatDong,

      mucDich:
        activity.mucDich ||
        "",

      duTruKinhPhi:
        Number(
          activity.duTruKinhPhi ??
            0,
        ),

      trangThai:
        oldStatus,

      fileKeHoach:
        activity.fileKeHoach
          ? {
              tenTep:
                activity.fileKeHoach.tenTep,

              pathname:
                activity.fileKeHoach.pathname ||
                "",
            }
          : null,
    };

    /* =====================================================
       ASSIGN
    ===================================================== */

    activity.maHoatDong =
      maHoatDong;

    activity.tenHoatDong =
      tenHoatDong;

    activity.moTa =
      moTa;

    activity.noiDung =
      noiDung;

    activity.mucDich =
      mucDich;

    activity.phamVi =
      phamVi as
        PhamViHoatDong;

    activity.chiHoiId =
      phamVi ===
      "CHI_HOI"
        ? new Types.ObjectId(
            chiHoiId,
          )
        : null;

    activity.donViToChuc =
      donViToChuc;

    activity.diaDiem =
      diaDiem;

    activity.thoiGianBatDau =
      thoiGianBatDau;

    activity.thoiGianKetThuc =
      thoiGianKetThuc;

    activity.hanDangKy =
      deadlineResult.value;

    activity.soLuongToiDa =
      maximumResult.value;

    activity.duTruKinhPhi =
      moneyResult.value;

    activity.fileKeHoach =
      fileKeHoach;

    activity.trangThai =
      nextStatus;

    /* =====================================================
       RESUBMIT
    ===================================================== */

    if (
      isResubmission
    ) {
      activity.lyDoTuChoi =
        "";

      activity.nguoiDuyetId =
        null;

      activity.ngayDuyet =
        null;

      activity.ngayGuiPheDuyet =
        new Date();

      activity.lyDoHuy =
        "";
    }

    /* =====================================================
       ADMIN STATUS COMPATIBILITY
    ===================================================== */

    if (
      isAdmin &&
      nextStatus ===
        "DA_DUYET" &&
      oldStatus !==
        "DA_DUYET"
    ) {
      activity.nguoiDuyetId =
        new Types.ObjectId(
          session.userId,
        );

      activity.ngayDuyet =
        new Date();

      activity.lyDoTuChoi =
        "";

      activity.lyDoHuy =
        "";
    }

    if (
      isAdmin &&
      nextStatus ===
        "CHO_DUYET"
    ) {
      activity.nguoiDuyetId =
        null;

      activity.ngayDuyet =
        null;

      activity.lyDoTuChoi =
        "";

      if (
        activity.laDeXuatChiHoi
      ) {
        activity.ngayGuiPheDuyet =
          new Date();
      }
    }

    /* =====================================================
       SAVE
    ===================================================== */

    await activity.save();

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
        "UPDATE",

      module:
        "HOAT_DONG",

      description:
        isResubmission
          ? `${session.fullName} đã chỉnh sửa và gửi lại đề xuất hoạt động ${activity.maHoatDong} - ${activity.tenHoatDong}`
          : `${session.fullName} đã cập nhật hoạt động ${activity.maHoatDong} - ${activity.tenHoatDong}`,

      targetId:
        activity._id.toString(),

      targetName:
        `${activity.maHoatDong} - ${activity.tenHoatDong}`,

      metadata: {
        before,

        after: {
          maHoatDong:
            activity.maHoatDong,

          tenHoatDong:
            activity.tenHoatDong,

          mucDich:
            activity.mucDich,

          duTruKinhPhi:
            activity.duTruKinhPhi,

          trangThai:
            activity.trangThai,

          fileKeHoach:
            activity.fileKeHoach
              ? {
                  tenTep:
                    activity.fileKeHoach.tenTep,

                  pathname:
                    activity.fileKeHoach.pathname ||
                    "",
                }
              : null,
        },

        laDeXuatChiHoi:
          Boolean(
            activity.laDeXuatChiHoi,
          ),

        isResubmission,
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

    const updatedActivity =
      await populateActivity(
        id,
      );

    return NextResponse.json({
      success: true,

      message:
        isResubmission
          ? "Cập nhật đề xuất thành công. Đề xuất đã được gửi lại để chờ phê duyệt."
          : "Cập nhật hoạt động thành công",

      data:
        updatedActivity,
    });
  } catch (error) {
    console.error(
      "PUT /api/hoat-dong/[id]:",
      error,
    );

    if (
      error instanceof
      mongoose.Error
        .ValidationError
    ) {
      const firstError =
        Object.values(
          error.errors,
        )[0];

      return errorResponse(
        firstError?.message ||
          "Dữ liệu hoạt động không hợp lệ",
        400,
      );
    }

    if (
      typeof error ===
        "object" &&
      error !== null &&
      "code" in error &&
      (
        error as {
          code?: number;
        }
      ).code ===
        11000
    ) {
      return errorResponse(
        "Mã hoạt động đã tồn tại",
        409,
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
              ? `Đã xảy ra lỗi khi cập nhật hoạt động: ${error.message}`
              : "Đã xảy ra lỗi khi cập nhật hoạt động"
            : "Đã xảy ra lỗi khi cập nhật hoạt động",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   DELETE / CANCEL
========================================================= */

export async function DELETE(
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
      session.role !==
      "ADMIN"
    ) {
      return errorResponse(
        "Bạn không có quyền xóa hoặc hủy hoạt động",
        403,
      );
    }

    if (
      !session.userId ||
      !Types.ObjectId.isValid(
        session.userId,
      )
    ) {
      return errorResponse(
        "Thông tin tài khoản đăng nhập không hợp lệ",
        401,
      );
    }

    const { id } =
      await context.params;

    if (
      !Types.ObjectId.isValid(
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

    let lyDoHuy =
      "";

    try {
      const text =
        await request.text();

      if (text) {
        const body =
          JSON.parse(
            text,
          ) as {
            lyDoHuy?:
              unknown;
          };

        lyDoHuy =
          getString(
            body.lyDoHuy,
          );
      }
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
        400,
      );
    }

    await connectDB();

    const activity =
      await HoatDong.findById(
        id,
      );

    if (!activity) {
      return errorResponse(
        "Không tìm thấy hoạt động",
        404,
      );
    }

    const currentStatus =
      activity.trangThai as
        TrangThaiHoatDong;

    /* =====================================================
       HARD DELETE
    ===================================================== */

    /*
     * Những hoạt động chưa thực sự
     * được triển khai có thể xóa cứng.
     */
    if (
      currentStatus ===
        "CHO_DUYET" ||
      currentStatus ===
        "TU_CHOI" ||
      currentStatus ===
        "DA_HUY"
    ) {
      const targetName =
        `${activity.maHoatDong} - ${activity.tenHoatDong}`;

      const targetId =
        activity._id.toString();

      await HoatDong.deleteOne({
        _id:
          activity._id,
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
          "DELETE",

        module:
          "HOAT_DONG",

        description:
          `${session.fullName} đã xóa hoạt động ${targetName}`,

        targetId,

        targetName,

        metadata: {
          previousStatus:
            currentStatus,

          laDeXuatChiHoi:
            Boolean(
              activity.laDeXuatChiHoi,
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

      return NextResponse.json({
        success: true,

        message:
          "Xóa hoạt động thành công",

        action:
          "DELETED",
      });
    }

    /* =====================================================
       CANCEL
    ===================================================== */

    /*
     * Hoạt động đã được duyệt/
     * triển khai không xóa khỏi
     * lịch sử.
     */
    if (!lyDoHuy) {
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

    activity.trangThai =
      "DA_HUY";

    activity.lyDoHuy =
      lyDoHuy;

    await activity.save();

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
        "HOAT_DONG",

      description:
        `${session.fullName} đã hủy hoạt động ${activity.maHoatDong} - ${activity.tenHoatDong}`,

      targetId:
        activity._id.toString(),

      targetName:
        `${activity.maHoatDong} - ${activity.tenHoatDong}`,

      metadata: {
        previousStatus:
          currentStatus,

        newStatus:
          "DA_HUY",

        lyDoHuy,
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

    const cancelledActivity =
      await populateActivity(
        id,
      );

    return NextResponse.json({
      success: true,

      message:
        "Hủy hoạt động thành công",

      action:
        "CANCELLED",

      data:
        cancelledActivity,
    });
  } catch (error) {
    console.error(
      "DELETE /api/hoat-dong/[id]:",
      error,
    );

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
              : "Không thể xóa hoặc hủy hoạt động"
            : "Đã xảy ra lỗi khi xóa hoặc hủy hoạt động",
      },
      {
        status: 500,
      },
    );
  }
}