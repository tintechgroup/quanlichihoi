import bcrypt from "bcryptjs";
import type { Types } from "mongoose";

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

import ChiHoi from "@/models/ChiHoi";
import HoiVien from "@/models/HoiVien";
import User from "@/models/User";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

/* =========================================================
   TYPES
========================================================= */

type LoaiImport =
  | "HOI_VIEN"
  | "CHI_HOI"
  | "BAN_CHAP_HANH";

type ImportRow = {
  __rowNumber?:
    number;

  [key: string]:
    unknown;
};

type RequestBody = {
  loai?:
    unknown;

  skipInvalid?:
    unknown;

  rows?:
    unknown;
};

type ImportError = {
  row:
    number;

  message:
    string;
};

/* =========================================================
   HELPERS
========================================================= */

function errorResponse(
  message:
    string,

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

function normalizeKey(
  value:
    string,
) {
  return value
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /đ/g,
      "d",
    )
    .replace(
      /Đ/g,
      "D",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim()
    .toLowerCase();
}

function stringValue(
  value:
    unknown,
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "";
  }

  return String(
    value,
  ).trim();
}

function getValue(
  row:
    ImportRow,

  header:
    string,
) {
  const target =
    normalizeKey(
      header,
    );

  for (
    const [
      key,
      value,
    ] of Object.entries(
      row,
    )
  ) {
    if (
      key ===
      "__rowNumber"
    ) {
      continue;
    }

    if (
      normalizeKey(
        key,
      ) ===
      target
    ) {
      return stringValue(
        value,
      );
    }
  }

  return "";
}

function getRowNumber(
  row:
    ImportRow,

  fallback:
    number,
) {
  const value =
    Number(
      row.__rowNumber,
    );

  if (
    Number.isInteger(
      value,
    ) &&
    value >
      0
  ) {
    return value;
  }

  return (
    fallback +
    2
  );
}

function isValidEmail(
  value:
    string,
) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function normalizePhone(
  value:
    string,
) {
  return value.replace(
    /[\s.\-()]/g,
    "",
  );
}

function isValidPhone(
  value:
    string,
) {
  if (!value) {
    return true;
  }

  return /^0\d{9}$/.test(
    normalizePhone(
      value,
    ),
  );
}

function normalizeGender(
  value:
    string,
):
  | "NAM"
  | "NU"
  | "KHAC"
  | null {
  const normalized =
    normalizeKey(
      value,
    );

  if (
    !normalized
  ) {
    return "NAM";
  }

  if (
    normalized ===
      "nam"
  ) {
    return "NAM";
  }

  if (
    normalized ===
      "nu"
  ) {
    return "NU";
  }

  if (
    normalized ===
      "khac"
  ) {
    return "KHAC";
  }

  if (
    value ===
      "NAM" ||
    value ===
      "NU" ||
    value ===
      "KHAC"
  ) {
    return value;
  }

  return null;
}

function normalizeMemberStatus(
  value:
    string,
):
  | "DANG_HOAT_DONG"
  | "TAM_NGUNG"
  | null {
  if (!value) {
    return "DANG_HOAT_DONG";
  }

  if (
    value ===
      "DANG_HOAT_DONG" ||
    normalizeKey(
      value,
    ) ===
      "dang hoat dong"
  ) {
    return "DANG_HOAT_DONG";
  }

  if (
    value ===
      "TAM_NGUNG" ||
    normalizeKey(
      value,
    ) ===
      "tam ngung"
  ) {
    return "TAM_NGUNG";
  }

  return null;
}

function normalizeRole(
  value:
    string,
):
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | null {
  if (
    value ===
    "BAN_CHAP_HANH"
  ) {
    return "BAN_CHAP_HANH";
  }

  if (
    value ===
    "CHI_HOI_TRUONG"
  ) {
    return "CHI_HOI_TRUONG";
  }

  const normalized =
    normalizeKey(
      value,
    );

  if (
    normalized ===
      "ban chap hanh" ||
    normalized ===
      "bch"
  ) {
    return "BAN_CHAP_HANH";
  }

  if (
    normalized ===
      "chi hoi truong" ||
    normalized ===
      "cht"
  ) {
    return "CHI_HOI_TRUONG";
  }

  return null;
}

