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
import DiemRenLuyen from "@/models/DiemRenLuyen";
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

function safeNumber(
  value: unknown,
) {
  const number =
    Number(
      value,
    );

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}

/* =========================================================
   GET
========================================================= */

export async function GET(
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
        "Chức năng này chỉ dành cho Hội viên",
        403,
      );
    }

    await connectDB();

    const hoiVien =
      await HoiVien.findOne({
        taiKhoanId:
          session.userId,
      })
        .select(
          [
            "_id",
            "maHoiVien",
            "hoTen",
            "lop",
            "khoaHoc",
            "chiHoiId",
          ].join(" "),
        )
        .populate(
          "chiHoiId",
          "maChiHoi tenChiHoi",
        )
        .lean();

    if (!hoiVien) {
      return errorResponse(
        "Tài khoản chưa được liên kết với hồ sơ Hội viên",
        404,
      );
    }

    /* =====================================================
       FILTER
    ===================================================== */

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const trangThai =
      searchParams
        .get("trangThai")
        ?.trim() ||
      "";

    const tuNgay =
      searchParams
        .get("tuNgay")
        ?.trim() ||
      "";

    const denNgay =
      searchParams
        .get("denNgay")
        ?.trim() ||
      "";

    const allowedStatus = [
      "DA_DANG_KY",
      "DA_THAM_GIA",
      "VANG_MAT",
      "VANG_CO_LY_DO",
      "DA_HUY",
    ];

    if (
      trangThai &&
      !allowedStatus.includes(
        trangThai,
      )
    ) {
      return errorResponse(
        "Trạng thái tham gia không hợp lệ",
      );
    }

    const registrationFilter:
      Record<
        string,
        unknown
      > = {
      hoiVienId:
        hoiVien._id,
    };

    if (
      trangThai
    ) {
      registrationFilter.trangThai =
        trangThai;
    }

    /* =====================================================
       LOAD HISTORY
    ===================================================== */

    const registrations =
      await DangKyHoatDong.find(
        registrationFilter,
      )
        .populate({
          path:
            "hoatDongId",

          select: [
            "_id",
            "maHoatDong",
            "tenHoatDong",
            "phamVi",
            "chiHoiId",
            "diaDiem",
            "thoiGianBatDau",
            "thoiGianKetThuc",
            "hanDangKy",
            "trangThai",
            "moTa",
          ].join(" "),

          populate: {
            path:
              "chiHoiId",

            select:
              "maChiHoi tenChiHoi",
          },
        })
        .sort({
          thoiGianDangKy:
            -1,
        })
        .lean();

    /*
     * Lọc theo ngày hoạt động sau populate
     * để tránh phụ thuộc schema registration.
     */
    const startDate =
      tuNgay
        ? new Date(
            `${tuNgay}T00:00:00.000`,
          )
        : null;

    const endDate =
      denNgay
        ? new Date(
            `${denNgay}T23:59:59.999`,
          )
        : null;

    if (
      startDate &&
      Number.isNaN(
        startDate.getTime(),
      )
    ) {
      return errorResponse(
        "Ngày bắt đầu không hợp lệ",
      );
    }

    if (
      endDate &&
      Number.isNaN(
        endDate.getTime(),
      )
    ) {
      return errorResponse(
        "Ngày kết thúc không hợp lệ",
      );
    }

    if (
      startDate &&
      endDate &&
      startDate >
        endDate
    ) {
      return errorResponse(
        "Khoảng thời gian không hợp lệ",
      );
    }

    const danhSach =
      registrations
        .filter(
          (
            registration,
          ) => {
            const activity =
              registration.hoatDongId as unknown as
                | {
                    thoiGianBatDau?:
                      Date;
                  }
                | null;

            if (
              !activity?.thoiGianBatDau
            ) {
              return (
                !startDate &&
                !endDate
              );
            }

            const date =
              new Date(
                activity.thoiGianBatDau,
              );

            if (
              Number.isNaN(
                date.getTime(),
              )
            ) {
              return false;
            }

            if (
              startDate &&
              date <
                startDate
            ) {
              return false;
            }

            if (
              endDate &&
              date >
                endDate
            ) {
              return false;
            }

            return true;
          },
        )
        .map(
          (
            registration,
          ) => ({
            id:
              String(
                registration._id,
              ),

            _id:
              String(
                registration._id,
              ),

            hoatDong:
              registration.hoatDongId,

            /*
             * Giữ field cũ để các component
             * đã viết trước đó vẫn chạy.
             */
            hoatDongId:
              registration.hoatDongId,

            trangThai:
              registration.trangThai,

            thoiGianDangKy:
              registration.thoiGianDangKy,

            thoiGianHuy:
              registration.thoiGianHuy ||
              null,

            thoiGianDiemDanh:
              registration.thoiGianDiemDanh ||
              null,

            lyDoHuy:
              registration.lyDoHuy ||
              "",

            lyDoVang:
              registration.lyDoVang ||
              "",

            ghiChu:
              registration.ghiChu ||
              "",
          }),
        );

    /* =====================================================
       STATS
    ===================================================== */

    const thongKe = {
      tongSo:
        danhSach.length,

      daDangKy:
        danhSach.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "DA_DANG_KY",
        ).length,

      daThamGia:
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

      vangCoLyDo:
        danhSach.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "VANG_CO_LY_DO",
        ).length,

      daHuy:
        danhSach.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "DA_HUY",
        ).length,
    };

    const soKetQua =
      thongKe.daThamGia +
      thongKe.vangMat +
      thongKe.vangCoLyDo;

    const tyLeThamGia =
      soKetQua >
      0
        ? Number(
            (
              thongKe.daThamGia /
              soKetQua *
              100
            ).toFixed(
              1,
            ),
          )
        : 0;

    /* =====================================================
       DIEM REN LUYEN
    ===================================================== */

    const diemRenLuyen =
      await DiemRenLuyen.find({
        hoiVienId:
          hoiVien._id,

        /*
         * Hội viên chỉ xem kết quả
         * chính thức đã duyệt.
         */
        trangThai:
          "DA_DUYET",
      })
        .select(
          [
            "_id",
            "hocKy",
            "namHoc",
            "diem",
            "xepLoai",
            "nhanXet",
            "ngayDuyet",
            "createdAt",
          ].join(" "),
        )
        .sort({
          namHoc:
            -1,

          hocKy:
            -1,

          createdAt:
            -1,
        })
        .lean();

    const diemRenLuyenDanhSach =
      diemRenLuyen.map(
        (
          item,
        ) => ({
          id:
            String(
              item._id,
            ),

          _id:
            String(
              item._id,
            ),

          hocKy:
            item.hocKy,

          namHoc:
            item.namHoc,

          diem:
            safeNumber(
              item.diem,
            ),

          xepLoai:
            item.xepLoai,

          nhanXet:
            item.nhanXet ||
            "",

          ngayDuyet:
            item.ngayDuyet ||
            null,
        }),
      );

    const tongDiem =
      diemRenLuyenDanhSach.reduce(
        (
          sum,
          item,
        ) =>
          sum +
          item.diem,
        0,
      );

    const diemTrungBinh =
      diemRenLuyenDanhSach.length >
      0
        ? Number(
            (
              tongDiem /
              diemRenLuyenDanhSach.length
            ).toFixed(
              2,
            ),
          )
        : 0;

    const moiNhat =
      diemRenLuyenDanhSach[0] ??
      null;

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success:
        true,

      message:
        "Lấy lịch sử tham gia thành công",

      data: {
        hoiVien,

        /*
         * Response mới.
         */
        danhSach,

        thongKe: {
          ...thongKe,

          tyLeThamGia,
        },

        diemRenLuyen: {
          danhSach:
            diemRenLuyenDanhSach,

          thongKe: {
            tongSo:
              diemRenLuyenDanhSach.length,

            diemTrungBinh,

            moiNhat,
          },
        },

        /*
         * Compatibility cho code cũ.
         */
        dangKy:
          danhSach,

        registrations:
          danhSach,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/hoat-dong/cua-toi:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof
          Error
            ? error.message
            : "Không thể tải lịch sử tham gia",
      },
      {
        status:
          500,
      },
    );
  }
}