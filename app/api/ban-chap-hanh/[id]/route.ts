import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession as getSession } from "@/lib/session";
import BanChapHanh from "@/models/BanChapHanh";
import ChiHoi from "@/models/ChiHoi";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const ALLOWED_STATUS = [
  "DANG_DUONG_NHIEM",
  "DA_KET_THUC",
] as const;

async function checkAdmin() {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      ),
    };
  }

  if (session.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền thực hiện thao tác này",
        },
        {
          status: 403,
        },
      ),
    };
  }

  return {
    session,
  };
}

function validateObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const authorization = await checkAdmin();

    if (authorization.error) {
      return authorization.error;
    }

    const { id } = await context.params;

    if (!validateObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Ban Chấp hành không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const member = await BanChapHanh.findById(id)
      .populate({
        path: "hoiVienId",
        model: HoiVien,
        select:
          "maHoiVien hoTen ngaySinh gioiTinh email soDienThoai lop khoaHoc diaChi chiHoiId taiKhoanId trangThai",
      })
      .populate({
        path: "chiHoiId",
        model: ChiHoi,
        select: "maChiHoi tenChiHoi",
      })
      .populate({
        path: "taiKhoanId",
        model: User,
        select: "username fullName role isActive",
      })
      .lean();

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy thành viên Ban Chấp hành",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Lấy thông tin thành viên Ban Chấp hành thành công",
        data: member,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Lỗi lấy thông tin thành viên Ban Chấp hành:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi lấy thông tin Ban Chấp hành",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const authorization = await checkAdmin();

    if (authorization.error) {
      return authorization.error;
    }

    const { id } = await context.params;

    if (!validateObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Ban Chấp hành không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();

    const maBanChapHanh =
      typeof body.maBanChapHanh === "string"
        ? body.maBanChapHanh.trim().toUpperCase()
        : "";

    const hoiVienId =
      typeof body.hoiVienId === "string"
        ? body.hoiVienId.trim()
        : "";

    const chiHoiId =
      typeof body.chiHoiId === "string"
        ? body.chiHoiId.trim()
        : "";

    const chucVu =
      typeof body.chucVu === "string"
        ? body.chucVu.trim()
        : "";

    const nhiemKy =
      typeof body.nhiemKy === "string"
        ? body.nhiemKy.trim()
        : "";

    const ngayBatDau =
      typeof body.ngayBatDau === "string"
        ? body.ngayBatDau.trim()
        : "";

    const ngayKetThuc =
      typeof body.ngayKetThuc === "string"
        ? body.ngayKetThuc.trim()
        : "";

    const trangThai =
      typeof body.trangThai === "string"
        ? body.trangThai.trim()
        : "DANG_DUONG_NHIEM";

    if (!maBanChapHanh) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Ban Chấp hành không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (!validateObjectId(hoiVienId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Hội viên không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (!validateObjectId(chiHoiId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Chi hội không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (!chucVu) {
      return NextResponse.json(
        {
          success: false,
          message: "Chức vụ không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (!nhiemKy) {
      return NextResponse.json(
        {
          success: false,
          message: "Nhiệm kỳ không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (!ngayBatDau) {
      return NextResponse.json(
        {
          success: false,
          message: "Ngày bắt đầu không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !ALLOWED_STATUS.includes(
        trangThai as (typeof ALLOWED_STATUS)[number],
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Trạng thái không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const parsedStartDate = new Date(ngayBatDau);

    if (Number.isNaN(parsedStartDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Ngày bắt đầu không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    let parsedEndDate: Date | null = null;

    if (ngayKetThuc) {
      parsedEndDate = new Date(ngayKetThuc);

      if (Number.isNaN(parsedEndDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            message: "Ngày kết thúc không hợp lệ",
          },
          {
            status: 400,
          },
        );
      }

      if (parsedEndDate < parsedStartDate) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Ngày kết thúc không được nhỏ hơn ngày bắt đầu",
          },
          {
            status: 400,
          },
        );
      }
    }

    if (
      trangThai === "DA_KET_THUC" &&
      !parsedEndDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng nhập ngày kết thúc khi nhiệm kỳ đã kết thúc",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const [currentMember, selectedMember, selectedBranch] =
      await Promise.all([
        BanChapHanh.findById(id)
          .select(
            "_id maBanChapHanh hoiVienId taiKhoanId trangThai",
          )
          .lean(),

        HoiVien.findById(hoiVienId)
          .select(
            "_id maHoiVien hoTen chiHoiId taiKhoanId trangThai",
          )
          .lean(),

        ChiHoi.findById(chiHoiId)
          .select("_id maChiHoi tenChiHoi")
          .lean(),
      ]);

    if (!currentMember) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy thành viên Ban Chấp hành",
        },
        {
          status: 404,
        },
      );
    }

    if (!selectedMember) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Hội viên",
        },
        {
          status: 404,
        },
      );
    }

    if (selectedMember.trangThai !== "DANG_HOAT_DONG") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể bổ nhiệm Hội viên đang tạm ngừng hoạt động",
        },
        {
          status: 400,
        },
      );
    }

    if (!selectedBranch) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Chi hội",
        },
        {
          status: 404,
        },
      );
    }

    if (String(selectedMember.chiHoiId) !== chiHoiId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hội viên không thuộc Chi hội đã được lựa chọn",
        },
        {
          status: 400,
        },
      );
    }

    const [duplicatedCode, duplicatedAppointment] =
      await Promise.all([
        BanChapHanh.findOne({
          _id: {
            $ne: id,
          },
          maBanChapHanh,
        })
          .select("_id")
          .lean(),

        BanChapHanh.findOne({
          _id: {
            $ne: id,
          },
          hoiVienId,
          nhiemKy,
        })
          .select("_id")
          .lean(),
      ]);

    if (duplicatedCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Ban Chấp hành đã tồn tại",
        },
        {
          status: 409,
        },
      );
    }

    if (duplicatedAppointment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hội viên đã có trong Ban Chấp hành của nhiệm kỳ này",
        },
        {
          status: 409,
        },
      );
    }

    const updatedMember = await BanChapHanh.findByIdAndUpdate(
      id,
      {
        $set: {
          maBanChapHanh,
          hoiVienId,
          chiHoiId,
          chucVu,
          nhiemKy,
          ngayBatDau: parsedStartDate,
          ngayKetThuc: parsedEndDate,
          taiKhoanId: selectedMember.taiKhoanId || null,
          trangThai,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate({
        path: "hoiVienId",
        model: HoiVien,
        select:
          "maHoiVien hoTen ngaySinh gioiTinh email soDienThoai lop khoaHoc diaChi chiHoiId taiKhoanId trangThai",
      })
      .populate({
        path: "chiHoiId",
        model: ChiHoi,
        select: "maChiHoi tenChiHoi",
      })
      .populate({
        path: "taiKhoanId",
        model: User,
        select: "username fullName role isActive",
      });

    if (!updatedMember) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể cập nhật thành viên Ban Chấp hành",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Nếu nhiệm kỳ đã kết thúc và tài khoản hiện có vai trò
     * BAN_CHAP_HANH thì chuyển lại thành HOI_VIEN.
     */
    if (
      trangThai === "DA_KET_THUC" &&
      selectedMember.taiKhoanId
    ) {
      await User.updateOne(
        {
          _id: selectedMember.taiKhoanId,
          role: "BAN_CHAP_HANH",
        },
        {
          $set: {
            role: "HOI_VIEN",
          },
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Cập nhật thành viên Ban Chấp hành thành công",
        data: updatedMember,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Lỗi cập nhật thành viên Ban Chấp hành:",
      error,
    );

    if (
      error instanceof Error &&
      error.name === "ValidationError"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: 400,
        },
      );
    }

    if (
      error instanceof Error &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Ban Chấp hành đã tồn tại",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi cập nhật Ban Chấp hành",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const authorization = await checkAdmin();

    if (authorization.error) {
      return authorization.error;
    }

    const { id } = await context.params;

    if (!validateObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Ban Chấp hành không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const member = await BanChapHanh.findById(id)
      .select(
        "_id maBanChapHanh hoiVienId taiKhoanId chucVu nhiemKy",
      )
      .lean();

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy thành viên Ban Chấp hành",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Xóa bản ghi Ban Chấp hành nhưng không xóa Hội viên
     * và không xóa tài khoản của Hội viên.
     */
    await BanChapHanh.deleteOne({
      _id: id,
    });

    /*
     * Nếu tài khoản đang mang vai trò Ban Chấp hành,
     * chuyển tài khoản về vai trò Hội viên.
     */
    if (member.taiKhoanId) {
      await User.updateOne(
        {
          _id: member.taiKhoanId,
          role: "BAN_CHAP_HANH",
        },
        {
          $set: {
            role: "HOI_VIEN",
          },
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Xóa thành viên Ban Chấp hành ${member.maBanChapHanh} thành công`,
        data: {
          deletedId: id,
          hoiVienId: member.hoiVienId,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Lỗi xóa thành viên Ban Chấp hành:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Đã xảy ra lỗi khi xóa Ban Chấp hành",
      },
      {
        status: 500,
      },
    );
  }
}