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

type TrangThaiDangKy =
  | "DA_DANG_KY"
  | "DA_THAM_GIA"
  | "VANG_MAT"
  | "VANG_CO_LY_DO"
  | "DA_HUY";

/* =========================================================
   CONSTANTS
========================================================= */

const VAI_TRO_QUAN_LY = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const VAI_TRO_DUOC_DANG_KY = [
  "HOI_VIEN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const TRANG_THAI_DANG_KY_DANG_HIEU_LUC:
  TrangThaiDangKy[] = [
    "DA_DANG_KY",
    "DA_THAM_GIA",
  ];

const TRANG_THAI_DA_DIEM_DANH:
  TrangThaiDangKy[] = [
    "DA_THAM_GIA",
    "VANG_MAT",
    "VANG_CO_LY_DO",
  ];

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

async function timHoiVienTheoTaiKhoan(
  userId: string,
) {
  if (
    !Types.ObjectId.isValid(
      userId,
    )
  ) {
    return null;
  }

  return HoiVien.findOne({
    taiKhoanId:
      userId,
  });
}

async function timHoatDong(
  id: string,
) {
  if (
    !Types.ObjectId.isValid(
      id,
    )
  ) {
    return null;
  }

  return HoatDong.findById(
    id,
  );
}

/* =========================================================
   CHI HỘI CỦA TÀI KHOẢN
========================================================= */

async function layChiHoiIdCuaTaiKhoan({
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

  /*
   * Chi hội trưởng:
   * ưu tiên User.chiHoiId
   */
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
      return String(
        user.chiHoiId,
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

    return member?.chiHoiId
      ? String(
          member.chiHoiId,
        )
      : null;
  }

  /*
   * Hội viên:
   * ưu tiên HoiVien.chiHoiId
   */
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
    return String(
      member.chiHoiId,
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

  return user?.chiHoiId
    ? String(
        user.chiHoiId,
      )
    : null;
}

/* =========================================================
   GET
   LẤY THÔNG TIN ĐĂNG KÝ
========================================================= */

export async function GET(
  _request: Request,
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
        400,
      );
    }

    await connectDB();

    /* =====================================================
       ACTIVITY
    ===================================================== */

    const hoatDong =
      await HoatDong.findById(
        id,
      )
        .populate(
          "chiHoiId",
          "maChiHoi tenChiHoi",
        )
        .lean();

    if (!hoatDong) {
      return errorResponse(
        "Không tìm thấy hoạt động",
        404,
      );
    }

    /* =====================================================
       MANAGER VIEW
    ===================================================== */

    if (
      VAI_TRO_QUAN_LY.includes(
        session.role,
      )
    ) {
      const filter:
        Record<
          string,
          unknown
        > = {
        hoatDongId:
          id,
      };

      /*
       * Chi hội trưởng chỉ được xem
       * đăng ký của Hội viên thuộc
       * Chi hội mình.
       */
      if (
        session.role ===
        "CHI_HOI_TRUONG"
      ) {
        const chiHoiId =
          await layChiHoiIdCuaTaiKhoan({
            userId:
              session.userId,

            role:
              session.role,
          });

        if (!chiHoiId) {
          return errorResponse(
            "Tài khoản Chi hội trưởng chưa được liên kết với Chi hội",
            403,
          );
        }

        const hoiVienCuaChiHoi =
          await HoiVien.find({
            chiHoiId,
          })
            .select(
              "_id",
            )
            .lean();

        filter.hoiVienId =
          {
            $in:
              hoiVienCuaChiHoi.map(
                (
                  item,
                ) =>
                  item._id,
              ),
          };
      }

      const danhSachDangKy =
        await DangKyHoatDong.find(
          filter,
        )
          .populate({
            path:
              "hoiVienId",

            select:
              [
                "maHoiVien",
                "hoTen",
                "gioiTinh",
                "lop",
                "khoaHoc",
                "soDienThoai",
                "email",
                "trangThai",
                "chiHoiId",
              ].join(" "),

            populate: {
              path:
                "chiHoiId",

              select:
                "maChiHoi tenChiHoi",
            },
          })
          .populate(
            "nguoiCapNhatId",

            "username fullName role",
          )
          .sort({
            thoiGianDangKy:
              -1,
          })
          .lean();

      /* ===================================================
         STATISTICS
      =================================================== */

      const thongKe = {
        tongSo:
          danhSachDangKy.length,

        daDangKy:
          danhSachDangKy.filter(
            (
              item,
            ) =>
              item.trangThai ===
              "DA_DANG_KY",
          ).length,

        daThamGia:
          danhSachDangKy.filter(
            (
              item,
            ) =>
              item.trangThai ===
              "DA_THAM_GIA",
          ).length,

        vangMat:
          danhSachDangKy.filter(
            (
              item,
            ) =>
              item.trangThai ===
              "VANG_MAT",
          ).length,

        vangCoLyDo:
          danhSachDangKy.filter(
            (
              item,
            ) =>
              item.trangThai ===
              "VANG_CO_LY_DO",
          ).length,

        daHuy:
          danhSachDangKy.filter(
            (
              item,
            ) =>
              item.trangThai ===
              "DA_HUY",
          ).length,
      };

      return NextResponse.json({
        success: true,

        message:
          "Lấy danh sách đăng ký hoạt động thành công",

        data:
          danhSachDangKy,

        total:
          danhSachDangKy.length,

        thongKe,

        hoatDong,
      });
    }

    /* =====================================================
       MEMBER VIEW
    ===================================================== */

    const hoiVien =
      await timHoiVienTheoTaiKhoan(
        session.userId,
      );

    if (!hoiVien) {
      return errorResponse(
        "Không tìm thấy hồ sơ Hội viên của tài khoản",
        404,
      );
    }

    const dangKy =
      await DangKyHoatDong.findOne({
        hoatDongId:
          id,

        hoiVienId:
          hoiVien._id,
      })
        .populate(
          "hoatDongId",

          [
            "maHoatDong",
            "tenHoatDong",
            "diaDiem",
            "thoiGianBatDau",
            "thoiGianKetThuc",
            "trangThai",
          ].join(" "),
        )
        .lean();

    return NextResponse.json({
      success: true,

      message:
        "Lấy trạng thái đăng ký thành công",

      data:
        dangKy,

      daDangKy:
        Boolean(
          dangKy &&
            dangKy.trangThai !==
              "DA_HUY",
        ),

      daDiemDanh:
        Boolean(
          dangKy &&
            TRANG_THAI_DA_DIEM_DANH.includes(
              dangKy.trangThai as
                TrangThaiDangKy,
            ),
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/hoat-dong/[id]/dang-ky:",
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
              : "Không thể lấy thông tin đăng ký"
            : "Đã xảy ra lỗi khi lấy danh sách đăng ký",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST
   ĐĂNG KÝ CÁ NHÂN
========================================================= */

export async function POST(
  _request: Request,
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
      !VAI_TRO_DUOC_DANG_KY.includes(
        session.role,
      )
    ) {
      return errorResponse(
        "Tài khoản này không được đăng ký hoạt động",
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

    /* =====================================================
       ID
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
        400,
      );
    }

    await connectDB();

    /* =====================================================
       ACTIVITY + MEMBER
    ===================================================== */

    const [
      hoatDong,
      hoiVien,
    ] =
      await Promise.all([
        timHoatDong(
          id,
        ),

        timHoiVienTheoTaiKhoan(
          session.userId,
        ),
      ]);

    if (!hoatDong) {
      return errorResponse(
        "Không tìm thấy hoạt động",
        404,
      );
    }

    if (!hoiVien) {
      return errorResponse(
        "Không tìm thấy hồ sơ Hội viên của tài khoản",
        404,
      );
    }

    /* =====================================================
       MEMBER STATUS
    ===================================================== */

    if (
      hoiVien.trangThai !==
      "DANG_HOAT_DONG"
    ) {
      return errorResponse(
        "Hội viên đang tạm ngừng hoạt động nên không thể đăng ký",
        403,
      );
    }

    /* =====================================================
       ACTIVITY STATUS
    ===================================================== */

    if (
      ![
        "DA_DUYET",
        "SAP_DIEN_RA",
      ].includes(
        hoatDong.trangThai,
      )
    ) {
      return errorResponse(
        "Hoạt động hiện không nhận đăng ký",
        409,
      );
    }

    const hienTai =
      new Date();

    /* =====================================================
       DEADLINE
    ===================================================== */

    if (
      hoatDong.hanDangKy &&
      hienTai >
        new Date(
          hoatDong.hanDangKy,
        )
    ) {
      return errorResponse(
        "Hoạt động đã hết hạn đăng ký",
        409,
      );
    }

    /* =====================================================
       ACTIVITY STARTED
    ===================================================== */

    if (
      hienTai >=
      new Date(
        hoatDong.thoiGianBatDau,
      )
    ) {
      return errorResponse(
        "Hoạt động đã bắt đầu, không thể đăng ký",
        409,
      );
    }

    /* =====================================================
       PHẠM VI CHI HỘI
    ===================================================== */

    if (
      hoatDong.phamVi ===
      "CHI_HOI"
    ) {
      if (
        !hoatDong.chiHoiId
      ) {
        return errorResponse(
          "Hoạt động chưa được thiết lập Chi hội",
          409,
        );
      }

      const chiHoiHoatDong =
        String(
          hoatDong.chiHoiId,
        );

      const chiHoiHoiVien =
        hoiVien.chiHoiId
          ? String(
              hoiVien.chiHoiId,
            )
          : "";

      if (
        !chiHoiHoiVien ||
        chiHoiHoatDong !==
          chiHoiHoiVien
      ) {
        return errorResponse(
          "Bạn không thuộc Chi hội tổ chức hoạt động này",
          403,
        );
      }
    }

    /* =====================================================
       EXISTING REGISTRATION
    ===================================================== */

    const dangKyCu =
      await DangKyHoatDong.findOne({
        hoatDongId:
          hoatDong._id,

        hoiVienId:
          hoiVien._id,
      });

    /*
     * Nếu tồn tại và chưa hủy
     * thì không được đăng ký lại.
     */
    if (
      dangKyCu &&
      dangKyCu.trangThai !==
        "DA_HUY"
    ) {
      let message =
        "Bạn đã đăng ký hoạt động này";

      if (
        dangKyCu.trangThai ===
        "DA_THAM_GIA"
      ) {
        message =
          "Bạn đã được xác nhận tham gia hoạt động này";
      }

      if (
        dangKyCu.trangThai ===
        "VANG_MAT"
      ) {
        message =
          "Bạn đã được ghi nhận vắng mặt tại hoạt động này";
      }

      if (
        dangKyCu.trangThai ===
        "VANG_CO_LY_DO"
      ) {
        message =
          "Bạn đã được ghi nhận vắng có lý do tại hoạt động này";
      }

      return errorResponse(
        message,
        409,
      );
    }

    /* =====================================================
       CAPACITY
    ===================================================== */

    const tongNguoiDangKy =
      await DangKyHoatDong.countDocuments(
        {
          hoatDongId:
            hoatDong._id,

          trangThai: {
            $in:
              TRANG_THAI_DANG_KY_DANG_HIEU_LUC,
          },
        },
      );

    if (
      hoatDong.soLuongToiDa &&
      hoatDong.soLuongToiDa >
        0 &&
      tongNguoiDangKy >=
        hoatDong.soLuongToiDa
    ) {
      return errorResponse(
        "Hoạt động đã đủ số lượng người đăng ký",
        409,
      );
    }

    /* =====================================================
       CREATE / REACTIVATE
    ===================================================== */

    let dangKy;

    const now =
      new Date();

    if (
      dangKyCu
    ) {
      /*
       * Đăng ký lại sau DA_HUY.
       */
      dangKyCu.trangThai =
        "DA_DANG_KY";

      dangKyCu.thoiGianDangKy =
        now;

      dangKyCu.thoiGianHuy =
        undefined;

      dangKyCu.lyDoHuy =
        "";

      /*
       * Reset toàn bộ dữ liệu
       * điểm danh cũ nếu bản ghi
       * được tái kích hoạt.
       */
      dangKyCu.thoiGianDiemDanh =
        undefined;

      dangKyCu.lyDoVang =
        "";

      dangKyCu.ghiChu =
        "";

      dangKyCu.nguoiCapNhatId =
        new Types.ObjectId(
          session.userId,
        );

      dangKy =
        await dangKyCu.save();
    } else {
      dangKy =
        await DangKyHoatDong.create({
          hoatDongId:
            hoatDong._id,

          hoiVienId:
            hoiVien._id,

          trangThai:
            "DA_DANG_KY",

          thoiGianDangKy:
            now,

          thoiGianHuy:
            undefined,

          thoiGianDiemDanh:
            undefined,

          lyDoHuy:
            "",

          lyDoVang:
            "",

          ghiChu:
            "",

          nguoiCapNhatId:
            new Types.ObjectId(
              session.userId,
            ),
        });
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    const ketQua =
      await DangKyHoatDong.findById(
        dangKy._id,
      )
        .populate(
          "hoiVienId",

          [
            "maHoiVien",
            "hoTen",
            "email",
            "soDienThoai",
            "lop",
            "khoaHoc",
          ].join(" "),
        )
        .populate(
          "hoatDongId",

          [
            "maHoatDong",
            "tenHoatDong",
            "diaDiem",
            "thoiGianBatDau",
            "thoiGianKetThuc",
          ].join(" "),
        )
        .lean();

    return NextResponse.json(
      {
        success: true,

        message:
          dangKyCu
            ? "Đăng ký lại hoạt động thành công"
            : "Đăng ký hoạt động thành công",

        data:
          ketQua,
      },
      {
        status:
          dangKyCu
            ? 200
            : 201,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "POST /api/hoat-dong/[id]/dang-ky:",
      error,
    );

    if (
      error &&
      typeof error ===
        "object" &&
      "code" in error &&
      (
        error as {
          code?: number;
        }
      ).code ===
        11000
    ) {
      return errorResponse(
        "Bạn đã đăng ký hoạt động này",
        409,
      );
    }

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
          "Dữ liệu đăng ký không hợp lệ",
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
              : "Không thể đăng ký hoạt động"
            : "Đã xảy ra lỗi khi đăng ký hoạt động",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   DELETE
   HỦY ĐĂNG KÝ CÁ NHÂN
========================================================= */

export async function DELETE(
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
      !VAI_TRO_DUOC_DANG_KY.includes(
        session.role,
      )
    ) {
      return errorResponse(
        "Tài khoản này không được hủy đăng ký hoạt động",
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

    /* =====================================================
       ID
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
        400,
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body: {
      lyDoHuy?:
        unknown;
    } = {};

    try {
      const text =
        await request.text();

      if (
        text.trim()
      ) {
        body =
          JSON.parse(
            text,
          ) as {
            lyDoHuy?:
              unknown;
          };
      }
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
        400,
      );
    }

    const lyDoHuy =
      getString(
        body.lyDoHuy,
      );

    if (
      lyDoHuy.length >
      500
    ) {
      return errorResponse(
        "Lý do hủy không được vượt quá 500 ký tự",
        400,
      );
    }

    await connectDB();

    /* =====================================================
       ACTIVITY + MEMBER
    ===================================================== */

    const [
      hoatDong,
      hoiVien,
    ] =
      await Promise.all([
        timHoatDong(
          id,
        ),

        timHoiVienTheoTaiKhoan(
          session.userId,
        ),
      ]);

    if (!hoatDong) {
      return errorResponse(
        "Không tìm thấy hoạt động",
        404,
      );
    }

    if (!hoiVien) {
      return errorResponse(
        "Không tìm thấy hồ sơ Hội viên của tài khoản",
        404,
      );
    }

    /* =====================================================
       ACTIVITY STARTED
    ===================================================== */

    if (
      new Date() >=
      new Date(
        hoatDong.thoiGianBatDau,
      )
    ) {
      return errorResponse(
        "Hoạt động đã bắt đầu, không thể hủy đăng ký",
        409,
      );
    }

    /* =====================================================
       REGISTRATION
    ===================================================== */

    const dangKy =
      await DangKyHoatDong.findOne({
        hoatDongId:
          hoatDong._id,

        hoiVienId:
          hoiVien._id,
      });

    if (!dangKy) {
      return errorResponse(
        "Bạn chưa đăng ký hoạt động này",
        404,
      );
    }

    if (
      dangKy.trangThai ===
      "DA_HUY"
    ) {
      return errorResponse(
        "Đăng ký này đã được hủy trước đó",
        409,
      );
    }

    /* =====================================================
       ATTENDANCE LOCK
    ===================================================== */

    if (
      TRANG_THAI_DA_DIEM_DANH.includes(
        dangKy.trangThai as
          TrangThaiDangKy,
      )
    ) {
      return errorResponse(
        "Hoạt động đã được điểm danh, không thể hủy đăng ký",
        409,
      );
    }

    /*
     * Chỉ DA_DANG_KY mới được
     * tự hủy.
     */
    if (
      dangKy.trangThai !==
      "DA_DANG_KY"
    ) {
      return errorResponse(
        "Trạng thái đăng ký hiện tại không cho phép hủy",
        409,
      );
    }

    /* =====================================================
       CANCEL
    ===================================================== */

    dangKy.trangThai =
      "DA_HUY";

    dangKy.thoiGianHuy =
      new Date();

    dangKy.lyDoHuy =
      lyDoHuy;

    dangKy.nguoiCapNhatId =
      new Types.ObjectId(
        session.userId,
      );

    await dangKy.save();

    /* =====================================================
       RESPONSE
    ===================================================== */

    const result =
      await DangKyHoatDong.findById(
        dangKy._id,
      )
        .populate(
          "hoiVienId",

          [
            "maHoiVien",
            "hoTen",
            "email",
            "soDienThoai",
            "lop",
          ].join(" "),
        )
        .populate(
          "hoatDongId",

          [
            "maHoatDong",
            "tenHoatDong",
            "diaDiem",
            "thoiGianBatDau",
            "thoiGianKetThuc",
          ].join(" "),
        )
        .lean();

    return NextResponse.json({
      success: true,

      message:
        "Hủy đăng ký hoạt động thành công",

      data:
        result,
    });
  } catch (
    error
  ) {
    console.error(
      "DELETE /api/hoat-dong/[id]/dang-ky:",
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
          "Dữ liệu đăng ký không hợp lệ",
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
              : "Không thể hủy đăng ký"
            : "Đã xảy ra lỗi khi hủy đăng ký hoạt động",
      },
      {
        status: 500,
      },
    );
  }
}