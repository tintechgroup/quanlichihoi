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
import VanKien, { type IVanKien } from "@/models/VanKien";

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

type TrangThaiVanKien =
  | "NHAP"
  | "CHO_DUYET"
  | "DA_DUYET"
  | "TU_CHOI"
  | "DA_AN";

type PhamVi =
  | "TOAN_HE_THONG"
  | "CHI_HOI"
  | "VAI_TRO";

interface SessionUser {
  userId: string;

  username?: string;

  fullName?: string;

  role: UserRole;
}

/* =========================================================
   CONSTANTS
========================================================= */

const VALID_ROLES: UserRole[] = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
  "HOI_VIEN",
];

const LOAI_VALUES = [
  "THONG_BAO",
  "KE_HOACH",
  "QUYET_DINH",
  "BIEN_BAN",
  "BIEU_MAU",
  "KHAC",
];

const PHAM_VI_VALUES:
  PhamVi[] = [
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
      success:
        false,

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
):
  SessionUser | null {
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
  value:
    unknown,
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
          ) =>
            String(
              item,
            ).trim(),
        )
        .filter(
          (
            item,
          ) =>
            mongoose.isValidObjectId(
              item,
            ),
        ),
    ),
  );
}

function parseRoles(
  value:
    unknown,
):
  UserRole[] {
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
            ) as
              UserRole,
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

/* =========================================================
   GET
========================================================= */

