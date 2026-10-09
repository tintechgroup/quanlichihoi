import {
  NextResponse,
} from "next/server";

import {
  connectDB,
} from "@/lib/mongodb";

import {
  getCurrentSession,
} from "@/lib/session";

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
  __rowNumber?: number;

  [key: string]: unknown;
};

type RequestBody = {
  loai?: unknown;
  rows?: unknown;
};

type RowResult = {
  row: number;
  valid: boolean;
  errors: string[];
};

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

function normalizeKey(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(
      /\s+/g,
      " ",
    )
    .trim()
    .toLowerCase();
}

function getText(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function getValue(
  row: ImportRow,
  header: string,
) {
  const target =
    normalizeKey(header);

  for (
    const [key, value] of
      Object.entries(row)
  ) {
    if (
      key === "__rowNumber"
    ) {
      continue;
    }

    if (
      normalizeKey(key) ===
      target
    ) {
      return getText(value);
    }
  }

  return "";
}

function getRowNumber(
  row: ImportRow,
  index: number,
) {
  const value =
    Number(
      row.__rowNumber,
    );

  if (
    Number.isInteger(value) &&
    value > 0
  ) {
    return value;
  }

  return index + 2;
}

function normalizePhone(
  value: string,
) {
  return value.replace(
    /[\s.\-()]/g,
    "",
  );
}

function isValidEmail(
  value: string,
) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function isValidPhone(
  value: string,
) {
  if (!value) {
    return true;
  }

  return /^0\d{9}$/.test(
    normalizePhone(value),
  );
}

function normalizeRole(
  value: string,
) {
  if (
    value ===
      "BAN_CHAP_HANH" ||
    value ===
      "CHI_HOI_TRUONG"
  ) {
    return value;
  }

  const normalized =
    normalizeKey(value);

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

  return "";
}

/* =========================================================
   POST /api/import-du-lieu/kiem-tra
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       AUTH
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
      session.role !==
      "ADMIN"
    ) {
      return responseError(
        "Chỉ Quản trị viên được kiểm tra dữ liệu import",
        403,
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body: RequestBody;

    try {
      body =
        await request.json();
    } catch {
      return responseError(
        "Dữ liệu gửi lên không hợp lệ",
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
      ].includes(loai)
    ) {
      return responseError(
        "Loại dữ liệu không hợp lệ",
      );
    }

    const rows =
      Array.isArray(body.rows)
        ? body.rows.filter(
            (
              row,
            ): row is ImportRow =>
              typeof row ===
                "object" &&
              row !== null &&
              !Array.isArray(
                row,
              ),
          )
        : [];

    if (
      rows.length ===
      0
    ) {
      return responseError(
        "Không có dữ liệu để kiểm tra",
      );
    }

    if (
      rows.length > 5000
    ) {
      return responseError(
        "Mỗi lần chỉ kiểm tra tối đa 5.000 dòng",
      );
    }

    await connectDB();

    const results:
      RowResult[] = [];

    /* =====================================================
       DUPLICATE INSIDE EXCEL
    ===================================================== */

    const fileMemberCodes =
      new Map<
        string,
        number[]
      >();

    const fileUsernames =
      new Map<
        string,
        number[]
      >();

    const fileBranchCodes =
      new Map<
        string,
        number[]
      >();

    for (
      let index = 0;
      index < rows.length;
      index += 1
    ) {
      const row =
        rows[index];

      const rowNumber =
        getRowNumber(
          row,
          index,
        );

      if (
        loai ===
        "HOI_VIEN"
      ) {
        const memberCode =
          getValue(
            row,
            "Mã Hội viên",
          );

        const username =
          getValue(
            row,
            "Tên đăng nhập",
          ).toLowerCase();

        if (memberCode) {
          const key =
            memberCode.toLowerCase();

          const list =
            fileMemberCodes.get(
              key,
            ) || [];

          list.push(
            rowNumber,
          );

          fileMemberCodes.set(
            key,
            list,
          );
        }

        if (username) {
          const list =
            fileUsernames.get(
              username,
            ) || [];

          list.push(
            rowNumber,
          );

          fileUsernames.set(
            username,
            list,
          );
        }
      }

      if (
        loai ===
        "CHI_HOI"
      ) {
        const branchCode =
          getValue(
            row,
            "Mã Chi hội",
          ).toUpperCase();

        if (branchCode) {
          const list =
            fileBranchCodes.get(
              branchCode,
            ) || [];

          list.push(
            rowNumber,
          );

          fileBranchCodes.set(
            branchCode,
            list,
          );
        }
      }

      if (
        loai ===
        "BAN_CHAP_HANH"
      ) {
        const username =
          getValue(
            row,
            "Tên đăng nhập",
          ).toLowerCase();

        if (username) {
          const list =
            fileUsernames.get(
              username,
            ) || [];

          list.push(
            rowNumber,
          );

          fileUsernames.set(
            username,
            list,
          );
        }
      }
    }

    /* =====================================================
       CHECK EACH ROW
    ===================================================== */

    for (
      let index = 0;
      index < rows.length;
      index += 1
    ) {
      const row =
        rows[index];

      const rowNumber =
        getRowNumber(
          row,
          index,
        );

      const errors:
        string[] = [];

      /* ===================================================
         CHI HOI
      =================================================== */

      if (
        loai ===
        "CHI_HOI"
      ) {
        const maChiHoi =
          getValue(
            row,
            "Mã Chi hội",
          ).toUpperCase();

        const tenChiHoi =
          getValue(
            row,
            "Tên Chi hội",
          );

        if (!maChiHoi) {
          errors.push(
            "Thiếu Mã Chi hội",
          );
        }

        if (!tenChiHoi) {
          errors.push(
            "Thiếu Tên Chi hội",
          );
        }

        if (maChiHoi) {
          const duplicateRows =
            fileBranchCodes.get(
              maChiHoi,
            ) || [];

          if (
            duplicateRows.length >
            1
          ) {
            errors.push(
              `Mã Chi hội ${maChiHoi} bị lặp trong file tại các dòng ${duplicateRows.join(", ")}`,
            );
          }

          const exists =
            await ChiHoi.exists({
              maChiHoi,
            });

          if (exists) {
            errors.push(
              `Mã Chi hội ${maChiHoi} đã tồn tại trong hệ thống`,
            );
          }
        }
      }

      /* ===================================================
         HOI VIEN
      =================================================== */

      if (
        loai ===
        "HOI_VIEN"
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

        const maChiHoi =
          getValue(
            row,
            "Mã Chi hội",
          ).toUpperCase();

        const email =
          getValue(
            row,
            "Email",
          ).toLowerCase();

        const phone =
          normalizePhone(
            getValue(
              row,
              "Số điện thoại",
            ),
          );

        const username =
          getValue(
            row,
            "Tên đăng nhập",
          ).toLowerCase();

        const password =
          getValue(
            row,
            "Mật khẩu",
          );

        if (!maHoiVien) {
          errors.push(
            "Thiếu Mã Hội viên",
          );
        }

        if (!hoTen) {
          errors.push(
            "Thiếu Họ tên",
          );
        }

        if (!maChiHoi) {
          errors.push(
            "Thiếu Mã Chi hội",
          );
        }

        if (
          email &&
          !isValidEmail(email)
        ) {
          errors.push(
            "Email không hợp lệ",
          );
        }

        if (
          phone &&
          !isValidPhone(phone)
        ) {
          errors.push(
            "Số điện thoại phải gồm đúng 10 số và bắt đầu bằng 0",
          );
        }

        if (
          username &&
          !password
        ) {
          errors.push(
            "Có Tên đăng nhập nhưng thiếu Mật khẩu",
          );
        }

        if (
          password &&
          !username
        ) {
          errors.push(
            "Có Mật khẩu nhưng thiếu Tên đăng nhập",
          );
        }

        if (
          password &&
          password.length < 6
        ) {
          errors.push(
            "Mật khẩu phải có ít nhất 6 ký tự",
          );
        }

        if (maHoiVien) {
          const duplicateRows =
            fileMemberCodes.get(
              maHoiVien.toLowerCase(),
            ) || [];

          if (
            duplicateRows.length >
            1
          ) {
            errors.push(
              `Mã Hội viên ${maHoiVien} bị lặp trong file tại các dòng ${duplicateRows.join(", ")}`,
            );
          }

          const exists =
            await HoiVien.exists({
              maHoiVien,
            });

          if (exists) {
            errors.push(
              `Mã Hội viên ${maHoiVien} đã tồn tại trong hệ thống`,
            );
          }
        }

        if (username) {
          const duplicateRows =
            fileUsernames.get(
              username,
            ) || [];

          if (
            duplicateRows.length >
            1
          ) {
            errors.push(
              `Tên đăng nhập ${username} bị lặp trong file tại các dòng ${duplicateRows.join(", ")}`,
            );
          }

          const exists =
            await User.exists({
              username,
            });

          if (exists) {
            errors.push(
              `Tên đăng nhập ${username} đã tồn tại`,
            );
          }
        }

        if (maChiHoi) {
          const branchExists =
            await ChiHoi.exists({
              maChiHoi,
            });

          if (!branchExists) {
            errors.push(
              `Không tìm thấy Chi hội có mã ${maChiHoi}`,
            );
          }
        }
      }

      /* ===================================================
         BAN CHAP HANH
      =================================================== */

      if (
        loai ===
        "BAN_CHAP_HANH"
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
          ).toLowerCase();

        const password =
          getValue(
            row,
            "Mật khẩu",
          );

        const email =
          getValue(
            row,
            "Email",
          ).toLowerCase();

        const phone =
          normalizePhone(
            getValue(
              row,
              "Số điện thoại",
            ),
          );

        const role =
          normalizeRole(
            getValue(
              row,
              "Vai trò",
            ),
          );

        const maChiHoi =
          getValue(
            row,
            "Mã Chi hội",
          ).toUpperCase();

        if (!fullName) {
          errors.push(
            "Thiếu Họ tên",
          );
        }

        if (!username) {
          errors.push(
            "Thiếu Tên đăng nhập",
          );
        }

        if (!password) {
          errors.push(
            "Thiếu Mật khẩu",
          );
        }

        if (
          password &&
          password.length < 6
        ) {
          errors.push(
            "Mật khẩu phải có ít nhất 6 ký tự",
          );
        }

        if (
          email &&
          !isValidEmail(email)
        ) {
          errors.push(
            "Email không hợp lệ",
          );
        }

        if (
          phone &&
          !isValidPhone(phone)
        ) {
          errors.push(
            "Số điện thoại phải gồm đúng 10 số và bắt đầu bằng 0",
          );
        }

        if (!role) {
          errors.push(
            "Vai trò phải là BAN_CHAP_HANH hoặc CHI_HOI_TRUONG",
          );
        }

        if (username) {
          const duplicateRows =
            fileUsernames.get(
              username,
            ) || [];

          if (
            duplicateRows.length >
            1
          ) {
            errors.push(
              `Tên đăng nhập ${username} bị lặp trong file tại các dòng ${duplicateRows.join(", ")}`,
            );
          }

          const exists =
            await User.exists({
              username,
            });

          if (exists) {
            errors.push(
              `Tên đăng nhập ${username} đã tồn tại`,
            );
          }
        }

        if (
          role ===
          "CHI_HOI_TRUONG"
        ) {
          if (!maChiHoi) {
            errors.push(
              "Chi hội trưởng bắt buộc phải có Mã Chi hội",
            );
          } else {
            const chiHoi =
              await ChiHoi.findOne({
                maChiHoi,
              })
                .select("_id")
                .lean();

            if (!chiHoi) {
              errors.push(
                `Không tìm thấy Chi hội có mã ${maChiHoi}`,
              );
            } else {
              const currentLeader =
                await User.exists({
                  role:
                    "CHI_HOI_TRUONG",

                  chiHoiId:
                    chiHoi._id,

                  isActive: {
                    $ne:
                      false,
                  },
                });

              if (
                currentLeader
              ) {
                errors.push(
                  `Chi hội ${maChiHoi} đã có Chi hội trưởng`,
                );
              }
            }
          }
        }

        if (
          role ===
            "BAN_CHAP_HANH" &&
          maChiHoi
        ) {
          const exists =
            await ChiHoi.exists({
              maChiHoi,
            });

          if (!exists) {
            errors.push(
              `Không tìm thấy Chi hội có mã ${maChiHoi}`,
            );
          }
        }
      }

      results.push({
        row:
          rowNumber,

        valid:
          errors.length === 0,

        errors,
      });
    }

    /* =====================================================
       SUMMARY
    ===================================================== */

    const valid =
      results.filter(
        (
          item,
        ) =>
          item.valid,
      ).length;

    const invalid =
      results.length -
      valid;

    return NextResponse.json({
      success:
        true,

      message:
        invalid ===
        0
          ? `Kiểm tra hoàn tất. ${valid} dòng đều hợp lệ.`
          : `Kiểm tra hoàn tất. ${valid} dòng hợp lệ, ${invalid} dòng có lỗi.`,

      data: {
        total:
          results.length,

        valid,

        invalid,

        rows:
          results,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "POST /api/import-du-lieu/kiem-tra:",
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
              : "Không thể kiểm tra dữ liệu"
            : "Không thể kiểm tra dữ liệu",
      },
      {
        status:
          500,
      },
    );
  }
}