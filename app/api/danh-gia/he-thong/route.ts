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

import DanhGiaHeThong from "@/models/DanhGiaHeThong";

export const dynamic =
  "force-dynamic";

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

function getString(
  value:
    unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function parseScore(
  value:
    unknown,
) {
  const score =
    Number(
      value,
    );

  if (
    !Number.isInteger(
      score,
    ) ||
    score <
      1 ||
    score >
      5
  ) {
    return null;
  }

  return score;
}

function average(
  values:
    number[],
) {
  if (
    values.length ===
    0
  ) {
    return 0;
  }

  return Number(
    (
      values.reduce(
        (
          sum,
          value,
        ) =>
          sum +
          value,
        0,
      ) /
      values.length
    ).toFixed(
      2,
    ),
  );
}

/* =========================================================
   GET
========================================================= */

export async function GET() {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return errorResponse(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    await connectDB();

    /* =====================================================
       HỘI VIÊN / BCH: LỊCH SỬ CỦA MÌNH
    ===================================================== */

    if (
      [
        "HOI_VIEN",
        "BAN_CHAP_HANH",
      ].includes(
        session.role,
      )
    ) {
      const danhSach =
        await DanhGiaHeThong.find({
          nguoiDungId:
            session.userId,
        })
          .sort({
            createdAt:
              -1,
          })
          .lean();

      return NextResponse.json({
        success:
          true,

        message:
          "Lấy lịch sử đánh giá hệ thống thành công",

        data: {
          danhSach,

          tongSo:
            danhSach.length,
        },
      });
    }

    /* =====================================================
       ADMIN: XEM TOÀN BỘ
    ===================================================== */

    if (
      session.role !==
      "ADMIN"
    ) {
      return errorResponse(
        "Bạn không có quyền xem đánh giá hệ thống",
        403,
      );
    }

    const danhSach =
      await DanhGiaHeThong.find()
        .populate({
          path:
            "nguoiDungId",

          select:
            "username fullName role",
        })
        .sort({
          createdAt:
            -1,
        })
        .lean();

    const thongKe = {
      tongDanhGia:
        danhSach.length,

      mucDoHaiLongTrungBinh:
        average(
          danhSach.map(
            (
              item,
            ) =>
              Number(
                item.mucDoHaiLong ||
                  0,
              ),
          ),
        ),

      deSuDungTrungBinh:
        average(
          danhSach.map(
            (
              item,
            ) =>
              Number(
                item.deSuDung ||
                  0,
              ),
          ),
        ),

      tinhHieuQuaTrungBinh:
        average(
          danhSach.map(
            (
              item,
            ) =>
              Number(
                item.tinhHieuQua ||
                  0,
              ),
          ),
        ),

      mucDoPhuHopTrungBinh:
        average(
          danhSach.map(
            (
              item,
            ) =>
              Number(
                item.mucDoPhuHop ||
                  0,
              ),
          ),
        ),

      hoiVien:
        danhSach.filter(
          (
            item,
          ) =>
            item.loaiNguoiDung ===
            "HOI_VIEN",
        ).length,

      banChapHanh:
        danhSach.filter(
          (
            item,
          ) =>
            item.loaiNguoiDung ===
            "BAN_CHAP_HANH",
        ).length,
    };

    return NextResponse.json({
      success:
        true,

      message:
        "Lấy danh sách đánh giá hệ thống thành công",

      data: {
        danhSach,

        thongKe,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/danh-gia/he-thong:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          process.env
            .NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? error.message
              : "Không thể lấy đánh giá hệ thống"
            : "Đã xảy ra lỗi khi lấy đánh giá hệ thống",
      },
      {
        status:
          500,
      },
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
      await getCurrentSession();

    if (!session) {
      return errorResponse(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    /*
     * Theo tài liệu:
     * Hội viên và BCH có chức năng
     * đánh giá hệ thống.
     */
    if (
      ![
        "HOI_VIEN",
        "BAN_CHAP_HANH",
      ].includes(
        session.role,
      )
    ) {
      return errorResponse(
        "Tài khoản này không được gửi đánh giá hệ thống",
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

    let body:
      Record<
        string,
        unknown
      >;

    try {
      body =
        (
          await request.json()
        ) as
          Record<
            string,
            unknown
          >;
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    const mucDoHaiLong =
      parseScore(
        body.mucDoHaiLong,
      );

    const deSuDung =
      parseScore(
        body.deSuDung,
      );

    const tinhHieuQua =
      parseScore(
        body.tinhHieuQua,
      );

    const mucDoPhuHop =
      parseScore(
        body.mucDoPhuHop,
      );

    const noiDungGopY =
      getString(
        body.noiDungGopY,
      );

    const deXuatCaiThien =
      getString(
        body.deXuatCaiThien,
      );

    if (
      mucDoHaiLong ===
        null ||
      deSuDung ===
        null ||
      tinhHieuQua ===
        null ||
      mucDoPhuHop ===
        null
    ) {
      return errorResponse(
        "Vui lòng đánh giá đầy đủ các tiêu chí từ 1 đến 5 sao",
      );
    }

    if (
      !noiDungGopY
    ) {
      return errorResponse(
        "Vui lòng nhập nội dung góp ý",
      );
    }

    if (
      noiDungGopY.length >
      3000
    ) {
      return errorResponse(
        "Nội dung góp ý không được vượt quá 3000 ký tự",
      );
    }

    if (
      deXuatCaiThien.length >
      3000
    ) {
      return errorResponse(
        "Đề xuất cải thiện không được vượt quá 3000 ký tự",
      );
    }

    await connectDB();

    const record =
      await DanhGiaHeThong.create({
        nguoiDungId:
          new Types.ObjectId(
            session.userId,
          ),

        loaiNguoiDung:
          session.role ===
          "BAN_CHAP_HANH"
            ? "BAN_CHAP_HANH"
            : "HOI_VIEN",

        mucDoHaiLong,

        deSuDung,

        tinhHieuQua,

        mucDoPhuHop,

        noiDungGopY,

        deXuatCaiThien,
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
        "DANH_GIA",

      description:
        `${session.fullName} đã gửi đánh giá hệ thống`,

      targetId:
        record._id.toString(),

      targetName:
        "Đánh giá hệ thống",

      metadata: {
        loaiDanhGia:
          "HE_THONG",

        mucDoHaiLong,

        deSuDung,

        tinhHieuQua,

        mucDoPhuHop,
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
          "Gửi đánh giá hệ thống thành công",

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
      "POST /api/danh-gia/he-thong:",
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
          "Dữ liệu đánh giá không hợp lệ",
      );
    }

    return NextResponse.json(
      {
        success:
          false,

        message:
          process.env
            .NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? error.message
              : "Không thể gửi đánh giá hệ thống"
            : "Đã xảy ra lỗi khi gửi đánh giá hệ thống",
      },
      {
        status:
          500,
      },
    );
  }
}