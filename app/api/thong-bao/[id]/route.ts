import {
  NextResponse,
} from "next/server";

import mongoose, {
  Types,
} from "mongoose";

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

import ThongBao from "@/models/ThongBao";
import User from "@/models/User";
import ChiHoi from "@/models/ChiHoi";
import HoiVien from "@/models/HoiVien";

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

type LoaiThongBao =
  | "THONG_BAO_CHUNG"
  | "HOAT_DONG"
  | "TAI_LIEU"
  | "KHAC";

type MucDo =
  | "THONG_THUONG"
  | "QUAN_TRONG"
  | "KHAN_CAP";

type PhamVi =
  | "TAT_CA"
  | "CHI_HOI"
  | "VAI_TRO"
  | "CA_NHAN";

type TrangThai =
  | "NHAP"
  | "CHO_DUYET"
  | "DA_DANG"
  | "TU_CHOI"
  | "DA_AN";

interface SessionUser {
  userId: string;

  username?: string;

  fullName?: string;

  role: UserRole;
}

interface RouteContext {
  params:
    Promise<{
      id: string;
    }>;
}

interface TepDinhKemInput {
  tenTep?: unknown;

  duongDan?: unknown;

  loaiTep?: unknown;

  kichThuoc?: unknown;
}

interface UpdateThongBaoBody {
  tieuDe?: unknown;

  noiDung?: unknown;

  loaiThongBao?: unknown;

  mucDo?: unknown;

  phamVi?: unknown;

  chiHoiIds?: unknown;

  vaiTroNguoiNhan?: unknown;

  nguoiNhanIds?: unknown;

  tepDinhKem?: unknown;

  ngayBatDau?: unknown;

  ngayKetThuc?: unknown;

  trangThai?: unknown;
}

/* =========================================================
   CONSTANTS
========================================================= */

const ROLES: UserRole[] = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
  "HOI_VIEN",
];

const MANAGER_ROLES: UserRole[] = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const LOAI_THONG_BAO:
  LoaiThongBao[] = [
    "THONG_BAO_CHUNG",
    "HOAT_DONG",
    "TAI_LIEU",
    "KHAC",
  ];

const MUC_DO: MucDo[] = [
  "THONG_THUONG",
  "QUAN_TRONG",
  "KHAN_CAP",
];

const PHAM_VI: PhamVi[] = [
  "TAT_CA",
  "CHI_HOI",
  "VAI_TRO",
  "CA_NHAN",
];

const TRANG_THAI:
  TrangThai[] = [
    "NHAP",
    "CHO_DUYET",
    "DA_DANG",
    "TU_CHOI",
    "DA_AN",
  ];

const MAX_FILE_COUNT =
  5;

const MAX_FILE_SIZE =
  10 *
  1024 *
  1024;

/* =========================================================
   HELPERS
========================================================= */

function responseError(
  message: string,
  status = 400,
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
    },
  );
}

function normalizeString(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function isManager(
  role: UserRole,
) {
  return MANAGER_ROLES.includes(
    role,
  );
}

/* =========================================================
   SESSION
========================================================= */

function normalizeSession(
  rawSession:
    unknown,
):
  SessionUser | null {
  if (
    !rawSession ||
    typeof rawSession !==
      "object"
  ) {
    return null;
  }

  const session =
    rawSession as Record<
      string,
      unknown
    >;

  const nestedUser =
    session.user &&
    typeof session.user ===
      "object"
      ? session.user as Record<
          string,
          unknown
        >
      : {};

  const userId =
    String(
      session.userId ??
        session.id ??
        session._id ??
        nestedUser.userId ??
        nestedUser.id ??
        nestedUser._id ??
        "",
    );

  const role =
    String(
      session.role ??
        nestedUser.role ??
        "",
    ) as UserRole;

  if (
    !userId ||
    !Types.ObjectId.isValid(
      userId,
    )
  ) {
    return null;
  }

  if (
    !ROLES.includes(
      role,
    )
  ) {
    return null;
  }

  return {
    userId,

    role,

    username:
      normalizeString(
        session.username ??
          nestedUser.username,
      ),

    fullName:
      normalizeString(
        session.fullName ??
          session.hoTen ??
          nestedUser.fullName ??
          nestedUser.hoTen,
      ),
  };
}

/* =========================================================
   IDS
========================================================= */

function objectIdToString(
  value:
    unknown,
) {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    value instanceof
    Types.ObjectId
  ) {
    return value.toString();
  }

  if (
    typeof value ===
    "object"
  ) {
    const object =
      value as Record<
        string,
        unknown
      >;

    if (
      object._id
    ) {
      return objectIdToString(
        object._id,
      );
    }

    if (
      object.id
    ) {
      return objectIdToString(
        object.id,
      );
    }
  }

  return String(
    value,
  );
}

