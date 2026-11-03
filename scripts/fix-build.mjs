import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fullPath(relativePath) {
  return path.join(
    root,
    relativePath,
  );
}

function readFile(relativePath) {
  const filePath =
    fullPath(
      relativePath,
    );

  if (
    !fs.existsSync(
      filePath,
    )
  ) {
    throw new Error(
      `Không tìm thấy file: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    filePath,
    "utf8",
  );
}

function writeFile(
  relativePath,
  content,
) {
  fs.writeFileSync(
    fullPath(
      relativePath,
    ),
    content,
    "utf8",
  );
}

function backupFile(
  relativePath,
) {
  const filePath =
    fullPath(
      relativePath,
    );

  const backupPath =
    `${filePath}.before-fix-build`;

  if (
    !fs.existsSync(
      backupPath,
    )
  ) {
    fs.copyFileSync(
      filePath,
      backupPath,
    );

    console.log(
      `✓ Backup: ${relativePath}.before-fix-build`,
    );
  }
}

function replaceOrThrow(
  content,
  search,
  replacement,
  description,
) {
  if (
    !content.includes(
      search,
    )
  ) {
    throw new Error(
      `Không tìm thấy đoạn cần sửa: ${description}`,
    );
  }

  return content.replace(
    search,
    replacement,
  );
}

/* =========================================================
   1. FIX:
   app/api/diem-danh-qr/[id]/chi-tiet/route.ts

   TS2352:
   Mongoose document -> Record<string, unknown>
========================================================= */

function fixChiTietQr() {
  const relativePath =
    "app/api/diem-danh-qr/[id]/chi-tiet/route.ts";

  backupFile(
    relativePath,
  );

  let content =
    readFile(
      relativePath,
    );

  const regex =
    /\.toObject\(\)\s+as\s+Record<\s*string\s*,\s*unknown\s*>/g;

  const matches =
    content.match(
      regex,
    );

  if (
    !matches ||
    matches.length ===
      0
  ) {
    console.log(
      `• ${relativePath}: không còn lỗi cast cần sửa`,
    );

    return;
  }

  content =
    content.replace(
      regex,
      ".toObject() as unknown as Record<string, unknown>",
    );

  writeFile(
    relativePath,
    content,
  );

  console.log(
    `✓ ${relativePath}: sửa ${matches.length} cast Mongoose`,
  );
}

/* =========================================================
   2. FIX:
   app/api/diem-danh-qr/[token]/route.ts

   TS2352:
   Mongoose document -> Record<string, unknown>
========================================================= */

function fixTokenQr() {
  const relativePath =
    "app/api/diem-danh-qr/[token]/route.ts";

  backupFile(
    relativePath,
  );

  let content =
    readFile(
      relativePath,
    );

  const regex =
    /\.toObject\(\)\s+as\s+Record<\s*string\s*,\s*unknown\s*>/g;

  const matches =
    content.match(
      regex,
    );

  if (
    !matches ||
    matches.length ===
      0
  ) {
    console.log(
      `• ${relativePath}: không còn lỗi cast cần sửa`,
    );

    return;
  }

  content =
    content.replace(
      regex,
      ".toObject() as unknown as Record<string, unknown>",
    );

  writeFile(
    relativePath,
    content,
  );

  console.log(
    `✓ ${relativePath}: sửa ${matches.length} cast Mongoose`,
  );
}

/* =========================================================
   3. FIX:
   app/api/ho-tro/[id]/route.ts

   TS2322:
   "" | TrangThaiHoTro
   không gán được vào TrangThaiHoTro
========================================================= */

function fixHoTro() {
  const relativePath =
    "app/api/ho-tro/[id]/route.ts";

  backupFile(
    relativePath,
  );

  let content =
    readFile(
      relativePath,
    );

  const oldBlock = `      const newStatus =
        typeof body.trangThai ===
        "string"
          ? body.trangThai.trim() as
              TrangThaiHoTro
          : "";

      if (
        !VALID_STATUSES.includes(
          newStatus as
            TrangThaiHoTro,
        )
      ) {
        return errorResponse(
          "Trạng thái không hợp lệ",
        );
      }`;

  const newBlock = `      const rawStatus =
        typeof body.trangThai ===
        "string"
          ? body.trangThai.trim()
          : "";

      if (
        !rawStatus ||
        !VALID_STATUSES.includes(
          rawStatus as TrangThaiHoTro,
        )
      ) {
        return errorResponse(
          "Trạng thái không hợp lệ",
        );
      }

      const newStatus =
        rawStatus as
          TrangThaiHoTro;`;

  if (
    content.includes(
      oldBlock,
    )
  ) {
    content =
      replaceOrThrow(
        content,
        oldBlock,
        newBlock,
        "khối newStatus của API hỗ trợ",
      );

    writeFile(
      relativePath,
      content,
    );

    console.log(
      `✓ ${relativePath}: sửa kiểu newStatus`,
    );

    return;
  }

  /*
   * Fallback cho trường hợp format code
   * hơi khác so với bản đã gửi.
   */
  const regex =
    /const newStatus\s*=\s*typeof body\.trangThai ===\s*"string"\s*\?\s*body\.trangThai\.trim\(\)\s*as\s*TrangThaiHoTro\s*:\s*"";\s*if\s*\(\s*!VALID_STATUSES\.includes\(\s*newStatus\s*as\s*TrangThaiHoTro\s*,?\s*\)\s*\)\s*\{\s*return errorResponse\(\s*"Trạng thái không hợp lệ",?\s*\);\s*\}/m;

  if (
    regex.test(
      content,
    )
  ) {
    content =
      content.replace(
        regex,
        `const rawStatus =
        typeof body.trangThai ===
        "string"
          ? body.trangThai.trim()
          : "";

      if (
        !rawStatus ||
        !VALID_STATUSES.includes(
          rawStatus as TrangThaiHoTro,
        )
      ) {
        return errorResponse(
          "Trạng thái không hợp lệ",
        );
      }

      const newStatus =
        rawStatus as
          TrangThaiHoTro;`,
      );

    writeFile(
      relativePath,
      content,
    );

    console.log(
      `✓ ${relativePath}: sửa kiểu newStatus`,
    );

    return;
  }

  console.log(
    `• ${relativePath}: không tìm thấy đoạn newStatus cũ, có thể file đã được sửa`,
  );
}

/* =========================================================
   4. FIX WARNING:
   app/dashboard/diem-danh-qr/quan-ly/page.tsx

   CalendarDays imported nhưng không sử dụng
========================================================= */

function fixUnusedCalendarDays() {
  const relativePath =
    "app/dashboard/diem-danh-qr/quan-ly/page.tsx";

  backupFile(
    relativePath,
  );

  let content =
    readFile(
      relativePath,
    );

  const before =
    content;

  content =
    content.replace(
      /^\s*CalendarDays,\r?\n/m,
      "",
    );

  if (
    content ===
    before
  ) {
    console.log(
      `• ${relativePath}: CalendarDays không còn import thừa`,
    );

    return;
  }

  writeFile(
    relativePath,
    content,
  );

  console.log(
    `✓ ${relativePath}: xóa import CalendarDays thừa`,
  );
}

/* =========================================================
   RUN
========================================================= */

console.log(
  "\n=== FIX BUILD ===\n",
);

try {
  fixChiTietQr();

  fixTokenQr();

  fixHoTro();

  fixUnusedCalendarDays();

  console.log(
    "\n✓ Hoàn tất sửa source.",
  );

  console.log(
    "\nChạy tiếp:",
  );

  console.log(
    "npm run lint",
  );

  console.log(
    "npm run build\n",
  );
} catch (
  error
) {
  console.error(
    "\n✖ Fix thất bại:",
  );

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode =
    1;
}