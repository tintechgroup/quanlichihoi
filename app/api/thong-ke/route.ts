import {
  NextResponse,
} from "next/server";

import {
  Types,
} from "mongoose";

import {
  connectDB,
} from "@/lib/mongodb";

import {
  getCurrentSession,
} from "@/lib/session";

import ChiHoi from "@/models/ChiHoi";
import DangKyHoatDong from "@/models/DangKyHoatDong";
import DiemRenLuyen from "@/models/DiemRenLuyen";
import GiaoDichTaiChinh from "@/models/GiaoDichTaiChinh";
import HoatDong from "@/models/HoatDong";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

export const dynamic =
  "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type LoaiThongKe =
  | "TONG_QUAN"
  | "CHI_HOI"
  | "HOI_VIEN"
  | "HOAT_DONG"
  | "TAI_CHINH";

/* =========================================================
   CONSTANTS
========================================================= */

const VAI_TRO_DUOC_XEM = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

const PHAM_VI_TAI_CHINH = [
  "LIEN_CHI_HOI",
  "CHI_HOI",
];

const LOAI_GIAO_DICH = [
  "THU",
  "CHI",
];

/* =========================================================
   RESPONSE HELPERS
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
  value: string | null,
) {
  return (
    value ||
    ""
  ).trim();
}

function parseStartDate(
  value: string,
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      `${value}T00:00:00.000`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function parseEndDate(
  value: string,
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      `${value}T23:59:59.999`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function percent(
  numerator: number,
  denominator: number,
) {
  if (
    denominator <=
    0
  ) {
    return 0;
  }

  return Number(
    (
      (
        numerator /
        denominator
      ) *
      100
    ).toFixed(
      1,
    ),
  );
}

function average(
  total: number,
  count: number,
) {
  if (
    count <=
    0
  ) {
    return 0;
  }

  return Number(
    (
      total /
      count
    ).toFixed(
      2,
    ),
  );
}

function getPopulatedId(
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
    return String(
      value,
    );
  }

  if (
    typeof value ===
    "object"
  ) {
    const record =
      value as Record<
        string,
        unknown
      >;

    return String(
      record._id ??
        record.id ??
        "",
    );
  }

  return String(
    value,
  );
}

/* =========================================================
   CHI HOI CUA CHT
========================================================= */

