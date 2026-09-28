import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";
import BanChapHanh from "@/models/BanChapHanh";
import ChiHoi from "@/models/ChiHoi";
import DanhGiaBanChapHanh from "@/models/DanhGiaBanChapHanh";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

const ALLOWED_ROLES = [
  "ADMIN",
  "BAN_CHAP_HANH",
];

const STATUS_VALUES = [
  "DANG_DUONG_NHIEM",
  "DA_KET_THUC",
];

function escapeRegex(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function getObjectId(
  value: unknown
): mongoose.Types.ObjectId | null {
  if (!value) {
    return null;
  }

  if (
    value instanceof mongoose.Types.ObjectId
  ) {
    return value;
  }

  const id =
    typeof value === "object" &&
    value !== null &&
    "_id" in value
      ? String(
          (value as { _id: unknown })._id
        )
      : String(value);

  if (
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

export async function GET(request: Request) {
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
      !ALLOWED_ROLES.includes(session.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền xem danh sách Ban Chấp hành",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(
      request.url
    );

    const search =
      searchParams.get("search")?.trim() ||
      "";

    const chiHoiId =
      searchParams.get("chiHoiId")?.trim() ||
      "";

    const trangThai =
      searchParams.get("trangThai")?.trim() ||
      "";

    const query: Record<string, unknown> = {};

    if (chiHoiId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          chiHoiId
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Mã Chi hội không hợp lệ",
          },
          { status: 400 }
        );
      }

      query.chiHoiId =
        new mongoose.Types.ObjectId(
          chiHoiId
        );
    }

    if (
      trangThai &&
      STATUS_VALUES.includes(trangThai)
    ) {
      query.trangThai = trangThai;
    }

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        "i"
      );

      const [matchingHoiViens, matchingChiHois] =
        await Promise.all([
          HoiVien.find({
            $or: [
              { maHoiVien: regex },
              { hoTen: regex },
            ],
          })
            .select("_id")
            .lean(),

          ChiHoi.find({
            $or: [
              { maChiHoi: regex },
              { tenChiHoi: regex },
            ],
          })
            .select("_id")
            .lean(),
        ]);

      const hoiVienIds = matchingHoiViens.map(
        (item) => item._id
      );

      const chiHoiIds = matchingChiHois.map(
        (item) => item._id
      );

      query.$or = [
        { maBanChapHanh: regex },
        { chucVu: regex },
        { nhiemKy: regex },
        {
          hoiVienId: {
            $in: hoiVienIds,
          },
        },
        {
          chiHoiId: {
            $in: chiHoiIds,
          },
        },
      ];
    }

    /*
     * Populate hai cấp:
     *
     * BanChapHanh
     *   -> hoiVienId
     *      -> taiKhoanId
     *
     * Nhờ vậy tài khoản được cấp ở trang Hội viên
     * vẫn hiển thị chính xác tại trang Ban Chấp hành.
     */
    const banChapHanhList =
      await BanChapHanh.find(query)
        .populate({
          path: "hoiVienId",
          select:
            "maHoiVien hoTen chiHoiId taiKhoanId trangThai",

          populate: [
            {
              path: "chiHoiId",
              select:
                "maChiHoi tenChiHoi",
            },
            {
              path: "taiKhoanId",
              select:
                "username fullName role isActive",
            },
          ],
        })
        .populate({
          path: "chiHoiId",
          select:
            "maChiHoi tenChiHoi",
        })
        .populate({
          path: "taiKhoanId",
          select:
            "username fullName role isActive",
        })
        .sort({
          trangThai: 1,
          createdAt: -1,
        })
        .lean();

    const banChapHanhIds =
      banChapHanhList.map(
        (item) => item._id
      );

    const danhGiaList =
      banChapHanhIds.length > 0
        ? await DanhGiaBanChapHanh.find({
            banChapHanhId: {
              $in: banChapHanhIds,
            },
          })
            .populate({
              path: "nguoiDanhGiaId",
              select:
                "username fullName role",
            })
            .lean()
        : [];

    const danhGiaMap = new Map(
      danhGiaList.map((item) => [
        String(item.banChapHanhId),
        item,
      ])
    );

    const normalizedData =
      banChapHanhList.map((item) => {
        const hoiVien =
          item.hoiVienId &&
          typeof item.hoiVienId === "object"
            ? (item.hoiVienId as {
                taiKhoanId?: unknown;
              })
            : null;

        /*
         * Ưu tiên tài khoản lưu trực tiếp tại BCH.
         * Nếu chưa có thì lấy tài khoản từ Hội viên.
         */
        const taiKhoan =
          item.taiKhoanId ||
          hoiVien?.taiKhoanId ||
          null;

        return {
          ...item,
          taiKhoanId: taiKhoan,
          danhGia:
            danhGiaMap.get(
              String(item._id)
            ) || null,
        };
      });

    return NextResponse.json({
      success: true,
      message:
        "Lấy danh sách Ban Chấp hành thành công",
      data: normalizedData,
      total: normalizedData.length,
    });
  } catch (error) {
    console.error(
      "Lỗi lấy danh sách Ban Chấp hành:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi lấy danh sách Ban Chấp hành",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền thêm thành viên Ban Chấp hành",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const maBanChapHanh =
      typeof body.maBanChapHanh === "string"
        ? body.maBanChapHanh
            .trim()
            .toUpperCase()
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

    if (
      !maBanChapHanh ||
      !hoiVienId ||
      !chiHoiId ||
      !chucVu ||
      !nhiemKy ||
      !ngayBatDau
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng nhập đầy đủ các trường bắt buộc",
        },
        { status: 400 }
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        hoiVienId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Hội viên không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        chiHoiId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã Chi hội không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (
      !STATUS_VALUES.includes(trangThai)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trạng thái Ban Chấp hành không hợp lệ",
        },
        { status: 400 }
      );
    }

    const startDate = new Date(ngayBatDau);

    const endDate = ngayKetThuc
      ? new Date(ngayKetThuc)
      : null;

    if (
      Number.isNaN(startDate.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ngày bắt đầu không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (
      endDate &&
      Number.isNaN(endDate.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ngày kết thúc không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (
      endDate &&
      endDate < startDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ngày kết thúc không được nhỏ hơn ngày bắt đầu",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const [hoiVien, chiHoi] =
      await Promise.all([
        HoiVien.findById(hoiVienId)
          .select(
            "maHoiVien hoTen chiHoiId taiKhoanId trangThai"
          )
          .lean(),

        ChiHoi.findById(chiHoiId)
          .select(
            "maChiHoi tenChiHoi"
          )
          .lean(),
      ]);

    if (!hoiVien) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Hội viên",
        },
        { status: 404 }
      );
    }

    if (!chiHoi) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy Chi hội",
        },
        { status: 404 }
      );
    }

    if (
      String(hoiVien.chiHoiId) !==
      String(chiHoiId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hội viên không thuộc Chi hội đã chọn",
        },
        { status: 400 }
      );
    }

    if (
      hoiVien.trangThai === "TAM_NGUNG"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể thêm Hội viên đang tạm ngừng hoạt động vào Ban Chấp hành",
        },
        { status: 400 }
      );
    }

    const duplicateCode =
      await BanChapHanh.findOne({
        maBanChapHanh,
      })
        .select("_id")
        .lean();

    if (duplicateCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã Ban Chấp hành đã tồn tại",
        },
        { status: 409 }
      );
    }

    const duplicateMember =
      await BanChapHanh.findOne({
        hoiVienId,
        nhiemKy,
      })
        .select("_id")
        .lean();

    if (duplicateMember) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hội viên đã có trong Ban Chấp hành của nhiệm kỳ này",
        },
        { status: 409 }
      );
    }

    /*
     * Nếu Hội viên đã được cấp tài khoản trước đó,
     * liên kết luôn tài khoản đó với Ban Chấp hành.
     */
    const existingAccountId =
      getObjectId(hoiVien.taiKhoanId);

    const createdBanChapHanh =
      await BanChapHanh.create({
        maBanChapHanh,
        hoiVienId,
        chiHoiId,
        taiKhoanId:
          existingAccountId || null,
        chucVu,
        nhiemKy,
        ngayBatDau: startDate,
        ngayKetThuc: endDate,
        trangThai,
      });

    /*
     * Hội viên đã có tài khoản thì không tạo tài khoản mới.
     * Chỉ nâng quyền tài khoản hiện tại thành BAN_CHAP_HANH.
     */
    if (existingAccountId) {
      await User.findByIdAndUpdate(
        existingAccountId,
        {
          $set: {
            role: "BAN_CHAP_HANH",
          },
        }
      );
    }

    const populatedData =
      await BanChapHanh.findById(
        createdBanChapHanh._id
      )
        .populate({
          path: "hoiVienId",
          select:
            "maHoiVien hoTen chiHoiId taiKhoanId trangThai",

          populate: [
            {
              path: "chiHoiId",
              select:
                "maChiHoi tenChiHoi",
            },
            {
              path: "taiKhoanId",
              select:
                "username fullName role isActive",
            },
          ],
        })
        .populate({
          path: "chiHoiId",
          select:
            "maChiHoi tenChiHoi",
        })
        .populate({
          path: "taiKhoanId",
          select:
            "username fullName role isActive",
        })
        .lean();

    return NextResponse.json(
      {
        success: true,

        message: existingAccountId
          ? "Thêm Ban Chấp hành và liên kết tài khoản Hội viên thành công"
          : "Thêm thành viên Ban Chấp hành thành công",

        data: populatedData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Lỗi thêm Ban Chấp hành:",
      error
    );

    if (
      error instanceof mongoose.Error.ValidationError
    ) {
      const firstError =
        Object.values(error.errors)[0];

      return NextResponse.json(
        {
          success: false,
          message:
            firstError?.message ||
            "Dữ liệu Ban Chấp hành không hợp lệ",
        },
        { status: 400 }
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code ===
        11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã Ban Chấp hành đã tồn tại",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi thêm thành viên Ban Chấp hành",
      },
      { status: 500 }
    );
  }
}