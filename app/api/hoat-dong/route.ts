import mongoose, {
  QueryFilter,
  Types,
} from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import ChiHoi from "@/models/ChiHoi";
import HoatDong, {
  IHoatDong,
} from "@/models/HoatDong";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

type PhamViHoatDong =
  | "LIEN_CHI_HOI"
  | "CHI_HOI";

type CreateHoatDongBody = {
  maHoatDong?: string;
  tenHoatDong?: string;
  moTa?: string;
  noiDung?: string;

  phamVi?: PhamViHoatDong;
  chiHoiId?: string;

  donViToChuc?: string;
  diaDiem?: string;

  thoiGianBatDau?: string;
  thoiGianKetThuc?: string;
  hanDangKy?: string;

  soLuongToiDa?: number | string;
};

const VAI_TRO_DUOC_TAO = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const VAI_TRO_QUAN_LY = [
  "ADMIN",
  "BAN_CHAP_HANH",
];

const PHAM_VI_HOP_LE = [
  "LIEN_CHI_HOI",
  "CHI_HOI",
];

const TRANG_THAI_HOP_LE = [
  "CHO_DUYET",
  "DA_DUYET",
  "SAP_DIEN_RA",
  "DANG_DIEN_RA",
  "DA_KET_THUC",
  "DA_HUY",
];

const TRANG_THAI_CONG_KHAI: IHoatDong["trangThai"][] = [
  "DA_DUYET",
  "SAP_DIEN_RA",
  "DANG_DIEN_RA",
  "DA_KET_THUC",
];

