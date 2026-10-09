import mongoose, {
  Types,
} from "mongoose";

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
import HoiVien from "@/models/HoiVien";
import ChiHoi from "@/models/ChiHoi";
import VanKien from "@/models/VanKien";

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

type LoaiVanKien =
  | "THONG_BAO"
  | "KE_HOACH"
  | "QUYET_DINH"
  | "BIEN_BAN"
  | "BIEU_MAU"
  | "KHAC";

type PhamViVanKien =
  | "TOAN_HE_THONG"
  | "CHI_HOI"
  | "VAI_TRO";

type TrangThaiVanKien =
  | "NHAP"
  | "CHO_DUYET"
  | "DA_DUYET"
  | "TU_CHOI"
  | "DA_AN";

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

interface UpdateBody {
  tieuDe?: unknown;
  moTa?: unknown;
  loai?: unknown;

  soKyHieu?: unknown;
  ngayBanHanh?: unknown;

  fileUrl?: unknown;
  tenFile?: unknown;

  phamVi?: unknown;

  chiHoiIds?: unknown;
  vaiTroNhan?: unknown;

  trangThai?: unknown;
}

/* =========================================================
   CONSTANTS
========================================================= */

const VALID_ROLES:
  UserRole[] = [
    "ADMIN",
    "BAN_CHAP_HANH",
    "CHI_HOI_TRUONG",
    "HOI_VIEN",
  ];

const LOAI_VALUES:
  LoaiVanKien[] = [
    "THONG_BAO",
    "KE_HOACH",
    "QUYET_DINH",
    "BIEN_BAN",
    "BIEU_MAU",
    "KHAC",
  ];

const PHAM_VI_VALUES:
  PhamViVanKien[] = [
    "TOAN_HE_THONG",
    "CHI_HOI",
    "VAI_TRO",
  ];

const TRANG_THAI_VALUES:
  TrangThaiVanKien[] = [
    "NHAP",
    "CHO_DUYET",
    "DA_DUYET",
    "TU_CHOI",
    "DA_AN",
  ];

/* =========================================================
   HELPERS
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

function normalizeString(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizeSession(
  raw:
    unknown,
): SessionUser | null {
  if (
    !raw ||
    typeof raw !==
      "object"
  ) {
    return null;
  }

  const session =
    raw as Record<
      string,
      unknown
    >;

  const nested =
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
        nested.userId ??
        nested.id ??
        nested._id ??
        "",
    );

  const role =
    String(
      session.role ??
        nested.role ??
        "",
    ) as UserRole;

  if (
    !Types.ObjectId.isValid(
      userId,
    ) ||
    !VALID_ROLES.includes(
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
          nested.username,
      ),

    fullName:
      normalizeString(
        session.fullName ??
          session.hoTen ??
          nested.fullName ??
          nested.hoTen,
      ),
  };
}

function parseIds(
  value: unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(
          (
            item,
          ) => {
            if (
              typeof item ===
              "string"
            ) {
              return item.trim();
            }

            if (
              item &&
              typeof item ===
                "object"
            ) {
              const object =
                item as Record<
                  string,
                  unknown
                >;

              return String(
                object._id ??
                  object.id ??
                  "",
              );
            }

            return "";
          },
        )
        .filter(
          (
            id,
          ) =>
            mongoose.isValidObjectId(
              id,
            ),
        ),
    ),
  );
}

function parseRoles(
  value: unknown,
): UserRole[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(
          (
            item,
          ) =>
            String(
              item,
            ) as UserRole,
        )
        .filter(
          (
            role,
          ) =>
            VALID_ROLES.includes(
              role,
            ),
        ),
    ),
  );
}

async function getUserChiHoiId(
  session:
    SessionUser,
):
  Promise<
    Types.ObjectId | null
  > {
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
   CAN VIEW
========================================================= */

