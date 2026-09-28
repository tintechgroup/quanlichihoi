import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import ChiHoi from "@/models/ChiHoi";
import DaDocThongBao from "@/models/DaDocThongBao";
import HoiVien from "@/models/HoiVien";
import ThongBao, {
  type LoaiThongBao,
  type MucDoThongBao,
  type PhamViThongBao,
  type TrangThaiThongBao,
  type VaiTroNhanThongBao,
} from "@/models/ThongBao";
import User from "@/models/User";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const LOAI_THONG_BAO_VALUES: LoaiThongBao[] = [
  "THONG_BAO_CHUNG",
  "HOAT_DONG",
  "TAI_LIEU",
  "KHAC",
];

const MUC_DO_VALUES: MucDoThongBao[] = [
  "THONG_THUONG",
  "QUAN_TRONG",
  "KHAN_CAP",
];

const PHAM_VI_VALUES: PhamViThongBao[] = [
  "TAT_CA",
  "CHI_HOI",
  "VAI_TRO",
  "CA_NHAN",
];

const TRANG_THAI_VALUES: TrangThaiThongBao[] = [
  "NHAP",
  "DA_DANG",
  "DA_AN",
];

const VAI_TRO_VALUES: VaiTroNhanThongBao[] = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
  "HOI_VIEN",
];

const MANAGER_ROLES: VaiTroNhanThongBao[] = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

function isManagerRole(
  role: string,
): role is VaiTroNhanThongBao {
  return MANAGER_ROLES.includes(
    role as VaiTroNhanThongBao,
  );
}

function isValidObjectId(value: unknown) {
  return (
    typeof value === "string" &&
    Types.ObjectId.isValid(value)
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeStringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (item): item is string =>
            typeof item === "string",
        )
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeObjectIdArray(
  value: unknown,
): Types.ObjectId[] {
  return normalizeStringArray(value)
    .filter((item) =>
      Types.ObjectId.isValid(item),
    )
    .map(
      (item) =>
        new Types.ObjectId(item),
    );
}

function toComparableId(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const record =
      value as Record<string, unknown>;

    return String(
      record._id ??
        record.id ??
        value,
    );
  }

  return String(value);
}

function parseOptionalDate(
  value: unknown,
): Date | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function normalizeAttachments(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return null;
      }

      const attachment =
        item as Record<string, unknown>;

      const tenTep = normalizeString(
        attachment.tenTep,
      );

      const duongDan = normalizeString(
        attachment.duongDan,
      );

      const loaiTep = normalizeString(
        attachment.loaiTep,
      );

      const rawSize = Number(
        attachment.kichThuoc ?? 0,
      );

      const kichThuoc =
        Number.isFinite(rawSize) &&
        rawSize >= 0
          ? rawSize
          : 0;

      if (!tenTep || !duongDan) {
        return null;
      }

      return {
        tenTep,
        duongDan,
        loaiTep,
        kichThuoc,
      };
    })
    .filter(
      (
        item,
      ): item is {
        tenTep: string;
        duongDan: string;
        loaiTep: string;
        kichThuoc: number;
      } => item !== null,
    );
}

async function getUserChiHoiId(
  userId: string,
) {
  const hoiVien = await HoiVien.findOne({
    taiKhoanId: new Types.ObjectId(
      userId,
    ),
  })
    .select("chiHoiId")
    .lean();

  if (!hoiVien?.chiHoiId) {
    return "";
  }

  return hoiVien.chiHoiId.toString();
}

async function canViewNotification({
  thongBao,
  userId,
  role,
}: {
  thongBao: {
    phamVi: PhamViThongBao;
    chiHoiIds: unknown[];
    vaiTroNguoiNhan: string[];
    nguoiNhanIds: unknown[];
    nguoiTaoId: unknown;
    trangThai: TrangThaiThongBao;
    ngayBatDau?: Date;
    ngayKetThuc?: Date;
  };
  userId: string;
  role: string;
}) {
  if (isManagerRole(role)) {
    return true;
  }

  if (thongBao.trangThai !== "DA_DANG") {
    return false;
  }

  const now = new Date();

  if (
    thongBao.ngayBatDau &&
    thongBao.ngayBatDau > now
  ) {
    return false;
  }

  if (
    thongBao.ngayKetThuc &&
    thongBao.ngayKetThuc < now
  ) {
    return false;
  }

  if (thongBao.phamVi === "TAT_CA") {
    return true;
  }

  if (
    thongBao.phamVi === "VAI_TRO"
  ) {
    return thongBao.vaiTroNguoiNhan.includes(
      role,
    );
  }

  if (
    thongBao.phamVi === "CA_NHAN"
  ) {
    return thongBao.nguoiNhanIds.some(
      (id) =>
        toComparableId(id) === userId,
    );
  }

  if (
    thongBao.phamVi === "CHI_HOI"
  ) {
    const userChiHoiId =
      await getUserChiHoiId(userId);

    if (!userChiHoiId) {
      return false;
    }

    return thongBao.chiHoiIds.some(
      (id) =>
        toComparableId(id) ===
        userChiHoiId,
    );
  }

  return false;
}