function parseObjectIdArray(
  value:
    unknown,
):
  Types.ObjectId[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  const ids =
    new Set<string>();

  value.forEach(
    (
      item,
    ) => {
      let id =
        "";

      if (
        typeof item ===
        "string"
      ) {
        id =
          item.trim();
      } else if (
        item &&
        typeof item ===
          "object"
      ) {
        const object =
          item as Record<
            string,
            unknown
          >;

        id =
          String(
            object.id ??
              object._id ??
              "",
          );
      }

      if (
        Types.ObjectId.isValid(
          id,
        )
      ) {
        ids.add(
          id,
        );
      }
    },
  );

  return Array.from(
    ids,
  ).map(
    (
      id,
    ) =>
      new Types.ObjectId(
        id,
      ),
  );
}

function parseRoleArray(
  value:
    unknown,
):
  UserRole[] {
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
            ).trim() as
              UserRole,
        )
        .filter(
          (
            role,
          ) =>
            ROLES.includes(
              role,
            ),
        ),
    ),
  );
}

/* =========================================================
   DATE
========================================================= */

function parseOptionalDate(
  value:
    unknown,

  fieldName:
    string,
):
  Date | undefined {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ""
  ) {
    return undefined;
  }

  const date =
    new Date(
      String(
        value,
      ),
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      `${fieldName} không hợp lệ`,
    );
  }

  return date;
}

/* =========================================================
   ATTACHMENT
========================================================= */

function parseTepDinhKem(
  value:
    unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  if (
    value.length >
    MAX_FILE_COUNT
  ) {
    throw new Error(
      `Chỉ được đính kèm tối đa ${MAX_FILE_COUNT} tệp`,
    );
  }

  return value.map(
    (
      raw,
      index,
    ) => {
      if (
        !raw ||
        typeof raw !==
          "object"
      ) {
        throw new Error(
          `Tệp đính kèm thứ ${index + 1} không hợp lệ`,
        );
      }

      const item =
        raw as
          TepDinhKemInput;

      const tenTep =
        normalizeString(
          item.tenTep,
        );

      const duongDan =
        normalizeString(
          item.duongDan,
        );

      const loaiTep =
        normalizeString(
          item.loaiTep,
        );

      const rawSize =
        Number(
          item.kichThuoc ??
            0,
        );

      const kichThuoc =
        Number.isFinite(
          rawSize,
        ) &&
        rawSize >=
          0
          ? rawSize
          : 0;

      if (!tenTep) {
        throw new Error(
          `Tên tệp đính kèm thứ ${index + 1} không hợp lệ`,
        );
      }

      if (!duongDan) {
        throw new Error(
          `Đường dẫn tệp “${tenTep}” không hợp lệ`,
        );
      }

      if (
        kichThuoc >
        MAX_FILE_SIZE
      ) {
        throw new Error(
          `Tệp “${tenTep}” vượt quá dung lượng 10 MB`,
        );
      }

      return {
        tenTep,

        duongDan,

        loaiTep:
          loaiTep ||
          undefined,

        kichThuoc,
      };
    },
  );
}