function parseDate(
  value:
    string,
) {
  if (!value) {
    return null;
  }

  /*
   * yyyy-mm-dd
   */
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    const date =
      new Date(
        `${value}T00:00:00`,
      );

    return Number.isNaN(
      date.getTime(),
    )
      ? null
      : date;
  }

  /*
   * dd/mm/yyyy
   */
  const match =
    value.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    );

  if (match) {
    const day =
      Number(
        match[1],
      );

    const month =
      Number(
        match[2],
      );

    const year =
      Number(
        match[3],
      );

    const date =
      new Date(
        year,
        month -
          1,
        day,
      );

    if (
      date.getFullYear() !==
        year ||
      date.getMonth() !==
        month -
          1 ||
      date.getDate() !==
        day
    ) {
      return null;
    }

    return date;
  }

  const date =
    new Date(
      value,
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

function passwordIsValid(
  value:
    string,
) {
  /*
   * Import giữ tương thích với
   * module cấp tài khoản hiện tại:
   * ít nhất 6 ký tự.
   */
  return (
    value.length >=
    6
  );
}

/* =========================================================
   FIND CHI HOI
========================================================= */

async function findChiHoiByCode(
  maChiHoi:
    string,
) {
  if (!maChiHoi) {
    return null;
  }

  return ChiHoi.findOne({
    maChiHoi:
      maChiHoi
        .trim()
        .toUpperCase(),
  });
}

/* =========================================================
   IMPORT CHI HOI
========================================================= */

async function importChiHoi(
  row:
    ImportRow,

  rowNumber:
    number,
) {
  const maChiHoi =
    getValue(
      row,
      "Mã Chi hội",
    )
      .toUpperCase();

  const tenChiHoi =
    getValue(
      row,
      "Tên Chi hội",
    );

  if (!maChiHoi) {
    throw new Error(
      "Thiếu Mã Chi hội",
    );
  }

  if (!tenChiHoi) {
    throw new Error(
      "Thiếu Tên Chi hội",
    );
  }

  const duplicate =
    await ChiHoi.findOne({
      maChiHoi,
    })
      .select(
        "_id",
      )
      .lean();

  if (duplicate) {
    throw new Error(
      `Mã Chi hội ${maChiHoi} đã tồn tại`,
    );
  }

  /*
   * Model ChiHoi hiện tại dùng tối thiểu:
   * maChiHoi, tenChiHoi, moTa.
   */
  await ChiHoi.create({
    maChiHoi,
    tenChiHoi,
    moTa:
      "",
  });

  return {
    row:
      rowNumber,

    name:
      `${maChiHoi} - ${tenChiHoi}`,
  };
}

/* =========================================================
   IMPORT HOI VIEN
========================================================= */

async function importHoiVien(
  row:
    ImportRow,

  rowNumber:
    number,
) {
  const maHoiVien =
    getValue(
      row,
      "Mã Hội viên",
    );

  const hoTen =
    getValue(
      row,
      "Họ tên",
    );

  const ngaySinhText =
    getValue(
      row,
      "Ngày sinh",
    );

  const gioiTinhText =
    getValue(
      row,
      "Giới tính",
    );

  const email =
    getValue(
      row,
      "Email",
    ).toLowerCase();

  const soDienThoai =
    normalizePhone(
      getValue(
        row,
        "Số điện thoại",
      ),
    );

  const lop =
    getValue(
      row,
      "Lớp",
    );

  const khoaHoc =
    getValue(
      row,
      "Khóa học",
    );

  const diaChi =
    getValue(
      row,
      "Địa chỉ",
    );

  const maChiHoi =
    getValue(
      row,
      "Mã Chi hội",
    )
      .toUpperCase();

  const trangThaiText =
    getValue(
      row,
      "Trạng thái",
    );

  const username =
    getValue(
      row,
      "Tên đăng nhập",
    )
      .toLowerCase();

  const password =
    getValue(
      row,
      "Mật khẩu",
    );

  /* =====================================================
     VALIDATION
  ===================================================== */

  if (!maHoiVien) {
    throw new Error(
      "Thiếu Mã Hội viên",
    );
  }

  if (!hoTen) {
    throw new Error(
      "Thiếu Họ tên",
    );
  }

  if (!maChiHoi) {
    throw new Error(
      "Thiếu Mã Chi hội",
    );
  }

  if (
    email &&
    !isValidEmail(
      email,
    )
  ) {
    throw new Error(
      "Email không hợp lệ",
    );
  }

  if (
    soDienThoai &&
    !isValidPhone(
      soDienThoai,
    )
  ) {
    throw new Error(
      "Số điện thoại phải gồm 10 số và bắt đầu bằng 0",
    );
  }

  const gioiTinh =
    normalizeGender(
      gioiTinhText,
    );

  if (!gioiTinh) {
    throw new Error(
      "Giới tính không hợp lệ",
    );
  }

  const trangThai =
    normalizeMemberStatus(
      trangThaiText,
    );

  if (!trangThai) {
    throw new Error(
      "Trạng thái Hội viên không hợp lệ",
    );
  }

  let ngaySinh:
    Date | null =
    null;

  if (
    ngaySinhText
  ) {
    ngaySinh =
      parseDate(
        ngaySinhText,
      );

    if (!ngaySinh) {
      throw new Error(
        "Ngày sinh không hợp lệ",
      );
    }
  }

  if (
    username &&
    !password
  ) {
    throw new Error(
      "Có Tên đăng nhập nhưng thiếu Mật khẩu",
    );
  }

  if (
    password &&
    !username
  ) {
    throw new Error(
      "Có Mật khẩu nhưng thiếu Tên đăng nhập",
    );
  }

  if (
    password &&
    !passwordIsValid(
      password,
    )
  ) {
    throw new Error(
      "Mật khẩu phải có ít nhất 6 ký tự",
    );
  }

  /* =====================================================
     CHECK DUPLICATE MEMBER
  ===================================================== */

  const duplicateMember =
    await HoiVien.findOne({
      maHoiVien,
    })
      .select(
        "_id",
      )
      .lean();

  if (
    duplicateMember
  ) {
    throw new Error(
      `Mã Hội viên ${maHoiVien} đã tồn tại`,
    );
  }

  /* =====================================================
     CHI HOI
  ===================================================== */

  const chiHoi =
    await findChiHoiByCode(
      maChiHoi,
    );

  if (!chiHoi) {
    throw new Error(
      `Không tìm thấy Chi hội có mã ${maChiHoi}`,
    );
  }

  /* =====================================================
     CHECK ACCOUNT
  ===================================================== */

  if (username) {
    const duplicateUser =
      await User.findOne({
        username,
      })
        .select(
          "_id",
        )
        .lean();

    if (
      duplicateUser
    ) {
      throw new Error(
        `Tên đăng nhập ${username} đã tồn tại`,
      );
    }
  }

  /*
   * Email ở User có thể optional.
   * Không chặn email trùng ở đây nếu schema hiện tại
   * không khai báo unique.
   */

  let createdUserId:
    Types.ObjectId | null =
    null;

  try {
    /* ===================================================
       CREATE USER
    =================================================== */

    if (username) {
      const hashedPassword =
        await bcrypt.hash(
          password,
          12,
        );

      const user =
        await User.create({
          username,

          password:
            hashedPassword,

          fullName:
            hoTen,

          email,

          phone:
            soDienThoai,

          role:
            "HOI_VIEN",

          isActive:
            trangThai ===
            "DANG_HOAT_DONG",
        });

      createdUserId =
        user._id;
    }

    /* ===================================================
       CREATE MEMBER
    =================================================== */

    await HoiVien.create({
      maHoiVien,

      hoTen,

      ngaySinh,

      gioiTinh,

      email,

      soDienThoai,

      lop,

      khoaHoc,

      diaChi,

      chiHoiId:
        chiHoi._id,

      taiKhoanId:
        createdUserId ||
        null,

      trangThai,
    });
  } catch (
    error
  ) {
    /*
     * Nếu User đã tạo nhưng HoiVien thất bại,
     * xóa lại User để tránh tài khoản mồ côi.
     */
    if (
      createdUserId
    ) {
      try {
        await User.findByIdAndDelete(
          createdUserId,
        );
      } catch (
        rollbackError
      ) {
        console.error(
          "Không thể rollback User khi import Hội viên:",
          rollbackError,
        );
      }
    }

    throw error;
  }

  return {
    row:
      rowNumber,

    name:
      `${maHoiVien} - ${hoTen}`,
  };
}

/* =========================================================
   IMPORT BCH / CHT
========================================================= */

async function importBanChapHanh(
  row:
    ImportRow,

  rowNumber:
    number,
) {
  const fullName =
    getValue(
      row,
      "Họ tên",
    );

  const username =
    getValue(
      row,
      "Tên đăng nhập",
    )
      .toLowerCase();

  const password =
    getValue(
      row,
      "Mật khẩu",
    );

  const email =
    getValue(
      row,
      "Email",
    )
      .toLowerCase();

  const phone =
    normalizePhone(
      getValue(
        row,
        "Số điện thoại",
      ),
    );

  const roleText =
    getValue(
      row,
      "Vai trò",
    );

  const maChiHoi =
    getValue(
      row,
      "Mã Chi hội",
    )
      .toUpperCase();

  /* =====================================================
     VALIDATION
  ===================================================== */

  if (!fullName) {
    throw new Error(
      "Thiếu Họ tên",
    );
  }

  if (!username) {
    throw new Error(
      "Thiếu Tên đăng nhập",
    );
  }

  if (!password) {
    throw new Error(
      "Thiếu Mật khẩu",
    );
  }

  if (
    !passwordIsValid(
      password,
    )
  ) {
    throw new Error(
      "Mật khẩu phải có ít nhất 6 ký tự",
    );
  }

  if (
    email &&
    !isValidEmail(
      email,
    )
  ) {
    throw new Error(
      "Email không hợp lệ",
    );
  }

  if (
    phone &&
    !isValidPhone(
      phone,
    )
  ) {
    throw new Error(
      "Số điện thoại phải gồm 10 số và bắt đầu bằng 0",
    );
  }

  const role =
    normalizeRole(
      roleText,
    );

  if (!role) {
    throw new Error(
      "Vai trò chỉ được là BAN_CHAP_HANH hoặc CHI_HOI_TRUONG",
    );
  }

  /* =====================================================
     DUPLICATE USER
  ===================================================== */

  const duplicate =
    await User.findOne({
      username,
    })
      .select(
        "_id",
      )
      .lean();

  if (duplicate) {
    throw new Error(
      `Tên đăng nhập ${username} đã tồn tại`,
    );
  }

  /* =====================================================
     CHI HOI
  ===================================================== */

  let chiHoiId:
    Types.ObjectId | null =
    null;

  if (
    role ===
    "CHI_HOI_TRUONG"
  ) {
    if (!maChiHoi) {
      throw new Error(
        "Chi hội trưởng bắt buộc phải có Mã Chi hội",
      );
    }

    const chiHoi =
      await findChiHoiByCode(
        maChiHoi,
      );

    if (!chiHoi) {
      throw new Error(
        `Không tìm thấy Chi hội có mã ${maChiHoi}`,
      );
    }

    /*
     * Không cho một Chi hội có nhiều CHT
     * nếu dữ liệu hiện tại đã có CHT gắn trực tiếp.
     */
    const existingLeader =
      await User.findOne({
        role:
          "CHI_HOI_TRUONG",

        chiHoiId:
          chiHoi._id,

        isActive: {
          $ne:
            false,
        },
      })
        .select(
          "_id username",
        )
        .lean();

    if (
      existingLeader
    ) {
      throw new Error(
        `Chi hội ${maChiHoi} đã có Chi hội trưởng`,
      );
    }

    chiHoiId =
      chiHoi._id;
  } else if (
    maChiHoi
  ) {
    /*
     * BCH có thể để trống Chi hội.
     * Nếu Excel có nhập mã thì vẫn kiểm tra.
     */
    const chiHoi =
      await findChiHoiByCode(
        maChiHoi,
      );

    if (!chiHoi) {
      throw new Error(
        `Không tìm thấy Chi hội có mã ${maChiHoi}`,
      );
    }

    chiHoiId =
      chiHoi._id;
  }

  /* =====================================================
     CREATE USER
  ===================================================== */

  const hashedPassword =
    await bcrypt.hash(
      password,
      12,
    );

  await User.create({
    username,

    password:
      hashedPassword,

    fullName,

    email,

    phone,

    role,

    chiHoiId,

    isActive:
      true,
  });

  return {
    row:
      rowNumber,

    name:
      `${username} - ${fullName}`,
  };
}

/* =========================================================
   POST /api/import-du-lieu
========================================================= */

export async function POST(
  request:
    Request,
) {
  try {
    /* =====================================================
       AUTH
    ===================================================== */

    const session =
      await getCurrentSession();

    if (!session) {
      return errorResponse(
        "Bạn chưa đăng nhập",
        401,
      );
    }

    /*
     * Import dữ liệu có thể tạo hàng loạt
     * tài khoản và hồ sơ => chỉ ADMIN.
     */
    if (
      session.role !==
      "ADMIN"
    ) {
      return errorResponse(
        "Chỉ Quản trị viên được phép import dữ liệu",
        403,
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body:
      RequestBody;

    try {
      body =
        await request.json();
    } catch {
      return errorResponse(
        "Dữ liệu gửi lên không hợp lệ",
        400,
      );
    }

    const loai =
      typeof body.loai ===
      "string"
        ? body.loai as
            LoaiImport
        : "";

    if (
      ![
        "HOI_VIEN",
        "CHI_HOI",
        "BAN_CHAP_HANH",
      ].includes(
        loai,
      )
    ) {
      return errorResponse(
        "Loại dữ liệu import không hợp lệ",
        400,
      );
    }

    const rows =
      Array.isArray(
        body.rows,
      )
        ? body.rows.filter(
            (
              item,
            ): item is
              ImportRow =>
              typeof item ===
                "object" &&
              item !==
                null &&
              !Array.isArray(
                item,
              ),
          )
        : [];

    if (
      rows.length ===
      0
    ) {
      return errorResponse(
        "Không có dữ liệu để import",
        400,
      );
    }

    /*
     * Tránh request quá lớn / import nhầm file cực lớn.
     */
    if (
      rows.length >
      5000
    ) {
      return errorResponse(
        "Mỗi lần chỉ được import tối đa 5.000 dòng",
        400,
      );
    }

    await connectDB();

    /* =====================================================
       PROCESS
    ===================================================== */

    let success =
      0;

    let failed =
      0;

    let skipped =
      0;

    const errors:
      ImportError[] =
      [];

    const successfulRows:
      number[] =
      [];

    for (
      let index =
        0;
      index <
      rows.length;
      index +=
        1
    ) {
      const row =
        rows[index];

      const rowNumber =
        getRowNumber(
          row,
          index,
        );

      try {
        if (
          loai ===
          "CHI_HOI"
        ) {
          await importChiHoi(
            row,
            rowNumber,
          );
        }

        if (
          loai ===
          "HOI_VIEN"
        ) {
          await importHoiVien(
            row,
            rowNumber,
          );
        }

        if (
          loai ===
          "BAN_CHAP_HANH"
        ) {
          await importBanChapHanh(
            row,
            rowNumber,
          );
        }

        success +=
          1;

        successfulRows.push(
          rowNumber,
        );
      } catch (
        rowError
      ) {
        failed +=
          1;

        errors.push({
          row:
            rowNumber,

          message:
            rowError instanceof
              Error
              ? rowError.message
              : "Không thể import dòng dữ liệu",
        });
      }
    }

    /*
     * Frontend hiện chỉ gửi các dòng hợp lệ khi
     * skipInvalid=true, vì vậy skipped thường = 0.
     * Giữ field để tương thích UI.
     */
    skipped =
      0;

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
        "HE_THONG",

      description:
        `${session.fullName} import dữ liệu ${loai}: ${success} thành công, ${failed} lỗi`,

      targetName:
        `Import ${loai}`,

      metadata: {
        loai,

        tongDong:
          rows.length,

        thanhCong:
          success,

        loi:
          failed,

        boQua:
          skipped,

        successfulRows,

        errors:
          errors.slice(
            0,
            100,
          ),
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
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success:
        true,

      message:
        failed ===
        0
          ? `Import thành công ${success}/${rows.length} dòng.`
          : `Import hoàn tất: ${success} thành công, ${failed} lỗi.`,

      data: {
        total:
          rows.length,

        success,

        failed,

        skipped,

        errors,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "POST /api/import-du-lieu:",
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
              : "Không thể import dữ liệu"
            : "Không thể import dữ liệu",
      },
      {
        status:
          500,
      },
    );
  }
}
