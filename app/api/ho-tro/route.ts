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

import User from "@/models/User";

import YeuCauHoTro, {
  LoaiYeuCauHoTro,
  MucDoUuTien,
  TrangThaiHoTro,
  ITepDinhKemHoTro,
} from "@/models/YeuCauHoTro";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

/* =========================================================
   CONSTANTS
========================================================= */

const VALID_TYPES:
  LoaiYeuCauHoTro[] = [
  "TAI_KHOAN",
  "HOI_VIEN",
  "HOAT_DONG",
  "HOI_PHI",
  "TAI_CHINH",
  "VAN_KIEN",
  "KHAC",
];

const VALID_PRIORITIES:
  MucDoUuTien[] = [
  "THAP",
  "TRUNG_BINH",
  "CAO",
];

const VALID_STATUSES:
  TrangThaiHoTro[] = [
  "MOI",
  "DA_TIEP_NHAN",
  "DANG_XU_LY",
  "CHO_BO_SUNG",
  "DA_XU_LY",
  "DONG",
];

const MAX_FILES =
  5;

const MAX_FILE_SIZE =
  10 *
  1024 *
  1024;

const ALLOWED_EXTENSIONS =
  new Set([
    "png",
    "jpg",
    "jpeg",
    "webp",
    "pdf",
  ]);

/* =========================================================
   HELPERS
========================================================= */

function errorResponse(
  message: string,
  status =
    400,
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

function createTicketCode() {
  const now =
    new Date();

  const date =
    now
      .toISOString()
      .slice(
        0,
        10,
      )
      .replace(
        /-/g,
        "",
      );

  const time =
    now
      .getTime()
      .toString()
      .slice(
        -8,
      );

  const random =
    Math.floor(
      Math.random() *
        900 +
        100,
    );

  return `HT-${date}-${time}-${random}`;
}

function getFileExtension(
  filename: string,
) {
  return (
    filename
      .split(".")
      .pop()
      ?.trim()
      .toLowerCase() ||
    ""
  );
}

function parseAttachments(
  value:
    unknown,
): ITepDinhKemHoTro[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ) =>
        item &&
        typeof item ===
          "object",
    )
    .map(
      (
        item,
      ) => {
        const raw =
          item as Record<
            string,
            unknown
          >;

        return {
          tenTep:
            typeof raw.tenTep ===
            "string"
              ? raw.tenTep.trim()
              : "",

          duongDan:
            typeof raw.duongDan ===
            "string"
              ? raw.duongDan.trim()
              : "",

          pathname:
            typeof raw.pathname ===
            "string"
              ? raw.pathname.trim()
              : "",

          mimeType:
            typeof raw.mimeType ===
            "string"
              ? raw.mimeType.trim()
              : "",

          kichThuoc:
            Number.isFinite(
              Number(
                raw.kichThuoc,
              ),
            )
              ? Number(
                  raw.kichThuoc,
                )
              : 0,
        };
      },
    )
    .filter(
      (
        file,
      ) =>
        file.tenTep &&
        file.duongDan,
    );
}

function validateAttachments(
  files:
    ITepDinhKemHoTro[],
) {
  if (
    files.length >
    MAX_FILES
  ) {
    return `Chỉ được đính kèm tối đa ${MAX_FILES} tệp`;
  }

  for (
    const file of
    files
  ) {
    const extension =
      getFileExtension(
        file.tenTep,
      );

    if (
      !ALLOWED_EXTENSIONS.has(
        extension,
      )
    ) {
      return `Tệp "${file.tenTep}" không đúng định dạng cho phép`;
    }

    if (
      Number(
        file.kichThuoc ||
          0,
      ) >
      MAX_FILE_SIZE
    ) {
      return `Tệp "${file.tenTep}" vượt quá 10MB`;
    }

    try {
      const url =
        new URL(
          file.duongDan,
        );

      if (
        url.protocol !==
        "https:"
      ) {
        return `Đường dẫn tệp "${file.tenTep}" không hợp lệ`;
      }
    } catch {
      return `Đường dẫn tệp "${file.tenTep}" không hợp lệ`;
    }
  }

  return "";
}

/* =========================================================
   GET /api/ho-tro
========================================================= */