/* =========================================================
   SERIALIZE
========================================================= */

function serializeThongBao(
  raw:
    Record<
      string,
      unknown
    >,

  currentUserId:
    string,
) {
  const nguoiTaoRaw =
    raw.nguoiTaoId &&
    typeof raw.nguoiTaoId ===
      "object" &&
    !(
      raw.nguoiTaoId instanceof
      Types.ObjectId
    )
      ? raw.nguoiTaoId as
          Record<
            string,
            unknown
          >
      : null;

  const nguoiDuyetRaw =
    raw.nguoiDuyetId &&
    typeof raw.nguoiDuyetId ===
      "object" &&
    !(
      raw.nguoiDuyetId instanceof
      Types.ObjectId
    )
      ? raw.nguoiDuyetId as
          Record<
            string,
            unknown
          >
      : null;

  const nguoiDaDocIds =
    Array.isArray(
      raw.nguoiDaDocIds,
    )
      ? raw.nguoiDaDocIds
      : Array.isArray(
          raw.danhSachDaDoc,
        )
        ? raw.danhSachDaDoc
        : [];

  const daDoc =
    nguoiDaDocIds.some(
      (
        item,
      ) =>
        objectIdToString(
          item,
        ) ===
        currentUserId,
    );

  return {
    ...raw,

    id:
      objectIdToString(
        raw._id,
      ),

    _id:
      objectIdToString(
        raw._id,
      ),

    chiHoiIds:
      Array.isArray(
        raw.chiHoiIds,
      )
        ? raw.chiHoiIds.map(
            objectIdToString,
          )
        : [],

    nguoiNhanIds:
      Array.isArray(
        raw.nguoiNhanIds,
      )
        ? raw.nguoiNhanIds.map(
            objectIdToString,
          )
        : [],

    vaiTroNguoiNhan:
      Array.isArray(
        raw.vaiTroNguoiNhan,
      )
        ? raw.vaiTroNguoiNhan
        : [],

    tepDinhKem:
      Array.isArray(
        raw.tepDinhKem,
      )
        ? raw.tepDinhKem
        : [],

    daDoc,

    nguoiTao:
      nguoiTaoRaw
        ? {
            id:
              objectIdToString(
                nguoiTaoRaw._id,
              ),

            username:
              nguoiTaoRaw.username ??
              "",

            fullName:
              nguoiTaoRaw.fullName ??
              nguoiTaoRaw.hoTen ??
              nguoiTaoRaw.username ??
              "",

            role:
              nguoiTaoRaw.role ??
              "",
          }
        : undefined,

    nguoiTaoId:
      objectIdToString(
        nguoiTaoRaw?._id ??
          raw.nguoiTaoId,
      ),

    nguoiDuyet:
      nguoiDuyetRaw
        ? {
            id:
              objectIdToString(
                nguoiDuyetRaw._id,
              ),

            username:
              nguoiDuyetRaw.username ??
              "",

            fullName:
              nguoiDuyetRaw.fullName ??
              nguoiDuyetRaw.hoTen ??
              nguoiDuyetRaw.username ??
              "",

            role:
              nguoiDuyetRaw.role ??
              "",
          }
        : undefined,

    nguoiDuyetId:
      objectIdToString(
        nguoiDuyetRaw?._id ??
          raw.nguoiDuyetId,
      ),
  };
}

/* =========================================================
   CHI HOI CUA USER
========================================================= */