function canEditNotification({
  role,
  userId,
  creatorId,
}: {
  role: string;
  userId: string;
  creatorId: string;
}) {
  if (
    role === "ADMIN" ||
    role === "BAN_CHAP_HANH"
  ) {
    return true;
  }

  if (
    role === "CHI_HOI_TRUONG"
  ) {
    return creatorId === userId;
  }

  return false;
}

function serializeThongBao(
  thongBao: object,
  daDoc = false,
) {
  const raw = thongBao as Record<string, unknown> & { nguoiTaoId?: { username?: string; fullName?: string; role?: string } | null };
  return {
    ...thongBao,

    id: String(
      raw._id ??
        raw.id ??
        "",
    ),

    _id: String(
      raw._id ??
        raw.id ??
        "",
    ),

    nguoiTao: raw.nguoiTaoId
      ? {
          id: toComparableId(
            raw.nguoiTaoId,
          ),

          username:
            raw.nguoiTaoId
              .username ?? "",

          fullName:
            raw.nguoiTaoId
              .fullName ?? "",

          role:
            raw.nguoiTaoId
              .role ?? "",
        }
      : null,

    chiHoiIds:
      raw.chiHoiIds ?? [],

    nguoiNhanIds:
      raw.nguoiNhanIds ?? [],

    tepDinhKem:
      raw.tepDinhKem ?? [],

    daDoc,
  };
}

/**
 * GET /api/thong-bao/[id]
 * Xem chi tiết và tự đánh dấu đã đọc.
 */
