import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/session";

import ChiHoi from "@/models/ChiHoi";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const ROLE_OPTIONS = [
  {
    value: "ADMIN",
    label: "Quản trị viên",
  },
  {
    value: "BAN_CHAP_HANH",
    label: "Ban Chấp hành",
  },
  {
    value: "CHI_HOI_TRUONG",
    label: "Chi hội trưởng",
  },
  {
    value: "HOI_VIEN",
    label: "Hội viên",
  },
];

function normalizeString(value: string | null) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function getId(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "_id" in value
  ) {
    return String(
      (value as { _id: unknown })._id || "",
    );
  }

  return String(value || "");
}

function getPopulatedValue<T>(
  value: unknown,
): T | null {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as T;
  }

  return null;
}

export async function GET(
  request: NextRequest,
) {
  try {
    const session = await getCurrentSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng đăng nhập để tiếp tục",
        },
        {
          status: 401,
        },
      );
    }

    if (
      !MANAGER_ROLES.includes(session.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền lấy danh sách người nhận",
        },
        {
          status: 403,
        },
      );
    }

    await connectDB();

    /*
     * Đăng ký model trước khi populate.
     */
    void User;
    void ChiHoi;

    const search = normalizeString(
      request.nextUrl.searchParams.get(
        "search",
      ),
    );

    /*
     * Hồ sơ Hội viên đang đăng nhập.
     * Dùng để giới hạn quyền Chi hội trưởng.
     */
    const currentMember =
      await HoiVien.findOne({
        taiKhoanId: session.userId,
      })
        .select(
          "_id maHoiVien hoTen chiHoiId taiKhoanId",
        )
        .lean();

    let allowedChiHoiIds: string[] | null =
      null;

    if (
      session.role === "CHI_HOI_TRUONG"
    ) {
      if (!currentMember?.chiHoiId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Tài khoản Chi hội trưởng chưa được liên kết với Chi hội",
          },
          {
            status: 403,
          },
        );
      }

      allowedChiHoiIds = [
        currentMember.chiHoiId.toString(),
      ];
    }

    /*
     * Lấy danh sách Chi hội.
     */
    const chiHoiFilter =
      allowedChiHoiIds !== null
        ? {
            _id: {
              $in: allowedChiHoiIds,
            },
          }
        : {};

    const chiHoiDocuments =
      await ChiHoi.find(chiHoiFilter)
        .select(
          "_id maChiHoi tenChiHoi trangThai",
        )
        .sort({
          maChiHoi: 1,
        })
        .lean();

    /*
     * Lấy hồ sơ Hội viên có tài khoản.
     */
    const hoiVienFilter =
      allowedChiHoiIds !== null
        ? {
            chiHoiId: {
              $in: allowedChiHoiIds,
            },
            taiKhoanId: {
              $exists: true,
              $ne: null,
            },
          }
        : {
            taiKhoanId: {
              $exists: true,
              $ne: null,
            },
          };

    const memberDocuments =
      await HoiVien.find(hoiVienFilter)
        .select(
          "_id maHoiVien hoTen lop chiHoiId taiKhoanId trangThai",
        )
        .populate({
          path: "chiHoiId",
          model: ChiHoi,
          select:
            "_id maChiHoi tenChiHoi",
        })
        .populate({
          path: "taiKhoanId",
          model: User,
          select:
            "_id username fullName role isActive",
        })
        .sort({
          hoTen: 1,
        })
        .lean();

    /*
     * Admin và Ban Chấp hành được chọn cả những
     * tài khoản chưa liên kết với hồ sơ Hội viên.
     */
    const allUsers =
      allowedChiHoiIds === null
        ? await User.find({
            isActive: true,
          })
            .select(
              "_id username fullName role isActive",
            )
            .sort({
              fullName: 1,
              username: 1,
            })
            .lean()
        : [];

    const memberAccountIds = new Set<string>();

    const memberUsers = memberDocuments
      .map((member) => {
        const account = getPopulatedValue<{
          _id: unknown;
          username?: string;
          fullName?: string;
          role?: string;
          isActive?: boolean;
        }>(member.taiKhoanId);

        if (
          !account ||
          account.isActive === false
        ) {
          return null;
        }

        const userId = getId(account);

        if (!userId) {
          return null;
        }

        memberAccountIds.add(userId);

        const chiHoi = getPopulatedValue<{
          _id: unknown;
          maChiHoi?: string;
          tenChiHoi?: string;
        }>(member.chiHoiId);

        return {
          id: userId,
          _id: userId,
          username:
            account.username || "",
          fullName:
            account.fullName ||
            member.hoTen,
          role:
            account.role || "HOI_VIEN",

          hoiVien: {
            id: member._id.toString(),
            _id: member._id.toString(),
            maHoiVien:
              member.maHoiVien,
            hoTen: member.hoTen,
            lop: member.lop || "",
            trangThai:
              member.trangThai,
          },

          chiHoi: chiHoi
            ? {
                id: getId(chiHoi),
                _id: getId(chiHoi),
                maChiHoi:
                  chiHoi.maChiHoi || "",
                tenChiHoi:
                  chiHoi.tenChiHoi || "",
              }
            : null,
        };
      })
      .filter(
        (
          item,
        ): item is NonNullable<
          typeof item
        > => item !== null,
      );

    const unlinkedUsers = allUsers
      .filter(
        (user) =>
          !memberAccountIds.has(
            user._id.toString(),
          ),
      )
      .map((user) => ({
        id: user._id.toString(),
        _id: user._id.toString(),
        username: user.username,
        fullName:
          user.fullName || user.username,
        role: user.role,

        hoiVien: null,
        chiHoi: null,
      }));

    const combinedUsers = [
      ...memberUsers,
      ...unlinkedUsers,
    ];

    /*
     * Loại bỏ tài khoản trùng lặp.
     */
    const uniqueUsers = Array.from(
      new Map(
        combinedUsers.map((user) => [
          user.id,
          user,
        ]),
      ).values(),
    );

    /*
     * Tìm kiếm theo tài khoản, họ tên,
     * mã Hội viên, lớp hoặc Chi hội.
     */
    const filteredUsers = search
      ? uniqueUsers.filter((user) => {
          const searchableText = [
            user.username,
            user.fullName,
            user.role,
            user.hoiVien?.maHoiVien,
            user.hoiVien?.hoTen,
            user.hoiVien?.lop,
            user.chiHoi?.maChiHoi,
            user.chiHoi?.tenChiHoi,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            search,
          );
        })
      : uniqueUsers;

    const chiHoiList =
      chiHoiDocuments.map((chiHoi) => ({
        id: chiHoi._id.toString(),
        _id: chiHoi._id.toString(),
        maChiHoi: chiHoi.maChiHoi,
        tenChiHoi: chiHoi.tenChiHoi,
        trangThai:
          chiHoi.trangThai || null,
      }));

    /*
     * Chi hội trưởng không được gửi thông báo
     * cho Admin hoặc Ban Chấp hành toàn hệ thống.
     */
    const roleOptions =
      session.role === "CHI_HOI_TRUONG"
        ? ROLE_OPTIONS.filter(
            (role) =>
              role.value ===
                "CHI_HOI_TRUONG" ||
              role.value === "HOI_VIEN",
          )
        : ROLE_OPTIONS;

    return NextResponse.json({
      success: true,
      message:
        "Lấy danh sách người nhận thành công",

      data: {
        chiHoi: chiHoiList,
        vaiTro: roleOptions,
        nguoiDung: filteredUsers,

        thongKe: {
          tongChiHoi: chiHoiList.length,
          tongVaiTro:
            roleOptions.length,
          tongNguoiDung:
            filteredUsers.length,
        },

        quyen: {
          role: session.role,
          chiHoiGioiHan:
            allowedChiHoiIds,
        },
      },
    });
  } catch (error) {
    console.error(
      "Lỗi lấy danh sách người nhận:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi lấy danh sách người nhận",
      },
      {
        status: 500,
      },
    );
  }
}