export async function GET(
  request:
    Request,
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

    await connectDB();

    void User;
    void HoiVien;
    void ChiHoi;

    const currentUser =
      await User.findById(
        session.userId,
      ).lean();

    if (!currentUser) {
      return responseError(
        "Không tìm thấy tài khoản",
        404,
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const search =
      normalizeString(
        searchParams.get(
          "search",
        ),
      );

    const loai =
      normalizeString(
        searchParams.get(
          "loai",
        ),
      );

    const status =
      normalizeString(
        searchParams.get(
          "status",
        ),
      ) as
        TrangThaiVanKien;

    const mode =
      normalizeString(
        searchParams.get(
          "mode",
        ),
      );

    const isAdmin =
      session.role ===
      "ADMIN";

    const canManage =
      isAdmin ||
      session.role ===
        "BAN_CHAP_HANH";

    const managerMode =
      canManage &&
      mode ===
        "quan-ly";

    const filter:
      Record<
        string,
        unknown
      > = {
        isActive:
          true,
      };

    if (
      loai &&
      LOAI_VALUES.includes(
        loai,
      )
    ) {
      filter.loai =
        loai;
    }

    if (search) {
      const escaped =
        search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );

      filter.$or = [
        {
          tieuDe: {
            $regex:
              escaped,

            $options:
              "i",
          },
        },

        {
          soKyHieu: {
            $regex:
              escaped,

            $options:
              "i",
          },
        },
      ];
    }

    /* =====================================================
       QUẢN LÝ
    ===================================================== */

    if (
      managerMode
    ) {
      if (
        !isAdmin
      ) {
        /*
         * BCH chỉ xem:
         * - văn kiện mình tạo
         * - hoặc văn kiện đã duyệt
         */
        filter.$and = [
          {
            $or: [
              {
                nguoiTaoId:
                  new Types.ObjectId(
                    session.userId,
                  ),
              },

              {
                trangThai:
                  "DA_DUYET",
              },
            ],
          },
        ];
      }

      if (
        status &&
        TRANG_THAI_VALUES.includes(
          status,
        )
      ) {
        const and =
          Array.isArray(
            filter.$and,
          )
            ? filter.$and as
                Record<
                  string,
                  unknown
                >[]
            : [];

        and.push({
          trangThai:
            status,
        });

        filter.$and =
          and;
      }
    } else {
      /*
       * Người dùng thường:
       * chỉ thấy đã duyệt.
       */
      const conditions:
        Record<
          string,
          unknown
        >[] = [
          {
            trangThai:
              "DA_DUYET",
          },
        ];

      const visibility:
        Record<
          string,
          unknown
        >[] = [
          {
            phamVi:
              "TOAN_HE_THONG",
          },

          {
            phamVi:
              "VAI_TRO",

            vaiTroNhan:
              session.role,
          },
        ];

      const chiHoiId =
        await getUserChiHoiId(
          session,
        );

      if (chiHoiId) {
        visibility.push({
          phamVi:
            "CHI_HOI",

          chiHoiIds:
            chiHoiId,
        });
      }

      conditions.push({
        $or:
          visibility,
      });

      const oldAnd =
        Array.isArray(
          filter.$and,
        )
          ? filter.$and as
              Record<
                string,
                unknown
              >[]
          : [];

      filter.$and = [
        ...oldAnd,
        ...conditions,
      ];
    }

    const data =
      await VanKien.find(
        filter,
      )
        .populate({
          path:
            "chiHoiIds",

          model:
            ChiHoi,

          select:
            "tenChiHoi maChiHoi",
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
        .sort({
          ngayBanHanh:
            -1,

          createdAt:
            -1,
        })
        .lean();

    const [
      total,
      choDuyet,
      daDuyet,
      tuChoi,
      nhap,
      daAn,
    ] =
      managerMode
        ? await Promise.all([
            VanKien.countDocuments({
              isActive:
                true,
            }),

            VanKien.countDocuments({
              isActive:
                true,

              trangThai:
                "CHO_DUYET",
            }),

            VanKien.countDocuments({
              isActive:
                true,

              trangThai:
                "DA_DUYET",
            }),

            VanKien.countDocuments({
              isActive:
                true,

              trangThai:
                "TU_CHOI",
            }),

            VanKien.countDocuments({
              isActive:
                true,

              trangThai:
                "NHAP",
            }),

            VanKien.countDocuments({
              isActive:
                true,

              trangThai:
                "DA_AN",
            }),
          ])
        : [
            data.length,
            0,
            data.length,
            0,
            0,
            0,
          ];

    return NextResponse.json({
      success:
        true,

      data,

      permissions: {
        canCreate:
          canManage,

        canManage,

        canApprove:
          isAdmin,

        role:
          session.role,
      },

      thongKe: {
        total,

        choDuyet,

        daDuyet,

        tuChoi,

        nhap,

        daAn,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/van-kien:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể tải danh sách văn kiện",
      500,
    );
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request:
    Request,
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

    if (
      session.role !==
        "ADMIN" &&
      session.role !==
        "BAN_CHAP_HANH"
    ) {
      return responseError(
        "Bạn không có quyền tạo văn kiện",
        403,
      );
    }

    let body:
      Record<
        string,
        unknown
      >;

    try {
      body =
        await request.json();
    } catch {
      return responseError(
        "Dữ liệu gửi lên không hợp lệ",
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
        ),
      )
        ? String(
            body.loai,
          )
        : "KHAC";

    const phamVi =
      PHAM_VI_VALUES.includes(
        String(
          body.phamVi,
        ) as
          PhamVi,
      )
        ? String(
            body.phamVi,
          ) as
            PhamVi
        : "TOAN_HE_THONG";

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
      parseIds(
        body.chiHoiIds,
      );

    const vaiTroNhan =
      parseRoles(
        body.vaiTroNhan,
      );

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

    await connectDB();

    void ChiHoi;
    void HoiVien;

    const user =
      await User.findById(
        session.userId,
      );

    if (!user) {
      return responseError(
        "Không tìm thấy tài khoản",
        404,
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

    const isAdmin =
      session.role ===
      "ADMIN";

    const requestedStatus =
      normalizeString(
        body.trangThai,
      ) as
        TrangThaiVanKien;

    let trangThai:
      TrangThaiVanKien;

    if (isAdmin) {
      trangThai =
        requestedStatus ===
        "NHAP"
          ? "NHAP"
          : requestedStatus ===
            "DA_AN"
            ? "DA_AN"
            : "DA_DUYET";
    } else {
      trangThai =
        requestedStatus ===
        "NHAP"
          ? "NHAP"
          : "CHO_DUYET";
    }

    const now =
      new Date();

    const record =
      await VanKien.create({
        tieuDe,

        moTa,

        loai: loai as IVanKien["loai"],

        soKyHieu,

        ngayBanHanh,

        fileUrl,

        tenFile,

        phamVi,

        chiHoiIds:
          phamVi ===
          "CHI_HOI"
            ? chiHoiIds
            : [],

        vaiTroNhan:
          phamVi ===
          "VAI_TRO"
            ? vaiTroNhan
            : [],

        nguoiTaoId:
          user._id,

        nguoiTaoTen:
          user.fullName,

        trangThai,

        nguoiDuyetId:
          isAdmin &&
          trangThai ===
            "DA_DUYET"
            ? user._id
            : null,

        nguoiDuyetTen:
          isAdmin &&
          trangThai ===
            "DA_DUYET"
            ? user.fullName
            : "",

        ngayGuiDuyet:
          trangThai ===
          "CHO_DUYET"
            ? now
            : null,

        ngayDuyet:
          isAdmin &&
          trangThai ===
            "DA_DUYET"
            ? now
            : null,

        lyDoTuChoi:
          "",

        isActive:
          true,
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
        "CREATE",

      module:
        "VAN_KIEN",

      description:
        trangThai ===
        "CHO_DUYET"
          ? `Tạo và gửi duyệt văn kiện: ${tieuDe}`
          : trangThai ===
            "NHAP"
            ? `Lưu bản nháp văn kiện: ${tieuDe}`
            : `Tạo văn kiện: ${tieuDe}`,

      targetId:
        String(
          record._id,
        ),

      targetName:
        tieuDe,

      metadata: {
        loai,

        phamVi,

        trangThai,

        soKyHieu,

        fileUrl,
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

    return NextResponse.json(
      {
        success:
          true,

        message:
          trangThai ===
          "CHO_DUYET"
            ? "Tạo văn kiện thành công. Văn kiện đang chờ Quản trị viên phê duyệt."
            : trangThai ===
              "NHAP"
              ? "Đã lưu bản nháp văn kiện."
              : "Tạo và công khai văn kiện thành công.",

        data:
          record,
      },
      {
        status:
          201,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "POST /api/van-kien:",
      error,
    );

    if (
      error instanceof
      mongoose.Error
        .ValidationError
    ) {
      const message =
        Object.values(
          error.errors,
        )[0]?.message;

      return responseError(
        message ||
          "Dữ liệu văn kiện không hợp lệ",
      );
    }

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể tạo văn kiện",
      500,
    );
  }
}
