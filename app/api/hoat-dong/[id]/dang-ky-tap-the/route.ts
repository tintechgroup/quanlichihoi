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
import HoatDong from "@/models/HoatDong";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type TrangThaiDangKy =
  | "DA_DANG_KY"
  | "DA_THAM_GIA"
  | "VANG_MAT"
  | "VANG_CO_LY_DO"
  | "DA_HUY";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RequestBody = {
  chiHoiId?: unknown;

  hoiVienIds?: unknown;

  ghiChu?: unknown;
};

/* =========================================================
   CONSTANTS
========================================================= */

const MANAGER_ROLES:
  UserRole[] = [
    "ADMIN",
    "BAN_CHAP_HANH",
    "CHI_HOI_TRUONG",
  ];

const HOAT_DONG_CHO_DANG_KY =
  [
    "DA_DUYET",
    "SAP_DIEN_RA",
  ];

const TRANG_THAI_DANG_KY_ACTIVE:
  TrangThaiDangKy[] = [
    "DA_DANG_KY",
    "DA_THAM_GIA",
    "VANG_MAT",
    "VANG_CO_LY_DO",
  ];

/* =========================================================
   HELPERS
========================================================= */

function responseError(
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

function stringValue(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function parseObjectIds(
  value: unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(
          (
            item,
          ) =>
            String(
              item,
            ).trim(),
        )
        .filter(
          (
            item,
          ) =>
            Types.ObjectId.isValid(
              item,
            ),
        ),
    ),
  );
}

/* =========================================================
   CHI HOI CUA CHT
========================================================= */