async function getChiHoiIdCuaCHT(
  userId: string,
) {
  if (
    !Types.ObjectId.isValid(
      userId,
    )
  ) {
    return null;
  }

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
    return String(
      user.chiHoiId,
    );
  }

  /*
   * Fallback dữ liệu cũ:
   * HoiVien.taiKhoanId
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
    return String(
      hoiVien.chiHoiId,
    );
  }

  return null;
}

/* =========================================================
   GET
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
      return responseError(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    if (
      !VAI_TRO_DUOC_XEM.includes(
        session.role,
      )
    ) {
      return responseError(
        "Bạn không có quyền xem thống kê",
        403,
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

    const loai =
      (
        stringValue(
          searchParams.get(
            "loai",
          ),
        ) ||
        "TONG_QUAN"
      ) as
        LoaiThongKe;

    const tuNgayRaw =
      stringValue(
        searchParams.get(
          "tuNgay",
        ),
      );

    const denNgayRaw =
      stringValue(
        searchParams.get(
          "denNgay",
        ),
      );

    const chiHoiIdParam =
      stringValue(
        searchParams.get(
          "chiHoiId",
        ),
      );

    const trangThai =
      stringValue(
        searchParams.get(
          "trangThai",
        ),
      );

    const phamVi =
      stringValue(
        searchParams.get(
          "phamVi",
        ),
      );

    const search =
      stringValue(
        searchParams.get(
          "search",
        ),
      );

    const loaiGiaoDich =
      stringValue(
        searchParams.get(
          "loaiGiaoDich",
        ),
      );

    const hocKy =
      stringValue(
        searchParams.get(
          "hocKy",
        ),
      );

    const namHoc =
      stringValue(
        searchParams.get(
          "namHoc",
        ),
      );

    /* =====================================================
       VALIDATE TYPE
    ===================================================== */

    if (
      ![
        "TONG_QUAN",
        "CHI_HOI",
        "HOI_VIEN",
        "HOAT_DONG",
        "TAI_CHINH",
      ].includes(
        loai,
      )
    ) {
      return responseError(
        "Loại thống kê không hợp lệ",
      );
    }

    if (
      loaiGiaoDich &&
      !LOAI_GIAO_DICH.includes(
        loaiGiaoDich,
      )
    ) {
      return responseError(
        "Loại giao dịch tài chính không hợp lệ",
      );
    }

    if (
      phamVi &&
      loai ===
        "TAI_CHINH" &&
      !PHAM_VI_TAI_CHINH.includes(
        phamVi,
      )
    ) {
      return responseError(
        "Phạm vi tài chính không hợp lệ",
      );
    }

    /* =====================================================
       DATE RANGE
    ===================================================== */

    const tuNgay =
      tuNgayRaw
        ? parseStartDate(
            tuNgayRaw,
          )
        : null;

    const denNgay =
      denNgayRaw
        ? parseEndDate(
            denNgayRaw,
          )
        : null;

    if (
      tuNgayRaw &&
      !tuNgay
    ) {
      return responseError(
        "Ngày bắt đầu không hợp lệ",
      );
    }

    if (
      denNgayRaw &&
      !denNgay
    ) {
      return responseError(
        "Ngày kết thúc không hợp lệ",
      );
    }

    if (
      tuNgay &&
      denNgay &&
      tuNgay >
        denNgay
    ) {
      return responseError(
        "Khoảng thời gian không hợp lệ",
      );
    }

    /* =====================================================
       ROLE SCOPE
    ===================================================== */

    let forcedChiHoiId =
      "";

    if (
      session.role ===
      "CHI_HOI_TRUONG"
    ) {
      const ownChiHoiId =
        await getChiHoiIdCuaCHT(
          session.userId,
        );

      if (
        !ownChiHoiId
      ) {
        return responseError(
          "Tài khoản Chi hội trưởng chưa được liên kết với Chi hội",
          403,
        );
      }

      /*
       * Bắt buộc dùng Chi hội
       * của tài khoản CHT.
       *
       * Bỏ qua mọi chiHoiId
       * được client truyền lên.
       */
      forcedChiHoiId =
        ownChiHoiId;
    }

    const chiHoiId =
      forcedChiHoiId ||
      chiHoiIdParam;

    if (
      chiHoiId &&
      !Types.ObjectId.isValid(
        chiHoiId,
      )
    ) {
      return responseError(
        "Chi hội không hợp lệ",
      );
    }

    /* =====================================================
       MEMBER FILTER
    ===================================================== */

    const memberFilter:
      Record<
        string,
        unknown
      > = {};

    if (
      chiHoiId
    ) {
      memberFilter.chiHoiId =
        new Types.ObjectId(
          chiHoiId,
        );
    }

    if (
      loai ===
        "HOI_VIEN" &&
      trangThai
    ) {
      memberFilter.trangThai =
        trangThai;
    }

    if (
      loai ===
        "HOI_VIEN" &&
      search
    ) {
      memberFilter.$or = [
        {
          maHoiVien: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          hoTen: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          lop: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          khoaHoc: {
            $regex:
              search,

            $options:
              "i",
          },
        },
      ];
    }

    /* =====================================================
       LOAD MEMBERS
    ===================================================== */

    const members =
      await HoiVien.find(
        memberFilter,
      )
        .select(
          [
            "_id",
            "maHoiVien",
            "hoTen",
            "lop",
            "khoaHoc",
            "chiHoiId",
            "trangThai",
          ].join(
            " ",
          ),
        )
        .populate(
          "chiHoiId",

          "maChiHoi tenChiHoi",
        )
        .lean();

    const memberIds =
      members.map(
        (
          member,
        ) =>
          member._id,
      );

    /* =====================================================
       DIEM REN LUYEN FILTER
    ===================================================== */

    const diemRenLuyenFilter:
      Record<
        string,
        unknown
      > = {
      /*
       * Chỉ kết quả đã duyệt mới
       * được tính vào báo cáo.
       */
      trangThai:
        "DA_DUYET",
    };

    if (
      chiHoiId
    ) {
      diemRenLuyenFilter.chiHoiId =
        new Types.ObjectId(
          chiHoiId,
        );
    }

    if (
      hocKy
    ) {
      diemRenLuyenFilter.hocKy =
        hocKy;
    }

    if (
      namHoc
    ) {
      diemRenLuyenFilter.namHoc =
        namHoc;
    }

    /* =====================================================
       LOAD DIEM REN LUYEN
    ===================================================== */

    const diemRenLuyenList =
      await DiemRenLuyen.find(
        diemRenLuyenFilter,
      )
        .select(
          [
            "_id",
            "hoiVienId",
            "chiHoiId",
            "hocKy",
            "namHoc",
            "diem",
            "xepLoai",
            "trangThai",
          ].join(
            " ",
          ),
        )
        .lean();

    const tongDiemRenLuyen =
      diemRenLuyenList.reduce(
        (
          total,
          item,
        ) =>
          total +
          Number(
            item.diem ||
              0,
          ),
        0,
      );

    const diemRenLuyenTrungBinh =
      average(
        tongDiemRenLuyen,

        diemRenLuyenList.length,
      );

    /* =====================================================
       DIEM REN LUYEN - XEP LOAI
    ===================================================== */

    const thongKeXepLoaiRenLuyen = {
      xuatSac:
        diemRenLuyenList.filter(
          (
            item,
          ) =>
            item.xepLoai ===
            "XUAT_SAC",
        ).length,

      tot:
        diemRenLuyenList.filter(
          (
            item,
          ) =>
            item.xepLoai ===
            "TOT",
        ).length,

      kha:
        diemRenLuyenList.filter(
          (
            item,
          ) =>
            item.xepLoai ===
            "KHA",
        ).length,

      trungBinh:
        diemRenLuyenList.filter(
          (
            item,
          ) =>
            item.xepLoai ===
            "TRUNG_BINH",
        ).length,

      yeu:
        diemRenLuyenList.filter(
          (
            item,
          ) =>
            item.xepLoai ===
            "YEU",
        ).length,
    };

    /* =====================================================
       ACTIVITY FILTER
    ===================================================== */

    const activityFilter:
      Record<
        string,
        unknown
      > = {};

    if (
      tuNgay ||
      denNgay
    ) {
      const range:
        Record<
          string,
          Date
        > = {};

      if (
        tuNgay
      ) {
        range.$gte =
          tuNgay;
      }

      if (
        denNgay
      ) {
        range.$lte =
          denNgay;
      }

      activityFilter.thoiGianBatDau =
        range;
    }

    if (
      loai ===
        "HOAT_DONG" &&
      phamVi
    ) {
      activityFilter.phamVi =
        phamVi;
    }

    if (
      loai ===
        "HOAT_DONG" &&
      trangThai
    ) {
      activityFilter.trangThai =
        trangThai;
    }

    if (
      loai ===
        "HOAT_DONG" &&
      search
    ) {
      activityFilter.$or = [
        {
          maHoatDong: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          tenHoatDong: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          diaDiem: {
            $regex:
              search,

            $options:
              "i",
          },
        },
      ];
    }

    /*
     * CHT:
     *
     * - xem hoạt động Liên Chi hội
     * - xem hoạt động Chi hội mình
     */
    if (
      forcedChiHoiId
    ) {
      activityFilter.$and = [
        {
          $or: [
            {
              phamVi:
                "LIEN_CHI_HOI",
            },

            {
              phamVi:
                "CHI_HOI",

              chiHoiId:
                new Types.ObjectId(
                  forcedChiHoiId,
                ),
            },
          ],
        },
      ];
    }

    /* =====================================================
       LOAD ACTIVITIES
    ===================================================== */

    const activities =
      await HoatDong.find(
        activityFilter,
      )
        .select(
          [
            "_id",
            "maHoatDong",
            "tenHoatDong",
            "phamVi",
            "chiHoiId",
            "diaDiem",
            "thoiGianBatDau",
            "thoiGianKetThuc",
            "trangThai",
          ].join(
            " ",
          ),
        )
        .populate(
          "chiHoiId",

          "maChiHoi tenChiHoi",
        )
        .sort({
          thoiGianBatDau:
            -1,
        })
        .lean();

    const activityIds =
      activities.map(
        (
          activity,
        ) =>
          activity._id,
      );

    /* =====================================================
       REGISTRATION FILTER
    ===================================================== */

    const registrationFilter:
      Record<
        string,
        unknown
      > = {};

    if (
      activityIds.length >
      0
    ) {
      registrationFilter.hoatDongId =
        {
          $in:
            activityIds,
        };
    } else if (
      tuNgay ||
      denNgay ||
      (
        loai ===
          "HOAT_DONG" &&
        (
          phamVi ||
          trangThai ||
          search
        )
      )
    ) {
      /*
       * Nếu filter Hoạt động đã
       * chạy nhưng không có hoạt
       * động phù hợp thì không lấy
       * registration ngoài phạm vi.
       */
      registrationFilter.hoatDongId =
        {
          $in:
            [],
        };
    }

    if (
      chiHoiId
    ) {
      registrationFilter.hoiVienId =
        {
          $in:
            memberIds,
        };
    }

    /* =====================================================
       LOAD REGISTRATIONS
    ===================================================== */

    const registrations =
      await DangKyHoatDong.find(
        registrationFilter,
      )
        .select(
          [
            "_id",
            "hoatDongId",
            "hoiVienId",
            "trangThai",
            "thoiGianDangKy",
            "thoiGianDiemDanh",
          ].join(
            " ",
          ),
        )
        .lean();

    /* =====================================================
       REGISTRATION / ATTENDANCE STATS
    ===================================================== */

    const activeRegistrations =
      registrations.filter(
        (
          item,
        ) =>
          item.trangThai !==
          "DA_HUY",
      );

    const choDiemDanh =
      registrations.filter(
        (
          item,
        ) =>
          item.trangThai ===
          "DA_DANG_KY",
      ).length;

    const daThamGia =
      registrations.filter(
        (
          item,
        ) =>
          item.trangThai ===
          "DA_THAM_GIA",
      ).length;

    const vangMat =
      registrations.filter(
        (
          item,
        ) =>
          item.trangThai ===
          "VANG_MAT",
      ).length;

    const vangCoLyDo =
      registrations.filter(
        (
          item,
        ) =>
          item.trangThai ===
          "VANG_CO_LY_DO",
      ).length;

    const daHuy =
      registrations.filter(
        (
          item,
        ) =>
          item.trangThai ===
          "DA_HUY",
      ).length;

    const daCoKetQua =
      daThamGia +
      vangMat +
      vangCoLyDo;

    const tyLeThamGia =
      percent(
        daThamGia,

        daCoKetQua,
      );

    /* =====================================================
       GENERAL OVERVIEW
    ===================================================== */

    const tongQuan = {
      tongChiHoi:
        forcedChiHoiId
          ? 1
          : chiHoiId
            ? 1
            : await ChiHoi.countDocuments(),

      tongHoiVien:
        members.length,

      hoiVienDangHoatDong:
        members.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "DANG_HOAT_DONG",
        ).length,

      tongHoatDong:
        activities.length,

      hoatDongDaKetThuc:
        activities.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "DA_KET_THUC",
        ).length,

      tongLuotDangKy:
        activeRegistrations.length,

      choDiemDanh,

      daThamGia,

      vangMat,

      vangCoLyDo,

      daHuy,

      daCoKetQua,

      tyLeThamGia,

      /*
       * Điểm rèn luyện
       */
      soKetQuaRenLuyen:
        diemRenLuyenList.length,

      diemRenLuyenTrungBinh,

      thongKeXepLoaiRenLuyen,
    };

    /* =====================================================
       LOAD CHI HOI
    ===================================================== */

    let chiHoiList =
      await ChiHoi.find(
        forcedChiHoiId
          ? {
              _id:
                new Types.ObjectId(
                  forcedChiHoiId,
                ),
            }
          : {},
      )
        .select(
          "_id maChiHoi tenChiHoi",
        )
        .sort({
          maChiHoi:
            1,
        })
        .lean();

    /*
     * ADMIN/BCH filter Chi hội.
     */
    if (
      chiHoiId &&
      !forcedChiHoiId
    ) {
      chiHoiList =
        chiHoiList.filter(
          (
            item,
          ) =>
            String(
              item._id,
            ) ===
            chiHoiId,
        );
    }

    /* =====================================================
       MEMBERS BY CHI HOI
    ===================================================== */

    const memberChiHoiMap =
      new Map<
        string,
        typeof members
      >();

    for (
      const member of
      members
    ) {
      const id =
        getPopulatedId(
          member.chiHoiId,
        );

      if (!id) {
        continue;
      }

      const current =
        memberChiHoiMap.get(
          id,
        ) ||
        [];

      current.push(
        member,
      );

      memberChiHoiMap.set(
        id,
        current,
      );
    }

    /* =====================================================
       DIEM REN LUYEN BY CHI HOI
    ===================================================== */

    const diemRenLuyenChiHoiMap =
      new Map<
        string,
        {
          tongDiem: number;

          soLuong: number;

          xuatSac: number;

          tot: number;

          kha: number;

          trungBinh: number;

          yeu: number;
        }
      >();

    for (
      const item of
      diemRenLuyenList
    ) {
      const id =
        getPopulatedId(
          item.chiHoiId,
        );

      if (!id) {
        continue;
      }

      const current =
        diemRenLuyenChiHoiMap.get(
          id,
        ) || {
          tongDiem:
            0,

          soLuong:
            0,

          xuatSac:
            0,

          tot:
            0,

          kha:
            0,

          trungBinh:
            0,

          yeu:
            0,
        };

      current.tongDiem +=
        Number(
          item.diem ||
            0,
        );

      current.soLuong +=
        1;

      if (
        item.xepLoai ===
        "XUAT_SAC"
      ) {
        current.xuatSac +=
          1;
      }

      if (
        item.xepLoai ===
        "TOT"
      ) {
        current.tot +=
          1;
      }

      if (
        item.xepLoai ===
        "KHA"
      ) {
        current.kha +=
          1;
      }

      if (
        item.xepLoai ===
        "TRUNG_BINH"
      ) {
        current.trungBinh +=
          1;
      }

      if (
        item.xepLoai ===
        "YEU"
      ) {
        current.yeu +=
          1;
      }

      diemRenLuyenChiHoiMap.set(
        id,

        current,
      );
    }

    /* =====================================================
       CHI HOI STATS
    ===================================================== */

    const chiHoiStats =
      chiHoiList.map(
        (
          chiHoi,
        ) => {
          const id =
            String(
              chiHoi._id,
            );

          const ownMembers =
            memberChiHoiMap.get(
              id,
            ) ||
            [];

          const ownMemberIds =
            new Set(
              ownMembers.map(
                (
                  item,
                ) =>
                  String(
                    item._id,
                  ),
              ),
            );

          const ownRegs =
            registrations.filter(
              (
                item,
              ) =>
                ownMemberIds.has(
                  String(
                    item.hoiVienId,
                  ),
                ),
            );

          const present =
            ownRegs.filter(
              (
                item,
              ) =>
                item.trangThai ===
                "DA_THAM_GIA",
            ).length;

          const absent =
            ownRegs.filter(
              (
                item,
              ) =>
                item.trangThai ===
                  "VANG_MAT" ||
                item.trangThai ===
                  "VANG_CO_LY_DO",
            ).length;

          const resultCount =
            present +
            absent;

          const renLuyen =
            diemRenLuyenChiHoiMap.get(
              id,
            );

          const diemTrungBinh =
            renLuyen
              ? average(
                  renLuyen.tongDiem,

                  renLuyen.soLuong,
                )
              : 0;

          return {
            id,

            _id:
              id,

            maChiHoi:
              chiHoi.maChiHoi,

            tenChiHoi:
              chiHoi.tenChiHoi,

            tongHoiVien:
              ownMembers.length,

            hoiVienDangHoatDong:
              ownMembers.filter(
                (
                  item,
                ) =>
                  item.trangThai ===
                  "DANG_HOAT_DONG",
              ).length,

            tongLuotDangKy:
              ownRegs.filter(
                (
                  item,
                ) =>
                  item.trangThai !==
                  "DA_HUY",
              ).length,

            daThamGia:
              present,

            vang:
              absent,

            tyLeThamGia:
              percent(
                present,

                resultCount,
              ),

            /*
             * Điểm rèn luyện Chi hội.
             */
            soKetQuaRenLuyen:
              renLuyen?.soLuong ||
              0,

            diemRenLuyenTrungBinh:
              diemTrungBinh,

            xepLoaiRenLuyen: {
              xuatSac:
                renLuyen?.xuatSac ||
                0,

              tot:
                renLuyen?.tot ||
                0,

              kha:
                renLuyen?.kha ||
                0,

              trungBinh:
                renLuyen?.trungBinh ||
                0,

              yeu:
                renLuyen?.yeu ||
                0,
            },
          };
        },
      );

    /* =====================================================
       MEMBER STATS
    ===================================================== */

    const hoiVienStats =
      members.map(
        (
          member,
        ) => {
          const id =
            String(
              member._id,
            );

          const ownRegs =
            registrations.filter(
              (
                item,
              ) =>
                String(
                  item.hoiVienId,
                ) ===
                id,
            );

          const present =
            ownRegs.filter(
              (
                item,
              ) =>
                item.trangThai ===
                "DA_THAM_GIA",
            ).length;

          const absent =
            ownRegs.filter(
              (
                item,
              ) =>
                item.trangThai ===
                  "VANG_MAT" ||
                item.trangThai ===
                  "VANG_CO_LY_DO",
            ).length;

          /* ===============================================
             DIEM REN LUYEN CUA HOI VIEN
          =============================================== */

          const ownRenLuyen =
            diemRenLuyenList.filter(
              (
                item,
              ) =>
                String(
                  item.hoiVienId,
                ) ===
                id,
            );

          const tongDiem =
            ownRenLuyen.reduce(
              (
                total,
                item,
              ) =>
                total +
                Number(
                  item.diem ||
                    0,
                ),

              0,
            );

          const diemTrungBinh =
            average(
              tongDiem,

              ownRenLuyen.length,
            );

          const renLuyenMoiNhat =
            ownRenLuyen.length >
            0
              ? ownRenLuyen[
                  ownRenLuyen.length -
                    1
                ]
              : null;

          return {
            id,

            _id:
              id,

            maHoiVien:
              member.maHoiVien,

            hoTen:
              member.hoTen,

            lop:
              member.lop ||
              "",

            khoaHoc:
              member.khoaHoc ||
              "",

            trangThai:
              member.trangThai,

            chiHoi:
              member.chiHoiId,

            tongDangKy:
              ownRegs.filter(
                (
                  item,
                ) =>
                  item.trangThai !==
                  "DA_HUY",
              ).length,

            daThamGia:
              present,

            vangMat:
              ownRegs.filter(
                (
                  item,
                ) =>
                  item.trangThai ===
                  "VANG_MAT",
              ).length,

            vangCoLyDo:
              ownRegs.filter(
                (
                  item,
                ) =>
                  item.trangThai ===
                  "VANG_CO_LY_DO",
              ).length,

            daHuy:
              ownRegs.filter(
                (
                  item,
                ) =>
                  item.trangThai ===
                  "DA_HUY",
              ).length,

            tyLeThamGia:
              percent(
                present,

                present +
                  absent,
              ),

            /*
             * Điểm rèn luyện.
             */
            soKetQuaRenLuyen:
              ownRenLuyen.length,

            diemRenLuyenTrungBinh:
              diemTrungBinh,

            diemRenLuyenMoiNhat:
              renLuyenMoiNhat
                ? {
                    diem:
                      Number(
                        renLuyenMoiNhat.diem ||
                          0,
                      ),

                    xepLoai:
                      renLuyenMoiNhat.xepLoai,

                    hocKy:
                      renLuyenMoiNhat.hocKy,

                    namHoc:
                      renLuyenMoiNhat.namHoc,
                  }
                : null,
          };
        },
      );

    /* =====================================================
       ACTIVITY STATS
    ===================================================== */

    const hoatDongStats =
      activities.map(
        (
          activity,
        ) => {
          const id =
            String(
              activity._id,
            );

          let ownRegs =
            registrations.filter(
              (
                item,
              ) =>
                String(
                  item.hoatDongId,
                ) ===
                id,
            );

          /*
           * CHT:
           * chỉ thống kê người thuộc
           * Chi hội mình.
           */
          if (
            forcedChiHoiId
          ) {
            const allowedMemberIds =
              new Set(
                memberIds.map(
                  (
                    item,
                  ) =>
                    String(
                      item,
                    ),
                ),
              );

            ownRegs =
              ownRegs.filter(
                (
                  item,
                ) =>
                  allowedMemberIds.has(
                    String(
                      item.hoiVienId,
                    ),
                  ),
              );
          }

          const present =
            ownRegs.filter(
              (
                item,
              ) =>
                item.trangThai ===
                "DA_THAM_GIA",
            ).length;

          const absent =
            ownRegs.filter(
              (
                item,
              ) =>
                item.trangThai ===
                  "VANG_MAT" ||
                item.trangThai ===
                  "VANG_CO_LY_DO",
            ).length;

          return {
            id,

            _id:
              id,

            maHoatDong:
              activity.maHoatDong,

            tenHoatDong:
              activity.tenHoatDong,

            phamVi:
              activity.phamVi,

            chiHoi:
              activity.chiHoiId,

            diaDiem:
              activity.diaDiem,

            thoiGianBatDau:
              activity.thoiGianBatDau,

            thoiGianKetThuc:
              activity.thoiGianKetThuc,

            trangThai:
              activity.trangThai,

            tongDangKy:
              ownRegs.filter(
                (
                  item,
                ) =>
                  item.trangThai !==
                  "DA_HUY",
              ).length,

            choDiemDanh:
              ownRegs.filter(
                (
                  item,
                ) =>
                  item.trangThai ===
                  "DA_DANG_KY",
              ).length,

            daThamGia:
              present,

            vangMat:
              ownRegs.filter(
                (
                  item,
                ) =>
                  item.trangThai ===
                  "VANG_MAT",
              ).length,

            vangCoLyDo:
              ownRegs.filter(
                (
                  item,
                ) =>
                  item.trangThai ===
                  "VANG_CO_LY_DO",
              ).length,

            daHuy:
              ownRegs.filter(
                (
                  item,
                ) =>
                  item.trangThai ===
                  "DA_HUY",
              ).length,

            tyLeThamGia:
              percent(
                present,

                present +
                  absent,
              ),
          };
        },
      );

    /* =====================================================
       ACTIVITY BY MONTH
    ===================================================== */

    const monthMap =
      new Map<
        string,
        {
          thang: string;

          soHoatDong: number;

          tongDangKy: number;

          daThamGia: number;
        }
      >();

    for (
      const activity of
      activities
    ) {
      const date =
        new Date(
          activity.thoiGianBatDau,
        );

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        continue;
      }

      const key =
        `${date.getFullYear()}-${String(
          date.getMonth() +
            1,
        ).padStart(
          2,
          "0",
        )}`;

      if (
        !monthMap.has(
          key,
        )
      ) {
        monthMap.set(
          key,
          {
            thang:
              key,

            soHoatDong:
              0,

            tongDangKy:
              0,

            daThamGia:
              0,
          },
        );
      }

      const row =
        monthMap.get(
          key,
        );

      if (!row) {
        continue;
      }

      row.soHoatDong +=
        1;

      let activityRegs =
        registrations.filter(
          (
            item,
          ) =>
            String(
              item.hoatDongId,
            ) ===
            String(
              activity._id,
            ),
        );

      if (
        forcedChiHoiId
      ) {
        const allowedIds =
          new Set(
            memberIds.map(
              (
                item,
              ) =>
                String(
                  item,
                ),
            ),
          );

        activityRegs =
          activityRegs.filter(
            (
              item,
            ) =>
              allowedIds.has(
                String(
                  item.hoiVienId,
                ),
              ),
          );
      }

      row.tongDangKy +=
        activityRegs.filter(
          (
            item,
          ) =>
            item.trangThai !==
            "DA_HUY",
        ).length;

      row.daThamGia +=
        activityRegs.filter(
          (
            item,
          ) =>
            item.trangThai ===
            "DA_THAM_GIA",
        ).length;
    }

    const theoThang =
      Array.from(
        monthMap.values(),
      ).sort(
        (
          a,
          b,
        ) =>
          a.thang.localeCompare(
            b.thang,
          ),
      );

    /* =====================================================
       TOP CHI HOI
    ===================================================== */

    const topChiHoi =
      [...chiHoiStats]
        .sort(
          (
            a,
            b,
          ) => {
            if (
              b.tyLeThamGia !==
              a.tyLeThamGia
            ) {
              return (
                b.tyLeThamGia -
                a.tyLeThamGia
              );
            }

            return (
              b.daThamGia -
              a.daThamGia
            );
          },
        )
        .slice(
          0,
          10,
        );

    /* =====================================================
       DIEM REN LUYEN - PHAN BO
    ===================================================== */

    const diemRenLuyenTheoKhoang = {
      /*
       * Chỉ phân nhóm để phục vụ
       * biểu đồ.
       *
       * Không tự động thay đổi
       * xếp loại nghiệp vụ.
       */
      tu90Den100:
        diemRenLuyenList.filter(
          (
            item,
          ) =>
            Number(
              item.diem,
            ) >=
            90,
        ).length,

      tu80DenDuoi90:
        diemRenLuyenList.filter(
          (
            item,
          ) => {
            const diem =
              Number(
                item.diem,
              );

            return (
              diem >=
                80 &&
              diem <
                90
            );
          },
        ).length,

      tu65DenDuoi80:
        diemRenLuyenList.filter(
          (
            item,
          ) => {
            const diem =
              Number(
                item.diem,
              );

            return (
              diem >=
                65 &&
              diem <
                80
            );
          },
        ).length,

      tu50DenDuoi65:
        diemRenLuyenList.filter(
          (
            item,
          ) => {
            const diem =
              Number(
                item.diem,
              );

            return (
              diem >=
                50 &&
              diem <
                65
            );
          },
        ).length,

      duoi50:
        diemRenLuyenList.filter(
          (
            item,
          ) =>
            Number(
              item.diem,
            ) <
            50,
        ).length,
    };

    /* =====================================================
       FINANCE FILTER
    ===================================================== */

    const financeFilter:
      Record<
        string,
        unknown
      > = {};

    /*
     * CHT chỉ xem tài chính
     * của Chi hội mình.
     */
    if (
      forcedChiHoiId
    ) {
      financeFilter.phamVi =
        "CHI_HOI";

      financeFilter.chiHoiId =
        new Types.ObjectId(
          forcedChiHoiId,
        );
    } else {
      if (
        loai ===
          "TAI_CHINH" &&
        phamVi
      ) {
        financeFilter.phamVi =
          phamVi;
      }

      if (
        chiHoiId
      ) {
        financeFilter.chiHoiId =
          new Types.ObjectId(
            chiHoiId,
          );
      }
    }

    if (
      loai ===
        "TAI_CHINH" &&
      loaiGiaoDich
    ) {
      financeFilter.loai =
        loaiGiaoDich;
    }

    if (
      tuNgay ||
      denNgay
    ) {
      const range:
        Record<
          string,
          Date
        > = {};

      if (
        tuNgay
      ) {
        range.$gte =
          tuNgay;
      }

      if (
        denNgay
      ) {
        range.$lte =
          denNgay;
      }

      financeFilter.ngayGiaoDich =
        range;
    }

    if (
      loai ===
        "TAI_CHINH" &&
      search
    ) {
      financeFilter.$or = [
        {
          noiDung: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          ghiChu: {
            $regex:
              search,

            $options:
              "i",
          },
        },

        {
          nguoiTaoTen: {
            $regex:
              search,

            $options:
              "i",
          },
        },
      ];
    }

    /* =====================================================
       FINANCE DATA
    ===================================================== */

    const financeTransactions =
      await GiaoDichTaiChinh.find(
        financeFilter,
      )
        .select(
          [
            "_id",
            "loai",
            "phamVi",
            "chiHoiId",
            "soTien",
            "noiDung",
            "ngayGiaoDich",
            "ghiChu",
            "nguoiTaoTen",
            "chungTuUrl",
            "createdAt",
          ].join(
            " ",
          ),
        )
        .populate(
          "chiHoiId",

          "maChiHoi tenChiHoi",
        )
        .sort({
          ngayGiaoDich:
            -1,

          createdAt:
            -1,
        })
        .lean();

    /* =====================================================
       FINANCE TOTAL
    ===================================================== */

    const tongThu =
      financeTransactions
        .filter(
          (
            item,
          ) =>
            item.loai ===
            "THU",
        )
        .reduce(
          (
            total,
            item,
          ) =>
            total +
            Number(
              item.soTien ||
                0,
            ),

          0,
        );

    const tongChi =
      financeTransactions
        .filter(
          (
            item,
          ) =>
            item.loai ===
            "CHI",
        )
        .reduce(
          (
            total,
            item,
          ) =>
            total +
            Number(
              item.soTien ||
                0,
            ),

          0,
        );

    const soDu =
      tongThu -
      tongChi;

    const taiChinhTongQuan = {
      tongThu,

      tongChi,

      soDu,

      soGiaoDich:
        financeTransactions.length,

      soKhoanThu:
        financeTransactions.filter(
          (
            item,
          ) =>
            item.loai ===
            "THU",
        ).length,

      soKhoanChi:
        financeTransactions.filter(
          (
            item,
          ) =>
            item.loai ===
            "CHI",
        ).length,
    };

    /* =====================================================
       FINANCE DETAIL
    ===================================================== */

    const taiChinhDanhSach =
      financeTransactions.map(
        (
          item,
        ) => ({
          id:
            String(
              item._id,
            ),

          _id:
            String(
              item._id,
            ),

          loai:
            item.loai,

          phamVi:
            item.phamVi,

          chiHoi:
            item.chiHoiId,

          soTien:
            Number(
              item.soTien ||
                0,
            ),

          noiDung:
            item.noiDung ||
            "",

          ngayGiaoDich:
            item.ngayGiaoDich,

          ghiChu:
            item.ghiChu ||
            "",

          nguoiTaoTen:
            item.nguoiTaoTen ||
            "",

          chungTuUrl:
            item.chungTuUrl ||
            "",
        }),
      );

    /* =====================================================
       FINANCE BY MONTH
    ===================================================== */

    const financeMonthMap =
      new Map<
        string,
        {
          thang: string;

          tongThu: number;

          tongChi: number;

          soDu: number;

          soGiaoDich: number;
        }
      >();

    for (
      const item of
      financeTransactions
    ) {
      const date =
        new Date(
          item.ngayGiaoDich,
        );

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        continue;
      }

      const key =
        `${date.getFullYear()}-${String(
          date.getMonth() +
            1,
        ).padStart(
          2,
          "0",
        )}`;

      if (
        !financeMonthMap.has(
          key,
        )
      ) {
        financeMonthMap.set(
          key,
          {
            thang:
              key,

            tongThu:
              0,

            tongChi:
              0,

            soDu:
              0,

            soGiaoDich:
              0,
          },
        );
      }

      const row =
        financeMonthMap.get(
          key,
        );

      if (!row) {
        continue;
      }

      const amount =
        Number(
          item.soTien ||
            0,
        );

      row.soGiaoDich +=
        1;

      if (
        item.loai ===
        "THU"
      ) {
        row.tongThu +=
          amount;
      }

      if (
        item.loai ===
        "CHI"
      ) {
        row.tongChi +=
          amount;
      }

      row.soDu =
        row.tongThu -
        row.tongChi;
    }

    const taiChinhTheoThang =
      Array.from(
        financeMonthMap.values(),
      ).sort(
        (
          a,
          b,
        ) =>
          a.thang.localeCompare(
            b.thang,
          ),
      );

    /* =====================================================
       FINANCE BY CHI HOI
    ===================================================== */

    const financeChiHoiMap =
      new Map<
        string,
        {
          id: string;

          maChiHoi: string;

          tenChiHoi: string;

          tongThu: number;

          tongChi: number;

          soDu: number;

          soGiaoDich: number;
        }
      >();

    for (
      const item of
      financeTransactions
    ) {
      if (
        item.phamVi !==
        "CHI_HOI"
      ) {
        continue;
      }

      const chiHoi =
        item.chiHoiId as
          | {
              _id?: unknown;

              maChiHoi?: string;

              tenChiHoi?: string;
            }
          | null
          | undefined;

      const id =
        getPopulatedId(
          chiHoi,
        );

      if (!id) {
        continue;
      }

      if (
        !financeChiHoiMap.has(
          id,
        )
      ) {
        financeChiHoiMap.set(
          id,
          {
            id,

            maChiHoi:
              chiHoi?.maChiHoi ||
              "",

            tenChiHoi:
              chiHoi?.tenChiHoi ||
              "",

            tongThu:
              0,

            tongChi:
              0,

            soDu:
              0,

            soGiaoDich:
              0,
          },
        );
      }

      const row =
        financeChiHoiMap.get(
          id,
        );

      if (!row) {
        continue;
      }

      const amount =
        Number(
          item.soTien ||
            0,
        );

      row.soGiaoDich +=
        1;

      if (
        item.loai ===
        "THU"
      ) {
        row.tongThu +=
          amount;
      }

      if (
        item.loai ===
        "CHI"
      ) {
        row.tongChi +=
          amount;
      }

      row.soDu =
        row.tongThu -
        row.tongChi;
    }

    const taiChinhTheoChiHoi =
      Array.from(
        financeChiHoiMap.values(),
      ).sort(
        (
          a,
          b,
        ) =>
          b.soDu -
          a.soDu,
      );

    /* =====================================================
       RESULT BY TYPE
    ===================================================== */

    let ketQua:
      unknown;

    if (
      loai ===
      "CHI_HOI"
    ) {
      ketQua =
        chiHoiStats;
    } else if (
      loai ===
      "HOI_VIEN"
    ) {
      ketQua =
        hoiVienStats;
    } else if (
      loai ===
      "HOAT_DONG"
    ) {
      ketQua =
        hoatDongStats;
    } else if (
      loai ===
      "TAI_CHINH"
    ) {
      ketQua =
        taiChinhDanhSach;
    } else {
      ketQua = {
        tongQuan,

        topChiHoi,

        theoThang,

        diemRenLuyen: {
          diemTrungBinh:
            diemRenLuyenTrungBinh,

          tongKetQua:
            diemRenLuyenList.length,

          xepLoai:
            thongKeXepLoaiRenLuyen,

          phanBoDiem:
            diemRenLuyenTheoKhoang,
        },
      };
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success:
        true,

      message:
        "Lấy dữ liệu thống kê thành công",

      data: {
        loai,

        /* ===============================================
           FILTERS APPLIED
        =============================================== */

        boLoc: {
          tuNgay:
            tuNgayRaw ||
            null,

          denNgay:
            denNgayRaw ||
            null,

          chiHoiId:
            chiHoiId ||
            null,

          trangThai:
            trangThai ||
            null,

          phamVi:
            phamVi ||
            null,

          search:
            search ||
            null,

          loaiGiaoDich:
            loaiGiaoDich ||
            null,

          hocKy:
            hocKy ||
            null,

          namHoc:
            namHoc ||
            null,
        },

        /* ===============================================
           GENERAL
        =============================================== */

        tongQuan,

        topChiHoi,

        theoThang,

        /* ===============================================
           DIEM REN LUYEN
        =============================================== */

        diemRenLuyenTongQuan: {
          tongKetQua:
            diemRenLuyenList.length,

          diemTrungBinh:
            diemRenLuyenTrungBinh,

          xepLoai:
            thongKeXepLoaiRenLuyen,

          phanBoDiem:
            diemRenLuyenTheoKhoang,
        },

        /* ===============================================
           FINANCE
        =============================================== */

        taiChinhTongQuan,

        taiChinhTheoThang,

        taiChinhTheoChiHoi,

        /* ===============================================
           RESULT
        =============================================== */

        ketQua,

        chiHoi:
          loai ===
            "CHI_HOI"
            ? chiHoiStats
            : undefined,

        hoiVien:
          loai ===
            "HOI_VIEN"
            ? hoiVienStats
            : undefined,

        hoatDong:
          loai ===
            "HOAT_DONG"
            ? hoatDongStats
            : undefined,

        taiChinh:
          loai ===
            "TAI_CHINH"
            ? taiChinhDanhSach
            : undefined,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/thong-ke:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          process.env
            .NODE_ENV ===
          "development"
            ? error instanceof
              Error
              ? error.message
              : "Không thể lấy dữ liệu thống kê"
            : "Đã xảy ra lỗi khi thống kê dữ liệu",
      },
      {
        status:
          500,
      },
    );
  }
}