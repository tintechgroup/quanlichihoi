import mongoose, {
  type QueryFilter,
  Types,
} from "mongoose";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import { getCurrentSession } from "@/lib/session";

import {
  getRequestIp,
  getUserAgent,
  writeSystemLog,
} from "@/lib/systemLog";

import ChiHoi from "@/models/ChiHoi";

import HoatDong, {
  type IHoatDong,
} from "@/models/HoatDong";

import HoiVien from "@/models/HoiVien";

import User from "@/models/User";

export const dynamic =
  "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type PhamViHoatDong =
  | "LIEN_CHI_HOI"
  | "CHI_HOI";

type FileKeHoachBody = {
  tenTep?: string;

  duongDan?: string;

  pathname?: string;

  mimeType?: string;

  kichThuoc?:
    | number
    | string;
};

type CreateHoatDongBody = {
  maHoatDong?: string;

  tenHoatDong?: string;

  moTa?: string;

  noiDung?: string;

  /*
   * Field mới:
   * đề xuất hoạt động Chi hội.
   */
  mucDich?: string;

  phamVi?: PhamViHoatDong;

  chiHoiId?: string;

  donViToChuc?: string;

  diaDiem?: string;

  thoiGianBatDau?: string;

  thoiGianKetThuc?: string;

  hanDangKy?: string;

  soLuongToiDa?:
    | number
    | string;

  /*
   * Field mới:
   * dự trù kinh phí.
   */
  duTruKinhPhi?:
    | number
    | string;

  /*
   * Field mới:
   * metadata file kế hoạch
   * đã upload lên Private Vercel Blob.
   */
  fileKeHoach?:
    | FileKeHoachBody
    | null;

  /*
   * Không tin field này từ client
   * đối với Chi hội trưởng.
   *
   * Server sẽ tự quyết định.
   */
  laDeXuatChiHoi?: boolean;
};

/* =========================================================
   CONSTANTS
========================================================= */

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

/*
 * Đồng bộ model HoatDong mới.
 */
const TRANG_THAI_HOP_LE = [
  "CHO_DUYET",

  "DA_DUYET",

  "TU_CHOI",

  "SAP_DIEN_RA",

  "DANG_DIEN_RA",

  "DA_KET_THUC",

  "DA_HUY",
];

/*
 * Hoạt động Hội viên thường
 * được phép xem.
 *
 * Không đưa CHO_DUYET/TU_CHOI
 * ra công khai cho Hội viên.
 */
const TRANG_THAI_CONG_KHAI:
  IHoatDong["trangThai"][] =
  [
    "DA_DUYET",

    "SAP_DIEN_RA",

    "DANG_DIEN_RA",

    "DA_KET_THUC",
  ];

const MAX_FILE_KE_HOACH_SIZE =
  10 * 1024 * 1024;

const FILE_KE_HOACH_EXTENSIONS =
  new Set([
    "pdf",

    "doc",
    "docx",

    "xls",
    "xlsx",

    "ppt",
    "pptx",

    "png",
    "jpg",
    "jpeg",
  ]);

/* =========================================================
   HELPERS
========================================================= */