export async function GET(
  request:
    Request,
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

    const currentUser =
      await User.findById(
        session.userId,
      )
        .select(
          "_id role isActive",
        )
        .lean();

    if (!currentUser) {
      return errorResponse(
        "Không tìm thấy tài khoản",
        404,
      );
    }

    if (
      currentUser.isActive ===
      false
    ) {
      return errorResponse(
        "Tài khoản đã ngừng hoạt động",
        403,
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const search =
      searchParams
        .get(
          "search",
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

    const loai =
      searchParams
        .get(
          "loai",
        )
        ?.trim() ||
      "";

    const mucDo =
      searchParams
        .get(
          "mucDo",
        )
        ?.trim() ||
      "";

    const isManager =
      session.role ===
        "ADMIN" ||
      session.role ===
        "BAN_CHAP_HANH";

    const baseFilter:
      Record<
        string,
        unknown
      > = {};

    /*
     * Hội viên và Chi hội trưởng
     * chỉ xem yêu cầu của chính mình.
     */
    if (!isManager) {
      baseFilter.nguoiGuiId =
        currentUser._id;
    }

    const filter:
      Record<
        string,
        unknown
      > = {
      ...baseFilter,
    };

    if (
      trangThai &&
      VALID_STATUSES.includes(
        trangThai as
          TrangThaiHoTro,
      )
    ) {
      filter.trangThai =
        trangThai;
    }

    if (
      loai &&
      VALID_TYPES.includes(
        loai as
          LoaiYeuCauHoTro,
      )
    ) {
      filter.loai =
        loai;
    }

    if (
      mucDo &&
      VALID_PRIORITIES.includes(
        mucDo as
          MucDoUuTien,
      )
    ) {
      filter.mucDo =
        mucDo;
    }

    if (search) {
      filter.$or = [
        {
          maYeuCau: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          tieuDe: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          noiDung: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          nguoiGuiTen: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          nguoiXuLyTen: {
            $regex:
              search,

            $options:
              "i",
          },
        },
      ];
    }

    const [
      data,
      statusRows,
    ] =
      await Promise.all([
        YeuCauHoTro.find(
          filter,
        )
          .sort({
            createdAt:
              -1,
          })
          .lean(),

        YeuCauHoTro.aggregate<{
          _id:
            TrangThaiHoTro;

          total:
            number;
        }>([
          {
            $match:
              baseFilter,
          },

          {
            $group: {
              _id:
                "$trangThai",

              total: {
                $sum:
                  1,
              },
            },
          },
        ]),
      ]);

    const statusMap =
      new Map<
        string,
        number
      >();

    for (
      const row of
      statusRows
    ) {
      statusMap.set(
        row._id,
        row.total,
      );
    }

    const total =
      statusRows.reduce(
        (
          sum,
          row,
        ) =>
          sum +
          row.total,
        0,
      );

    return NextResponse.json({
      success:
        true,

      data,

      summary: {
        total,

        moi:
          statusMap.get(
            "MOI",
          ) ||
          0,

        daTiepNhan:
          statusMap.get(
            "DA_TIEP_NHAN",
          ) ||
          0,

        dangXuLy:
          statusMap.get(
            "DANG_XU_LY",
          ) ||
          0,

        choBoSung:
          statusMap.get(
            "CHO_BO_SUNG",
          ) ||
          0,

        daXuLy:
          statusMap.get(
            "DA_XU_LY",
          ) ||
          0,

        dong:
          statusMap.get(
            "DONG",
          ) ||
          0,
      },

      permissions: {
        canManage:
          isManager,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/ho-tro:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          process.env.NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? error.message
              : "Không thể tải yêu cầu hỗ trợ"
            : "Không thể tải yêu cầu hỗ trợ",
      },
      {
        status:
          500,
      },
    );
  }
}

/* =========================================================
   POST /api/ho-tro
========================================================= */

export async function POST(
  request:
    Request,
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

    let body:
      Record<
        string,
        unknown
      >;

    try {
      body =
        await request.json();
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
      );
    }

    const tieuDe =
      typeof body.tieuDe ===
      "string"
        ? body.tieuDe.trim()
        : "";

    const noiDung =
      typeof body.noiDung ===
      "string"
        ? body.noiDung.trim()
        : "";

    const loai:
      LoaiYeuCauHoTro =
      VALID_TYPES.includes(
        body.loai as
          LoaiYeuCauHoTro,
      )
        ? body.loai as
            LoaiYeuCauHoTro
        : "KHAC";

    const mucDo:
      MucDoUuTien =
      VALID_PRIORITIES.includes(
        body.mucDo as
          MucDoUuTien,
      )
        ? body.mucDo as
            MucDoUuTien
        : "TRUNG_BINH";

    const tepDinhKem =
      parseAttachments(
        body.tepDinhKem,
      );

    if (!tieuDe) {
      return errorResponse(
        "Tiêu đề không được để trống",
      );
    }

    if (
      tieuDe.length >
      255
    ) {
      return errorResponse(
        "Tiêu đề không được vượt quá 255 ký tự",
      );
    }

    if (!noiDung) {
      return errorResponse(
        "Nội dung hỗ trợ không được để trống",
      );
    }

    if (
      noiDung.length >
      5000
    ) {
      return errorResponse(
        "Nội dung hỗ trợ không được vượt quá 5000 ký tự",
      );
    }

    const attachmentError =
      validateAttachments(
        tepDinhKem,
      );

    if (
      attachmentError
    ) {
      return errorResponse(
        attachmentError,
      );
    }

    await connectDB();

    const user =
      await User.findById(
        session.userId,
      );

    if (!user) {
      return errorResponse(
        "Không tìm thấy tài khoản",
        404,
      );
    }

    if (
      user.isActive ===
      false
    ) {
      return errorResponse(
        "Tài khoản đã ngừng hoạt động",
        403,
      );
    }

    let maYeuCau =
      "";

    for (
      let attempt =
        0;
      attempt <
      5;
      attempt +=
        1
    ) {
      const candidate =
        createTicketCode();

      const exists =
        await YeuCauHoTro.exists({
          maYeuCau:
            candidate,
        });

      if (!exists) {
        maYeuCau =
          candidate;

        break;
      }
    }

    if (!maYeuCau) {
      return errorResponse(
        "Không thể tạo mã yêu cầu hỗ trợ",
        500,
      );
    }

    const record =
      await YeuCauHoTro.create({
        maYeuCau,

        tieuDe,

        noiDung,

        loai,

        mucDo,

        trangThai:
          "MOI",

        nguoiGuiId:
          user._id,

        nguoiGuiTen:
          user.fullName,

        nguoiGuiVaiTro:
          user.role,

        chiHoiId:
          user.chiHoiId ||
          null,

        nguoiXuLyId:
          null,

        nguoiXuLyTen:
          "",

        tepDinhKem,

        phanHoi:
          [],

        lichSuXuLy: [
          {
            nguoiThucHienId:
              user._id,

            nguoiThucHienTen:
              user.fullName,

            vaiTro:
              user.role,

            hanhDong:
              "TAO_YEU_CAU",

            trangThaiCu:
              null,

            trangThaiMoi:
              "MOI",

            ghiChu:
              tepDinhKem.length >
              0
                ? `Tạo yêu cầu hỗ trợ kèm ${tepDinhKem.length} tệp`
                : "Tạo yêu cầu hỗ trợ",

            createdAt:
              new Date(),
          },
        ],
      });

    await writeSystemLog({
      userId:
        user._id.toString(),

      username:
        user.username,

      fullName:
        user.fullName,

      role:
        user.role,

      action:
        "CREATE",

      module:
        "HO_TRO",

      description:
        `${user.fullName} tạo yêu cầu hỗ trợ ${record.maYeuCau}`,

      targetId:
        record._id.toString(),

      targetName:
        record.tieuDe,

      metadata: {
        maYeuCau:
          record.maYeuCau,

        loai:
          record.loai,

        mucDo:
          record.mucDo,

        soTepDinhKem:
          tepDinhKem.length,
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
          "Gửi yêu cầu hỗ trợ thành công",

        data:
          record,
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
      "POST /api/ho-tro:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          process.env.NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? error.message
              : "Không thể gửi yêu cầu hỗ trợ"
            : "Không thể gửi yêu cầu hỗ trợ",
      },
      {
        status:
          500,
      },
    );
  }
}