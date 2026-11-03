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

import DangKyHoatDong
  from "@/models/DangKyHoatDong";

import DangKyTapTheHoatDong
  from "@/models/DangKyTapTheHoatDong";

import HoatDong
  from "@/models/HoatDong";

import HoiVien
  from "@/models/HoiVien";

import LuotDiemDanhQR
  from "@/models/LuotDiemDanhQR";

import PhienDiemDanhQR
  from "@/models/PhienDiemDanhQR";

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
      token:
        string;
    }>;
};

type TrangThaiDangKy =
  | "DA_DANG_KY"
  | "DA_THAM_GIA"
  | "VANG_MAT"
  | "VANG_CO_LY_DO"
  | "DA_HUY";

/* =========================================================
   HELPERS
========================================================= */

function responseError(
  message:
    string,

  status =
    400,

  extra?: Record<
    string,
    unknown
  >,
) {
  return NextResponse.json(
    {
      success:
        false,

      message,

      ...extra,
    },
    {
      status,
    },
  );
}

function normalizeToken(
  value:
    unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function isMongoDuplicateError(
  error:
    unknown,
) {
  if (
    !error ||
    typeof error !==
      "object"
  ) {
    return false;
  }

  return (
    (
      error as {
        code?:
          number;
      }
    ).code ===
    11000
  );
}

/* =========================================================
   TỰ NHẬN BIẾT FIELD ĐĂNG KÝ CÁ NHÂN
========================================================= */

function getDangKyFields() {
  const hoiVienField =
    DangKyHoatDong.schema.path(
      "hoiVienId",
    )
      ? "hoiVienId"
      : "hoiVien";

  const hoatDongField =
    DangKyHoatDong.schema.path(
      "hoatDongId",
    )
      ? "hoatDongId"
      : "hoatDong";

  const statusField =
    DangKyHoatDong.schema.path(
      "trangThai",
    )
      ? "trangThai"
      : "trangThaiDangKy";

  return {
    hoiVienField,

    hoatDongField,

    statusField,
  };
}

/* =========================================================
   TÌM HỘI VIÊN HIỆN TẠI
========================================================= */

async function getCurrentHoiVien(
  userId:
    string,
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
      new Types.ObjectId(
        userId,
      ),
  })
    .select(
      [
        "_id",
        "maHoiVien",
        "hoTen",
        "chiHoiId",
        "taiKhoanId",
        "trangThai",
      ].join(
        " ",
      ),
    )
    .lean();
}

/* =========================================================
   KIỂM TRA ĐĂNG KÝ CÁ NHÂN
========================================================= */

async function findIndividualRegistration(
  hoatDongId:
    Types.ObjectId,

  hoiVienId:
    Types.ObjectId,
) {
  const {
    hoiVienField,
    hoatDongField,
  } =
    getDangKyFields();

  return DangKyHoatDong.findOne({
    [hoiVienField]:
      hoiVienId,

    [hoatDongField]:
      hoatDongId,
  });
}

/* =========================================================
   KIỂM TRA ĐĂNG KÝ TẬP THỂ
========================================================= */

async function findCollectiveRegistration(
  hoatDongId:
    Types.ObjectId,

  hoiVienId:
    Types.ObjectId,

  chiHoiId:
    Types.ObjectId,
) {
  return DangKyTapTheHoatDong.findOne({
    hoatDongId,

    chiHoiId,

    hoiVienIds:
      hoiVienId,

    trangThai:
      "DA_TIEP_NHAN",
  }).lean();
}

/* =========================================================
   CHUẨN HÓA TRẠNG THÁI ĐĂNG KÝ
========================================================= */

function getRegistrationStatus(
  registration:
    Record<
      string,
      unknown
    >,
) {
  const {
    statusField,
  } =
    getDangKyFields();

  return String(
    registration[
      statusField
    ] ||
      "DA_DANG_KY",
  ) as TrangThaiDangKy;
}

/* =========================================================
   GET
   Xem thông tin phiên QR trước khi xác nhận
========================================================= */

