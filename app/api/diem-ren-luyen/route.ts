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

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import "@/models/ChiHoi";
import DiemRenLuyen, { type XepLoaiRenLuyen } from "@/models/DiemRenLuyen";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

export const dynamic =
  "force-dynamic";

/* =========================================================
   CONSTANTS
========================================================= */

const XEP_LOAI = [
  "XUAT_SAC",
  "TOT",
  "KHA",
  "TRUNG_BINH",
  "YEU",
];

const TRANG_THAI = [
  "CHO_DUYET",
  "DA_DUYET",
  "TU_CHOI",
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
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

async function getChiHoiIdCuaCHT(
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
    return String(
      user.chiHoiId,
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
    return String(
      hoiVien.chiHoiId,
    );
  }

  return null;
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

    await connectDB();

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const namHoc =
      searchParams
        .get(
          "namHoc",
        )
        ?.trim() ||
      "";

    const hocKy =
      searchParams
        .get(
          "hocKy",
        )
        ?.trim() ||
      "";

    const trangThai =
      searchParams
        .get(
          "trangThai",
        )
        ?.trim() ||
      "";

    const chiHoiIdParam =
      searchParams
        .get(
          "chiHoiId",
        )
        ?.trim() ||
      "";

    const filter:
      Record<
        string,
        unknown
      > = {};

    if (
      namHoc
    ) {
      filter.namHoc =
        namHoc;
    }

    if (
      hocKy
    ) {
      filter.hocKy =
        hocKy;
    }

    if (
      trangThai
    ) {
      if (
        !TRANG_THAI.includes(
          trangThai,
        )
      ) {
        return errorResponse(
          "Trạng thái không hợp lệ",
        );
      }

      filter.trangThai =
        trangThai;
    }

    /* =====================================================
       HOI VIEN
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
            "_id",
          )
          .lean();

      if (!hoiVien) {
        return errorResponse(
          "Tài khoản chưa liên kết với hồ sơ Hội viên",
          404,
        );
      }

      filter.hoiVienId =
        hoiVien._id;
    }

    /* =====================================================
       CHI HOI TRUONG
    ===================================================== */

    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      const ownChiHoiId =
        await getChiHoiIdCuaCHT(
          session.userId,
        );

      if (
        !ownChiHoiId
      ) {
        return errorResponse(
          "Tài khoản chưa liên kết với Chi hội",
          403,
        );
      }

      filter.chiHoiId =
        new Types.ObjectId(
          ownChiHoiId,
        );
    }

    /* =====================================================
       ADMIN / BCH FILTER CHI HOI
    ===================================================== */

    if (
      (
        session.role ===
          "ADMIN" ||
        session.role ===
          "BAN_CHAP_HANH"
      ) &&
      chiHoiIdParam
    ) {
      if (
        !Types.ObjectId.isValid(
          chiHoiIdParam,
        )
      ) {
        return errorResponse(
          "Chi hội không hợp lệ",
        );
      }

      filter.chiHoiId =
        new Types.ObjectId(
          chiHoiIdParam,
        );
    }

    const danhSach =
      await DiemRenLuyen.find(
        filter,
      )
        .populate(
          "hoiVienId",

          "maHoiVien hoTen lop khoaHoc trangThai",
        )
        .populate(
          "chiHoiId",

          "maChiHoi tenChiHoi",
        )
        .populate(
          "nguoiDeXuatId",

          "username fullName role",
        )
        .populate(
          "nguoiDuyetId",

          "username fullName role",
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

    const daDuyet =
      danhSach.filter(
        (
          item,
        ) =>
          item.trangThai ===
          "DA_DUYET",
      );

    const tongDiem =
      daDuyet.reduce(
        (
          total,
          item,
        ) =>
          total +
          Number(
            item.diem ||
              0,
          ),
        0,
      );

    const diemTrungBinh =
      daDuyet.length >
      0
        ? Number(
            (
              tongDiem /
              daDuyet.length
            ).toFixed(
              2,
            ),
          )
        : 0;

    return NextResponse.json({
      success:
        true,

      message:
        "Lấy danh sách điểm rèn luyện thành công",

      data: {
        danhSach,

        thongKe: {
          tongSo:
            danhSach.length,

          choDuyet:
            danhSach.filter(
              (
                item,
              ) =>
                item.trangThai ===
                "CHO_DUYET",
            ).length,

          daDuyet:
            daDuyet.length,

          tuChoi:
            danhSach.filter(
              (
                item,
              ) =>
                item.trangThai ===
                "TU_CHOI",
            ).length,

          diemTrungBinh,
        },
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/diem-ren-luyen:",
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
            : "Không thể lấy dữ liệu điểm rèn luyện",
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
      ![
        "ADMIN",
        "BAN_CHAP_HANH",
        "CHI_HOI_TRUONG",
      ].includes(
        session.role,
      )
    ) {
      return errorResponse(
        "Bạn không có quyền nhập điểm rèn luyện",
        403,
      );
    }

    await connectDB();

    const body =
      await request.json() as
        Record<
          string,
          unknown
        >;

    const hoiVienId =
      getString(
        body.hoiVienId,
      );

    const hocKy =
      getString(
        body.hocKy,
      );

    const namHoc =
      getString(
        body.namHoc,
      );

    const xepLoai =
      getString(
        body.xepLoai,
      );

    const nhanXet =
      getString(
        body.nhanXet,
      );

    const diem =
      Number(
        body.diem,
      );

    if (
      !Types.ObjectId.isValid(
        hoiVienId,
      )
    ) {
      return errorResponse(
        "Hội viên không hợp lệ",
      );
    }

    if (
      !hocKy
    ) {
      return errorResponse(
        "Vui lòng nhập học kỳ",
      );
    }

    if (
      !namHoc
    ) {
      return errorResponse(
        "Vui lòng nhập năm học",
      );
    }

    if (
      !Number.isFinite(
        diem,
      ) ||
      diem <
        0 ||
      diem >
        100
    ) {
      return errorResponse(
        "Điểm rèn luyện phải từ 0 đến 100",
      );
    }

    if (
      !XEP_LOAI.includes(
        xepLoai,
      )
    ) {
      return errorResponse(
        "Xếp loại không hợp lệ",
      );
    }

    const hoiVien =
      await HoiVien.findById(
        hoiVienId,
      )
        .select(
          "_id maHoiVien hoTen chiHoiId",
        )
        .lean();

    if (!hoiVien) {
      return errorResponse(
        "Không tìm thấy Hội viên",
        404,
      );
    }

    if (
      !hoiVien.chiHoiId
    ) {
      return errorResponse(
        "Hội viên chưa thuộc Chi hội",
      );
    }

    /*
     * CHT chỉ được nhập cho
     * Hội viên Chi hội mình.
     */
    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      const ownChiHoiId =
        await getChiHoiIdCuaCHT(
          session.userId,
        );

      if (
        !ownChiHoiId ||
        String(
          hoiVien.chiHoiId,
        ) !==
          ownChiHoiId
      ) {
        return errorResponse(
          "Bạn chỉ được đề xuất điểm cho Hội viên thuộc Chi hội mình",
          403,
        );
      }
    }

    const existing =
      await DiemRenLuyen.findOne({
        hoiVienId:
          new Types.ObjectId(
            hoiVienId,
          ),

        hocKy,

        namHoc,
      });

    if (existing) {
      return errorResponse(
        "Hội viên đã có điểm rèn luyện trong học kỳ này",
        409,
      );
    }

    const isApprover =
      session.role ===
        "ADMIN" ||
      session.role ===
        "BAN_CHAP_HANH";

    const item =
      await DiemRenLuyen.create({
        hoiVienId:
          new Types.ObjectId(
            hoiVienId,
          ),

        chiHoiId:
          hoiVien.chiHoiId,

        hocKy,

        namHoc,

        diem,

        xepLoai: xepLoai as XepLoaiRenLuyen,

        nhanXet,

        trangThai:
          isApprover
            ? "DA_DUYET"
            : "CHO_DUYET",

        nguoiDeXuatId:
          new Types.ObjectId(
            session.userId,
          ),

        nguoiDuyetId:
          isApprover
            ? new Types.ObjectId(
                session.userId,
              )
            : null,

        ngayDuyet:
          isApprover
            ? new Date()
            : null,

        lyDoTuChoi:
          "",
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
        `Tạo điểm rèn luyện ${diem} cho Hội viên ${hoiVien.hoTen}`,

      targetId:
        String(
          item._id,
        ),

      targetName:
        hoiVien.hoTen,

      metadata: {
        hoiVienId,

        hocKy,

        namHoc,

        diem,

        xepLoai,
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
          isApprover
            ? "Đã ghi nhận điểm rèn luyện"
            : "Đã gửi đề xuất điểm rèn luyện chờ duyệt",

        data:
          item,
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
      "POST /api/diem-ren-luyen:",
      error,
    );

    if (
      error &&
      typeof error ===
        "object" &&
      "code" in
        error &&
      error.code ===
        11000
    ) {
      return errorResponse(
        "Hội viên đã có điểm rèn luyện trong học kỳ này",
        409,
      );
    }

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof
          Error
            ? error.message
            : "Không thể lưu điểm rèn luyện",
      },
      {
        status:
          500,
      },
    );
  }
}