export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã thông báo không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    // Đăng ký model trước khi populate.
    void User;
    void ChiHoi;
    void HoiVien;

    const thongBao =
      await ThongBao.findById(id)
        .populate({
          path: "nguoiTaoId",
          model: User,
          select:
            "username fullName role",
        })
        .populate({
          path: "chiHoiIds",
          model: ChiHoi,
          select:
            "maChiHoi tenChiHoi",
        })
        .populate({
          path: "nguoiNhanIds",
          model: User,
          select:
            "username fullName role",
        });

    if (!thongBao) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy thông báo",
        },
        {
          status: 404,
        },
      );
    }

    const userId =
      session.userId.toString();

    const role = String(session.role);

    const allowed =
      await canViewNotification({
        thongBao: {
          phamVi:
            thongBao.phamVi,

          chiHoiIds:
            thongBao.chiHoiIds,

          vaiTroNguoiNhan:
            thongBao.vaiTroNguoiNhan,

          nguoiNhanIds:
            thongBao.nguoiNhanIds,

          nguoiTaoId:
            thongBao.nguoiTaoId,

          trangThai:
            thongBao.trangThai,

          ngayBatDau:
            thongBao.ngayBatDau,

          ngayKetThuc:
            thongBao.ngayKetThuc,
        },

        userId,
        role,
      });

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền xem thông báo này",
        },
        {
          status: 403,
        },
      );
    }

    const existingRead =
      await DaDocThongBao.findOne({
        thongBaoId:
          thongBao._id,

        nguoiDungId:
          new Types.ObjectId(userId),
      })
        .select("_id daDoc")
        .lean();

    const wasRead =
      Boolean(existingRead?.daDoc);

    await DaDocThongBao.findOneAndUpdate(
      {
        thongBaoId:
          thongBao._id,

        nguoiDungId:
          new Types.ObjectId(userId),
      },
      {
        $set: {
          daDoc: true,
          thoiGianDoc: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    if (!wasRead) {
      await ThongBao.updateOne(
        {
          _id: thongBao._id,
        },
        {
          $inc: {
            soLuotXem: 1,
          },
        },
      );

      thongBao.soLuotXem =
        (thongBao.soLuotXem ?? 0) + 1;
    }

    const result =
      thongBao.toObject();

    return NextResponse.json({
      success: true,
      message:
        "Lấy thông báo thành công",
      data: serializeThongBao(
        result,
        true,
      ),
    });
  } catch (error) {
    console.error(
      "Lỗi xem thông báo:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi xem thông báo",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * PUT /api/thong-bao/[id]
 * Cập nhật thông báo.
 */
export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    const role = String(session.role);

    if (!isManagerRole(role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền cập nhật thông báo",
        },
        {
          status: 403,
        },
      );
    }

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã thông báo không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();

    await connectDB();

    const thongBao =
      await ThongBao.findById(id);

    if (!thongBao) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy thông báo",
        },
        {
          status: 404,
        },
      );
    }

    const userId =
      session.userId.toString();

    const creatorId =
      toComparableId(
        thongBao.nguoiTaoId,
      );

    if (
      !canEditNotification({
        role,
        userId,
        creatorId,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền sửa thông báo này",
        },
        {
          status: 403,
        },
      );
    }

    if (
      body.tieuDe !== undefined
    ) {
      const tieuDe = normalizeString(
        body.tieuDe,
      );

      if (!tieuDe) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Tiêu đề thông báo không được để trống",
          },
          {
            status: 400,
          },
        );
      }

      thongBao.tieuDe = tieuDe;
    }

    if (
      body.noiDung !== undefined
    ) {
      const noiDung = normalizeString(
        body.noiDung,
      );

      if (!noiDung) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Nội dung thông báo không được để trống",
          },
          {
            status: 400,
          },
        );
      }

      thongBao.noiDung = noiDung;
    }

    if (
      body.loaiThongBao !==
      undefined
    ) {
      const loaiThongBao =
        normalizeString(
          body.loaiThongBao,
        ).toUpperCase() as LoaiThongBao;

      if (
        !LOAI_THONG_BAO_VALUES.includes(
          loaiThongBao,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Loại thông báo không hợp lệ",
          },
          {
            status: 400,
          },
        );
      }

      thongBao.loaiThongBao =
        loaiThongBao;
    }

    if (body.mucDo !== undefined) {
      const mucDo = normalizeString(
        body.mucDo,
      ).toUpperCase() as MucDoThongBao;

      if (
        !MUC_DO_VALUES.includes(mucDo)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Mức độ thông báo không hợp lệ",
          },
          {
            status: 400,
          },
        );
      }

      thongBao.mucDo = mucDo;
    }

    if (body.phamVi !== undefined) {
      const phamVi = normalizeString(
        body.phamVi,
      ).toUpperCase() as PhamViThongBao;

      if (
        !PHAM_VI_VALUES.includes(
          phamVi,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Phạm vi thông báo không hợp lệ",
          },
          {
            status: 400,
          },
        );
      }

      thongBao.phamVi = phamVi;
    }

    if (
      body.trangThai !== undefined
    ) {
      const trangThai =
        normalizeString(
          body.trangThai,
        ).toUpperCase() as TrangThaiThongBao;

      if (
        !TRANG_THAI_VALUES.includes(
          trangThai,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Trạng thái thông báo không hợp lệ",
          },
          {
            status: 400,
          },
        );
      }

      thongBao.trangThai =
        trangThai;
    }

    if (
      body.chiHoiIds !== undefined
    ) {
      const rawChiHoiIds =
        normalizeStringArray(
          body.chiHoiIds,
        );

      const invalidChiHoiId =
        rawChiHoiIds.find(
          (chiHoiId) =>
            !Types.ObjectId.isValid(
              chiHoiId,
            ),
        );

      if (invalidChiHoiId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Danh sách Chi hội không hợp lệ",
          },
          {
            status: 400,
          },
        );
      }

      thongBao.chiHoiIds =
        normalizeObjectIdArray(
          rawChiHoiIds,
        );
    }

    if (
      body.nguoiNhanIds !==
      undefined
    ) {
      const rawNguoiNhanIds =
        normalizeStringArray(
          body.nguoiNhanIds,
        );

      const invalidUserId =
        rawNguoiNhanIds.find(
          (recipientId) =>
            !Types.ObjectId.isValid(
              recipientId,
            ),
        );

      if (invalidUserId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Danh sách người nhận không hợp lệ",
          },
          {
            status: 400,
          },
        );
      }

      thongBao.nguoiNhanIds =
        normalizeObjectIdArray(
          rawNguoiNhanIds,
        );
    }

    if (
      body.vaiTroNguoiNhan !==
      undefined
    ) {
      const roles =
        normalizeStringArray(
          body.vaiTroNguoiNhan,
        ).map(
          (item) =>
            item.toUpperCase() as VaiTroNhanThongBao,
        );

      const invalidRole = roles.find(
        (item) =>
          !VAI_TRO_VALUES.includes(
            item,
          ),
      );

      if (invalidRole) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Danh sách vai trò người nhận không hợp lệ",
          },
          {
            status: 400,
          },
        );
      }

      thongBao.vaiTroNguoiNhan =
        roles;
    }

    if (
      body.tepDinhKem !==
      undefined
    ) {
      const attachments =
        normalizeAttachments(
          body.tepDinhKem,
        );

      if (attachments.length > 5) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Chỉ được đính kèm tối đa 5 tệp",
          },
          {
            status: 400,
          },
        );
      }

      if (
        Array.isArray(
          body.tepDinhKem,
        ) &&
        attachments.length !==
          body.tepDinhKem.length
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Thông tin tệp đính kèm không hợp lệ",
          },
          {
            status: 400,
          },
        );
      }

      thongBao.tepDinhKem =
        attachments;
    }

    if (
      body.ngayBatDau !==
      undefined
    ) {
      if (
        body.ngayBatDau === null ||
        body.ngayBatDau === ""
      ) {
        thongBao.ngayBatDau =
          undefined;
      } else {
        const ngayBatDau =
          parseOptionalDate(
            body.ngayBatDau,
          );

        if (!ngayBatDau) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Thời gian bắt đầu không hợp lệ",
            },
            {
              status: 400,
            },
          );
        }

        thongBao.ngayBatDau =
          ngayBatDau;
      }
    }

    if (
      body.ngayKetThuc !==
      undefined
    ) {
      if (
        body.ngayKetThuc === null ||
        body.ngayKetThuc === ""
      ) {
        thongBao.ngayKetThuc =
          undefined;
      } else {
        const ngayKetThuc =
          parseOptionalDate(
            body.ngayKetThuc,
          );

        if (!ngayKetThuc) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Thời gian kết thúc không hợp lệ",
            },
            {
              status: 400,
            },
          );
        }

        thongBao.ngayKetThuc =
          ngayKetThuc;
      }
    }

    if (
      thongBao.ngayBatDau &&
      thongBao.ngayKetThuc &&
      thongBao.ngayKetThuc <=
        thongBao.ngayBatDau
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Thời gian kết thúc phải sau thời gian bắt đầu",
        },
        {
          status: 400,
        },
      );
    }

    if (
      thongBao.phamVi ===
      "CHI_HOI" &&
      thongBao.chiHoiIds.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng chọn ít nhất một Chi hội",
        },
        {
          status: 400,
        },
      );
    }

    if (
      thongBao.phamVi ===
        "VAI_TRO" &&
      thongBao.vaiTroNguoiNhan
        .length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng chọn ít nhất một vai trò người nhận",
        },
        {
          status: 400,
        },
      );
    }

    if (
      thongBao.phamVi ===
        "CA_NHAN" &&
      thongBao.nguoiNhanIds
        .length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng chọn ít nhất một người nhận",
        },
        {
          status: 400,
        },
      );
    }

    if (
      thongBao.phamVi === "TAT_CA"
    ) {
      thongBao.chiHoiIds = [];
      thongBao.vaiTroNguoiNhan = [];
      thongBao.nguoiNhanIds = [];
    }

    if (
      thongBao.phamVi === "CHI_HOI"
    ) {
      thongBao.vaiTroNguoiNhan = [];
      thongBao.nguoiNhanIds = [];
    }

    if (
      thongBao.phamVi === "VAI_TRO"
    ) {
      thongBao.chiHoiIds = [];
      thongBao.nguoiNhanIds = [];
    }

    if (
      thongBao.phamVi === "CA_NHAN"
    ) {
      thongBao.chiHoiIds = [];
      thongBao.vaiTroNguoiNhan = [];
    }

    await thongBao.save();

    const updatedThongBao =
      await ThongBao.findById(
        thongBao._id,
      )
        .populate({
          path: "nguoiTaoId",
          model: User,
          select:
            "username fullName role",
        })
        .populate({
          path: "chiHoiIds",
          model: ChiHoi,
          select:
            "maChiHoi tenChiHoi",
        })
        .populate({
          path: "nguoiNhanIds",
          model: User,
          select:
            "username fullName role",
        })
        .lean();

    if (!updatedThongBao) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể lấy thông báo sau khi cập nhật",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Cập nhật thông báo thành công",
      data: serializeThongBao(
        updatedThongBao,
      ),
    });
  } catch (error) {
    console.error(
      "Lỗi cập nhật thông báo:",
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

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi cập nhật thông báo",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * DELETE /api/thong-bao/[id]
 * Xóa thông báo và lịch sử đã đọc.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    const role = String(session.role);

    if (!isManagerRole(role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền xóa thông báo",
        },
        {
          status: 403,
        },
      );
    }

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã thông báo không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const thongBao =
      await ThongBao.findById(id);

    if (!thongBao) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy thông báo",
        },
        {
          status: 404,
        },
      );
    }

    const userId =
      session.userId.toString();

    const creatorId =
      toComparableId(
        thongBao.nguoiTaoId,
      );

    if (
      !canEditNotification({
        role,
        userId,
        creatorId,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền xóa thông báo này",
        },
        {
          status: 403,
        },
      );
    }

    await Promise.all([
      DaDocThongBao.deleteMany({
        thongBaoId:
          thongBao._id,
      }),

      ThongBao.deleteOne({
        _id: thongBao._id,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message:
        "Xóa thông báo thành công",
    });
  } catch (error) {
    console.error(
      "Lỗi xóa thông báo:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi xóa thông báo",
      },
      {
        status: 500,
      },
    );
  }
}