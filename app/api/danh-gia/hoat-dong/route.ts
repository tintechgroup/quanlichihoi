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
import DanhGiaHoatDong from "@/models/DanhGiaHoatDong";
import HoatDong from "@/models/HoatDong";
import HoiVien from "@/models/HoiVien";

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

function parseScore(
  value: unknown,
) {
  const score =
    Number(value);

  if (
    !Number.isInteger(
      score,
    ) ||
    score < 1 ||
    score > 5
  ) {
    return null;
  }

  return score;
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
       HỘI VIÊN
    ===================================================== */

    if (
      session.role ===
      "HOI_VIEN"
    ) {
      const hoiVien =
        await HoiVien.findOne({
          taiKhoanId:
            session.userId,
        })
          .select(
            "_id maHoiVien hoTen",
          )
          .lean();

      if (!hoiVien) {
        return errorResponse(
          "Tài khoản chưa được liên kết với hồ sơ Hội viên",
          404,
        );
      }

      /*
       * Chỉ hoạt động đã được
       * xác nhận CÓ MẶT.
       */
      const thamGia =
        await DangKyHoatDong.find({
          hoiVienId:
            hoiVien._id,

          trangThai:
            "DA_THAM_GIA",
        })
          .populate({
            path:
              "hoatDongId",

            model:
              HoatDong,

            select:
              [
                "_id",
                "maHoatDong",
                "tenHoatDong",
                "diaDiem",
                "thoiGianBatDau",
                "thoiGianKetThuc",
                "trangThai",
              ].join(" "),
          })
          .sort({
            updatedAt:
              -1,
          })
          .lean();

      const activityIds =
        thamGia
          .map(
            (
              item,
            ) =>
              item.hoatDongId &&
              typeof item.hoatDongId ===
                "object"
                ? (
                    item.hoatDongId as {
                      _id?:
                        mongoose.Types.ObjectId;
                    }
                  )._id
                : null,
          )
          .filter(
            (id): id is mongoose.Types.ObjectId => Boolean(id),
          );

      const danhGia =
        activityIds.length
          ? await DanhGiaHoatDong.find({
              hoiVienId:
                hoiVien._id,

              hoatDongId: {
                $in:
                  activityIds,
              },
            }).lean()
          : [];

      const danhGiaMap =
        new Map(
          danhGia.map(
            (
              item,
            ) => [
              String(
                item.hoatDongId,
              ),

              item,
            ],
          ),
        );

      const danhSach =
        thamGia
          .map(
            (
              item,
            ) => {
              if (
                !item.hoatDongId ||
                typeof item.hoatDongId !==
                  "object"
              ) {
                return null;
              }

              const activity =
                item.hoatDongId as {
                  _id:
                    unknown;

                  maHoatDong?:
                    string;

                  tenHoatDong?:
                    string;

                  diaDiem?:
                    string;

                  thoiGianBatDau?:
                    Date;

                  thoiGianKetThuc?:
                    Date;

                  trangThai?:
                    string;
                };

              const evaluation =
                danhGiaMap.get(
                  String(
                    activity._id,
                  ),
                );

              return {
                hoatDong: {
                  id:
                    String(
                      activity._id,
                    ),

                  _id:
                    String(
                      activity._id,
                    ),

                  maHoatDong:
                    activity.maHoatDong ||
                    "",

                  tenHoatDong:
                    activity.tenHoatDong ||
                    "",

                  diaDiem:
                    activity.diaDiem ||
                    "",

                  thoiGianBatDau:
                    activity.thoiGianBatDau ||
                    null,

                  thoiGianKetThuc:
                    activity.thoiGianKetThuc ||
                    null,

                  trangThai:
                    activity.trangThai ||
                    "",
                },

                /*
                 * Hiện model HoatDong chưa có
                 * cờ "mở đánh giá" riêng.
                 *
                 * Tạm coi hoạt động kết thúc
                 * là được đánh giá.
                 */
                coTheDanhGia:
                  activity.trangThai ===
                  "DA_KET_THUC",

                daDanhGia:
                  Boolean(
                    evaluation,
                  ),

                danhGia:
                  evaluation ||
                  null,
              };
            },
          )
          .filter(
            Boolean,
          );

      return NextResponse.json({
        success: true,

        message:
          "Lấy danh sách hoạt động cần đánh giá thành công",

        data: {
          hoiVien,

          danhSach,

          thongKe: {
            tongDaThamGia:
              danhSach.length,

            daDanhGia:
              danhSach.filter(
                (
                  item,
                ) =>
                  item?.daDanhGia,
              ).length,

            chuaDanhGia:
              danhSach.filter(
                (
                  item,
                ) =>
                  item?.coTheDanhGia &&
                  !item.daDanhGia,
              ).length,
          },
        },
      });
    }

    /* =====================================================
       ADMIN / BCH
    ===================================================== */

    if (
      ![
        "ADMIN",
        "BAN_CHAP_HANH",
      ].includes(
        session.role,
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem dữ liệu đánh giá hoạt động",
        403,
      );
    }

    const danhSach =
      await DanhGiaHoatDong.find()
        .populate({
          path:
            "hoatDongId",

          select:
            "maHoatDong tenHoatDong diaDiem thoiGianBatDau thoiGianKetThuc",
        })
        .populate({
          path:
            "hoiVienId",

          select:
            "maHoiVien hoTen lop chiHoiId",

          populate: {
            path:
              "chiHoiId",

            select:
              "maChiHoi tenChiHoi",
          },
        })
        .sort({
          createdAt:
            -1,
        })
        .lean();

    const tongDanhGia =
      danhSach.length;

    const trungBinh =
      (
        field:
          | "diemChatLuong"
          | "diemNoiDung"
          | "diemToChuc",
      ) => {
        if (
          tongDanhGia ===
          0
        ) {
          return 0;
        }

        const total =
          danhSach.reduce(
            (
              sum,
              item,
            ) =>
              sum +
              Number(
                item[
                  field
                ] ||
                  0,
              ),

            0,
          );

        return Number(
          (
            total /
            tongDanhGia
          ).toFixed(
            2,
          ),
        );
      };

    return NextResponse.json({
      success: true,

      message:
        "Lấy danh sách đánh giá hoạt động thành công",

      data: {
        danhSach,

        thongKe: {
          tongDanhGia,

          diemChatLuongTrungBinh:
            trungBinh(
              "diemChatLuong",
            ),

          diemNoiDungTrungBinh:
            trungBinh(
              "diemNoiDung",
            ),

          diemToChucTrungBinh:
            trungBinh(
              "diemToChuc",
            ),
        },
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/danh-gia/hoat-dong:",
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
              : "Không thể lấy đánh giá hoạt động"
            : "Đã xảy ra lỗi khi lấy đánh giá hoạt động",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
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
      "HOI_VIEN"
    ) {
      return errorResponse(
        "Chỉ Hội viên được gửi đánh giá hoạt động",
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
        (await request.json()) as
          Record<
            string,
            unknown
          >;
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    const hoatDongId =
      getString(
        body.hoatDongId,
      );

    const diemChatLuong =
      parseScore(
        body.diemChatLuong,
      );

    const diemNoiDung =
      parseScore(
        body.diemNoiDung,
      );

    const diemToChuc =
      parseScore(
        body.diemToChuc,
      );

    const noiDungDanhGia =
      getString(
        body.noiDungDanhGia,
      );

    const deXuatCaiThien =
      getString(
        body.deXuatCaiThien,
      );

    if (
      !Types.ObjectId.isValid(
        hoatDongId,
      )
    ) {
      return errorResponse(
        "Hoạt động không hợp lệ",
      );
    }

    if (
      diemChatLuong ===
        null ||
      diemNoiDung ===
        null ||
      diemToChuc ===
        null
    ) {
      return errorResponse(
        "Vui lòng đánh giá đầy đủ từ 1 đến 5 sao",
      );
    }

    if (
      !noiDungDanhGia
    ) {
      return errorResponse(
        "Vui lòng nhập nội dung đánh giá",
      );
    }

    if (
      noiDungDanhGia.length >
      2000
    ) {
      return errorResponse(
        "Nội dung đánh giá không được vượt quá 2000 ký tự",
      );
    }

    if (
      deXuatCaiThien.length >
      2000
    ) {
      return errorResponse(
        "Đề xuất cải thiện không được vượt quá 2000 ký tự",
      );
    }

    await connectDB();

    const [
      hoiVien,
      hoatDong,
    ] =
      await Promise.all([
        HoiVien.findOne({
          taiKhoanId:
            session.userId,
        }),

        HoatDong.findById(
          hoatDongId,
        ),
      ]);

    if (!hoiVien) {
      return errorResponse(
        "Không tìm thấy hồ sơ Hội viên",
        404,
      );
    }

    if (!hoatDong) {
      return errorResponse(
        "Không tìm thấy hoạt động",
        404,
      );
    }

    /*
     * Chỉ đánh giá hoạt động
     * đã kết thúc.
     */
    if (
      hoatDong.trangThai !==
      "DA_KET_THUC"
    ) {
      return errorResponse(
        "Hoạt động chưa kết thúc nên chưa thể đánh giá",
        409,
      );
    }

    /*
     * Quan trọng:
     * phải được điểm danh CÓ MẶT.
     */
    const dangKy =
      await DangKyHoatDong.findOne({
        hoatDongId:
          hoatDong._id,

        hoiVienId:
          hoiVien._id,

        trangThai:
          "DA_THAM_GIA",
      })
        .select(
          "_id",
        )
        .lean();

    if (!dangKy) {
      return errorResponse(
        "Chỉ Hội viên đã được xác nhận tham gia hoạt động mới được đánh giá",
        403,
      );
    }

    const existing =
      await DanhGiaHoatDong.findOne({
        hoatDongId:
          hoatDong._id,

        hoiVienId:
          hoiVien._id,
      })
        .select(
          "_id",
        )
        .lean();

    if (existing) {
      return errorResponse(
        "Bạn đã đánh giá hoạt động này trước đó",
        409,
      );
    }

    const record =
      await DanhGiaHoatDong.create({
        hoatDongId:
          hoatDong._id,

        hoiVienId:
          hoiVien._id,

        nguoiDungId:
          new Types.ObjectId(
            session.userId,
          ),

        diemChatLuong,

        diemNoiDung,

        diemToChuc,

        noiDungDanhGia,

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
        `${session.fullName} đã đánh giá hoạt động ${hoatDong.maHoatDong} - ${hoatDong.tenHoatDong}`,

      targetId:
        record._id.toString(),

      targetName:
        `${hoatDong.maHoatDong} - ${hoatDong.tenHoatDong}`,

      metadata: {
        loaiDanhGia:
          "HOAT_DONG",

        hoatDongId:
          hoatDong._id.toString(),

        hoiVienId:
          hoiVien._id.toString(),

        diemChatLuong,

        diemNoiDung,

        diemToChuc,
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
        success: true,

        message:
          "Gửi đánh giá hoạt động thành công",

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
      "POST /api/danh-gia/hoat-dong:",
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

    if (
      error &&
      typeof error ===
        "object" &&
      "code" in error &&
      (
        error as {
          code?:
            number;
        }
      ).code ===
        11000
    ) {
      return errorResponse(
        "Bạn đã đánh giá hoạt động này",
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
              ? error.message
              : "Không thể gửi đánh giá"
            : "Đã xảy ra lỗi khi gửi đánh giá hoạt động",
      },
      {
        status:
          500,
      },
    );
  }
}