async function canViewVanKien(
  document:
    Record<
      string,
      unknown
    >,

  session:
    SessionUser,
) {
  const isAdmin =
    session.role ===
    "ADMIN";

  const isBCH =
    session.role ===
    "BAN_CHAP_HANH";

  const creatorId =
    objectIdToString(
      document.nguoiTaoId,
    );

  if (isAdmin) {
    return true;
  }

  /*
   * BCH được xem văn kiện mình tạo
   * kể cả NHAP / CHO_DUYET / TU_CHOI.
   */
  if (
    isBCH &&
    creatorId ===
      session.userId
  ) {
    return true;
  }

  /*
   * Người nhận chỉ thấy văn kiện đã duyệt.
   */
  if (
    document.trangThai !==
    "DA_DUYET"
  ) {
    return false;
  }

  const phamVi =
    String(
      document.phamVi ??
        "",
    );

  if (
    phamVi ===
    "TOAN_HE_THONG"
  ) {
    return true;
  }

  if (
    phamVi ===
    "VAI_TRO"
  ) {
    const roles =
      Array.isArray(
        document.vaiTroNhan,
      )
        ? document.vaiTroNhan.map(
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

  if (
    phamVi ===
    "CHI_HOI"
  ) {
    const chiHoiId =
      await getUserChiHoiId(
        session,
      );

    if (!chiHoiId) {
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
   GET /api/van-kien/[id]
========================================================= */

export async function GET(
  _request:
    Request,

  context:
    RouteContext,
) {
  try {
    const session =
      normalizeSession(
        await getCurrentSession(),
      );

    if (!session) {
      return responseError(
        "Bạn chưa đăng nhập",
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
        "Mã văn kiện không hợp lệ",
      );
    }

    await connectDB();

    void User;
    void HoiVien;
    void ChiHoi;

    const document =
      await VanKien.findOne({
        _id:
          id,

        isActive:
          true,
      })
        .populate({
          path:
            "chiHoiIds",

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

    if (!document) {
      return responseError(
        "Không tìm thấy văn kiện",
        404,
      );
    }

    const allowed =
      await canViewVanKien(
        document as unknown as
          Record<
            string,
            unknown
          >,

        session,
      );

    if (!allowed) {
      return responseError(
        "Bạn không có quyền xem văn kiện này",
        403,
      );
    }

    return NextResponse.json({
      success:
        true,

      data:
        document,
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/van-kien/[id]:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể tải văn kiện",
      500,
    );
  }
}

/* =========================================================
   PUT /api/van-kien/[id]
========================================================= */

export async function PUT(
  request:
    Request,

  context:
    RouteContext,
) {
  try {
    const session =
      normalizeSession(
        await getCurrentSession(),
      );

    if (!session) {
      return responseError(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    const isAdmin =
      session.role ===
      "ADMIN";

    const isBCH =
      session.role ===
      "BAN_CHAP_HANH";

    if (
      !isAdmin &&
      !isBCH
    ) {
      return responseError(
        "Bạn không có quyền chỉnh sửa văn kiện",
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
      return responseError(
        "Mã văn kiện không hợp lệ",
      );
    }

    let body:
      UpdateBody;

    try {
      body =
        await request.json() as
          UpdateBody;
    } catch {
      return responseError(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    await connectDB();

    void User;
    void ChiHoi;

    const record =
      await VanKien.findOne({
        _id:
          id,

        isActive:
          true,
      });

    if (!record) {
      return responseError(
        "Không tìm thấy văn kiện",
        404,
      );
    }

    const isOwner =
      String(
        record.nguoiTaoId,
      ) ===
      session.userId;

    if (
      !isAdmin &&
      !isOwner
    ) {
      return responseError(
        "Bạn chỉ được chỉnh sửa văn kiện do chính mình tạo",
        403,
      );
    }

    /*
     * BCH chỉ được sửa:
     * NHAP hoặc TU_CHOI.
     */
    if (
      !isAdmin &&
      ![
        "NHAP",
        "TU_CHOI",
      ].includes(
        record.trangThai,
      )
    ) {
      return responseError(
        "Chỉ có thể sửa bản nháp hoặc văn kiện đã bị từ chối",
        409,
      );
    }

    const tieuDe =
      normalizeString(
        body.tieuDe,
      );

    const moTa =
      normalizeString(
        body.moTa,
      );

    const soKyHieu =
      normalizeString(
        body.soKyHieu,
      );

    const fileUrl =
      normalizeString(
        body.fileUrl,
      );

    const tenFile =
      normalizeString(
        body.tenFile,
      );

    if (!tieuDe) {
      return responseError(
        "Tiêu đề không được để trống",
      );
    }

    if (
      tieuDe.length >
      255
    ) {
      return responseError(
        "Tiêu đề không được vượt quá 255 ký tự",
      );
    }

    if (
      moTa.length >
      2000
    ) {
      return responseError(
        "Mô tả không được vượt quá 2000 ký tự",
      );
    }

    const loai =
      LOAI_VALUES.includes(
        String(
          body.loai,
        ) as
          LoaiVanKien,
      )
        ? String(
            body.loai,
          ) as
            LoaiVanKien
        : record.loai;

    const phamVi =
      PHAM_VI_VALUES.includes(
        String(
          body.phamVi,
        ) as
          PhamViVanKien,
      )
        ? String(
            body.phamVi,
          ) as
            PhamViVanKien
        : record.phamVi;

    let ngayBanHanh:
      Date | null =
      null;

    if (
      body.ngayBanHanh
    ) {
      const date =
        new Date(
          String(
            body.ngayBanHanh,
          ),
        );

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return responseError(
          "Ngày ban hành không hợp lệ",
        );
      }

      ngayBanHanh =
        date;
    }

    const chiHoiIds =
      phamVi ===
      "CHI_HOI"
        ? parseIds(
            body.chiHoiIds,
          )
        : [];

    const vaiTroNhan =
      phamVi ===
      "VAI_TRO"
        ? parseRoles(
            body.vaiTroNhan,
          )
        : [];

    if (
      phamVi ===
        "CHI_HOI" &&
      chiHoiIds.length ===
        0
    ) {
      return responseError(
        "Vui lòng chọn ít nhất một Chi hội",
      );
    }

    if (
      phamVi ===
        "VAI_TRO" &&
      vaiTroNhan.length ===
        0
    ) {
      return responseError(
        "Vui lòng chọn ít nhất một vai trò nhận",
      );
    }

    if (
      chiHoiIds.length >
      0
    ) {
      const count =
        await ChiHoi.countDocuments({
          _id: {
            $in:
              chiHoiIds,
          },
        });

      if (
        count !==
        chiHoiIds.length
      ) {
        return responseError(
          "Có Chi hội được chọn không tồn tại",
        );
      }
    }

    const requestedStatus =
      normalizeString(
        body.trangThai,
      ) as
        TrangThaiVanKien;

    let nextStatus:
      TrangThaiVanKien;

    if (isAdmin) {
      /*
       * Admin được quản lý trạng thái.
       * Duyệt CHO_DUYET nên dùng API /phe-duyet.
       */
      nextStatus =
        TRANG_THAI_VALUES.includes(
          requestedStatus,
        )
          ? requestedStatus
          : record.trangThai;
    } else {
      /*
       * BCH:
       * NHAP -> tiếp tục lưu nháp.
       * Còn lại -> gửi duyệt.
       */
      nextStatus =
        requestedStatus ===
        "NHAP"
          ? "NHAP"
          : "CHO_DUYET";
    }

    const oldStatus =
      record.trangThai;

    record.tieuDe =
      tieuDe;

    record.moTa =
      moTa;

    record.loai =
      loai;

    record.soKyHieu =
      soKyHieu;

    record.ngayBanHanh =
      ngayBanHanh;

    record.fileUrl =
      fileUrl;

    record.tenFile =
      tenFile;

    record.phamVi =
      phamVi;

    record.chiHoiIds =
      chiHoiIds.map(
        (
          item,
        ) =>
          new Types.ObjectId(
            item,
          ),
      );

    record.vaiTroNhan =
      vaiTroNhan;

    record.trangThai =
      nextStatus;

    /* =====================================================
       WORKFLOW BCH
    ===================================================== */

    if (!isAdmin) {
      if (
        nextStatus ===
        "CHO_DUYET"
      ) {
        record.ngayGuiDuyet =
          new Date();

        record.ngayDuyet =
          null;

        record.nguoiDuyetId =
          null;

        record.nguoiDuyetTen =
          "";

        record.lyDoTuChoi =
          "";
      }

      if (
        nextStatus ===
        "NHAP"
      ) {
        record.ngayGuiDuyet =
          null;

        record.ngayDuyet =
          null;

        record.nguoiDuyetId =
          null;

        record.nguoiDuyetTen =
          "";

        record.lyDoTuChoi =
          "";
      }
    }

    /* =====================================================
       ADMIN DIRECT PUBLISH
    ===================================================== */

    if (
      isAdmin &&
      nextStatus ===
        "DA_DUYET"
    ) {
      const admin =
        await User.findById(
          session.userId,
        );

      if (!admin) {
        return responseError(
          "Không tìm thấy tài khoản quản trị",
          404,
        );
      }

      record.nguoiDuyetId =
        admin._id;

      record.nguoiDuyetTen =
        admin.fullName;

      record.ngayDuyet =
        new Date();

      record.lyDoTuChoi =
        "";
    }

    await record.save();

    const updated =
      await VanKien.findById(
        record._id,
      )
        .populate({
          path:
            "chiHoiIds",

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
        "VAN_KIEN",

      description:
        nextStatus ===
        "CHO_DUYET"
          ? `Cập nhật và gửi duyệt văn kiện: ${tieuDe}`
          : `Cập nhật văn kiện: ${tieuDe}`,

      targetId:
        String(
          record._id,
        ),

      targetName:
        tieuDe,

      metadata: {
        trangThaiCu:
          oldStatus,

        trangThaiMoi:
          nextStatus,

        loai,

        phamVi,

        soKyHieu,
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
        nextStatus ===
        "CHO_DUYET"
          ? "Cập nhật thành công. Văn kiện đã được gửi lại chờ Quản trị viên phê duyệt."
          : nextStatus ===
            "NHAP"
            ? "Đã cập nhật và lưu bản nháp."
            : "Cập nhật văn kiện thành công.",

      data:
        updated,
    });
  } catch (
    error
  ) {
    console.error(
      "PUT /api/van-kien/[id]:",
      error,
    );

    if (
      error instanceof
      mongoose.Error
        .ValidationError
    ) {
      return responseError(
        Object.values(
          error.errors,
        )[0]?.message ||
          "Dữ liệu văn kiện không hợp lệ",
      );
    }

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể cập nhật văn kiện",
      500,
    );
  }
}

/* =========================================================
   DELETE /api/van-kien/[id]
========================================================= */

export async function DELETE(
  request:
    Request,

  context:
    RouteContext,
) {
  try {
    const session =
      normalizeSession(
        await getCurrentSession(),
      );

    if (!session) {
      return responseError(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    const isAdmin =
      session.role ===
      "ADMIN";

    const isBCH =
      session.role ===
      "BAN_CHAP_HANH";

    if (
      !isAdmin &&
      !isBCH
    ) {
      return responseError(
        "Bạn không có quyền xóa văn kiện",
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
      return responseError(
        "Mã văn kiện không hợp lệ",
      );
    }

    await connectDB();

    const record =
      await VanKien.findOne({
        _id:
          id,

        isActive:
          true,
      });

    if (!record) {
      return responseError(
        "Không tìm thấy văn kiện",
        404,
      );
    }

    const isOwner =
      String(
        record.nguoiTaoId,
      ) ===
      session.userId;

    if (
      !isAdmin &&
      !isOwner
    ) {
      return responseError(
        "Bạn chỉ được xóa văn kiện do chính mình tạo",
        403,
      );
    }

    /*
     * BCH không được xóa văn kiện
     * đang chờ duyệt hoặc đã duyệt.
     */
    if (
      !isAdmin &&
      ![
        "NHAP",
        "TU_CHOI",
      ].includes(
        record.trangThai,
      )
    ) {
      return responseError(
        "Không thể xóa văn kiện đang chờ duyệt hoặc đã được công khai",
        409,
      );
    }

    /*
     * Soft delete.
     *
     * Không xóa vật lý để giữ lịch sử.
     */
    record.isActive =
      false;

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
        "DELETE",

      module:
        "VAN_KIEN",

      description:
        `Xóa văn kiện: ${record.tieuDe}`,

      targetId:
        String(
          record._id,
        ),

      targetName:
        record.tieuDe,

      metadata: {
        trangThai:
          record.trangThai,

        loai:
          record.loai,

        soKyHieu:
          record.soKyHieu,
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
        "Xóa văn kiện thành công",
    });
  } catch (
    error
  ) {
    console.error(
      "DELETE /api/van-kien/[id]:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể xóa văn kiện",
      500,
    );
  }
}