function layChuoi(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function escapeRegExp(
  value: string,
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function layDuoiFile(
  filename: string,
) {
  return (
    filename
      .split(".")
      .pop()
      ?.toLowerCase() ||
    ""
  );
}

/* =========================================================
   ERROR
========================================================= */

function layThongBaoLoi(
  error: unknown,
) {
  if (
    error instanceof
    mongoose.Error
      .ValidationError
  ) {
    const loiDauTien =
      Object.values(
        error.errors,
      )[0];

    return (
      loiDauTien?.message ||
      "Dữ liệu hoạt động không hợp lệ"
    );
  }

  if (
    error &&
    typeof error ===
      "object" &&
    "code" in error &&
    error.code === 11000
  ) {
    return "Mã hoạt động đã tồn tại";
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Đã xảy ra lỗi không xác định";
}

function laLoiTrungDuLieu(
  error: unknown,
) {
  return Boolean(
    error &&
      typeof error ===
        "object" &&
      "code" in error &&
      error.code ===
        11000,
  );
}

/* =========================================================
   PARSE FILE KẾ HOẠCH
========================================================= */

function parseFileKeHoach(
  value:
    | FileKeHoachBody
    | null
    | undefined,
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  const tenTep =
    layChuoi(
      value.tenTep,
    );

  const duongDan =
    layChuoi(
      value.duongDan,
    );

  const pathname =
    layChuoi(
      value.pathname,
    );

  const mimeType =
    layChuoi(
      value.mimeType,
    );

  const rawSize =
    Number(
      value.kichThuoc ??
        0,
    );

  const kichThuoc =
    Number.isFinite(
      rawSize,
    )
      ? rawSize
      : 0;

  if (
    !tenTep ||
    !duongDan
  ) {
    return null;
  }

  return {
    tenTep,

    duongDan,

    pathname,

    mimeType,

    kichThuoc,
  };
}

/* =========================================================
   VALIDATE FILE KẾ HOẠCH
========================================================= */

function validateFileKeHoach(
  file:
    ReturnType<
      typeof parseFileKeHoach
    >,
) {
  if (!file) {
    return "";
  }

  const extension =
    layDuoiFile(
      file.tenTep,
    );

  if (
    !FILE_KE_HOACH_EXTENSIONS.has(
      extension,
    )
  ) {
    return (
      "File kế hoạch chỉ hỗ trợ PDF, Word, Excel, PowerPoint hoặc ảnh"
    );
  }

  if (
    file.kichThuoc <
    0
  ) {
    return "Kích thước file kế hoạch không hợp lệ";
  }

  if (
    file.kichThuoc >
    MAX_FILE_KE_HOACH_SIZE
  ) {
    return "File kế hoạch không được vượt quá 10MB";
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
      return "Đường dẫn file kế hoạch không hợp lệ";
    }
  } catch {
    return "Đường dẫn file kế hoạch không hợp lệ";
  }

  return "";
}

/* =========================================================
   RESOLVE CHI HỘI CỦA TÀI KHOẢN
========================================================= */

/*
 * Kiến trúc hiện tại:
 *
 * CHI_HOI_TRUONG:
 *   User.chiHoiId là nguồn chính.
 *
 * HOI_VIEN:
 *   HoiVien.chiHoiId là nguồn chính.
 *
 * Có fallback để tương thích
 * dữ liệu cũ.
 */
async function layChiHoiIdCuaTaiKhoan({
  userId,

  role,
}: {
  userId: string;

  role: string;
}) {
  if (
    !Types.ObjectId.isValid(
      userId,
    )
  ) {
    return null;
  }

  /* =======================================================
     CHI HỘI TRƯỞNG
  ======================================================= */

  if (
    role ===
    "CHI_HOI_TRUONG"
  ) {
    /*
     * Nguồn chính:
     * User.chiHoiId
     */
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
      return new Types.ObjectId(
        String(
          user.chiHoiId,
        ),
      );
    }

    /*
     * Fallback dữ liệu cũ.
     */
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
      return new Types.ObjectId(
        String(
          hoiVien.chiHoiId,
        ),
      );
    }

    return null;
  }

  /* =======================================================
     HỘI VIÊN
  ======================================================= */

  if (
    role ===
    "HOI_VIEN"
  ) {
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
      return new Types.ObjectId(
        String(
          hoiVien.chiHoiId,
        ),
      );
    }

    /*
     * Fallback User.chiHoiId
     * cho tài khoản cũ.
     */
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
      return new Types.ObjectId(
        String(
          user.chiHoiId,
        ),
      );
    }
  }

  return null;
}

/* =========================================================
   GET: LẤY DANH SÁCH HOẠT ĐỘNG
========================================================= */