export async function GET(
  _request:
    Request,

  context:
    RouteContext,
) {
  try {
    const {
      token:
        rawToken,
    } =
      await context.params;

    const token =
      normalizeToken(
        rawToken,
      );

    if (!token) {
      return responseError(
        "Mã QR không hợp lệ",
      );
    }

    const session =
      await getCurrentSession();

    if (!session) {
      return responseError(
        "Bạn cần đăng nhập trước khi điểm danh",
        401,
      );
    }

    if (
      session.role !==
      "HOI_VIEN"
    ) {
      return responseError(
        "Mã QR điểm danh chỉ dành cho tài khoản Hội viên",
        403,
      );
    }

    await connectDB();

    const hoiVien =
      await getCurrentHoiVien(
        session.userId,
      );

    if (!hoiVien) {
      return responseError(
        "Tài khoản chưa được liên kết với hồ sơ Hội viên",
        404,
      );
    }

    if (
      hoiVien.trangThai ===
      "TAM_NGUNG"
    ) {
      return responseError(
        "Hồ sơ Hội viên đang tạm ngừng hoạt động",
        403,
      );
    }

    const qrSession =
      await PhienDiemDanhQR.findOne({
        token,
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
          ].join(
            " ",
          ),
        )
        .populate(
          "chiHoiId",
          "maChiHoi tenChiHoi",
        )
        .lean();

    if (!qrSession) {
      return responseError(
        "Mã QR không tồn tại",
        404,
      );
    }

    const now =
      new Date();

    const expired =
      qrSession.trangThai !==
        "DANG_MO" ||
      new Date(
        qrSession.thoiGianHetHan,
      ).getTime() <=
        now.getTime();

    const existed =
      await LuotDiemDanhQR.findOne({
        phienId:
          qrSession._id,

        hoiVienId:
          hoiVien._id,
      })
        .select(
          "thoiGianDiemDanh",
        )
        .lean();

    return NextResponse.json({
      success:
        true,

      data: {
        phien:
          qrSession,

        hoiVien: {
          id:
            String(
              hoiVien._id,
            ),

          maHoiVien:
            hoiVien.maHoiVien,

          hoTen:
            hoiVien.hoTen,
        },

        daHetHan:
          expired,

        daDiemDanh:
          Boolean(
            existed,
          ),

        thoiGianDiemDanh:
          existed
            ?.thoiGianDiemDanh ||
          null,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/diem-danh-qr/token/[token]:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể tải thông tin điểm danh QR",
      500,
    );
  }
}

/* =========================================================
   POST
   HỘI VIÊN XÁC NHẬN ĐIỂM DANH
========================================================= */

export async function POST(
  request:
    Request,

  context:
    RouteContext,
) {
  try {
    /* =====================================================
       1. TOKEN
    ===================================================== */

    const {
      token:
        rawToken,
    } =
      await context.params;

    const token =
      normalizeToken(
        rawToken,
      );

    if (!token) {
      return responseError(
        "Mã QR không hợp lệ",
      );
    }

    /* =====================================================
       2. SESSION
    ===================================================== */

    const session =
      await getCurrentSession();

    if (!session) {
      return responseError(
        "Bạn cần đăng nhập trước khi điểm danh",
        401,
      );
    }

    if (
      session.role !==
      "HOI_VIEN"
    ) {
      return responseError(
        "Chức năng điểm danh QR chỉ dành cho Hội viên",
        403,
      );
    }

    await connectDB();

    /* =====================================================
       3. HỒ SƠ HỘI VIÊN
    ===================================================== */

    const hoiVien =
      await getCurrentHoiVien(
        session.userId,
      );

    if (!hoiVien) {
      return responseError(
        "Tài khoản chưa được liên kết với hồ sơ Hội viên",
        404,
      );
    }

    if (
      hoiVien.trangThai ===
      "TAM_NGUNG"
    ) {
      return responseError(
        "Hồ sơ Hội viên đang tạm ngừng hoạt động",
        403,
      );
    }

    if (
      !hoiVien.chiHoiId
    ) {
      return responseError(
        "Hồ sơ Hội viên chưa được gán Chi hội",
        409,
      );
    }

    const hoiVienId =
      new Types.ObjectId(
        String(
          hoiVien._id,
        ),
      );

    const userId =
      new Types.ObjectId(
        session.userId,
      );

    const memberChiHoiId =
      new Types.ObjectId(
        String(
          hoiVien.chiHoiId,
        ),
      );

    /* =====================================================
       4. PHIÊN QR
    ===================================================== */

    const qrSession =
      await PhienDiemDanhQR.findOne({
        token,
      });

    if (!qrSession) {
      return responseError(
        "Mã QR không tồn tại",
        404,
      );
    }

    if (
      qrSession.trangThai !==
      "DANG_MO"
    ) {
      return responseError(
        "Phiên điểm danh QR đã đóng",
        409,
      );
    }

    const now =
      new Date();

    if (
      qrSession.thoiGianHetHan.getTime() <=
      now.getTime()
    ) {
      return responseError(
        "Mã QR đã hết hạn",
        410,
      );
    }

    /* =====================================================
       5. HOẠT ĐỘNG
    ===================================================== */

    const activity =
      await HoatDong.findById(
        qrSession.hoatDongId,
      ).lean();

    if (!activity) {
      return responseError(
        "Hoạt động không tồn tại",
        404,
      );
    }

    if (
      activity.trangThai !==
      "DANG_DIEN_RA"
    ) {
      return responseError(
        "Hoạt động hiện không trong thời gian điểm danh",
        409,
      );
    }

    /*
     * QR của Chi hội cụ thể:
     * bắt buộc Hội viên đúng Chi hội.
     */
    if (
      qrSession.chiHoiId &&
      String(
        qrSession.chiHoiId,
      ) !==
        String(
          memberChiHoiId,
        )
    ) {
      return responseError(
        "Mã QR này không dành cho Chi hội của bạn",
        403,
      );
    }

    /* =====================================================
       6. KIỂM TRA ĐÃ QUÉT CHƯA
    ===================================================== */

    const existedScan =
      await LuotDiemDanhQR.findOne({
        phienId:
          qrSession._id,

        hoiVienId,
      })
        .select(
          "_id thoiGianDiemDanh",
        )
        .lean();

    if (existedScan) {
      return NextResponse.json({
        success:
          true,

        alreadyCheckedIn:
          true,

        message:
          "Bạn đã điểm danh hoạt động này",

        data: {
          thoiGianDiemDanh:
            existedScan.thoiGianDiemDanh,
        },
      });
    }

    /* =====================================================
       7. KIỂM TRA ĐĂNG KÝ

       Cho phép nếu:
       - có đăng ký cá nhân hợp lệ
       HOẶC
       - có trong đăng ký tập thể đã được BCH tiếp nhận
    ===================================================== */

    const individual =
      await findIndividualRegistration(
        qrSession.hoatDongId,
        hoiVienId,
      );

    let individualValid =
      false;

    if (individual) {
      const status =
        getRegistrationStatus(
          individual.toObject() as unknown as Record<string, unknown>,
        );

      individualValid =
        status ===
          "DA_DANG_KY" ||
        status ===
          "DA_THAM_GIA";
    }

    const collective =
      await findCollectiveRegistration(
        qrSession.hoatDongId,
        hoiVienId,
        memberChiHoiId,
      );

    const collectiveValid =
      Boolean(
        collective,
      );

    if (
      !individualValid &&
      !collectiveValid
    ) {
      return responseError(
        "Bạn chưa có đăng ký hợp lệ cho hoạt động này",
        403,
      );
    }

    /* =====================================================
       8. GHI NHẬN QR

       Unique index:
       phienId + hoiVienId
       chống double click / gửi song song.
    ===================================================== */

    let checkIn;

    try {
      checkIn =
        await LuotDiemDanhQR.create({
          phienId:
            qrSession._id,

          hoatDongId:
            qrSession.hoatDongId,

          chiHoiId:
            memberChiHoiId,

          hoiVienId,

          userId,

          hoTen:
            hoiVien.hoTen,

          maHoiVien:
            hoiVien.maHoiVien,

          thoiGianDiemDanh:
            now,

          ipAddress:
            getRequestIp(
              request,
            ),

          userAgent:
            getUserAgent(
              request,
            ),
        });
    } catch (
      error
    ) {
      if (
        isMongoDuplicateError(
          error,
        )
      ) {
        const existing =
          await LuotDiemDanhQR.findOne({
            phienId:
              qrSession._id,

            hoiVienId,
          })
            .select(
              "thoiGianDiemDanh",
            )
            .lean();

        return NextResponse.json({
          success:
            true,

          alreadyCheckedIn:
            true,

          message:
            "Bạn đã điểm danh hoạt động này",

          data: {
            thoiGianDiemDanh:
              existing
                ?.thoiGianDiemDanh ||
              now,
          },
        });
      }

      throw error;
    }

    /* =====================================================
       9. CẬP NHẬT ĐĂNG KÝ CÁ NHÂN

       Nếu Hội viên có record DangKyHoatDong:
       DA_DANG_KY → DA_THAM_GIA.

       Không thay đổi nếu trước đó đã DA_THAM_GIA.
    ===================================================== */

    if (individual) {
      const {
        statusField,
      } =
        getDangKyFields();

      const currentStatus =
        getRegistrationStatus(
          individual.toObject() as unknown as Record<string, unknown>,
        );

      if (
        currentStatus ===
        "DA_DANG_KY"
      ) {
        individual.set(
          statusField,
          "DA_THAM_GIA",
        );

        if (
          DangKyHoatDong.schema.path(
            "thoiGianDiemDanh",
          )
        ) {
          individual.set(
            "thoiGianDiemDanh",
            now,
          );
        }

        if (
          DangKyHoatDong.schema.path(
            "nguoiCapNhatId",
          )
        ) {
          individual.set(
            "nguoiCapNhatId",
            userId,
          );
        }

        await individual.save();
      }
    }

    /* =====================================================
       10. SYSTEM LOG
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
        "HOAT_DONG",

      description:
        `${hoiVien.hoTen} điểm danh QR hoạt động ${activity.maHoatDong} - ${activity.tenHoatDong}`,

      targetId:
        checkIn._id.toString(),

      targetName:
        `${activity.maHoatDong} - ${activity.tenHoatDong}`,

      metadata: {
        loai:
          "DIEM_DANH_QR",

        phienId:
          qrSession._id.toString(),

        hoatDongId:
          String(
            qrSession.hoatDongId,
          ),

        hoiVienId:
          String(
            hoiVienId,
          ),

        maHoiVien:
          hoiVien.maHoiVien,

        chiHoiId:
          String(
            memberChiHoiId,
          ),

        dangKyCaNhan:
          individualValid,

        dangKyTapThe:
          collectiveValid,

        thoiGianDiemDanh:
          now.toISOString(),
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
       11. RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success:
          true,

        alreadyCheckedIn:
          false,

        message:
          "Điểm danh QR thành công",

        data: {
          id:
            checkIn._id.toString(),

          hoiVien: {
            id:
              String(
                hoiVien._id,
              ),

            maHoiVien:
              hoiVien.maHoiVien,

            hoTen:
              hoiVien.hoTen,
          },

          hoatDong: {
            id:
              String(
                activity._id,
              ),

            maHoatDong:
              activity.maHoatDong,

            tenHoatDong:
              activity.tenHoatDong,

            diaDiem:
              activity.diaDiem ||
              "",
          },

          thoiGianDiemDanh:
            now,
        },
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
      "POST /api/diem-danh-qr/token/[token]:",
      error,
    );

    return responseError(
      error instanceof
        mongoose.Error
          .ValidationError
        ? Object.values(
            error.errors,
          )[0]
            ?.message ||
          "Dữ liệu điểm danh không hợp lệ"
        : error instanceof
            Error
          ? error.message
          : "Không thể thực hiện điểm danh QR",
      500,
    );
  }
}