function layChuoi(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function escapeRegExp(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function layThongBaoLoi(
  error: unknown
) {
  if (
    error instanceof
    mongoose.Error.ValidationError
  ) {
    const loiDauTien = Object.values(
      error.errors
    )[0];

    return (
      loiDauTien?.message ||
      "Dữ liệu hoạt động không hợp lệ"
    );
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === 11000
  ) {
    return "Mã hoạt động đã tồn tại";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Đã xảy ra lỗi không xác định";
}

function laLoiTrungDuLieu(
  error: unknown
) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
  );
}

/* =====================================================
   GET: LẤY DANH SÁCH HOẠT ĐỘNG
===================================================== */

export async function GET(
  request: Request
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(
      request.url
    );

    const search =
      searchParams.get("search")?.trim() ||
      "";

    const phamVi =
      searchParams.get("phamVi")?.trim() ||
      "";

    const trangThai =
      searchParams
        .get("trangThai")
        ?.trim() || "";

    const chiHoiId =
      searchParams
        .get("chiHoiId")
        ?.trim() || "";

    const dieuKien: QueryFilter<IHoatDong>[] =
      [];

    /*
     * Tìm kiếm theo mã, tên, mô tả,
     * đơn vị tổ chức hoặc địa điểm.
     */
    if (search) {
      const keyword = new RegExp(
        escapeRegExp(search),
        "i"
      );

      dieuKien.push({
        $or: [
          { maHoatDong: keyword },
          { tenHoatDong: keyword },
          { moTa: keyword },
          { donViToChuc: keyword },
          { diaDiem: keyword },
        ],
      });
    }

    if (
      phamVi &&
      PHAM_VI_HOP_LE.includes(phamVi)
    ) {
      dieuKien.push({
        phamVi:
          phamVi as PhamViHoatDong,
      });
    }

    if (
      trangThai &&
      TRANG_THAI_HOP_LE.includes(
        trangThai
      )
    ) {
      dieuKien.push({
        trangThai:
          trangThai as IHoatDong["trangThai"],
      });
    }

    if (chiHoiId) {
      if (
        !Types.ObjectId.isValid(
          chiHoiId
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Mã Chi hội lọc không hợp lệ",
          },
          { status: 400 }
        );
      }

      dieuKien.push({
        chiHoiId:
          new Types.ObjectId(chiHoiId),
      });
    }

    /*
     * Hội viên thường chỉ được xem
     * những hoạt động đã công khai.
     */
    if (
      !VAI_TRO_QUAN_LY.includes(
        session.role
      ) &&
      session.role !==
        "CHI_HOI_TRUONG"
    ) {
      dieuKien.push({
        trangThai: {
          $in: TRANG_THAI_CONG_KHAI,
        },
      });
    }

    /*
     * Chi hội trưởng và Hội viên chỉ xem:
     * - Hoạt động toàn Liên Chi hội.
     * - Hoạt động thuộc Chi hội mình.
     */
    if (
      session.role ===
        "CHI_HOI_TRUONG" ||
      session.role === "HOI_VIEN"
    ) {
      const hoiVien =
        await HoiVien.findOne({
          taiKhoanId: session.userId,
        }).select("chiHoiId");

      if (
        session.role ===
        "CHI_HOI_TRUONG" &&
        (!hoiVien ||
          !hoiVien.chiHoiId)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Tài khoản Chi hội trưởng chưa được liên kết với Chi hội",
          },
          { status: 403 }
        );
      }

      if (
        session.role === "HOI_VIEN"
      ) {
        dieuKien.push({
          trangThai: {
            $in: TRANG_THAI_CONG_KHAI,
          },
        });
      }

      if (hoiVien?.chiHoiId) {
        dieuKien.push({
          $or: [
            {
              phamVi:
                "LIEN_CHI_HOI",
            },
            {
              phamVi: "CHI_HOI",
              chiHoiId:
                hoiVien.chiHoiId,
            },
          ],
        });
      } else {
        dieuKien.push({
          phamVi: "LIEN_CHI_HOI",
        });
      }
    }

    const query: QueryFilter<IHoatDong> =
      dieuKien.length > 0
        ? {
            $and: dieuKien,
          }
        : {};

    const danhSach =
      await HoatDong.find(query)
        .populate({
          path: "chiHoiId",
          model: ChiHoi,
          select:
            "maChiHoi tenChiHoi",
        })
        .populate({
          path: "nguoiTaoId",
          model: User,
          select:
            "username fullName role",
        })
        .populate({
          path: "nguoiDuyetId",
          model: User,
          select:
            "username fullName role",
        })
        .sort({
          createdAt: -1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      message:
        "Lấy danh sách hoạt động thành công",
      data: danhSach,
      total: danhSach.length,
    });
  } catch (error) {
    console.error(
      "Lỗi lấy danh sách hoạt động:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          process.env.NODE_ENV ===
          "development"
            ? `Không thể lấy danh sách hoạt động: ${layThongBaoLoi(
                error
              )}`
            : "Đã xảy ra lỗi khi lấy danh sách hoạt động",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   POST: TẠO HOẠT ĐỘNG
===================================================== */

export async function POST(
  request: Request
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    if (
      !VAI_TRO_DUOC_TAO.includes(
        session.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền tạo hoạt động",
        },
        { status: 403 }
      );
    }

    if (
      !session.userId ||
      !Types.ObjectId.isValid(
        session.userId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thông tin tài khoản đăng nhập không hợp lệ",
        },
        { status: 401 }
      );
    }

    let body: CreateHoatDongBody;

    try {
      body =
        (await request.json()) as CreateHoatDongBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Dữ liệu gửi lên không hợp lệ",
        },
        { status: 400 }
      );
    }

    const maHoatDong = layChuoi(
      body.maHoatDong
    ).toUpperCase();

    const tenHoatDong = layChuoi(
      body.tenHoatDong
    );

    const moTa = layChuoi(body.moTa);

    const noiDung = layChuoi(
      body.noiDung
    );

    const phamVi = layChuoi(
      body.phamVi
    ).toUpperCase();

    let chiHoiId = layChuoi(
      body.chiHoiId
    );

    const donViToChuc = layChuoi(
      body.donViToChuc
    );

    const diaDiem = layChuoi(
      body.diaDiem
    );

    const thoiGianBatDauChuoi =
      layChuoi(body.thoiGianBatDau);

    const thoiGianKetThucChuoi =
      layChuoi(body.thoiGianKetThuc);

    const hanDangKyChuoi =
      layChuoi(body.hanDangKy);

    if (!maHoatDong) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã hoạt động không được để trống",
        },
        { status: 400 }
      );
    }

    if (!tenHoatDong) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tên hoạt động không được để trống",
        },
        { status: 400 }
      );
    }

    if (
      !PHAM_VI_HOP_LE.includes(
        phamVi
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phạm vi hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (!diaDiem) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Địa điểm không được để trống",
        },
        { status: 400 }
      );
    }

    if (
      !thoiGianBatDauChuoi ||
      !thoiGianKetThucChuoi
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng nhập thời gian bắt đầu và kết thúc",
        },
        { status: 400 }
      );
    }

    const thoiGianBatDau =
      new Date(
        thoiGianBatDauChuoi
      );

    const thoiGianKetThuc =
      new Date(
        thoiGianKetThucChuoi
      );

    const hanDangKy =
      hanDangKyChuoi
        ? new Date(hanDangKyChuoi)
        : null;

    if (
      Number.isNaN(
        thoiGianBatDau.getTime()
      ) ||
      Number.isNaN(
        thoiGianKetThuc.getTime()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thời gian hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (
      thoiGianKetThuc <=
      thoiGianBatDau
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thời gian kết thúc phải sau thời gian bắt đầu",
        },
        { status: 400 }
      );
    }

    if (
      hanDangKy &&
      Number.isNaN(
        hanDangKy.getTime()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hạn đăng ký không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (
      hanDangKy &&
      hanDangKy > thoiGianBatDau
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hạn đăng ký không được sau thời gian bắt đầu",
        },
        { status: 400 }
      );
    }

    let soLuongToiDa:
      | number
      | null = null;

    if (
      body.soLuongToiDa !==
        undefined &&
      body.soLuongToiDa !== null &&
      body.soLuongToiDa !== ""
    ) {
      soLuongToiDa = Number(
        body.soLuongToiDa
      );

      if (
        !Number.isInteger(
          soLuongToiDa
        ) ||
        soLuongToiDa <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Số lượng tối đa phải là số nguyên lớn hơn 0",
          },
          { status: 400 }
        );
      }
    }

    await connectDB();

    const hoatDongTonTai =
      await HoatDong.findOne({
        maHoatDong,
      }).select("_id");

    if (hoatDongTonTai) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã hoạt động đã tồn tại",
        },
        { status: 409 }
      );
    }

    /*
     * Kiểm tra Chi hội khi hoạt động
     * có phạm vi CHI_HOI.
     */
    if (phamVi === "CHI_HOI") {
      if (
        !chiHoiId ||
        !Types.ObjectId.isValid(
          chiHoiId
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Vui lòng chọn Chi hội hợp lệ",
          },
          { status: 400 }
        );
      }

      const chiHoi =
        await ChiHoi.findById(
          chiHoiId
        ).select("_id");

      if (!chiHoi) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Không tìm thấy Chi hội đã chọn",
          },
          { status: 404 }
        );
      }

      /*
       * Chi hội trưởng chỉ tạo hoạt động
       * thuộc Chi hội mình quản lý.
       */
      if (
        session.role ===
        "CHI_HOI_TRUONG"
      ) {
        const hoiVien =
          await HoiVien.findOne({
            taiKhoanId:
              session.userId,
          }).select("chiHoiId");

        if (
          !hoiVien ||
          !hoiVien.chiHoiId ||
          hoiVien.chiHoiId.toString() !==
            chiHoiId
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Bạn chỉ được tạo hoạt động cho Chi hội của mình",
            },
            { status: 403 }
          );
        }
      }
    } else {
      chiHoiId = "";
    }

    const laQuanTriVien =
      session.role === "ADMIN";

    const hoatDong =
      await HoatDong.create({
        maHoatDong,
        tenHoatDong,
        moTa,
        noiDung,

        phamVi:
          phamVi as PhamViHoatDong,

        chiHoiId:
          phamVi === "CHI_HOI"
            ? new Types.ObjectId(
                chiHoiId
              )
            : null,

        donViToChuc,
        diaDiem,

        thoiGianBatDau,
        thoiGianKetThuc,
        hanDangKy,
        soLuongToiDa,

        trangThai: laQuanTriVien
          ? "DA_DUYET"
          : "CHO_DUYET",

        nguoiTaoId:
          new Types.ObjectId(
            session.userId
          ),

        nguoiDuyetId:
          laQuanTriVien
            ? new Types.ObjectId(
                session.userId
              )
            : null,

        ngayDuyet: laQuanTriVien
          ? new Date()
          : null,

        lyDoHuy: "",
      });

    /*
     * Truyền model trực tiếp vào populate
     * để không còn MissingSchemaError.
     */
    const ketQua =
      await HoatDong.findById(
        hoatDong._id
      )
        .populate({
          path: "chiHoiId",
          model: ChiHoi,
          select:
            "maChiHoi tenChiHoi",
        })
        .populate({
          path: "nguoiTaoId",
          model: User,
          select:
            "username fullName role",
        })
        .populate({
          path: "nguoiDuyetId",
          model: User,
          select:
            "username fullName role",
        })
        .lean();

    return NextResponse.json(
      {
        success: true,
        message: laQuanTriVien
          ? "Tạo và phê duyệt hoạt động thành công"
          : "Tạo hoạt động thành công, đang chờ phê duyệt",
        data: ketQua,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Lỗi tạo hoạt động:",
      error
    );

    const duplicate =
      laLoiTrungDuLieu(error);

    const validation =
      error instanceof
      mongoose.Error.ValidationError;

    return NextResponse.json(
      {
        success: false,
        message: duplicate
          ? "Mã hoạt động đã tồn tại"
          : validation
            ? layThongBaoLoi(error)
            : process.env.NODE_ENV ===
                "development"
              ? `Không thể tạo hoạt động: ${layThongBaoLoi(
                  error
                )}`
              : "Đã xảy ra lỗi khi tạo hoạt động",
      },
      {
        status: duplicate
          ? 409
          : validation
            ? 400
            : 500,
      }
    );
  }
}