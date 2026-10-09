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

import DangKyHoatDong from "@/models/DangKyHoatDong";
import HoatDong from "@/models/HoatDong";
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

type TrangThaiDiemDanh =
  | "DA_THAM_GIA"
  | "VANG_MAT"
  | "VANG_CO_LY_DO";

type DiemDanhItem = {
  hoiVienId?:
    unknown;

  trangThai?:
    unknown;

  lyDoVang?:
    unknown;

  ghiChu?:
    unknown;
};

type DiemDanhBody = {
  danhSach?:
    unknown;
};

/* =========================================================
   CONSTANTS
========================================================= */

const TRANG_THAI_HOP_LE:
  TrangThaiDiemDanh[] = [
    "DA_THAM_GIA",
    "VANG_MAT",
    "VANG_CO_LY_DO",
  ];

const MAX_ITEMS =
  500;

/* =========================================================
   HELPERS
========================================================= */

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

function getString(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

/* =========================================================
   CHI HỘI CỦA CHT
========================================================= */

async function getChiHoiIdCuaChiHoiTruong(
  userId: string,
) {
  if (
    !Types.ObjectId.isValid(
      userId,
    )
  ) {
    return null;
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

  const hoiVien =
    await HoiVien.findOne({
      taiKhoanId:
        userId,
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

  return null;
}

/* =========================================================
   QUYỀN
========================================================= */

function canManageAttendance(
  role: string,
) {
  return [
    "ADMIN",
    "BAN_CHAP_HANH",
    "CHI_HOI_TRUONG",
  ].includes(
    role,
  );
}

/* =========================================================
   GET
   DANH SÁCH ĐÃ ĐĂNG KÝ
========================================================= */

export async function GET(
  _request: Request,
  context: RouteContext,
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
      !canManageAttendance(
        session.role,
      )
    ) {
      return errorResponse(
        "Bạn không có quyền điểm danh hoạt động",
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
        "Mã hoạt động không hợp lệ",
      );
    }

    await connectDB();

    const activity =
      await HoatDong.findById(
        id,
      )
        .select(
          [
            "maHoatDong",
            "tenHoatDong",
            "phamVi",
            "chiHoiId",
            "diaDiem",
            "thoiGianBatDau",
            "thoiGianKetThuc",
            "trangThai",
          ].join(" "),
        )
        .lean();

    if (!activity) {
      return errorResponse(
        "Không tìm thấy hoạt động",
        404,
      );
    }

    /*
     * Chỉ điểm danh hoạt động
     * đã bắt đầu/đang diễn ra/
     * đã kết thúc.
     */
    if (
      ![
        "DANG_DIEN_RA",
        "DA_KET_THUC",
      ].includes(
        activity.trangThai,
      )
    ) {
      return errorResponse(
        "Hoạt động chưa ở thời điểm cho phép điểm danh",
        409,
      );
    }

    let chiHoiId:
      Types.ObjectId
      | null =
      null;

    /*
     * CHT chỉ được điểm danh
     * Hội viên của Chi hội mình.
     */
    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      chiHoiId =
        await getChiHoiIdCuaChiHoiTruong(
          session.userId,
        );

      if (!chiHoiId) {
        return errorResponse(
          "Tài khoản Chi hội trưởng chưa được liên kết với Chi hội",
          403,
        );
      }
    }

    /* =====================================================
       QUERY REGISTRATIONS
    ===================================================== */

    const registrations =
      await DangKyHoatDong.find({
        hoatDongId:
          activity._id,

        /*
         * Không lấy đăng ký đã hủy.
         */
        trangThai: {
          $ne:
            "DA_HUY",
        },
      })
        .populate({
          path:
            "hoiVienId",

          select:
            [
              "maHoiVien",
              "hoTen",
              "email",
              "soDienThoai",
              "lop",
              "khoaHoc",
              "chiHoiId",
              "trangThai",
            ].join(" "),
        })
        .sort({
          thoiGianDangKy:
            1,
        })
        .lean();

    /* =====================================================
       FILTER OWN CHI HỘI
    ===================================================== */

    const danhSach =
      session.role ===
      "CHI_HOI_TRUONG"
        ? registrations.filter(
            (
              item,
            ) => {
              if (
                !item.hoiVienId ||
                typeof item.hoiVienId !==
                  "object"
              ) {
                return false;
              }

              const member =
                item.hoiVienId as {
                  chiHoiId?:
                    unknown;
                };

              return (
                member.chiHoiId &&
                String(
                  member.chiHoiId,
                ) ===
                  chiHoiId?.toString()
              );
            },
          )
        : registrations;

    /* =====================================================
       STATS
    ===================================================== */

    const thongKe = {
      tongDangKy:
        danhSach.length,

      chuaDiemDanh:
        danhSach.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "DA_DANG_KY",
        ).length,

      coMat:
        danhSach.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "DA_THAM_GIA",
        ).length,

      vangMat:
        danhSach.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "VANG_MAT",
        ).length,

      coLyDo:
        danhSach.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "VANG_CO_LY_DO",
        ).length,
    };

    return NextResponse.json({
      success: true,

      message:
        "Lấy danh sách điểm danh thành công",

      data: {
        hoatDong:
          activity,

        danhSach,

        thongKe,

        coTheDiemDanh:
          true,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/hoat-dong/[id]/diem-danh:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          process.env
            .NODE_ENV ===
          "development" &&
          error instanceof
            Error
            ? error.message
            : "Không thể lấy danh sách điểm danh",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PATCH
   LƯU ĐIỂM DANH HÀNG LOẠT
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
      !canManageAttendance(
        session.role,
      )
    ) {
      return errorResponse(
        "Bạn không có quyền điểm danh hoạt động",
        403,
      );
    }

    if (
      !Types.ObjectId.isValid(
        session.userId,
      )
    ) {
      return errorResponse(
        "Thông tin tài khoản không hợp lệ",
        401,
      );
    }

    /* =====================================================
       ACTIVITY ID
    ===================================================== */

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
        "Mã hoạt động không hợp lệ",
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body:
      DiemDanhBody;

    try {
      body =
        (await request.json()) as
          DiemDanhBody;
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    if (
      !Array.isArray(
        body.danhSach,
      ) ||
      body.danhSach.length ===
        0
    ) {
      return errorResponse(
        "Vui lòng điểm danh ít nhất một Hội viên",
      );
    }

    if (
      body.danhSach.length >
      MAX_ITEMS
    ) {
      return errorResponse(
        `Không được điểm danh quá ${MAX_ITEMS} Hội viên trong một lần`,
      );
    }

    const rawItems =
      body.danhSach as
        DiemDanhItem[];

    const parsedItems =
      rawItems.map(
        (
          item,
        ) => ({
          hoiVienId:
            getString(
              item.hoiVienId,
            ),

          trangThai:
            getString(
              item.trangThai,
            ) as
              TrangThaiDiemDanh,

          lyDoVang:
            getString(
              item.lyDoVang,
            ),

          ghiChu:
            getString(
              item.ghiChu,
            ),
        }),
      );

    /* =====================================================
       VALIDATE EACH ITEM
    ===================================================== */

    for (
      const item of
      parsedItems
    ) {
      if (
        !Types.ObjectId.isValid(
          item.hoiVienId,
        )
      ) {
        return errorResponse(
          "Danh sách có Hội viên không hợp lệ",
        );
      }

      if (
        !TRANG_THAI_HOP_LE.includes(
          item.trangThai,
        )
      ) {
        return errorResponse(
          "Danh sách có trạng thái điểm danh không hợp lệ",
        );
      }

      if (
        item.trangThai ===
          "VANG_CO_LY_DO" &&
        !item.lyDoVang
      ) {
        return errorResponse(
          "Hội viên vắng có lý do phải nhập lý do",
        );
      }

      if (
        item.lyDoVang.length >
        1000
      ) {
        return errorResponse(
          "Lý do vắng không được vượt quá 1000 ký tự",
        );
      }

      if (
        item.ghiChu.length >
        1000
      ) {
        return errorResponse(
          "Ghi chú không được vượt quá 1000 ký tự",
        );
      }
    }

    /*
     * Chặn gửi trùng Hội viên.
     */
    const idSet =
      new Set(
        parsedItems.map(
          (
            item,
          ) =>
            item.hoiVienId,
        ),
      );

    if (
      idSet.size !==
      parsedItems.length
    ) {
      return errorResponse(
        "Danh sách điểm danh có Hội viên bị trùng",
      );
    }

    /* =====================================================
       DB
    ===================================================== */

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

    if (
      ![
        "DANG_DIEN_RA",
        "DA_KET_THUC",
      ].includes(
        activity.trangThai,
      )
    ) {
      return errorResponse(
        "Hoạt động chưa ở thời điểm cho phép điểm danh",
        409,
      );
    }

    /* =====================================================
       OWN CHI HỘI
    ===================================================== */

    let chiHoiId:
      Types.ObjectId
      | null =
      null;

    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      chiHoiId =
        await getChiHoiIdCuaChiHoiTruong(
          session.userId,
        );

      if (!chiHoiId) {
        return errorResponse(
          "Tài khoản Chi hội trưởng chưa được liên kết với Chi hội",
          403,
        );
      }
    }

    const hoiVienIds =
      parsedItems.map(
        (
          item,
        ) =>
          new Types.ObjectId(
            item.hoiVienId,
          ),
      );

    /* =====================================================
       VERIFY MEMBERS
    ===================================================== */

    const memberQuery:
      Record<
        string,
        unknown
      > = {
        _id: {
          $in:
            hoiVienIds,
        },
      };

    if (
      chiHoiId
    ) {
      memberQuery.chiHoiId =
        chiHoiId;
    }

    const validMembers =
      await HoiVien.find(
        memberQuery,
      )
        .select(
          "_id",
        )
        .lean();

    if (
      validMembers.length !==
      parsedItems.length
    ) {
      return errorResponse(
        session.role ===
        "CHI_HOI_TRUONG"
          ? "Danh sách có Hội viên không thuộc Chi hội của bạn"
          : "Danh sách có Hội viên không tồn tại",
        403,
      );
    }

    /* =====================================================
       MUST HAVE REGISTERED
    ===================================================== */

    const registrations =
      await DangKyHoatDong.find({
        hoatDongId:
          activity._id,

        hoiVienId: {
          $in:
            hoiVienIds,
        },

        trangThai: {
          $ne:
            "DA_HUY",
        },
      });

    if (
      registrations.length !==
      parsedItems.length
    ) {
      return errorResponse(
        "Chỉ được điểm danh Hội viên đã đăng ký hoạt động",
        409,
      );
    }

    const registrationMap =
      new Map(
        registrations.map(
          (
            item,
          ) => [
            String(
              item.hoiVienId,
            ),

            item,
          ],
        ),
      );

    /* =====================================================
       UPDATE
    ===================================================== */

    const now =
      new Date();

    await Promise.all(
      parsedItems.map(
        async (
          item,
        ) => {
          const registration =
            registrationMap.get(
              item.hoiVienId,
            );

          if (
            !registration
          ) {
            return;
          }

          registration.trangThai =
            item.trangThai;

          registration.thoiGianDiemDanh =
            now;

          registration.nguoiCapNhatId =
            new Types.ObjectId(
              session.userId,
            );

          registration.ghiChu =
            item.ghiChu;

          if (
            item.trangThai ===
            "VANG_CO_LY_DO"
          ) {
            registration.lyDoVang =
              item.lyDoVang;
          } else {
            registration.lyDoVang =
              "";
          }

          await registration.save();
        },
      ),
    );

    /* =====================================================
       LOG
    ===================================================== */

    const counts = {
      coMat:
        parsedItems.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "DA_THAM_GIA",
        ).length,

      vangMat:
        parsedItems.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "VANG_MAT",
        ).length,

      coLyDo:
        parsedItems.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "VANG_CO_LY_DO",
        ).length,
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
        "UPDATE",

      module:
        "HOAT_DONG",

      description:
        `${session.fullName} đã điểm danh ${parsedItems.length} Hội viên cho hoạt động ${activity.maHoatDong} - ${activity.tenHoatDong}`,

      targetId:
        activity._id.toString(),

      targetName:
        `${activity.maHoatDong} - ${activity.tenHoatDong}`,

      metadata: {
        action:
          "DIEM_DANH",

        tongSo:
          parsedItems.length,

        ...counts,

        chiHoiId:
          chiHoiId
            ? chiHoiId.toString()
            : null,
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
       RESPONSE
    ===================================================== */

    const result =
      await DangKyHoatDong.find({
        hoatDongId:
          activity._id,

        hoiVienId: {
          $in:
            hoiVienIds,
        },
      })
        .populate(
          "hoiVienId",

          "maHoiVien hoTen lop khoaHoc email soDienThoai chiHoiId",
        )
        .sort({
          thoiGianDangKy:
            1,
        })
        .lean();

    return NextResponse.json({
      success: true,

      message:
        "Điểm danh thành công",

      data: {
        tongSo:
          parsedItems.length,

        ...counts,

        danhSach:
          result,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "PATCH /api/hoat-dong/[id]/diem-danh:",
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
          "Dữ liệu điểm danh không hợp lệ",
        400,
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
              : "Không thể lưu điểm danh"
            : "Đã xảy ra lỗi khi lưu điểm danh",
      },
      {
        status: 500,
      },
    );
  }
}