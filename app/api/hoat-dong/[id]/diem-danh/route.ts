import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import DangKyHoatDong from "@/models/DangKyHoatDong";
import HoatDong from "@/models/HoatDong";
import HoiVien from "@/models/HoiVien";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TrangThaiDiemDanh =
  | "DA_DANG_KY"
  | "DA_THAM_GIA"
  | "VANG_MAT";

type DiemDanhItem = {
  dangKyId?: string;
  trangThai?: TrangThaiDiemDanh;
  ghiChu?: string;
};

type DiemDanhBody = {
  dangKyId?: string;
  trangThai?: TrangThaiDiemDanh;
  ghiChu?: string;
  danhSach?: DiemDanhItem[];
};

const VAI_TRO_DUOC_DIEM_DANH = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const TRANG_THAI_HOP_LE: TrangThaiDiemDanh[] = [
  "DA_DANG_KY",
  "DA_THAM_GIA",
  "VANG_MAT",
];

function chuanHoaDanhSach(
  body: DiemDanhBody
): DiemDanhItem[] {
  if (
    Array.isArray(body.danhSach) &&
    body.danhSach.length > 0
  ) {
    return body.danhSach;
  }

  if (body.dangKyId) {
    return [
      {
        dangKyId: body.dangKyId,
        trangThai: body.trangThai,
        ghiChu: body.ghiChu,
      },
    ];
  }

  return [];
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getCurrentSession();

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
      !VAI_TRO_DUOC_DIEM_DANH.includes(
        session.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền điểm danh hoạt động",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã hoạt động không hợp lệ",
        },
        { status: 400 }
      );
    }

    const body =
      (await request.json()) as DiemDanhBody;

    const danhSachBanDau =
      chuanHoaDanhSach(body);

    if (danhSachBanDau.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng chọn Hội viên cần điểm danh",
        },
        { status: 400 }
      );
    }

    /*
     * Dùng Map để loại bỏ đăng ký bị trùng.
     */
    const danhSachMap = new Map<
      string,
      {
        dangKyId: string;
        trangThai: TrangThaiDiemDanh;
        ghiChu: string;
      }
    >();

    for (const item of danhSachBanDau) {
      const dangKyId =
        typeof item.dangKyId === "string"
          ? item.dangKyId.trim()
          : "";

      const trangThai =
        typeof item.trangThai === "string"
          ? item.trangThai.trim().toUpperCase()
          : "";

      const ghiChu =
        typeof item.ghiChu === "string"
          ? item.ghiChu.trim()
          : "";

      if (
        !dangKyId ||
        !mongoose.Types.ObjectId.isValid(
          dangKyId
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Có mã đăng ký không hợp lệ",
          },
          { status: 400 }
        );
      }

      if (
        !TRANG_THAI_HOP_LE.includes(
          trangThai as TrangThaiDiemDanh
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Trạng thái điểm danh không hợp lệ",
          },
          { status: 400 }
        );
      }

      if (ghiChu.length > 1000) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Ghi chú không được vượt quá 1000 ký tự",
          },
          { status: 400 }
        );
      }

      danhSachMap.set(dangKyId, {
        dangKyId,
        trangThai:
          trangThai as TrangThaiDiemDanh,
        ghiChu,
      });
    }

    const danhSach = Array.from(
      danhSachMap.values()
    );

    await connectDB();

    const hoatDong =
      await HoatDong.findById(id);

    if (!hoatDong) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy hoạt động",
        },
        { status: 404 }
      );
    }

    /*
     * Chỉ điểm danh khi hoạt động đang diễn ra
     * hoặc đã kết thúc.
     */
    if (
      ![
        "DANG_DIEN_RA",
        "DA_KET_THUC",
      ].includes(hoatDong.trangThai)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chỉ có thể điểm danh hoạt động đang diễn ra hoặc đã kết thúc",
        },
        { status: 409 }
      );
    }

    /*
     * Chi hội trưởng chỉ quản lý hoạt động
     * thuộc đúng Chi hội của mình.
     */
    if (
      session.role === "CHI_HOI_TRUONG"
    ) {
      const hoiVienQuanLy =
        await HoiVien.findOne({
          taiKhoanId: session.userId,
        }).select("chiHoiId");

      if (!hoiVienQuanLy) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Không tìm thấy hồ sơ Hội viên của tài khoản",
          },
          { status: 404 }
        );
      }

      if (
        hoatDong.phamVi !== "CHI_HOI" ||
        !hoatDong.chiHoiId ||
        !hoiVienQuanLy.chiHoiId ||
        hoatDong.chiHoiId.toString() !==
          hoiVienQuanLy.chiHoiId.toString()
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Bạn không có quyền điểm danh hoạt động của Chi hội này",
          },
          { status: 403 }
        );
      }
    }

    const danhSachId = danhSach.map(
      (item) => item.dangKyId
    );

    /*
     * Chỉ lấy những bản ghi thuộc đúng hoạt động.
     */
    const cacDangKy =
      await DangKyHoatDong.find({
        _id: {
          $in: danhSachId,
        },
        hoatDongId: hoatDong._id,
      });

    if (
      cacDangKy.length !==
      danhSach.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Có đăng ký không tồn tại hoặc không thuộc hoạt động này",
        },
        { status: 404 }
      );
    }

    const dangKyDaHuy =
      cacDangKy.find(
        (item) =>
          item.trangThai === "DA_HUY"
      );

    if (dangKyDaHuy) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể điểm danh Hội viên đã hủy đăng ký",
        },
        { status: 409 }
      );
    }

    const nguoiCapNhatId =
      new mongoose.Types.ObjectId(
        session.userId
      );

    const thaoTacCapNhat = danhSach.map(
      (item) => ({
        updateOne: {
          filter: {
            _id: item.dangKyId,
            hoatDongId: hoatDong._id,
            trangThai: {
              $ne: "DA_HUY" as const,
            },
          },

          update: {
            $set: {
              trangThai: item.trangThai,
              ghiChu: item.ghiChu,
              nguoiCapNhatId,
            },
          },
        },
      })
    );

    await DangKyHoatDong.bulkWrite(
      thaoTacCapNhat
    );

    const ketQua =
      await DangKyHoatDong.find({
        _id: {
          $in: danhSachId,
        },
      })
        .populate({
          path: "hoiVienId",
          select:
            "maHoiVien hoTen gioiTinh lop email soDienThoai chiHoiId",
          populate: {
            path: "chiHoiId",
            select:
              "maChiHoi tenChiHoi",
          },
        })
        .populate(
          "nguoiCapNhatId",
          "username fullName role"
        )
        .sort({
          thoiGianDangKy: 1,
        })
        .lean();

    const thongKe = {
      tongSo: ketQua.length,

      daDangKy: ketQua.filter(
        (item) =>
          item.trangThai === "DA_DANG_KY"
      ).length,

      daThamGia: ketQua.filter(
        (item) =>
          item.trangThai === "DA_THAM_GIA"
      ).length,

      vangMat: ketQua.filter(
        (item) =>
          item.trangThai === "VANG_MAT"
      ).length,
    };

    return NextResponse.json({
      success: true,
      message:
        danhSach.length === 1
          ? "Cập nhật điểm danh thành công"
          : `Điểm danh ${danhSach.length} Hội viên thành công`,
      data: ketQua,
      thongKe,
    });
  } catch (error) {
    console.error(
      "Lỗi điểm danh hoạt động:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi điểm danh hoạt động",
      },
      { status: 500 }
    );
  }
}