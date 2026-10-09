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

import ThongBao from "@/models/ThongBao";
import User from "@/models/User";
import HoiVien from "@/models/HoiVien";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

interface SessionUser {
  userId: string;

  username?: string;

  fullName?: string;

  role: UserRole;
}

interface RouteContext {
  params:
    Promise<{
      id: string;
    }>;
}

interface RequestBody {
  daDoc?: unknown;
}

/* =========================================================
   CONSTANTS
========================================================= */

const ROLES: UserRole[] = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
  "HOI_VIEN",
];

/* =========================================================
   RESPONSE
========================================================= */

function responseError(
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
   SESSION
========================================================= */

function normalizeString(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizeSession(
  rawSession: unknown,
): SessionUser | null {
  if (
    !rawSession ||
    typeof rawSession !==
      "object"
  ) {
    return null;
  }

  const session =
    rawSession as Record<
      string,
      unknown
    >;

  const nestedUser =
    session.user &&
    typeof session.user ===
      "object"
      ? session.user as Record<
          string,
          unknown
        >
      : {};

  const userId =
    String(
      session.userId ??
        session.id ??
        session._id ??
        nestedUser.userId ??
        nestedUser.id ??
        nestedUser._id ??
        "",
    );

  const role =
    String(
      session.role ??
        nestedUser.role ??
        "",
    ) as UserRole;

  if (
    !userId ||
    !Types.ObjectId.isValid(
      userId,
    )
  ) {
    return null;
  }

  if (
    !ROLES.includes(
      role,
    )
  ) {
    return null;
  }

  return {
    userId,

    role,

    username:
      normalizeString(
        session.username ??
          nestedUser.username,
      ),

    fullName:
      normalizeString(
        session.fullName ??
          session.hoTen ??
          nestedUser.fullName ??
          nestedUser.hoTen,
      ),
  };
}

/* =========================================================
   OBJECT ID
========================================================= */

function objectIdToString(
  value: unknown,
) {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    value instanceof
    Types.ObjectId
  ) {
    return value.toString();
  }

  if (
    typeof value ===
    "object"
  ) {
    const object =
      value as Record<
        string,
        unknown
      >;

    if (
      object._id
    ) {
      return objectIdToString(
        object._id,
      );
    }

    if (
      object.id
    ) {
      return objectIdToString(
        object.id,
      );
    }
  }

  return String(
    value,
  );
}

/* =========================================================
   GET USER CHI HOI
========================================================= */

async function getUserChiHoiId(
  session: SessionUser,
): Promise<
  Types.ObjectId | null
> {
  /*
   * Chi hội trưởng:
   * User.chiHoiId là nguồn chính.
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

  /*
   * Hội viên:
   * HoiVien.chiHoiId là nguồn chính.
   */
  const hoiVien =
    await HoiVien.findOne({
      taiKhoanId:
        new Types.ObjectId(
          session.userId,
        ),
    })
      .select(
        "chiHoiId",
      )
      .lean();

  if (
    hoiVien?.chiHoiId
  ) {
    return new Types.ObjectId(
      String(
        hoiVien.chiHoiId,
      ),
    );
  }

  /*
   * Fallback cho dữ liệu cũ.
   */
  const user =
    await User.findById(
      session.userId,
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

  return null;
}

/* =========================================================
   CAN RECEIVE
========================================================= */

async function canReceiveNotification(
  document: {
    trangThai?: unknown;

    phamVi?: unknown;

    vaiTroNguoiNhan?: unknown;

    nguoiNhanIds?: unknown;

    chiHoiIds?: unknown;

    ngayBatDau?: unknown;

    ngayKetThuc?: unknown;
  },

  session: SessionUser,
) {
  /*
   * Chỉ thông báo đã phát hành
   * mới được phép đánh dấu đọc.
   *
   * NHAP / CHO_DUYET / TU_CHOI / DA_AN
   * tuyệt đối không được tính là thông báo người nhận.
   */
  if (
    document.trangThai !==
    "DA_DANG"
  ) {
    return false;
  }

  const now =
    new Date();

  if (
    document.ngayBatDau
  ) {
    const start =
      new Date(
        String(
          document.ngayBatDau,
        ),
      );

    if (
      !Number.isNaN(
        start.getTime(),
      ) &&
      start >
        now
    ) {
      return false;
    }
  }

  if (
    document.ngayKetThuc
  ) {
    const end =
      new Date(
        String(
          document.ngayKetThuc,
        ),
      );

    if (
      !Number.isNaN(
        end.getTime(),
      ) &&
      end <
        now
    ) {
      return false;
    }
  }

  const phamVi =
    String(
      document.phamVi ??
        "",
    );

  /* =====================================================
     TAT CA
  ===================================================== */

  if (
    phamVi ===
    "TAT_CA"
  ) {
    return true;
  }

  /* =====================================================
     VAI TRO
  ===================================================== */

  if (
    phamVi ===
    "VAI_TRO"
  ) {
    const roles =
      Array.isArray(
        document.vaiTroNguoiNhan,
      )
        ? document.vaiTroNguoiNhan.map(
            (
              item,
            ) =>
              String(
                item,
              ),
          )
        : [];

    return roles.includes(
      session.role,
    );
  }

  /* =====================================================
     CA NHAN
  ===================================================== */

  if (
    phamVi ===
    "CA_NHAN"
  ) {
    const ids =
      Array.isArray(
        document.nguoiNhanIds,
      )
        ? document.nguoiNhanIds.map(
            objectIdToString,
          )
        : [];

    return ids.includes(
      session.userId,
    );
  }

  /* =====================================================
     CHI HOI
  ===================================================== */

  if (
    phamVi ===
    "CHI_HOI"
  ) {
    const chiHoiId =
      await getUserChiHoiId(
        session,
      );

    if (
      !chiHoiId
    ) {
      return false;
    }

    const ids =
      Array.isArray(
        document.chiHoiIds,
      )
        ? document.chiHoiIds.map(
            objectIdToString,
          )
        : [];

    return ids.includes(
      chiHoiId.toString(),
    );
  }

  return false;
}

/* =========================================================
   PATCH /api/thong-bao/[id]/da-doc
========================================================= */

export async function PATCH(
  request: Request,

  context: RouteContext,
) {
  try {
    /* =====================================================
       AUTH
    ===================================================== */

    const session =
      normalizeSession(
        await getCurrentSession(),
      );

    if (!session) {
      return responseError(
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        401,
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
      return responseError(
        "Mã thông báo không hợp lệ",
        400,
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body: RequestBody = {
      daDoc: true,
    };

    try {
      const text =
        await request.text();

      if (
        text.trim()
      ) {
        body =
          JSON.parse(
            text,
          ) as RequestBody;
      }
    } catch {
      return responseError(
        "Dữ liệu gửi lên không hợp lệ",
        400,
      );
    }

    const daDoc =
      body.daDoc ===
      false
        ? false
        : true;

    await connectDB();

    void User;
    void HoiVien;

    /* =====================================================
       FIND NOTIFICATION
    ===================================================== */

    const thongBao =
      await ThongBao.findById(
        id,
      );

    if (!thongBao) {
      return responseError(
        "Không tìm thấy thông báo",
        404,
      );
    }

    /* =====================================================
       PERMISSION
    ===================================================== */

    const allowed =
      await canReceiveNotification(
        {
          trangThai:
            thongBao.trangThai,

          phamVi:
            thongBao.phamVi,

          vaiTroNguoiNhan:
            thongBao.vaiTroNguoiNhan,

          nguoiNhanIds:
            thongBao.nguoiNhanIds,

          chiHoiIds:
            thongBao.chiHoiIds,

          ngayBatDau:
            thongBao.ngayBatDau,

          ngayKetThuc:
            thongBao.ngayKetThuc,
        },

        session,
      );

    if (!allowed) {
      return responseError(
        "Bạn không phải đối tượng nhận thông báo này",
        403,
      );
    }

    const currentUserId =
      new Types.ObjectId(
        session.userId,
      );

    /* =====================================================
       CURRENT STATE
    ===================================================== */

    const currentIds =
      Array.isArray(
        thongBao.nguoiDaDocIds,
      )
        ? thongBao.nguoiDaDocIds
        : [];

    const alreadyRead =
      currentIds.some(
        (
          userId,
        ) =>
          String(
            userId,
          ) ===
          session.userId,
      );

    /* =====================================================
       MARK READ
    ===================================================== */

    if (
      daDoc &&
      !alreadyRead
    ) {
      thongBao.nguoiDaDocIds.push(
        currentUserId,
      );

      /*
       * soLuotXem được tính theo
       * số user unique đã đọc.
       *
       * Không tăng mỗi lần mở lại,
       * tránh refresh nhiều lần làm sai thống kê.
       */
      thongBao.soLuotXem =
        thongBao.nguoiDaDocIds
          .length;

      await thongBao.save();
    }

    /* =====================================================
       MARK UNREAD
    ===================================================== */

    if (
      !daDoc &&
      alreadyRead
    ) {
      thongBao.nguoiDaDocIds =
        thongBao.nguoiDaDocIds.filter(
          (
            userId,
          ) =>
            String(
              userId,
            ) !==
            session.userId,
        );

      thongBao.soLuotXem =
        thongBao.nguoiDaDocIds
          .length;

      await thongBao.save();
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    const finalReadState =
      thongBao.nguoiDaDocIds.some(
        (
          userId,
        ) =>
          String(
            userId,
          ) ===
          session.userId,
      );

    return NextResponse.json({
      success: true,

      message:
        finalReadState
          ? "Đã đánh dấu thông báo là đã đọc"
          : "Đã đánh dấu thông báo là chưa đọc",

      data: {
        id:
          String(
            thongBao._id,
          ),

        daDoc:
          finalReadState,

        soLuotXem:
          thongBao.soLuotXem,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "PATCH /api/thong-bao/[id]/da-doc:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof
          Error
            ? error.message
            : "Không thể cập nhật trạng thái đọc thông báo",
      },
      {
        status: 500,
      },
    );
  }
}