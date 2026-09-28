import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import ChiHoi from "@/models/ChiHoi";
import DangKyHoatDong from "@/models/DangKyHoatDong";
import HoatDong from "@/models/HoatDong";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const VAI_TRO_QUAN_LY = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const TRANG_THAI_DUOC_DANG_KY = [
  "DA_DUYET",
  "SAP_DIEN_RA",
];

const TRANG_THAI_DANG_KY_HOP_LE = [
  "DA_DANG_KY",
  "DA_THAM_GIA",
  "VANG_MAT",
];

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function cungObjectId(
  valueA: mongoose.Types.ObjectId | string | null | undefined,
  valueB: mongoose.Types.ObjectId | string | null | undefined
) {
  if (!valueA || !valueB) return false;

  return String(valueA) === String(valueB);
}

async function timHoiVienCuaTaiKhoan(
  userId: string,
  username?: string
) {
  const dieuKien: Record<string, unknown>[] = [
    { userId },
    { taiKhoanId: userId },
    { accountId: userId },
  ];

  if (username) {
    dieuKien.push({
      taiKhoan: username.trim().toLowerCase(),
    });

    dieuKien.push({
      username: username.trim().toLowerCase(),
    });
  }

  return HoiVien.findOne({
    $or: dieuKien,
  });
}

async function populateDangKy(query: ReturnType<typeof DangKyHoatDong.find>) {
  return query
    .populate({
      path: "hoiVienId",
      model: HoiVien,
      select:
        "maHoiVien hoTen gioiTinh lop khoaHoc soDienThoai email chiHoiId trangThai",
      populate: {
        path: "chiHoiId",
        model: ChiHoi,
        select: "maChiHoi tenChiHoi",
      },
    })
    .populate({
      path: "hoatDongId",
      model: HoatDong,
      select:
        "maHoatDong tenHoatDong trangThai thoiGianBatDau thoiGianKetThuc",
    })
    .populate({
      path: "nguoiCapNhatId",
      model: User,
      select: "username fullName role",
    })
    .sort({
      thoiGianDangKy: -1,
      createdAt: -1,
    })
    .lean();
}

/**
 * GET
 *
 * ADMIN/BAN_CHAP_HANH/CHI_HOI_TRUONG:
 * - Lấy toàn bộ người đăng ký của hoạt động.
 *
 * HOI_VIEN:
 * - Chỉ lấy trạng thái đăng ký của chính Hội viên.
 */
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn",
        },
        401
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return json(
        {
          success: false,
          message: "Mã hoạt động không hợp lệ",
        },
        400
      );
    }

    await connectDB();

    const hoatDong = await HoatDong.findById(id)
      .select(
        "maHoatDong tenHoatDong trangThai phamVi chiHoiId thoiGianBatDau thoiGianKetThuc hanDangKy soLuongToiDa"
      )
      .lean();

    if (!hoatDong) {
      return json(
        {
          success: false,
          message: "Không tìm thấy hoạt động",
        },
        404
      );
    }

    /*
     * Hội viên chỉ được xem đăng ký của chính mình.
     */
    if (session.role === "HOI_VIEN") {
      const hoiVien = await timHoiVienCuaTaiKhoan(
        session.userId,
        session.username
      );

      if (!hoiVien) {
        return json(
          {
            success: false,
            message:
              "Tài khoản chưa được liên kết với hồ sơ Hội viên",
          },
          404
        );
      }

      const danhSach = await populateDangKy(
        DangKyHoatDong.find({
          hoatDongId: id,
          hoiVienId: hoiVien._id,
        })
      );

      const dangKy = danhSach.length > 0 ? danhSach[0] : null;

      return json({
        success: true,
        message: dangKy
          ? "Lấy trạng thái đăng ký thành công"
          : "Hội viên chưa đăng ký hoạt động",
        data: danhSach,
        registration: dangKy,
        daDangKy: Boolean(
          dangKy &&
            dangKy.trangThai !== "DA_HUY"
        ),
        total: danhSach.length,
      });
    }

    /*
     * Chỉ các vai trò quản lý được xem toàn bộ người đăng ký.
     */
    if (!VAI_TRO_QUAN_LY.includes(session.role)) {
      return json(
        {
          success: false,
          message:
            "Bạn không có quyền xem danh sách người tham gia",
        },
        403
      );
    }

    const danhSach = await populateDangKy(
      DangKyHoatDong.find({
        hoatDongId: id,
      })
    );

    const thongKe = {
      tongDangKy: danhSach.length,
      daDangKy: danhSach.filter(
        (item) => item.trangThai === "DA_DANG_KY"
      ).length,
      daThamGia: danhSach.filter(
        (item) => item.trangThai === "DA_THAM_GIA"
      ).length,
      vangMat: danhSach.filter(
        (item) => item.trangThai === "VANG_MAT"
      ).length,
      daHuy: danhSach.filter(
        (item) => item.trangThai === "DA_HUY"
      ).length,
    };

    return json({
      success: true,
      message: "Lấy danh sách người tham gia thành công",
      data: danhSach,
      total: danhSach.length,
      thongKe,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách đăng ký hoạt động:", error);

    return json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi lấy danh sách người tham gia",
      },
      500
    );
  }
}