export async function GET(
  request: Request,
) {
  try {
    /* =====================================================
       SESSION
    ===================================================== */

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

    if (
      !session.userId ||
      !Types.ObjectId.isValid(
        session.userId,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Thông tin tài khoản đăng nhập không hợp lệ",
        },
        {
          status: 401,
        },
      );
    }

    await connectDB();

    /* =====================================================
       QUERY PARAMS
    ===================================================== */

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const search =
      searchParams
        .get("search")
        ?.trim() ||
      "";

    const phamVi =
      searchParams
        .get("phamVi")
        ?.trim() ||
      "";

    const trangThai =
      searchParams
        .get("trangThai")
        ?.trim() ||
      "";

    const chiHoiId =
      searchParams
        .get("chiHoiId")
        ?.trim() ||
      "";

    /*
     * Field mới:
     *
     * /api/hoat-dong?laDeXuatChiHoi=true
     */
    const laDeXuatChiHoi =
      searchParams
        .get(
          "laDeXuatChiHoi",
        )
        ?.trim() ||
      "";

    const dieuKien:
      QueryFilter<IHoatDong>[] =
      [];

    /* =====================================================
       SEARCH
    ===================================================== */

    if (search) {
      const keyword =
        new RegExp(
          escapeRegExp(
            search,
          ),

          "i",
        );

      dieuKien.push({
        $or: [
          {
            maHoatDong:
              keyword,
          },

          {
            tenHoatDong:
              keyword,
          },

          /*
           * Field mới.
           */
          {
            mucDich:
              keyword,
          },

          {
            moTa:
              keyword,
          },

          {
            noiDung:
              keyword,
          },

          {
            donViToChuc:
              keyword,
          },

          {
            diaDiem:
              keyword,
          },
        ],
      });
    }

    /* =====================================================
       FILTER PHẠM VI
    ===================================================== */

    if (
      phamVi &&
      PHAM_VI_HOP_LE.includes(
        phamVi,
      )
    ) {
      dieuKien.push({
        phamVi:
          phamVi as
            PhamViHoatDong,
      });
    }

    /* =====================================================
       FILTER TRẠNG THÁI
    ===================================================== */

    if (
      trangThai &&
      TRANG_THAI_HOP_LE.includes(
        trangThai,
      )
    ) {
      dieuKien.push({
        trangThai:
          trangThai as
            IHoatDong["trangThai"],
      });
    }

    /* =====================================================
       FILTER CHI HỘI
    ===================================================== */

    if (chiHoiId) {
      if (
        !Types.ObjectId.isValid(
          chiHoiId,
        )
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Mã Chi hội lọc không hợp lệ",
          },
          {
            status:
              400,
          },
        );
      }

      dieuKien.push({
        chiHoiId:
          new Types.ObjectId(
            chiHoiId,
          ),
      });
    }

    /* =====================================================
       FILTER ĐỀ XUẤT
    ===================================================== */

    if (
      laDeXuatChiHoi ===
        "true" ||
      laDeXuatChiHoi ===
        "false"
    ) {
      dieuKien.push({
        laDeXuatChiHoi:
          laDeXuatChiHoi ===
          "true",
      });
    }

    /* =====================================================
       PHÂN QUYỀN HỘI VIÊN
    ===================================================== */

    /*
     * Hội viên thường chỉ thấy
     * hoạt động đã công khai.
     *
     * Chi hội trưởng phải thấy
     * CHO_DUYET/TU_CHOI của chính
     * Chi hội mình để theo dõi đề xuất.
     */
    if (
      !VAI_TRO_QUAN_LY.includes(
        session.role,
      ) &&
      session.role !==
        "CHI_HOI_TRUONG"
    ) {
      dieuKien.push({
        trangThai: {
          $in:
            TRANG_THAI_CONG_KHAI,
        },
      });
    }

    /* =====================================================
       PHÂN QUYỀN THEO CHI HỘI
    ===================================================== */

    if (
      session.role ===
        "CHI_HOI_TRUONG" ||
      session.role ===
        "HOI_VIEN"
    ) {
      const chiHoiTaiKhoanId =
        await layChiHoiIdCuaTaiKhoan(
          {
            userId:
              session.userId,

            role:
              session.role,
          },
        );

      /*
       * Chi hội trưởng bắt buộc
       * phải có Chi hội.
       */
      if (
        session.role ===
          "CHI_HOI_TRUONG" &&
        !chiHoiTaiKhoanId
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Tài khoản Chi hội trưởng chưa được liên kết với Chi hội",
          },
          {
            status:
              403,
          },
        );
      }

      if (
        chiHoiTaiKhoanId
      ) {
        dieuKien.push({
          $or: [
            /*
             * Hoạt động chung
             * toàn Liên Chi hội.
             */
            {
              phamVi:
                "LIEN_CHI_HOI",
            },

            /*
             * Hoạt động đúng
             * Chi hội của tài khoản.
             */
            {
              phamVi:
                "CHI_HOI",

              chiHoiId:
                chiHoiTaiKhoanId,
            },
          ],
        });
      } else {
        /*
         * Hội viên chưa có Chi hội:
         * chỉ thấy hoạt động chung.
         */
        dieuKien.push({
          phamVi:
            "LIEN_CHI_HOI",
        });
      }
    }

    /* =====================================================
       QUERY
    ===================================================== */

    const query:
      QueryFilter<IHoatDong> =
      dieuKien.length >
      0
        ? {
            $and:
              dieuKien,
          }
        : {};

    const danhSach =
      await HoatDong.find(
        query,
      )
        .populate({
          path:
            "chiHoiId",

          model:
            ChiHoi,

          select:
            "maChiHoi tenChiHoi",
        })
        .populate({
          path:
            "nguoiTaoId",

          model:
            User,

          select:
            "username fullName role",
        })
        .populate({
          path:
            "nguoiDuyetId",

          model:
            User,

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

      data: {
        danhSach,

        total:
          danhSach.length,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/hoat-dong:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          process.env
            .NODE_ENV ===
          "development"
            ? `Không thể lấy danh sách hoạt động: ${layThongBaoLoi(
                error,
              )}`
            : "Đã xảy ra lỗi khi lấy danh sách hoạt động",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST: TẠO HOẠT ĐỘNG / ĐỀ XUẤT
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       SESSION
    ===================================================== */

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

    if (
      !VAI_TRO_DUOC_TAO.includes(
        session.role,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền tạo hoạt động",
        },
        {
          status: 403,
        },
      );
    }

    if (
      !session.userId ||
      !Types.ObjectId.isValid(
        session.userId,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Thông tin tài khoản đăng nhập không hợp lệ",
        },
        {
          status: 401,
        },
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body:
      CreateHoatDongBody;

    try {
      body =
        (await request.json()) as
          CreateHoatDongBody;
    } catch {
      return NextResponse.json(
        {
          success: false,

          message:
            "Dữ liệu gửi lên không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       BASIC DATA
    ===================================================== */

    const maHoatDong =
      layChuoi(
        body.maHoatDong,
      ).toUpperCase();

    const tenHoatDong =
      layChuoi(
        body.tenHoatDong,
      );

    const moTa =
      layChuoi(
        body.moTa,
      );

    const noiDung =
      layChuoi(
        body.noiDung,
      );

    const mucDich =
      layChuoi(
        body.mucDich,
      );

    let phamVi =
      layChuoi(
        body.phamVi,
      ).toUpperCase();

    let chiHoiId =
      layChuoi(
        body.chiHoiId,
      );

    let donViToChuc =
      layChuoi(
        body.donViToChuc,
      );

    const diaDiem =
      layChuoi(
        body.diaDiem,
      );

    const thoiGianBatDauChuoi =
      layChuoi(
        body.thoiGianBatDau,
      );

    const thoiGianKetThucChuoi =
      layChuoi(
        body.thoiGianKetThuc,
      );

    const hanDangKyChuoi =
      layChuoi(
        body.hanDangKy,
      );

    const fileKeHoach =
      parseFileKeHoach(
        body.fileKeHoach,
      );

    /* =====================================================
       PHÂN LOẠI NGƯỜI TẠO
    ===================================================== */

    const laAdmin =
      session.role ===
      "ADMIN";

    const laBanChapHanh =
      session.role ===
      "BAN_CHAP_HANH";

    const laChiHoiTruong =
      session.role ===
      "CHI_HOI_TRUONG";

    /*
     * CHT luôn tạo ĐỀ XUẤT cấp Chi hội.
     *
     * Không tin:
     * - phamVi client gửi
     * - chiHoiId client gửi
     * - laDeXuatChiHoi client gửi
     */
    const laDeXuatChiHoi =
      laChiHoiTruong;

    /* =====================================================
       VALIDATION CƠ BẢN
    ===================================================== */

    if (!maHoatDong) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Mã hoạt động không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (!tenHoatDong) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Tên hoạt động không được để trống",
        },
        {
          status: 400,
        },
      );
    }

    if (!diaDiem) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Địa điểm không được để trống",
        },
        {
          status: 400,
        },
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
        {
          status: 400,
        },
      );
    }

    /*
     * Admin/BCH:
     * vẫn được chọn phạm vi.
     *
     * Chi hội trưởng:
     * server khóa CHI_HOI bên dưới.
     */
    if (
      !laChiHoiTruong &&
      !PHAM_VI_HOP_LE.includes(
        phamVi,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Phạm vi hoạt động không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       DATE
    ===================================================== */

    const thoiGianBatDau =
      new Date(
        thoiGianBatDauChuoi,
      );

    const thoiGianKetThuc =
      new Date(
        thoiGianKetThucChuoi,
      );

    const hanDangKy =
      hanDangKyChuoi
        ? new Date(
            hanDangKyChuoi,
          )
        : null;

    if (
      Number.isNaN(
        thoiGianBatDau.getTime(),
      ) ||
      Number.isNaN(
        thoiGianKetThuc.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Thời gian hoạt động không hợp lệ",
        },
        {
          status: 400,
        },
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
        {
          status: 400,
        },
      );
    }

    if (
      hanDangKy &&
      Number.isNaN(
        hanDangKy.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Hạn đăng ký không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (
      hanDangKy &&
      hanDangKy >
        thoiGianBatDau
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Hạn đăng ký không được sau thời gian bắt đầu",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       SỐ LƯỢNG
    ===================================================== */

    let soLuongToiDa:
      | number
      | null = null;

    if (
      body.soLuongToiDa !==
        undefined &&
      body.soLuongToiDa !==
        null &&
      body.soLuongToiDa !==
        ""
    ) {
      soLuongToiDa =
        Number(
          body.soLuongToiDa,
        );

      if (
        !Number.isInteger(
          soLuongToiDa,
        ) ||
        soLuongToiDa <=
          0
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Số lượng tối đa phải là số nguyên lớn hơn 0",
          },
          {
            status:
              400,
          },
        );
      }
    }

    /* =====================================================
       DỰ TRÙ KINH PHÍ
    ===================================================== */

    let duTruKinhPhi =
      0;

    if (
      body.duTruKinhPhi !==
        undefined &&
      body.duTruKinhPhi !==
        null &&
      body.duTruKinhPhi !==
        ""
    ) {
      duTruKinhPhi =
        Number(
          body.duTruKinhPhi,
        );

      if (
        !Number.isFinite(
          duTruKinhPhi,
        ) ||
        duTruKinhPhi <
          0
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Dự trù kinh phí không hợp lệ",
          },
          {
            status:
              400,
          },
        );
      }
    }

    /* =====================================================
       FILE KẾ HOẠCH
    ===================================================== */

    const fileError =
      validateFileKeHoach(
        fileKeHoach,
      );

    if (fileError) {
      return NextResponse.json(
        {
          success: false,

          message:
            fileError,
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       ĐỀ XUẤT CỦA CHI HỘI TRƯỞNG
    ===================================================== */

    if (
      laChiHoiTruong
    ) {
      /*
       * Không cho client
       * giả mạo phạm vi.
       */
      phamVi =
        "CHI_HOI";

      /*
       * Đúng yêu cầu:
       * phải nhập mục đích.
       */
      if (!mucDich) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Vui lòng nhập mục đích hoạt động",
          },
          {
            status:
              400,
          },
        );
      }

      /*
       * Đề xuất phải có
       * file kế hoạch.
       */
      if (!fileKeHoach) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Vui lòng đính kèm file kế hoạch hoạt động",
          },
          {
            status:
              400,
          },
        );
      }
    }

    /* =====================================================
       DATABASE
    ===================================================== */

    await connectDB();

    /* =====================================================
       USER EXISTS
    ===================================================== */

    const currentUser =
      await User.findById(
        session.userId,
      )
        .select(
          "_id username fullName role chiHoiId",
        )
        .lean();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy tài khoản hiện tại",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       DUPLICATE CODE
    ===================================================== */

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
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       CHI HỘI
    ===================================================== */

    let chiHoiObjectId:
      | Types.ObjectId
      | null = null;

    let chiHoiDocument:
      | {
          _id: Types.ObjectId;

          maChiHoi?: string;

          tenChiHoi?: string;
        }
      | null = null;

    /* =====================================================
       CHI HỘI TRƯỞNG
    ===================================================== */

    if (
      laChiHoiTruong
    ) {
      /*
       * Server tự lấy Chi hội
       * từ tài khoản.
       *
       * Body chiHoiId bị bỏ qua.
       */
      const chiHoiTaiKhoanId =
        await layChiHoiIdCuaTaiKhoan(
          {
            userId:
              session.userId,

            role:
              session.role,
          },
        );

      if (
        !chiHoiTaiKhoanId
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Tài khoản Chi hội trưởng chưa được liên kết với Chi hội",
          },
          {
            status:
              403,
          },
        );
      }

      chiHoiObjectId =
        chiHoiTaiKhoanId;

      chiHoiId =
        chiHoiTaiKhoanId.toString();

      chiHoiDocument =
        await ChiHoi.findById(
          chiHoiTaiKhoanId,
        )
          .select(
            "_id maChiHoi tenChiHoi",
          )
          .lean();

      if (!chiHoiDocument) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Không tìm thấy Chi hội của tài khoản",
          },
          {
            status:
              404,
          },
        );
      }

      /*
       * Nếu CHT không nhập
       * đơn vị tổ chức,
       * mặc định lấy tên Chi hội.
       */
      if (
        !donViToChuc
      ) {
        donViToChuc =
          chiHoiDocument.tenChiHoi ||
          "";
      }
    }

    /* =====================================================
       ADMIN / BCH
    ===================================================== */

    if (
      !laChiHoiTruong &&
      phamVi ===
        "CHI_HOI"
    ) {
      if (
        !chiHoiId ||
        !Types.ObjectId.isValid(
          chiHoiId,
        )
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Vui lòng chọn Chi hội hợp lệ",
          },
          {
            status:
              400,
          },
        );
      }

      chiHoiDocument =
        await ChiHoi.findById(
          chiHoiId,
        )
          .select(
            "_id maChiHoi tenChiHoi",
          )
          .lean();

      if (!chiHoiDocument) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Không tìm thấy Chi hội đã chọn",
          },
          {
            status:
              404,
          },
        );
      }

      chiHoiObjectId =
        new Types.ObjectId(
          chiHoiId,
        );
    }

    if (
      phamVi ===
      "LIEN_CHI_HOI"
    ) {
      chiHoiObjectId =
        null;
    }

    /* =====================================================
       TRẠNG THÁI BAN ĐẦU
    ===================================================== */

    /*
     * Giữ logic đang chạy:
     *
     * ADMIN:
     *   tạo -> DA_DUYET
     *
     * BCH:
     *   tạo -> CHO_DUYET
     *
     * CHI_HOI_TRUONG:
     *   gửi đề xuất -> CHO_DUYET
     */
    const trangThaiBanDau:
      IHoatDong["trangThai"] =
      laAdmin
        ? "DA_DUYET"
        : "CHO_DUYET";

    /* =====================================================
       CREATE
    ===================================================== */

    const hoatDong =
      await HoatDong.create({
        maHoatDong,

        tenHoatDong,

        moTa,

        noiDung,

        mucDich,

        phamVi:
          phamVi as
            PhamViHoatDong,

        chiHoiId:
          chiHoiObjectId,

        donViToChuc,

        diaDiem,

        thoiGianBatDau,

        thoiGianKetThuc,

        hanDangKy,

        soLuongToiDa,

        /*
         * Field mới.
         */
        duTruKinhPhi,

        /*
         * Field mới.
         */
        fileKeHoach,

        /*
         * CHT => true.
         *
         * Admin/BCH tạo hoạt động
         * bình thường => false.
         */
        laDeXuatChiHoi,

        trangThai:
          trangThaiBanDau,

        nguoiTaoId:
          new Types.ObjectId(
            session.userId,
          ),

        /*
         * Admin tạo thì
         * tự duyệt.
         */
        nguoiDuyetId:
          laAdmin
            ? new Types.ObjectId(
                session.userId,
              )
            : null,

        /*
         * Chỉ đề xuất Chi hội
         * có thời điểm gửi phê duyệt.
         */
        ngayGuiPheDuyet:
          laDeXuatChiHoi
            ? new Date()
            : null,

        ngayDuyet:
          laAdmin
            ? new Date()
            : null,

        lyDoTuChoi:
          "",

        lyDoHuy:
          "",
      });

    /* =====================================================
       SYSTEM LOG
    ===================================================== */

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
        laDeXuatChiHoi
          ? `${session.fullName} đã gửi đề xuất hoạt động ${maHoatDong} - ${tenHoatDong}`
          : `${session.fullName} đã tạo hoạt động ${maHoatDong} - ${tenHoatDong}`,

      targetId:
        hoatDong._id.toString(),

      targetName:
        `${maHoatDong} - ${tenHoatDong}`,

      metadata: {
        phamVi,

        chiHoiId:
          chiHoiObjectId
            ? chiHoiObjectId.toString()
            : null,

        laDeXuatChiHoi,

        duTruKinhPhi,

        trangThai:
          trangThaiBanDau,

        fileKeHoach:
          fileKeHoach
            ? {
                tenTep:
                  fileKeHoach.tenTep,

                pathname:
                  fileKeHoach.pathname,

                kichThuoc:
                  fileKeHoach.kichThuoc,
              }
            : null,
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

    /* =====================================================
       POPULATE
    ===================================================== */

    const ketQua =
      await HoatDong.findById(
        hoatDong._id,
      )
        .populate({
          path:
            "chiHoiId",

          model:
            ChiHoi,

          select:
            "maChiHoi tenChiHoi",
        })
        .populate({
          path:
            "nguoiTaoId",

          model:
            User,

          select:
            "username fullName role",
        })
        .populate({
          path:
            "nguoiDuyetId",

          model:
            User,

          select:
            "username fullName role",
        })
        .lean();

    /* =====================================================
       RESPONSE
    ===================================================== */

    let successMessage =
      "Tạo hoạt động thành công, đang chờ phê duyệt";

    if (laAdmin) {
      successMessage =
        "Tạo và phê duyệt hoạt động thành công";
    } else if (
      laChiHoiTruong
    ) {
      successMessage =
        "Gửi đề xuất hoạt động thành công, đang chờ Ban Chấp hành phê duyệt";
    } else if (
      laBanChapHanh
    ) {
      successMessage =
        "Tạo hoạt động thành công, đang chờ phê duyệt";
    }

    return NextResponse.json(
      {
        success: true,

        message:
          successMessage,

        data:
          ketQua,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/hoat-dong:",
      error,
    );

    const duplicate =
      laLoiTrungDuLieu(
        error,
      );

    const validation =
      error instanceof
      mongoose.Error
        .ValidationError;

    return NextResponse.json(
      {
        success: false,

        message:
          duplicate
            ? "Mã hoạt động đã tồn tại"
            : validation
              ? layThongBaoLoi(
                  error,
                )
              : process.env
                    .NODE_ENV ===
                  "development"
                ? `Không thể tạo hoạt động: ${layThongBaoLoi(
                    error,
                  )}`
                : "Đã xảy ra lỗi khi tạo hoạt động",
      },
      {
        status:
          duplicate
            ? 409
            : validation
              ? 400
              : 500,
      },
    );
  }
}