async function getChiHoiIdCuaChiHoiTruong(
  userId: string,
) {
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

  /*
   * Fallback dữ liệu cũ:
   * một số tài khoản CHT có thể đồng thời
   * có hồ sơ HoiVien.
   */
  const hoiVien =
    await HoiVien.findOne({
      taiKhoanId:
        new Types.ObjectId(
          userId,
        ),
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

  return "";
}

/* =========================================================
   KIEM TRA HOAT DONG
========================================================= */

async function loadHoatDong(
  id: string,
) {
  const hoatDong =
    await HoatDong.findById(
      id,
    ).lean();

  if (!hoatDong) {
    return {
      error:
        responseError(
          "Không tìm thấy hoạt động",
          404,
        ),

      hoatDong:
        null,
    };
  }

  if (
    !HOAT_DONG_CHO_DANG_KY.includes(
      String(
        hoatDong.trangThai,
      ),
    )
  ) {
    return {
      error:
        responseError(
          "Hoạt động hiện không ở trạng thái cho phép đăng ký",
          409,
        ),

      hoatDong:
        null,
    };
  }

  if (
    hoatDong.hanDangKy
  ) {
    const deadline =
      new Date(
        hoatDong.hanDangKy,
      );

    if (
      !Number.isNaN(
        deadline.getTime(),
      ) &&
      deadline.getTime() <
        Date.now()
    ) {
      return {
        error:
          responseError(
            "Hoạt động đã hết hạn đăng ký",
            409,
          ),

        hoatDong:
          null,
      };
    }
  }

  return {
    error:
      null,

    hoatDong,
  };
}

/* =========================================================
   GET
   Xem danh sách đăng ký của Chi hội cho hoạt động
========================================================= */

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return responseError(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    if (
      !MANAGER_ROLES.includes(
        session.role as
          UserRole,
      )
    ) {
      return responseError(
        "Bạn không có quyền xem đăng ký tập thể",
        403,
      );
    }

    const {
      id,
    } =
      await context.params;

    if (
      !Types.ObjectId.isValid(
        id,
      )
    ) {
      return responseError(
        "Mã hoạt động không hợp lệ",
      );
    }

    await connectDB();

    let chiHoiId =
      new URL(
        request.url,
      ).searchParams
        .get(
          "chiHoiId",
        )
        ?.trim() ||
      "";

    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      chiHoiId =
        await getChiHoiIdCuaChiHoiTruong(
          session.userId,
        );

      if (!chiHoiId) {
        return responseError(
          "Tài khoản Chi hội trưởng chưa được gán Chi hội",
          409,
        );
      }
    }

    if (
      !chiHoiId ||
      !Types.ObjectId.isValid(
        chiHoiId,
      )
    ) {
      return responseError(
        "Vui lòng chọn Chi hội",
      );
    }

    const hoiVien =
      await HoiVien.find({
        chiHoiId:
          new Types.ObjectId(
            chiHoiId,
          ),

        trangThai:
          "DANG_HOAT_DONG",
      })
        .select(
          "maHoiVien hoTen lop khoaHoc email soDienThoai chiHoiId trangThai",
        )
        .sort({
          hoTen:
            1,
        })
        .lean();

    const memberIds =
      hoiVien.map(
        (
          member,
        ) =>
          member._id,
      );

    const registrations =
      memberIds.length >
      0
        ? await DangKyHoatDong.find({
            hoatDongId:
              new Types.ObjectId(
                id,
              ),

            hoiVienId: {
              $in:
                memberIds,
            },
          })
            .select(
              [
                "_id",
                "hoiVienId",
                "trangThai",
                "thoiGianDangKy",
                "thoiGianDiemDanh",
                "thoiGianHuy",
                "lyDoHuy",
                "lyDoVang",
                "ghiChu",
              ].join(
                " ",
              ),
            )
            .lean()
        : [];

    const registrationMap =
      new Map<
        string,
        typeof registrations[number]
      >();

    for (
      const item of registrations
    ) {
      registrationMap.set(
        String(
          item.hoiVienId,
        ),
        item,
      );
    }

    const data =
      hoiVien.map(
        (
          member,
        ) => {
          const dangKy =
            registrationMap.get(
              String(
                member._id,
              ),
            );

          return {
            ...member,

            dangKy:
              dangKy ||
              null,
          };
        },
      );

    return NextResponse.json({
      success:
        true,

      message:
        "Lấy danh sách đăng ký tập thể thành công",

      data,

      thongKe: {
        tongHoiVien:
          hoiVien.length,

        daDangKy:
          registrations.filter(
            (
              item,
            ) =>
              item.trangThai ===
              "DA_DANG_KY",
          ).length,

        daThamGia:
          registrations.filter(
            (
              item,
            ) =>
              item.trangThai ===
              "DA_THAM_GIA",
          ).length,

        vangMat:
          registrations.filter(
            (
              item,
            ) =>
              item.trangThai ===
              "VANG_MAT",
          ).length,

        vangCoLyDo:
          registrations.filter(
            (
              item,
            ) =>
              item.trangThai ===
              "VANG_CO_LY_DO",
          ).length,

        daHuy:
          registrations.filter(
            (
              item,
            ) =>
              item.trangThai ===
              "DA_HUY",
          ).length,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/hoat-dong/[id]/dang-ky-tap-the:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể tải đăng ký tập thể",
      500,
    );
  }
}

/* =========================================================
   POST
   Dang ky tap the
========================================================= */

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getCurrentSession();

    if (!session) {
      return responseError(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    const role =
      session.role as
        UserRole;

    if (
      !MANAGER_ROLES.includes(
        role,
      )
    ) {
      return responseError(
        "Bạn không có quyền đăng ký tập thể",
        403,
      );
    }

    const {
      id,
    } =
      await context.params;

    if (
      !Types.ObjectId.isValid(
        id,
      )
    ) {
      return responseError(
        "Mã hoạt động không hợp lệ",
      );
    }

    let body:
      RequestBody;

    try {
      body =
        await request.json() as
          RequestBody;
    } catch {
      return responseError(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    await connectDB();

    const activityResult =
      await loadHoatDong(
        id,
      );

    if (
      activityResult.error
    ) {
      return activityResult.error;
    }

    const hoatDong =
      activityResult.hoatDong!;

    let chiHoiId =
      stringValue(
        body.chiHoiId,
      );

    /*
     * CHT chỉ được đăng ký cho Chi hội của mình.
     */
    if (
      role ===
      "CHI_HOI_TRUONG"
    ) {
      chiHoiId =
        await getChiHoiIdCuaChiHoiTruong(
          session.userId,
        );

      if (!chiHoiId) {
        return responseError(
          "Tài khoản Chi hội trưởng chưa được gán Chi hội",
          409,
        );
      }
    }

    if (
      !chiHoiId ||
      !Types.ObjectId.isValid(
        chiHoiId,
      )
    ) {
      return responseError(
        "Vui lòng chọn Chi hội cần đăng ký",
      );
    }

    /*
     * Nếu hoạt động chỉ dành cho một Chi hội,
     * không cho đăng ký nhầm Chi hội khác.
     */
    if (
      hoatDong.phamVi ===
        "CHI_HOI" &&
      hoatDong.chiHoiId &&
      String(
        hoatDong.chiHoiId,
      ) !==
        chiHoiId
    ) {
      return responseError(
        "Hoạt động này không thuộc Chi hội được chọn",
        403,
      );
    }

    const requestedMemberIds =
      parseObjectIds(
        body.hoiVienIds,
      );

    const memberFilter:
      Record<
        string,
        unknown
      > = {
        chiHoiId:
          new Types.ObjectId(
            chiHoiId,
          ),

        trangThai:
          "DANG_HOAT_DONG",
      };

    /*
     * Có hoiVienIds:
     * chỉ đăng ký các Hội viên được chọn.
     *
     * Không có:
     * đăng ký toàn bộ Hội viên đang hoạt động của Chi hội.
     */
    if (
      requestedMemberIds.length >
      0
    ) {
      memberFilter._id = {
        $in:
          requestedMemberIds.map(
            (
              memberId,
            ) =>
              new Types.ObjectId(
                memberId,
              ),
          ),
      };
    }

    const members =
      await HoiVien.find(
        memberFilter,
      )
        .select(
          "_id maHoiVien hoTen chiHoiId trangThai",
        )
        .lean();

    if (
      members.length ===
      0
    ) {
      return responseError(
        "Không có Hội viên phù hợp để đăng ký",
        404,
      );
    }

    const memberIds =
      members.map(
        (
          member,
        ) =>
          member._id,
      );

    /*
     * Lấy đăng ký hiện tại.
     */
    const existing =
      await DangKyHoatDong.find({
        hoatDongId:
          hoatDong._id,

        hoiVienId: {
          $in:
            memberIds,
        },
      });

    const existingMap =
      new Map(
        existing.map(
          (
            registration,
          ) => [
            String(
              registration.hoiVienId,
            ),
            registration,
          ],
        ),
      );

    /*
     * Những trạng thái đã có kết quả điểm danh
     * không được ghi đè về DA_DANG_KY.
     */
    const lockedStatus:
      TrangThaiDangKy[] = [
        "DA_THAM_GIA",
        "VANG_MAT",
        "VANG_CO_LY_DO",
      ];

    const canRegisterMembers =
      members.filter(
        (
          member,
        ) => {
          const registration =
            existingMap.get(
              String(
                member._id,
              ),
            );

          if (
            !registration
          ) {
            return true;
          }

          return !lockedStatus.includes(
            registration.trangThai as
              TrangThaiDangKy,
          );
        },
      );

    /*
     * Kiểm tra sức chứa.
     */
    if (
      hoatDong.soLuongToiDa &&
      hoatDong.soLuongToiDa >
        0
    ) {
      const currentActive =
        await DangKyHoatDong.countDocuments({
          hoatDongId:
            hoatDong._id,

          trangThai: {
            $in:
              TRANG_THAI_DANG_KY_ACTIVE,
          },
        });

      const newRegistrations =
        canRegisterMembers.filter(
          (
            member,
          ) => {
            const old =
              existingMap.get(
                String(
                  member._id,
                ),
              );

            return (
              !old ||
              old.trangThai ===
                "DA_HUY"
            );
          },
        ).length;

      if (
        currentActive +
          newRegistrations >
        hoatDong.soLuongToiDa
      ) {
        return responseError(
          `Số lượng đăng ký vượt quá giới hạn ${hoatDong.soLuongToiDa} người của hoạt động`,
          409,
        );
      }
    }

    const now =
      new Date();

    const ghiChu =
      stringValue(
        body.ghiChu,
      );

    let created =
      0;

    let restored =
      0;

    let skipped =
      0;

    for (
      const member of members
    ) {
      const old =
        existingMap.get(
          String(
            member._id,
          ),
        );

      if (
        old &&
        lockedStatus.includes(
          old.trangThai as
            TrangThaiDangKy,
        )
      ) {
        skipped +=
          1;

        continue;
      }

      if (!old) {
        await DangKyHoatDong.create({
          hoatDongId:
            hoatDong._id,

          hoiVienId:
            member._id,

          trangThai:
            "DA_DANG_KY",

          thoiGianDangKy:
            now,

          ghiChu,

          nguoiCapNhatId:
            new Types.ObjectId(
              session.userId,
            ),
        });

        created +=
          1;

        continue;
      }

      if (
        old.trangThai ===
        "DA_HUY"
      ) {
        old.trangThai =
          "DA_DANG_KY";

        old.thoiGianDangKy =
          now;

        old.thoiGianHuy =
          undefined;

        old.lyDoHuy =
          "";

        old.lyDoVang =
          "";

        old.ghiChu =
          ghiChu;

        old.nguoiCapNhatId =
          new Types.ObjectId(
            session.userId,
          );

        await old.save();

        restored +=
          1;

        continue;
      }

      /*
       * DA_DANG_KY rồi:
       * không tạo trùng.
       */
      skipped +=
        1;
    }

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
        "HOAT_DONG",

      description:
        `Đăng ký tập thể hoạt động ${hoatDong.maHoatDong} - ${hoatDong.tenHoatDong}`,

      targetId:
        String(
          hoatDong._id,
        ),

      targetName:
        hoatDong.tenHoatDong,

      metadata: {
        chiHoiId,

        tongHoiVien:
          members.length,

        created,

        restored,

        skipped,
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

    return NextResponse.json({
      success:
        true,

      message:
        "Đăng ký tập thể thành công",

      data: {
        tongHoiVien:
          members.length,

        dangKyMoi:
          created,

        dangKyLai:
          restored,

        boQua:
          skipped,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "POST /api/hoat-dong/[id]/dang-ky-tap-the:",
      error,
    );

    if (
      error instanceof
      mongoose.Error
        .ValidationError
    ) {
      const first =
        Object.values(
          error.errors,
        )[0];

      return responseError(
        first?.message ||
          "Dữ liệu đăng ký không hợp lệ",
      );
    }

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể đăng ký tập thể",
      500,
    );
  }
}