/**
 * POST
 *
 * Hội viên tự đăng ký tham gia hoạt động.
 */
export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn",
        },
        401
      );
    }

    if (session.role !== "HOI_VIEN") {
      return json(
        {
          success: false,
          message:
            "Chỉ tài khoản Hội viên mới có thể đăng ký hoạt động",
        },
        403
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return json(
        {
          success: false,
          message: "Mã hoạt động không hợp lệ",
        },
        400
      );
    }

    await connectDB();

    const [hoatDong, user, hoiVien] = await Promise.all([
      HoatDong.findById(id),
      User.findById(session.userId).select(
        "username fullName role isActive"
      ),
      timHoiVienCuaTaiKhoan(
        session.userId,
        session.username
      ),
    ]);

    if (!user) {
      return json(
        {
          success: false,
          message: "Không tìm thấy tài khoản đăng nhập",
        },
        404
      );
    }

    if (user.isActive === false) {
      return json(
        {
          success: false,
          message:
            "Tài khoản đã bị ngừng hoạt động, không thể đăng ký",
        },
        403
      );
    }

    if (!hoiVien) {
      return json(
        {
          success: false,
          message:
            "Tài khoản chưa được liên kết với hồ sơ Hội viên",
        },
        404
      );
    }

    if (!hoatDong) {
      return json(
        {
          success: false,
          message: "Không tìm thấy hoạt động",
        },
        404
      );
    }

    /*
     * Kiểm tra trạng thái hồ sơ Hội viên.
     */
    if (
      hoiVien.trangThai &&
      ["TAM_NGUNG", "NGUNG_HOAT_DONG", "DA_XOA"].includes(
        String(hoiVien.trangThai)
      )
    ) {
      return json(
        {
          success: false,
          message:
            "Hội viên đang tạm ngừng hoạt động, không thể đăng ký",
        },
        403
      );
    }

    /*
     * Chỉ hoạt động đã duyệt hoặc sắp diễn ra mới được đăng ký.
     */
    if (
      !TRANG_THAI_DUOC_DANG_KY.includes(
        hoatDong.trangThai
      )
    ) {
      let message =
        "Hoạt động chưa mở đăng ký";

      if (hoatDong.trangThai === "CHO_DUYET") {
        message = "Hoạt động đang chờ phê duyệt";
      }

      if (hoatDong.trangThai === "DANG_DIEN_RA") {
        message =
          "Hoạt động đã bắt đầu, không thể đăng ký thêm";
      }

      if (hoatDong.trangThai === "DA_KET_THUC") {
        message =
          "Hoạt động đã kết thúc, không thể đăng ký";
      }

      if (hoatDong.trangThai === "DA_HUY") {
        message = "Hoạt động đã bị hủy";
      }

      return json(
        {
          success: false,
          message,
        },
        400
      );
    }

    const hienTai = new Date();

    if (
      hoatDong.hanDangKy &&
      hienTai.getTime() >
        new Date(hoatDong.hanDangKy).getTime()
    ) {
      return json(
        {
          success: false,
          message: "Đã hết hạn đăng ký hoạt động",
        },
        400
      );
    }

    if (
      hoatDong.thoiGianBatDau &&
      hienTai.getTime() >=
        new Date(hoatDong.thoiGianBatDau).getTime()
    ) {
      return json(
        {
          success: false,
          message:
            "Hoạt động đã bắt đầu, không thể đăng ký",
        },
        400
      );
    }

    /*
     * Nếu hoạt động thuộc phạm vi Chi hội,
     * Hội viên phải thuộc đúng Chi hội đó.
     */
    if (
      hoatDong.phamVi === "CHI_HOI" &&
      hoatDong.chiHoiId &&
      !cungObjectId(
        hoiVien.chiHoiId,
        hoatDong.chiHoiId
      )
    ) {
      return json(
        {
          success: false,
          message:
            "Hoạt động này chỉ dành cho Hội viên thuộc Chi hội tổ chức",
        },
        403
      );
    }

    const dangKyCu = await DangKyHoatDong.findOne({
      hoatDongId: hoatDong._id,
      hoiVienId: hoiVien._id,
    });

    /*
     * Không cho đăng ký trùng nếu bản ghi đang hoạt động.
     */
    if (
      dangKyCu &&
      TRANG_THAI_DANG_KY_HOP_LE.includes(
        dangKyCu.trangThai
      )
    ) {
      return json(
        {
          success: false,
          message:
            "Bạn đã đăng ký hoạt động này trước đó",
          data: dangKyCu,
        },
        409
      );
    }

    /*
     * Kiểm tra số lượng tối đa.
     * Không tính những người đã hủy.
     */
    if (
      hoatDong.soLuongToiDa &&
      hoatDong.soLuongToiDa > 0
    ) {
      const soLuongDaDangKy =
        await DangKyHoatDong.countDocuments({
          hoatDongId: hoatDong._id,
          trangThai: {
            $ne: "DA_HUY",
          },
        });

      if (soLuongDaDangKy >= hoatDong.soLuongToiDa) {
        return json(
          {
            success: false,
            message:
              "Hoạt động đã đủ số lượng người tham gia",
          },
          409
        );
      }
    }

    let dangKy;

    /*
     * Nếu trước đó đã hủy, cho phép đăng ký lại
     * bằng cách tái sử dụng bản ghi cũ.
     */
    if (dangKyCu && dangKyCu.trangThai === "DA_HUY") {
      dangKyCu.trangThai = "DA_DANG_KY";
      dangKyCu.thoiGianDangKy = new Date();
      dangKyCu.thoiGianHuy = null;
      dangKyCu.lyDoHuy = "";
      dangKyCu.nguoiCapNhatId = user._id;

      dangKy = await dangKyCu.save();
    } else {
      dangKy = await DangKyHoatDong.create({
        hoatDongId: hoatDong._id,
        hoiVienId: hoiVien._id,
        trangThai: "DA_DANG_KY",
        thoiGianDangKy: new Date(),
        nguoiCapNhatId: user._id,
      });
    }

    const ketQua = await populateDangKy(
      DangKyHoatDong.find({
        _id: dangKy._id,
      })
    );

    return json(
      {
        success: true,
        message: "Đăng ký tham gia hoạt động thành công",
        data: ketQua[0] || dangKy,
      },
      201
    );
  } catch (error) {
    console.error("Lỗi đăng ký hoạt động:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return json(
        {
          success: false,
          message:
            "Bạn đã đăng ký hoạt động này trước đó",
        },
        409
      );
    }

    return json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi đăng ký hoạt động",
      },
      500
    );
  }
}