async function getUserChiHoiId(
  session:
    SessionUser,
):
  Promise<
    Types.ObjectId | null
  > {
  /*
   * CHT ưu tiên User.chiHoiId.
   */
  if (
    session.role ===
    "CHI_HOI_TRUONG"
  ) {
    const user =
      await User.findById(
        session.userId,
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

  /*
   * Hội viên ưu tiên HoiVien.
   */
  const hoiVien =
    await HoiVien.findOne({
      taiKhoanId:
        new Types.ObjectId(
          session.userId,
        ),
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
   * Fallback User.chiHoiId.
   */
  const user =
    await User.findById(
      session.userId,
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

  return null;
}

/* =========================================================
   QUYỀN XEM THÔNG BÁO
========================================================= */

async function canViewNotification(
  document:
    Record<
      string,
      unknown
    >,

  session:
    SessionUser,
) {
  /*
   * ADMIN xem mọi record.
   */
  if (
    session.role ===
    "ADMIN"
  ) {
    return true;
  }

  const currentUserId =
    session.userId;

  const creatorId =
    objectIdToString(
      document.nguoiTaoId,
    );

  /*
   * BCH / CHT xem record mình tạo,
   * kể cả NHAP / CHO_DUYET / TU_CHOI.
   */
  if (
    isManager(
      session.role,
    ) &&
    creatorId ===
      currentUserId
  ) {
    return true;
  }

  /*
   * Các record chưa phát hành
   * không được xem bởi người nhận.
   */
  if (
    document.trangThai !==
    "DA_DANG"
  ) {
    return false;
  }

  const now =
    new Date();

  const ngayBatDau =
    document.ngayBatDau
      ? new Date(
          String(
            document.ngayBatDau,
          ),
        )
      : null;

  const ngayKetThuc =
    document.ngayKetThuc
      ? new Date(
          String(
            document.ngayKetThuc,
          ),
        )
      : null;

  if (
    ngayBatDau &&
    !Number.isNaN(
      ngayBatDau.getTime(),
    ) &&
    ngayBatDau >
      now
  ) {
    return false;
  }

  if (
    ngayKetThuc &&
    !Number.isNaN(
      ngayKetThuc.getTime(),
    ) &&
    ngayKetThuc <
      now
  ) {
    return false;
  }

  const phamVi =
    String(
      document.phamVi ??
        "",
    ) as PhamVi;

  if (
    phamVi ===
    "TAT_CA"
  ) {
    return true;
  }

  if (
    phamVi ===
    "VAI_TRO"
  ) {
    const roles =
      Array.isArray(
        document.vaiTroNguoiNhan,
      )
        ? document.vaiTroNguoiNhan.map(
            (
              item,
            ) =>
              String(
                item,
              ),
          )
        : [];

    return roles.includes(
      session.role,
    );
  }

  if (
    phamVi ===
    "CA_NHAN"
  ) {
    const ids =
      Array.isArray(
        document.nguoiNhanIds,
      )
        ? document.nguoiNhanIds.map(
            objectIdToString,
          )
        : [];

    return ids.includes(
      currentUserId,
    );
  }

  if (
    phamVi ===
    "CHI_HOI"
  ) {
    const userChiHoiId =
      await getUserChiHoiId(
        session,
      );

    if (
      !userChiHoiId
    ) {
      return false;
    }

    const branchIds =
      Array.isArray(
        document.chiHoiIds,
      )
        ? document.chiHoiIds.map(
            objectIdToString,
          )
        : [];

    return branchIds.includes(
      userChiHoiId.toString(),
    );
  }

  return false;
}

/* =========================================================
   GET /api/thong-bao/[id]
========================================================= */

export async function GET(
  _request:
    Request,

  context:
    RouteContext,
) {
  try {
    const session =
      normalizeSession(
        await getCurrentSession(),
      );

    if (!session) {
      return responseError(
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        401,
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
        "Mã thông báo không hợp lệ",
        400,
      );
    }

    await connectDB();

    void User;
    void ChiHoi;
    void HoiVien;

    const document =
      await ThongBao.findById(
        id,
      )
        .populate({
          path:
            "nguoiTaoId",

          select:
            "username fullName hoTen role",
        })
        .populate({
          path:
            "nguoiDuyetId",

          select:
            "username fullName hoTen role",
        })
        .lean();

    if (!document) {
      return responseError(
        "Không tìm thấy thông báo",
        404,
      );
    }

    const allowed =
      await canViewNotification(
        document as unknown as
          Record<
            string,
            unknown
          >,
        session,
      );

    if (!allowed) {
      return responseError(
        "Bạn không có quyền xem thông báo này",
        403,
      );
    }

    return NextResponse.json({
      success:
        true,

      message:
        "Lấy chi tiết thông báo thành công",

      data: {
        thongBao:
          serializeThongBao(
            document as unknown as
              Record<
                string,
                unknown
              >,
            session.userId,
          ),
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/thong-bao/[id]:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể lấy chi tiết thông báo",
      500,
    );
  }
}

/* =========================================================
   PUT /api/thong-bao/[id]
========================================================= */

export async function PUT(
  request:
    Request,

  context:
    RouteContext,
) {
  try {
    const session =
      normalizeSession(
        await getCurrentSession(),
      );

    if (!session) {
      return responseError(
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        401,
      );
    }

    if (
      !isManager(
        session.role,
      )
    ) {
      return responseError(
        "Bạn không có quyền cập nhật thông báo",
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
        "Mã thông báo không hợp lệ",
        400,
      );
    }

    let body:
      UpdateThongBaoBody;

    try {
      body =
        await request.json() as
          UpdateThongBaoBody;
    } catch {
      return responseError(
        "Dữ liệu gửi lên không đúng định dạng JSON",
        400,
      );
    }

    await connectDB();

    void User;
    void ChiHoi;
    void HoiVien;

    const thongBao =
      await ThongBao.findById(
        id,
      );

    if (!thongBao) {
      return responseError(
        "Không tìm thấy thông báo",
        404,
      );
    }

    const isAdmin =
      session.role ===
      "ADMIN";

    const isOwner =
      String(
        thongBao.nguoiTaoId,
      ) ===
      session.userId;

    /* =====================================================
       PERMISSION
    ===================================================== */

    if (
      !isAdmin &&
      !isOwner
    ) {
      return responseError(
        "Bạn chỉ được chỉnh sửa thông báo do chính mình tạo",
        403,
      );
    }

    if (
      !isAdmin &&
      ![
        "NHAP",
        "TU_CHOI",
      ].includes(
        thongBao.trangThai,
      )
    ) {
      return responseError(
        "Chỉ có thể sửa bản nháp hoặc thông báo đã bị từ chối",
        409,
      );
    }

    /* =====================================================
       VALUES
    ===================================================== */

    const tieuDe =
      normalizeString(
        body.tieuDe,
      );

    const noiDung =
      normalizeString(
        body.noiDung,
      );

    const loaiThongBao =
      normalizeString(
        body.loaiThongBao,
      ) as LoaiThongBao;

    const mucDo =
      normalizeString(
        body.mucDo,
      ) as MucDo;

    const phamVi =
      normalizeString(
        body.phamVi,
      ) as PhamVi;

    const requestedStatus =
      normalizeString(
        body.trangThai,
      ) as TrangThai;

    /* =====================================================
       BASIC VALIDATION
    ===================================================== */

    if (!tieuDe) {
      return responseError(
        "Tiêu đề thông báo không được để trống",
      );
    }

    if (
      tieuDe.length >
      250
    ) {
      return responseError(
        "Tiêu đề thông báo không được vượt quá 250 ký tự",
      );
    }

    if (!noiDung) {
      return responseError(
        "Nội dung thông báo không được để trống",
      );
    }

    if (
      noiDung.length >
      20000
    ) {
      return responseError(
        "Nội dung thông báo không được vượt quá 20000 ký tự",
      );
    }

    if (
      !LOAI_THONG_BAO.includes(
        loaiThongBao,
      )
    ) {
      return responseError(
        "Loại thông báo không hợp lệ",
      );
    }

    if (
      !MUC_DO.includes(
        mucDo,
      )
    ) {
      return responseError(
        "Mức độ thông báo không hợp lệ",
      );
    }

    if (
      !PHAM_VI.includes(
        phamVi,
      )
    ) {
      return responseError(
        "Phạm vi nhận thông báo không hợp lệ",
      );
    }

    /* =====================================================
       WORKFLOW STATUS
    ===================================================== */

    let newStatus:
      TrangThai;

    if (isAdmin) {
      const candidate =
        requestedStatus ||
        thongBao.trangThai;

      if (
        !TRANG_THAI.includes(
          candidate,
        )
      ) {
        return responseError(
          "Trạng thái thông báo không hợp lệ",
        );
      }

      /*
       * Admin được phép chỉnh tất cả trạng thái.
       *
       * Phê duyệt chính thức vẫn nên qua
       * /phe-duyet, nhưng giữ tương thích khi
       * Admin mở form chỉnh sửa record hiện tại.
       */
      newStatus =
        candidate;
    } else {
      /*
       * BCH / CHT:
       *
       * NHAP -> tiếp tục nháp.
       *
       * Các lựa chọn còn lại -> gửi duyệt.
       */
      newStatus =
        requestedStatus ===
        "NHAP"
          ? "NHAP"
          : "CHO_DUYET";
    }

    /* =====================================================
       RECIPIENT
    ===================================================== */

    const chiHoiIds =
      phamVi ===
      "CHI_HOI"
        ? parseObjectIdArray(
            body.chiHoiIds,
          )
        : [];

    const vaiTroNguoiNhan =
      phamVi ===
      "VAI_TRO"
        ? parseRoleArray(
            body.vaiTroNguoiNhan,
          )
        : [];

    const nguoiNhanIds =
      phamVi ===
      "CA_NHAN"
        ? parseObjectIdArray(
            body.nguoiNhanIds,
          )
        : [];

    if (
      phamVi ===
        "CHI_HOI" &&
      chiHoiIds.length ===
        0
    ) {
      return responseError(
        "Vui lòng chọn ít nhất một Chi hội",
      );
    }

    if (
      phamVi ===
        "VAI_TRO" &&
      vaiTroNguoiNhan.length ===
        0
    ) {
      return responseError(
        "Vui lòng chọn ít nhất một vai trò người nhận",
      );
    }

    if (
      phamVi ===
        "CA_NHAN" &&
      nguoiNhanIds.length ===
        0
    ) {
      return responseError(
        "Vui lòng chọn ít nhất một người nhận",
      );
    }

    /* =====================================================
       VALIDATE CHI HOI
    ===================================================== */

    if (
      chiHoiIds.length >
      0
    ) {
      const count =
        await ChiHoi.countDocuments({
          _id: {
            $in:
              chiHoiIds,
          },
        });

      if (
        count !==
        chiHoiIds.length
      ) {
        return responseError(
          "Có Chi hội được chọn không tồn tại",
        );
      }
    }

    /* =====================================================
       VALIDATE USERS
    ===================================================== */

    if (
      nguoiNhanIds.length >
      0
    ) {
      const count =
        await User.countDocuments({
          _id: {
            $in:
              nguoiNhanIds,
          },

          isActive: {
            $ne:
              false,
          },
        });

      if (
        count !==
        nguoiNhanIds.length
      ) {
        return responseError(
          "Có người nhận không tồn tại hoặc tài khoản đã ngừng hoạt động",
        );
      }
    }

    /* =====================================================
       DATE + FILE
    ===================================================== */

    let ngayBatDau:
      Date | undefined;

    let ngayKetThuc:
      Date | undefined;

    let tepDinhKem:
      ReturnType<
        typeof parseTepDinhKem
      >;

    try {
      ngayBatDau =
        parseOptionalDate(
          body.ngayBatDau,
          "Thời gian bắt đầu",
        );

      ngayKetThuc =
        parseOptionalDate(
          body.ngayKetThuc,
          "Thời gian kết thúc",
        );

      tepDinhKem =
        parseTepDinhKem(
          body.tepDinhKem,
        );
    } catch (
      error
    ) {
      return responseError(
        error instanceof
          Error
          ? error.message
          : "Dữ liệu thông báo không hợp lệ",
      );
    }

    if (
      ngayBatDau &&
      ngayKetThuc &&
      ngayKetThuc.getTime() <=
        ngayBatDau.getTime()
    ) {
      return responseError(
        "Thời gian kết thúc phải sau thời gian bắt đầu",
      );
    }

    /* =====================================================
       UPDATE CONTENT
    ===================================================== */

    thongBao.tieuDe =
      tieuDe;

    thongBao.noiDung =
      noiDung;

    thongBao.loaiThongBao =
      loaiThongBao;

    thongBao.mucDo =
      mucDo;

    thongBao.phamVi =
      phamVi;

    thongBao.chiHoiIds =
      chiHoiIds;

    thongBao.vaiTroNguoiNhan =
      vaiTroNguoiNhan;

    thongBao.nguoiNhanIds =
      nguoiNhanIds;

    thongBao.tepDinhKem =
      tepDinhKem;

    thongBao.ngayBatDau =
      ngayBatDau;

    thongBao.ngayKetThuc =
      ngayKetThuc;

    /* =====================================================
       WORKFLOW UPDATE
    ===================================================== */

    const oldStatus =
      thongBao.trangThai;

    thongBao.trangThai =
      newStatus;

    if (
      !isAdmin
    ) {
      /*
       * Người tạo sửa thông báo bị từ chối.
       *
       * Khi gửi lại:
       * - xóa người duyệt cũ
       * - xóa kết quả từ chối cũ
       * - cập nhật ngày gửi duyệt mới
       */
      if (
        newStatus ===
        "CHO_DUYET"
      ) {
        thongBao.nguoiDuyetId =
          null;

        thongBao.ngayDuyet =
          null;

        thongBao.ngayGuiDuyet =
          new Date();

        thongBao.lyDoTuChoi =
          "";
      } else {
        /*
         * Lưu nháp trở lại.
         */
        thongBao.nguoiDuyetId =
          null;

        thongBao.ngayDuyet =
          null;

        thongBao.ngayGuiDuyet =
          null;

        thongBao.lyDoTuChoi =
          "";
      }
    } else {
      /*
       * ADMIN chỉnh trực tiếp thành DA_DANG.
       */
      if (
        newStatus ===
        "DA_DANG"
      ) {
        thongBao.nguoiDuyetId =
          new Types.ObjectId(
            session.userId,
          );

        thongBao.ngayDuyet =
          new Date();

        thongBao.lyDoTuChoi =
          "";
      }

      /*
       * Admin đưa về nháp.
       */
      if (
        newStatus ===
        "NHAP"
      ) {
        thongBao.ngayGuiDuyet =
          null;

        thongBao.ngayDuyet =
          null;

        thongBao.nguoiDuyetId =
          null;

        thongBao.lyDoTuChoi =
          "";
      }

      /*
       * Nếu Admin chỉnh một record chờ duyệt
       * nhưng vẫn để CHO_DUYET thì giữ workflow.
       */
      if (
        newStatus ===
        "CHO_DUYET" &&
        !thongBao.ngayGuiDuyet
      ) {
        thongBao.ngayGuiDuyet =
          new Date();
      }
    }

    await thongBao.save();

    /* =====================================================
       POPULATE
    ===================================================== */

    const updated =
      await ThongBao.findById(
        thongBao._id,
      )
        .populate({
          path:
            "nguoiTaoId",

          select:
            "username fullName hoTen role",
        })
        .populate({
          path:
            "nguoiDuyetId",

          select:
            "username fullName hoTen role",
        })
        .lean();

    if (!updated) {
      return responseError(
        "Thông báo đã cập nhật nhưng không thể tải lại dữ liệu",
        500,
      );
    }

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
        "UPDATE",

      module:
        "THONG_BAO",

      description:
        newStatus ===
        "CHO_DUYET"
          ? `Cập nhật và gửi duyệt thông báo: ${tieuDe}`
          : `Cập nhật thông báo: ${tieuDe}`,

      targetId:
        String(
          thongBao._id,
        ),

      targetName:
        tieuDe,

      metadata: {
        maThongBao:
          thongBao.maThongBao,

        trangThaiCu:
          oldStatus,

        trangThaiMoi:
          newStatus,

        loaiThongBao,

        mucDo,

        phamVi,
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

    let message =
      "Cập nhật thông báo thành công";

    if (
      newStatus ===
      "CHO_DUYET"
    ) {
      message =
        "Cập nhật thành công. Thông báo đã được gửi lại cho Quản trị viên phê duyệt.";
    }

    if (
      newStatus ===
      "NHAP"
    ) {
      message =
        "Đã cập nhật và lưu bản nháp.";
    }

    if (
      newStatus ===
      "DA_DANG"
    ) {
      message =
        "Cập nhật và phát hành thông báo thành công.";
    }

    return NextResponse.json({
      success:
        true,

      message,

      data: {
        thongBao:
          serializeThongBao(
            updated as unknown as
              Record<
                string,
                unknown
              >,
            session.userId,
          ),
      },
    });
  } catch (
    error
  ) {
    console.error(
      "PUT /api/thong-bao/[id]:",
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
          "Dữ liệu thông báo không hợp lệ",
        400,
      );
    }

    if (
      error instanceof
      mongoose.Error
        .CastError
    ) {
      return responseError(
        "Dữ liệu định danh không hợp lệ",
        400,
      );
    }

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể cập nhật thông báo",
      500,
    );
  }
}

/* =========================================================
   DELETE /api/thong-bao/[id]
========================================================= */

export async function DELETE(
  request:
    Request,

  context:
    RouteContext,
) {
  try {
    const session =
      normalizeSession(
        await getCurrentSession(),
      );

    if (!session) {
      return responseError(
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        401,
      );
    }

    if (
      !isManager(
        session.role,
      )
    ) {
      return responseError(
        "Bạn không có quyền xóa thông báo",
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
        "Mã thông báo không hợp lệ",
        400,
      );
    }

    await connectDB();

    const thongBao =
      await ThongBao.findById(
        id,
      );

    if (!thongBao) {
      return responseError(
        "Không tìm thấy thông báo",
        404,
      );
    }

    const isAdmin =
      session.role ===
      "ADMIN";

    const isOwner =
      String(
        thongBao.nguoiTaoId,
      ) ===
      session.userId;

    if (
      !isAdmin &&
      !isOwner
    ) {
      return responseError(
        "Bạn chỉ được xóa thông báo do chính mình tạo",
        403,
      );
    }

    /*
     * BCH / CHT:
     *
     * Chỉ xóa:
     * - NHAP
     * - TU_CHOI
     *
     * Không được xóa:
     * - CHO_DUYET
     * - DA_DANG
     * - DA_AN
     */
    if (
      !isAdmin &&
      ![
        "NHAP",
        "TU_CHOI",
      ].includes(
        thongBao.trangThai,
      )
    ) {
      return responseError(
        "Không thể xóa thông báo đang chờ duyệt hoặc đã phát hành",
        409,
      );
    }

    const logData = {
      id:
        String(
          thongBao._id,
        ),

      tieuDe:
        thongBao.tieuDe,

      maThongBao:
        thongBao.maThongBao,

      trangThai:
        thongBao.trangThai,
    };

    await ThongBao.findByIdAndDelete(
      thongBao._id,
    );

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
        "DELETE",

      module:
        "THONG_BAO",

      description:
        `Xóa thông báo: ${logData.tieuDe}`,

      targetId:
        logData.id,

      targetName:
        logData.tieuDe,

      metadata: {
        maThongBao:
          logData.maThongBao,

        trangThai:
          logData.trangThai,
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
        "Xóa thông báo thành công",
    });
  } catch (
    error
  ) {
    console.error(
      "DELETE /api/thong-bao/[id]:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Không thể xóa thông báo",
      500,
    );
  }
}