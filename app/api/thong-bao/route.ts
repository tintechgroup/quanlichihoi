import { randomUUID } from "crypto";

import {
  NextRequest,
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

interface TepDinhKemInput {
  tenTep?: unknown;

  duongDan?: unknown;

  loaiTep?: unknown;

  kichThuoc?: unknown;
}

interface CreateThongBaoBody {
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

const ROLES:
  UserRole[] = [
    "ADMIN",
    "BAN_CHAP_HANH",
    "CHI_HOI_TRUONG",
    "HOI_VIEN",
  ];

const MANAGER_ROLES:
  UserRole[] = [
    "ADMIN",
    "BAN_CHAP_HANH",
  ];

const LOAI_THONG_BAO:
  LoaiThongBao[] = [
    "THONG_BAO_CHUNG",
    "HOAT_DONG",
    "TAI_LIEU",
    "KHAC",
  ];

const MUC_DO:
  MucDo[] = [
    "THONG_THUONG",
    "QUAN_TRONG",
    "KHAN_CAP",
  ];

const PHAM_VI:
  PhamVi[] = [
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
  10 * 1024 * 1024;

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

function escapeRegex(
  value: string,
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function isManager(
  role: UserRole,
) {
  return MANAGER_ROLES.includes(
    role,
  );
}

function normalizeSession(
  rawSession: unknown,
): SessionUser | null {
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

function parsePositiveInteger(
  value:
    string | null,

  defaultValue:
    number,

  maximum:
    number,
) {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(
      parsed,
    ) ||
    parsed <= 0
  ) {
    return defaultValue;
  }

  return Math.min(
    parsed,
    maximum,
  );
}

function buildQuery(
  conditions:
    Record<
      string,
      unknown
    >[],
): Record<
  string,
  unknown
> {
  if (
    conditions.length ===
    0
  ) {
    return {};
  }

  if (
    conditions.length ===
    1
  ) {
    return conditions[0];
  }

  return {
    $and:
      conditions,
  };
}

function taoMaThongBao() {
  const now =
    new Date();

  const datePart = [
    now.getFullYear(),

    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      "0",
    ),

    String(
      now.getDate(),
    ).padStart(
      2,
      "0",
    ),
  ].join("");

  const timePart = [
    String(
      now.getHours(),
    ).padStart(
      2,
      "0",
    ),

    String(
      now.getMinutes(),
    ).padStart(
      2,
      "0",
    ),

    String(
      now.getSeconds(),
    ).padStart(
      2,
      "0",
    ),
  ].join("");

  const randomPart =
    randomUUID()
      .replaceAll(
        "-",
        "",
      )
      .slice(
        0,
        6,
      )
      .toUpperCase();

  return `TB${datePart}${timePart}${randomPart}`;
}

function objectIdToString(
  value: unknown,
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
  value: unknown,
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

  for (
    const item
    of value
  ) {
    const id =
      typeof item ===
      "string"
        ? item.trim()
        : getObjectIdFromObject(
            item,
          );

    if (
      Types.ObjectId.isValid(
        id,
      )
    ) {
      ids.add(
        id,
      );
    }
  }

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

function getObjectIdFromObject(
  value: unknown,
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return "";
  }

  const object =
    value as Record<
      string,
      unknown
    >;

  return String(
    object.id ??
      object._id ??
      "",
  ).trim();
}

function parseRoleArray(
  value: unknown,
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

function parseTepDinhKem(
  value: unknown,
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
      rawItem,
      index,
    ) => {
      if (
        !rawItem ||
        typeof rawItem !==
          "object"
      ) {
        throw new Error(
          `Tệp đính kèm thứ ${index + 1} không hợp lệ`,
        );
      }

      const item =
        rawItem as
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
          `Tên tệp đính kèm thứ ${index + 1} không được để trống`,
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
   USER CHI HOI
========================================================= */

async function getUserChiHoiId(
  session:
    SessionUser,
):
  Promise<
    Types.ObjectId | null
  > {
  /*
   * Chi hội trưởng:
   * ưu tiên chiHoiId trên User.
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
   * Hội viên:
   * ưu tiên bản ghi HoiVien.
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
   * Fallback:
   * một số tài khoản có chiHoiId trực tiếp.
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

  /*
   * Giữ compatibility với record cũ.
   */
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
        id,
      ) =>
        objectIdToString(
          id,
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

    maThongBao:
      String(
        raw.maThongBao ??
          "",
      ),

    trangThai:
      raw.trangThai ??
      "DA_DANG",

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

    soLuotXem:
      typeof raw.soLuotXem ===
      "number"
        ? raw.soLuotXem
        : nguoiDaDocIds.length,

    nguoiTao:
      nguoiTaoRaw
        ? {
            id:
              objectIdToString(
                nguoiTaoRaw._id,
              ),

            username:
              String(
                nguoiTaoRaw.username ??
                  "",
              ),

            fullName:
              String(
                nguoiTaoRaw.fullName ??
                  nguoiTaoRaw.hoTen ??
                  nguoiTaoRaw.username ??
                  "",
              ),

            role:
              String(
                nguoiTaoRaw.role ??
                  "",
              ),
          }
        : undefined,

    nguoiDuyet:
      nguoiDuyetRaw
        ? {
            id:
              objectIdToString(
                nguoiDuyetRaw._id,
              ),

            username:
              String(
                nguoiDuyetRaw.username ??
                  "",
              ),

            fullName:
              String(
                nguoiDuyetRaw.fullName ??
                  nguoiDuyetRaw.hoTen ??
                  nguoiDuyetRaw.username ??
                  "",
              ),

            role:
              String(
                nguoiDuyetRaw.role ??
                  "",
              ),
          }
        : undefined,

    nguoiTaoId:
      objectIdToString(
        nguoiTaoRaw?._id ??
          raw.nguoiTaoId,
      ),

    nguoiDuyetId:
      objectIdToString(
        nguoiDuyetRaw?._id ??
          raw.nguoiDuyetId,
      ),
  };
}

/* =========================================================
   DUPLICATE
========================================================= */

function isDuplicateMaThongBaoError(
  error:
    unknown,
) {
  if (
    !error ||
    typeof error !==
      "object"
  ) {
    return false;
  }

  const mongoError =
    error as {
      code?: number;

      keyPattern?: {
        maThongBao?:
          unknown;
      };

      message?:
        unknown;
    };

  return (
    mongoError.code ===
      11000 &&
    (
      Boolean(
        mongoError
          .keyPattern
          ?.maThongBao,
      ) ||
      String(
        mongoError.message ??
          "",
      ).includes(
        "maThongBao",
      )
    )
  );
}

/* =========================================================
   GET /api/thong-bao
========================================================= */

export async function GET(
  request:
    NextRequest,
) {
  try {
    await connectDB();

    /*
     * Đảm bảo model đã được đăng ký
     * trước populate.
     */
    void User;
    void ChiHoi;
    void HoiVien;

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

    const searchParams =
      request.nextUrl
        .searchParams;

    const page =
      parsePositiveInteger(
        searchParams.get(
          "page",
        ),
        1,
        100000,
      );

    const limit =
      parsePositiveInteger(
        searchParams.get(
          "limit",
        ),
        10,
        100,
      );

    const skip =
      (page - 1) *
      limit;

    const search =
      normalizeString(
        searchParams.get(
          "search",
        ),
      );

    const loaiThongBao =
      normalizeString(
        searchParams.get(
          "loaiThongBao",
        ),
      ) as
        LoaiThongBao;

    const mucDo =
      normalizeString(
        searchParams.get(
          "mucDo",
        ),
      ) as
        MucDo;

    const trangThai =
      normalizeString(
        searchParams.get(
          "trangThai",
        ),
      ) as
        TrangThai;

    const mode =
      normalizeString(
        searchParams.get(
          "mode",
        ),
      );

    const managerMode =
      mode ===
        "quan-ly" &&
      isManager(
        session.role,
      );

    const now =
      new Date();

    const currentUserObjectId =
      new Types.ObjectId(
        session.userId,
      );

    const baseConditions:
      Record<
        string,
        unknown
      >[] = [];

    /* =====================================================
       MANAGER MODE
    ===================================================== */

    if (managerMode) {
      /*
       * ADMIN:
       * xem toàn bộ.
       *
       * BCH:
       * xem thông báo mình tạo + đã đăng.
       */
      if (
        session.role ===
        "BAN_CHAP_HANH"
      ) {
        baseConditions.push({
          $or: [
            {
              nguoiTaoId:
                currentUserObjectId,
            },

            {
              trangThai:
                "DA_DANG",
            },
          ],
        });
      }
    } else {
      /* ===================================================
         RECIPIENT MODE

         Chỉ thông báo đã được phát hành mới ra chuông.
         Record cũ chưa có trangThai được coi là DA_DANG
         để không làm mất dữ liệu cũ.
      =================================================== */

      baseConditions.push({
        $or: [
          {
            trangThai:
              "DA_DANG",
          },

          {
            trangThai: {
              $exists:
                false,
            },
          },

          {
            trangThai:
              null,
          },
        ],
      });

      /*
       * Chưa bắt đầu hoặc đã tới thời gian bắt đầu.
       */
      baseConditions.push({
        $or: [
          {
            ngayBatDau: {
              $exists:
                false,
            },
          },

          {
            ngayBatDau:
              null,
          },

          {
            ngayBatDau: {
              $lte:
                now,
            },
          },
        ],
      });

      /*
       * Chưa hết hạn.
       */
      baseConditions.push({
        $or: [
          {
            ngayKetThuc: {
              $exists:
                false,
            },
          },

          {
            ngayKetThuc:
              null,
          },

          {
            ngayKetThuc: {
              $gte:
                now,
            },
          },
        ],
      });

      const visibility:
        Record<
          string,
          unknown
        >[] = [
          {
            phamVi:
              "TAT_CA",
          },

          {
            phamVi:
              "VAI_TRO",

            vaiTroNguoiNhan:
              session.role,
          },

          {
            phamVi:
              "CA_NHAN",

            nguoiNhanIds:
              currentUserObjectId,
          },
        ];

      const chiHoiId =
        await getUserChiHoiId(
          session,
        );

      if (chiHoiId) {
        visibility.push({
          phamVi:
            "CHI_HOI",

          chiHoiIds:
            chiHoiId,
        });
      }

      baseConditions.push({
        $or:
          visibility,
      });
    }

    /* =====================================================
       FILTER
    ===================================================== */

    const filterConditions = [
      ...baseConditions,
    ];

    if (search) {
      const safeSearch =
        escapeRegex(
          search,
        );

      filterConditions.push({
        $or: [
          {
            maThongBao: {
              $regex:
                safeSearch,

              $options:
                "i",
            },
          },

          {
            tieuDe: {
              $regex:
                safeSearch,

              $options:
                "i",
            },
          },

          {
            noiDung: {
              $regex:
                safeSearch,

              $options:
                "i",
            },
          },
        ],
      });
    }

    if (
      loaiThongBao &&
      LOAI_THONG_BAO.includes(
        loaiThongBao,
      )
    ) {
      filterConditions.push({
        loaiThongBao,
      });
    }

    if (
      mucDo &&
      MUC_DO.includes(
        mucDo,
      )
    ) {
      filterConditions.push({
        mucDo,
      });
    }

    if (
      managerMode &&
      trangThai &&
      TRANG_THAI.includes(
        trangThai,
      )
    ) {
      filterConditions.push({
        trangThai,
      });
    }

    const query =
      buildQuery(
        filterConditions,
      );

    const statisticsQuery =
      buildQuery(
        baseConditions,
      );

    /* =====================================================
       QUERIES
    ===================================================== */

    const [
      documents,
      total,
      totalStatistics,
      quanTrong,
      khanCap,
    ] =
      await Promise.all([
        ThongBao.find(
          query,
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
          .sort({
            createdAt:
              -1,

            _id:
              -1,
          })
          .skip(
            skip,
          )
          .limit(
            limit,
          )
          .lean(),

        ThongBao.countDocuments(
          query,
        ),

        ThongBao.countDocuments(
          statisticsQuery,
        ),

        ThongBao.countDocuments(
          buildQuery([
            ...baseConditions,

            {
              mucDo:
                "QUAN_TRONG",
            },
          ]),
        ),

        ThongBao.countDocuments(
          buildQuery([
            ...baseConditions,

            {
              mucDo:
                "KHAN_CAP",
            },
          ]),
        ),
      ]);

    /* =====================================================
       UNREAD

       Không query field legacy danhSachDaDoc nữa.
       daDoc của record cũ vẫn được serialize tương thích.
    ===================================================== */

    let chuaDoc =
      0;

    if (
      !managerMode
    ) {
      chuaDoc =
        await ThongBao.countDocuments(
          buildQuery([
            ...baseConditions,

            {
              nguoiDaDocIds: {
                $ne:
                  currentUserObjectId,
              },
            },
          ]),
        );
    }

    /* =====================================================
       WORKFLOW STATS
    ===================================================== */

    let workflowStats = {
      choDuyet:
        0,

      daDang:
        0,

      tuChoi:
        0,

      banNhap:
        0,

      daAn:
        0,
    };

    if (managerMode) {
      const managerBase:
        Record<
          string,
          unknown
        >[] = [];

      if (
        session.role ===
        "BAN_CHAP_HANH"
      ) {
        managerBase.push({
          nguoiTaoId:
            currentUserObjectId,
        });
      }

      const [
        choDuyet,
        daDang,
        tuChoi,
        banNhap,
        daAn,
      ] =
        await Promise.all([
          ThongBao.countDocuments(
            buildQuery([
              ...managerBase,

              {
                trangThai:
                  "CHO_DUYET",
              },
            ]),
          ),

          ThongBao.countDocuments(
            buildQuery([
              ...managerBase,

              {
                trangThai:
                  "DA_DANG",
              },
            ]),
          ),

          ThongBao.countDocuments(
            buildQuery([
              ...managerBase,

              {
                trangThai:
                  "TU_CHOI",
              },
            ]),
          ),

          ThongBao.countDocuments(
            buildQuery([
              ...managerBase,

              {
                trangThai:
                  "NHAP",
              },
            ]),
          ),

          ThongBao.countDocuments(
            buildQuery([
              ...managerBase,

              {
                trangThai:
                  "DA_AN",
              },
            ]),
          ),
        ]);

      workflowStats = {
        choDuyet,
        daDang,
        tuChoi,
        banNhap,
        daAn,
      };
    }

    /* =====================================================
       SERIALIZE
    ===================================================== */

    const danhSach =
      documents.map(
        (
          document,
        ) =>
          serializeThongBao(
            {
              ...document,
            },
            session.userId,
          ),
      );

    const totalPages =
      Math.max(
        1,

        Math.ceil(
          total /
            limit,
        ),
      );

    return NextResponse.json({
      success: true,

      message:
        "Lấy danh sách thông báo thành công",

      data: {
        danhSach,

        phanTrang: {
          page,

          limit,

          total,

          totalPages,

          hasPreviousPage:
            page > 1,

          hasNextPage:
            page <
            totalPages,
        },

        thongKe: {
          tong:
            totalStatistics,

          chuaDoc,

          quanTrong,

          khanCap,

          ...workflowStats,
        },

        quyen: {
          role:
            session.role,

          canManage:
            isManager(
              session.role,
            ),

          canApprove:
            session.role ===
            "ADMIN",

          canPublishDirectly:
            session.role ===
            "ADMIN",
        },
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/thong-bao:",
      error,
    );

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Đã xảy ra lỗi khi lấy danh sách thông báo",
      500,
    );
  }
}

/* =========================================================
   POST /api/thong-bao
========================================================= */

export async function POST(
  request:
    NextRequest,
) {
  try {
    await connectDB();

    void User;
    void ChiHoi;
    void HoiVien;

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
        "Bạn không có quyền tạo thông báo",
        403,
      );
    }

    let body:
      CreateThongBaoBody;

    try {
      body =
        await request.json() as
          CreateThongBaoBody;
    } catch {
      return responseError(
        "Dữ liệu gửi lên không đúng định dạng JSON",
      );
    }

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
      ) as
        LoaiThongBao;

    const mucDo =
      normalizeString(
        body.mucDo,
      ) as
        MucDo;

    const phamVi =
      normalizeString(
        body.phamVi,
      ) as
        PhamVi;

    const requestedStatus =
      normalizeString(
        body.trangThai,
      ) as
        TrangThai;

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
       RECIPIENTS
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
        "Vui lòng chọn ít nhất một Chi hội nhận thông báo",
      );
    }

    if (
      phamVi ===
        "VAI_TRO" &&
      vaiTroNguoiNhan.length ===
        0
    ) {
      return responseError(
        "Vui lòng chọn ít nhất một vai trò nhận thông báo",
      );
    }

    if (
      phamVi ===
        "CA_NHAN" &&
      nguoiNhanIds.length ===
        0
    ) {
      return responseError(
        "Vui lòng chọn ít nhất một người nhận thông báo",
      );
    }

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
        });

      if (
        count !==
        nguoiNhanIds.length
      ) {
        return responseError(
          "Có người nhận được chọn không tồn tại",
        );
      }
    }

    /* =====================================================
       DATE / ATTACHMENT
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
       WORKFLOW STATUS
    ===================================================== */

    const isAdmin =
      session.role ===
      "ADMIN";

    let trangThai:
      TrangThai;

    if (isAdmin) {
      if (
        requestedStatus ===
        "NHAP"
      ) {
        trangThai =
          "NHAP";
      } else if (
        requestedStatus ===
        "DA_AN"
      ) {
        trangThai =
          "DA_AN";
      } else {
        trangThai =
          "DA_DANG";
      }
    } else {
      if (
        requestedStatus ===
        "NHAP"
      ) {
        trangThai =
          "NHAP";
      } else {
        trangThai =
          "CHO_DUYET";
      }
    }

    const now =
      new Date();

    const creator =
      await User.findById(
        session.userId,
      )
        .select(
          "username fullName hoTen role",
        )
        .lean();

    if (!creator) {
      return responseError(
        "Không tìm thấy tài khoản người tạo",
        404,
      );
    }

    /* =====================================================
       CREATE
    ===================================================== */

    const payload = {
      tieuDe,

      noiDung,

      loaiThongBao,

      mucDo,

      phamVi,

      chiHoiIds,

      vaiTroNguoiNhan,

      nguoiNhanIds,

      tepDinhKem,

      ngayBatDau,

      ngayKetThuc,

      trangThai,

      nguoiTaoId:
        new Types.ObjectId(
          session.userId,
        ),

      nguoiDuyetId:
        isAdmin &&
        trangThai ===
          "DA_DANG"
          ? new Types.ObjectId(
              session.userId,
            )
          : null,

      ngayGuiDuyet:
        trangThai ===
        "CHO_DUYET"
          ? now
          : null,

      ngayDuyet:
        isAdmin &&
        trangThai ===
          "DA_DANG"
          ? now
          : null,

      lyDoTuChoi:
        "",

      soLuotXem:
        0,

      nguoiDaDocIds:
        [],
    };

    let createdId:
      Types.ObjectId | null =
      null;

    let lastError:
      unknown =
      null;

    for (
      let attempt = 0;
      attempt < 5;
      attempt += 1
    ) {
      try {
        const created =
          await ThongBao.create({
            ...payload,

            maThongBao:
              taoMaThongBao(),
          });

        createdId =
          created._id;

        lastError =
          null;

        break;
      } catch (
        error
      ) {
        lastError =
          error;

        if (
          !isDuplicateMaThongBaoError(
            error,
          )
        ) {
          throw error;
        }
      }
    }

    if (!createdId) {
      throw (
        lastError ??
        new Error(
          "Không thể tạo mã thông báo",
        )
      );
    }

    const populated =
      await ThongBao.findById(
        createdId,
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

    if (!populated) {
      return responseError(
        "Thông báo đã được tạo nhưng không thể tải lại dữ liệu",
        500,
      );
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
        "THONG_BAO",

      description:
        trangThai ===
        "CHO_DUYET"
          ? `Tạo và gửi duyệt thông báo: ${tieuDe}`
          : trangThai ===
            "NHAP"
            ? `Lưu bản nháp thông báo: ${tieuDe}`
            : `Tạo thông báo: ${tieuDe}`,

      targetId:
        String(
          createdId,
        ),

      targetName:
        tieuDe,

      metadata: {
        loaiThongBao,

        mucDo,

        phamVi,

        trangThai,
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
          trangThai ===
          "CHO_DUYET"
            ? "Tạo thông báo thành công. Thông báo đang chờ Quản trị viên duyệt."
            : trangThai ===
              "NHAP"
              ? "Đã lưu bản nháp thông báo."
              : "Tạo và phát hành thông báo thành công.",

        data: {
          thongBao:
            serializeThongBao(
              {
                ...populated,
              },

              session.userId,
            ),
        },
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
      "POST /api/thong-bao:",
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
      );
    }

    if (
      error instanceof
      mongoose.Error
        .CastError
    ) {
      return responseError(
        "Dữ liệu định danh không hợp lệ",
      );
    }

    if (
      error &&
      typeof error ===
        "object" &&
      (
        error as {
          code?: number;
        }
      ).code ===
        11000
    ) {
      return responseError(
        "Dữ liệu thông báo bị trùng. Vui lòng thử lại.",
        409,
      );
    }

    return responseError(
      error instanceof
        Error
        ? error.message
        : "Đã xảy ra lỗi khi tạo thông báo",
      500,
    );
  }
}