/**
 * DELETE
 *
 * Hội viên hủy đăng ký của chính mình.
 * Không xóa bản ghi khỏi database để giữ lịch sử.
 */
export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn",
        },
        401
      );
    }

    if (session.role !== "HOI_VIEN") {
      return json(
        {
          success: false,
          message:
            "Chỉ Hội viên mới có thể hủy đăng ký của mình",
        },
        403
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return json(
        {
          success: false,
          message: "Mã hoạt động không hợp lệ",
        },
        400
      );
    }

    await connectDB();

    const [hoatDong, hoiVien] = await Promise.all([
      HoatDong.findById(id),
      timHoiVienCuaTaiKhoan(
        session.userId,
        session.username
      ),
    ]);

    if (!hoiVien) {
      return json(
        {
          success: false,
          message:
            "Tài khoản chưa được liên kết với hồ sơ Hội viên",
        },
        404
      );
    }

    if (!hoatDong) {
      return json(
        {
          success: false,
          message: "Không tìm thấy hoạt động",
        },
        404
      );
    }

    /*
     * Không cho hủy khi hoạt động đã bắt đầu,
     * đã kết thúc hoặc đã bị hủy.
     */
    if (
      ["DANG_DIEN_RA", "DA_KET_THUC", "DA_HUY"].includes(
        hoatDong.trangThai
      )
    ) {
      return json(
        {
          success: false,
          message:
            "Không thể hủy đăng ký ở trạng thái hiện tại của hoạt động",
        },
        400
      );
    }

    if (
      hoatDong.thoiGianBatDau &&
      new Date().getTime() >=
        new Date(hoatDong.thoiGianBatDau).getTime()
    ) {
      return json(
        {
          success: false,
          message:
            "Hoạt động đã bắt đầu, không thể hủy đăng ký",
        },
        400
      );
    }

    const dangKy = await DangKyHoatDong.findOne({
      hoatDongId: hoatDong._id,
      hoiVienId: hoiVien._id,
      trangThai: {
        $ne: "DA_HUY",
      },
    });

    if (!dangKy) {
      return json(
        {
          success: false,
          message:
            "Bạn chưa đăng ký hoặc đã hủy hoạt động này",
        },
        404
      );
    }

    /*
     * Nếu đã được điểm danh thì không cho hủy.
     */
    if (
      ["DA_THAM_GIA", "VANG_MAT"].includes(
        dangKy.trangThai
      )
    ) {
      return json(
        {
          success: false,
          message:
            "Hoạt động đã được điểm danh, không thể hủy đăng ký",
        },
        400
      );
    }

    let lyDoHuy = "Hội viên tự hủy đăng ký";

    try {
      const body = await request.json();

      if (
        typeof body.lyDoHuy === "string" &&
        body.lyDoHuy.trim()
      ) {
        lyDoHuy = body.lyDoHuy.trim();
      }
    } catch {
      // DELETE có thể không gửi body.
    }

    dangKy.trangThai = "DA_HUY";
    dangKy.thoiGianHuy = new Date();
    dangKy.lyDoHuy = lyDoHuy;
    dangKy.nguoiCapNhatId = new mongoose.Types.ObjectId(session.userId);

    await dangKy.save();

    return json({
      success: true,
      message: "Hủy đăng ký hoạt động thành công",
      data: dangKy,
    });
  } catch (error) {
    console.error("Lỗi hủy đăng ký hoạt động:", error);

    return json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi hủy đăng ký hoạt động",
      },
      500
    );
  }
}