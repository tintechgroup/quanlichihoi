"use client";

import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  ChangeEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import * as XLSX from "xlsx";

/* =========================================================
   TYPES
========================================================= */

type LoaiImport =
  | "HOI_VIEN"
  | "CHI_HOI"
  | "BAN_CHAP_HANH";

type ImportRow = {
  __rowNumber: number;

  [key: string]:
    string | number | boolean | null | undefined;
};

type ClientValidationRow = {
  row: ImportRow;
  valid: boolean;
  errors: string[];
};

type ServerValidationRow = {
  row: number;
  valid: boolean;
  errors: string[];
};

type ServerValidationResponse = {
  success: boolean;

  message?: string;

  data?: {
    total: number;
    valid: number;
    invalid: number;

    rows: ServerValidationRow[];
  };
};

type ApiImportResult = {
  success: boolean;

  message?: string;

  data?: {
    total: number;
    success: number;
    failed: number;
    skipped: number;

    errors?: {
      row: number;
      message: string;
    }[];
  };
};

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const HOI_VIEN_HEADERS = [
  "Mã Hội viên",
  "Họ tên",
  "Ngày sinh",
  "Giới tính",
  "Email",
  "Số điện thoại",
  "Lớp",
  "Khóa học",
  "Địa chỉ",
  "Mã Chi hội",
  "Trạng thái",
  "Tên đăng nhập",
  "Mật khẩu",
];

const CHI_HOI_HEADERS = [
  "Mã Chi hội",
  "Tên Chi hội",
];

const BCH_HEADERS = [
  "Họ tên",
  "Tên đăng nhập",
  "Mật khẩu",
  "Email",
  "Số điện thoại",
  "Vai trò",
  "Mã Chi hội",
];

/* =========================================================
   HELPERS
========================================================= */

function normalizeText(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
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
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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

  const phone =
    value.replace(
      /[\s.\-()]/g,
      "",
    );

  return /^0\d{9}$/.test(
    phone,
  );
}

function getHeadersByType(
  type: LoaiImport,
) {
  if (
    type === "HOI_VIEN"
  ) {
    return HOI_VIEN_HEADERS;
  }

  if (
    type === "CHI_HOI"
  ) {
    return CHI_HOI_HEADERS;
  }

  return BCH_HEADERS;
}

function getTypeLabel(
  type: LoaiImport,
) {
  if (
    type === "HOI_VIEN"
  ) {
    return "Hội viên";
  }

  if (
    type === "CHI_HOI"
  ) {
    return "Chi hội";
  }

  return "Ban Chấp hành";
}

function getValueByHeader(
  row: ImportRow,
  header: string,
) {
  const target =
    normalizeKey(
      header,
    );

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
      return normalizeText(
        value,
      );
    }
  }

  return "";
}

async function parseJsonResponse<
  T,
>(
  response: Response,
): Promise<T> {
  const text =
    await response.text();

  if (!text.trim()) {
    throw new Error(
      `Máy chủ không trả dữ liệu. HTTP ${response.status}`,
    );
  }

  try {
    return JSON.parse(
      text,
    ) as T;
  } catch {
    throw new Error(
      `Dữ liệu máy chủ trả về không hợp lệ. HTTP ${response.status}`,
    );
  }
}

/* =========================================================
   CLIENT VALIDATION
========================================================= */

function validateHoiVien(
  row: ImportRow,
) {
  const errors:
    string[] = [];

  const maHoiVien =
    getValueByHeader(
      row,
      "Mã Hội viên",
    );

  const hoTen =
    getValueByHeader(
      row,
      "Họ tên",
    );

  const maChiHoi =
    getValueByHeader(
      row,
      "Mã Chi hội",
    );

  const email =
    getValueByHeader(
      row,
      "Email",
    );

  const phone =
    getValueByHeader(
      row,
      "Số điện thoại",
    );

  const gioiTinh =
    getValueByHeader(
      row,
      "Giới tính",
    );

  const trangThai =
    getValueByHeader(
      row,
      "Trạng thái",
    );

  const username =
    getValueByHeader(
      row,
      "Tên đăng nhập",
    );

  const password =
    getValueByHeader(
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
    !isValidEmail(
      email,
    )
  ) {
    errors.push(
      "Email không hợp lệ",
    );
  }

  if (
    !isValidPhone(
      phone,
    )
  ) {
    errors.push(
      "Số điện thoại phải gồm 10 số và bắt đầu bằng 0",
    );
  }

  if (
    gioiTinh &&
    ![
      "NAM",
      "NU",
      "KHAC",
      "Nam",
      "Nữ",
      "Khác",
    ].includes(
      gioiTinh,
    )
  ) {
    errors.push(
      "Giới tính không hợp lệ",
    );
  }

  if (
    trangThai &&
    ![
      "DANG_HOAT_DONG",
      "TAM_NGUNG",
      "Đang hoạt động",
      "Tạm ngừng",
    ].includes(
      trangThai,
    )
  ) {
    errors.push(
      "Trạng thái không hợp lệ",
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

  return errors;
}

function validateChiHoi(
  row: ImportRow,
) {
  const errors:
    string[] = [];

  const maChiHoi =
    getValueByHeader(
      row,
      "Mã Chi hội",
    );

  const tenChiHoi =
    getValueByHeader(
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

  return errors;
}

function validateBCH(
  row: ImportRow,
) {
  const errors:
    string[] = [];

  const hoTen =
    getValueByHeader(
      row,
      "Họ tên",
    );

  const username =
    getValueByHeader(
      row,
      "Tên đăng nhập",
    );

  const password =
    getValueByHeader(
      row,
      "Mật khẩu",
    );

  const email =
    getValueByHeader(
      row,
      "Email",
    );

  const phone =
    getValueByHeader(
      row,
      "Số điện thoại",
    );

  const role =
    getValueByHeader(
      row,
      "Vai trò",
    );

  if (!hoTen) {
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
    !isValidEmail(
      email,
    )
  ) {
    errors.push(
      "Email không hợp lệ",
    );
  }

  if (
    !isValidPhone(
      phone,
    )
  ) {
    errors.push(
      "Số điện thoại phải gồm 10 số và bắt đầu bằng 0",
    );
  }

  if (
    role &&
    ![
      "BAN_CHAP_HANH",
      "CHI_HOI_TRUONG",
      "BCH",
      "CHT",
      "Ban Chấp hành",
      "Chi hội trưởng",
    ].includes(
      role,
    )
  ) {
    errors.push(
      "Vai trò không hợp lệ",
    );
  }

  return errors;
}

/* =========================================================
   PAGE
========================================================= */

export default function ImportDuLieuPage() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    loaiImport,
    setLoaiImport,
  ] =
    useState<LoaiImport>(
      "HOI_VIEN",
    );

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    rawRows,
    setRawRows,
  ] =
    useState<ImportRow[]>(
      [],
    );

  const [
    loadingFile,
    setLoadingFile,
  ] =
    useState(false);

  const [
    checkingDatabase,
    setCheckingDatabase,
  ] =
    useState(false);

  const [
    databaseChecked,
    setDatabaseChecked,
  ] =
    useState(false);

  const [
    serverRows,
    setServerRows,
  ] =
    useState<
      ServerValidationRow[]
    >([]);

  const [
    importing,
    setImporting,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    skipInvalid,
    setSkipInvalid,
  ] =
    useState(true);

  const [
    importResult,
    setImportResult,
  ] =
    useState<
      ApiImportResult["data"] | null
    >(null);

  /* =======================================================
     CLIENT VALIDATION
  ======================================================= */

  const clientRows =
    useMemo<
      ClientValidationRow[]
    >(
      () =>
        rawRows.map(
          (
            row,
          ) => {
            let errors:
              string[] = [];

            if (
              loaiImport ===
              "HOI_VIEN"
            ) {
              errors =
                validateHoiVien(
                  row,
                );
            } else if (
              loaiImport ===
              "CHI_HOI"
            ) {
              errors =
                validateChiHoi(
                  row,
                );
            } else {
              errors =
                validateBCH(
                  row,
                );
            }

            return {
              row,
              valid:
                errors.length ===
                0,
              errors,
            };
          },
        ),
      [
        loaiImport,
        rawRows,
      ],
    );

  /* =======================================================
     MERGED VALIDATION
  ======================================================= */

  const validatedRows =
    useMemo(
      () => {
        const serverMap =
          new Map<
            number,
            ServerValidationRow
          >();

        for (
          const row of
            serverRows
        ) {
          serverMap.set(
            row.row,
            row,
          );
        }

        return clientRows.map(
          (
            item,
          ) => {
            const server =
              serverMap.get(
                item.row
                  .__rowNumber,
              );

            const mergedErrors =
              Array.from(
                new Set([
                  ...item.errors,
                  ...(server?.errors ||
                    []),
                ]),
              );

            return {
              row:
                item.row,

              valid:
                mergedErrors.length ===
                0,

              errors:
                mergedErrors,
            };
          },
        );
      },
      [
        clientRows,
        serverRows,
      ],
    );

  const validCount =
    validatedRows.filter(
      (
        item,
      ) =>
        item.valid,
    ).length;

  const invalidCount =
    validatedRows.length -
    validCount;

  const clientInvalidCount =
    clientRows.filter(
      (
        item,
      ) =>
        !item.valid,
    ).length;

  /* =======================================================
     RESET
  ======================================================= */

  function resetDatabaseCheck() {
    setDatabaseChecked(
      false,
    );

    setServerRows(
      [],
    );

    setImportResult(
      null,
    );
  }

  function resetFile() {
    setSelectedFile(
      null,
    );

    setRawRows(
      [],
    );

    setServerRows(
      [],
    );

    setDatabaseChecked(
      false,
    );

    setImportResult(
      null,
    );

    setMessage(
      "",
    );

    setError(
      "",
    );

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  /* =======================================================
     CHANGE TYPE
  ======================================================= */

  function handleChangeType(
    value:
      LoaiImport,
  ) {
    setLoaiImport(
      value,
    );

    resetFile();
  }

  /* =======================================================
     READ EXCEL
  ======================================================= */

  async function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] ??
      null;

    if (!file) {
      return;
    }

    setError(
      "",
    );

    setMessage(
      "",
    );

    resetDatabaseCheck();

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase();

    if (
      extension !==
        "xlsx" &&
      extension !==
        "xls"
    ) {
      setError(
        "Chỉ chấp nhận file Excel .xlsx hoặc .xls",
      );

      event.target.value =
        "";

      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setError(
        "File Excel không được vượt quá 10MB",
      );

      event.target.value =
        "";

      return;
    }

    try {
      setLoadingFile(
        true,
      );

      const arrayBuffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(
          arrayBuffer,
          {
            type:
              "array",
          },
        );

      const firstSheetName =
        workbook.SheetNames[0];

      if (
        !firstSheetName
      ) {
        throw new Error(
          "File Excel không có sheet dữ liệu",
        );
      }

      const sheet =
        workbook.Sheets[
          firstSheetName
        ];

      const data =
        XLSX.utils.sheet_to_json<
          Record<
            string,
            unknown
          >
        >(
          sheet,
          {
            defval:
              "",
            raw:
              false,
          },
        );

      if (
        data.length ===
        0
      ) {
        throw new Error(
          "File Excel không có dữ liệu",
        );
      }

      const rows:
        ImportRow[] =
        data.map(
          (
            row,
            index,
          ) => ({
            __rowNumber:
              index + 2,

            ...row,
          }),
        );

      setSelectedFile(
        file,
      );

      setRawRows(
        rows,
      );

      setMessage(
        `Đã đọc ${rows.length} dòng dữ liệu từ Excel.`,
      );
    } catch (
      readError
    ) {
      setSelectedFile(
        null,
      );

      setRawRows(
        [],
      );

      setError(
        readError instanceof
          Error
          ? readError.message
          : "Không thể đọc file Excel",
      );
    } finally {
      setLoadingFile(
        false,
      );
    }
  }

  /* =======================================================
     DOWNLOAD TEMPLATE
  ======================================================= */

  function downloadTemplate() {
    const headers =
      getHeadersByType(
        loaiImport,
      );

    let example:
      unknown[] = [];

    if (
      loaiImport ===
      "HOI_VIEN"
    ) {
      example = [
        "HV001",
        "Nguyễn Văn A",
        "2005-01-15",
        "NAM",
        "nguyenvana@example.com",
        "0912345678",
        "SP01",
        "K45",
        "Hà Nội",
        "CH001",
        "DANG_HOAT_DONG",
        "hv001",
        "MatKhau123",
      ];
    } else if (
      loaiImport ===
      "CHI_HOI"
    ) {
      example = [
        "CH001",
        "Chi hội Sư phạm Toán",
      ];
    } else {
      example = [
        "Nguyễn Văn B",
        "nguyenvanb",
        "MatKhau123",
        "nguyenvanb@example.com",
        "0912345678",
        "BAN_CHAP_HANH",
        "",
      ];
    }

    const worksheet =
      XLSX.utils.aoa_to_sheet([
        headers,
        example,
      ]);

    worksheet["!cols"] =
      headers.map(
        (
          header,
        ) => ({
          wch:
            Math.max(
              16,
              header.length + 4,
            ),
        }),
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Du lieu",
    );

    XLSX.writeFile(
      workbook,
      `mau-import-${loaiImport
        .toLowerCase()
        .replaceAll(
          "_",
          "-",
        )}.xlsx`,
    );
  }

  /* =======================================================
     DATABASE CHECK
  ======================================================= */

  async function handleDatabaseCheck() {
    setError(
      "",
    );

    setMessage(
      "",
    );

    setImportResult(
      null,
    );

    if (
      rawRows.length ===
      0
    ) {
      setError(
        "Chưa có dữ liệu để kiểm tra",
      );

      return;
    }

    if (
      clientInvalidCount >
      0
    ) {
      setError(
        `File còn ${clientInvalidCount} dòng lỗi định dạng. Bạn có thể tiếp tục kiểm tra database, nhưng nên sửa các lỗi này trước.`,
      );
    }

    try {
      setCheckingDatabase(
        true,
      );

      setServerRows(
        [],
      );

      setDatabaseChecked(
        false,
      );

      const response =
        await fetch(
          "/api/import-du-lieu/kiem-tra",
          {
            method:
              "POST",

            credentials:
              "include",

            cache:
              "no-store",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                loai:
                  loaiImport,

                rows:
                  rawRows,
              }),
          },
        );

      const result =
        await parseJsonResponse<
          ServerValidationResponse
        >(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể kiểm tra dữ liệu với database",
        );
      }

      setServerRows(
        result.data?.rows ||
          [],
      );

      setDatabaseChecked(
        true,
      );

      setError(
        "",
      );

      setMessage(
        result.message ||
          "Kiểm tra database hoàn tất.",
      );
    } catch (
      checkError
    ) {
      setServerRows(
        [],
      );

      setDatabaseChecked(
        false,
      );

      setError(
        checkError instanceof
          Error
          ? checkError.message
          : "Không thể kiểm tra dữ liệu với database",
      );
    } finally {
      setCheckingDatabase(
        false,
      );
    }
  }

  /* =======================================================
     IMPORT
  ======================================================= */

  async function handleImport() {
    setError(
      "",
    );

    setMessage(
      "",
    );

    setImportResult(
      null,
    );

    if (
      rawRows.length ===
      0
    ) {
      setError(
        "Chưa có dữ liệu để import",
      );

      return;
    }

    if (
      !databaseChecked
    ) {
      setError(
        "Bạn phải kiểm tra dữ liệu với database trước khi Import.",
      );

      return;
    }

    if (
      !skipInvalid &&
      invalidCount >
        0
    ) {
      setError(
        `Có ${invalidCount} dòng lỗi. Hãy sửa file hoặc chọn "Bỏ qua dòng lỗi".`,
      );

      return;
    }

    const rowsToImport =
      validatedRows
        .filter(
          (
            item,
          ) =>
            skipInvalid
              ? item.valid
              : true,
        )
        .map(
          (
            item,
          ) =>
            item.row,
        );

    if (
      rowsToImport.length ===
      0
    ) {
      setError(
        "Không có dòng hợp lệ để import",
      );

      return;
    }

    try {
      setImporting(
        true,
      );

      const response =
        await fetch(
          "/api/import-du-lieu",
          {
            method:
              "POST",

            credentials:
              "include",

            cache:
              "no-store",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                loai:
                  loaiImport,

                skipInvalid,

                rows:
                  rowsToImport,
              }),
          },
        );

      const result =
        await parseJsonResponse<
          ApiImportResult
        >(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể import dữ liệu",
        );
      }

      setImportResult(
        result.data ||
          null,
      );

      setMessage(
        result.message ||
          "Import dữ liệu thành công",
      );

      /*
       * Sau khi import, dữ liệu trong DB đã thay đổi.
       * Không cho import lại ngay dựa trên kết quả check cũ.
       */
      setDatabaseChecked(
        false,
      );

      setServerRows(
        [],
      );
    } catch (
      importError
    ) {
      setError(
        importError instanceof
          Error
          ? importError.message
          : "Không thể import dữ liệu",
      );
    } finally {
      setImporting(
        false,
      );
    }
  }

  /* =======================================================
     EXPORT INVALID ROWS
  ======================================================= */

  function exportInvalidRows() {
    const invalidRows =
      validatedRows.filter(
        (
          item,
        ) =>
          !item.valid,
      );

    if (
      invalidRows.length ===
      0
    ) {
      setMessage(
        "Không có dòng lỗi để xuất.",
      );

      return;
    }

    const rows =
      invalidRows.map(
        (
          item,
        ) => {
          const {
            __rowNumber,
            ...rest
          } =
            item.row;

          return {
            "Dòng Excel":
              __rowNumber,

            ...rest,

            Lỗi:
              item.errors.join(
                "; ",
              ),
          };
        },
      );

    const worksheet =
      XLSX.utils.json_to_sheet(
        rows,
      );

    worksheet["!cols"] = [
      {
        wch:
          12,
      },

      ...getHeadersByType(
        loaiImport,
      ).map(
        () => ({
          wch:
            22,
        }),
      ),

      {
        wch:
          60,
      },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Dong loi",
    );

    XLSX.writeFile(
      workbook,
      `du-lieu-loi-${loaiImport
        .toLowerCase()
        .replaceAll(
          "_",
          "-",
        )}.xlsx`,
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-full bg-[#f4f7fb] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1700px]">

        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123b68]">
              Quản trị dữ liệu
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Import dữ liệu
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Nhập dữ liệu từ Excel, kiểm tra định dạng và đối chiếu trực tiếp với cơ sở dữ liệu trước khi ghi vào hệ thống.
            </p>
          </div>

          {rawRows.length >
            0 && (
            <button
              type="button"
              onClick={
                resetFile
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw
                size={16}
              />

              Làm lại
            </button>
          )}
        </div>

        {/* NOTICE */}

        {error && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>
                {error}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              <X
                size={16}
              />
            </button>
          </div>
        )}

        {message && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="flex items-start gap-2">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>
                {message}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
            >
              <X
                size={16}
              />
            </button>
          </div>
        )}

        {/* STEP 1 */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-950">
              1. Chọn loại dữ liệu
            </h2>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-3">
            <ImportTypeCard
              active={
                loaiImport ===
                "HOI_VIEN"
              }
              title="Hội viên"
              description="Hồ sơ Hội viên và tài khoản đăng nhập."
              onClick={() =>
                handleChangeType(
                  "HOI_VIEN",
                )
              }
            />

            <ImportTypeCard
              active={
                loaiImport ===
                "CHI_HOI"
              }
              title="Chi hội"
              description="Danh sách Chi hội của Liên Chi hội."
              onClick={() =>
                handleChangeType(
                  "CHI_HOI",
                )
              }
            />

            <ImportTypeCard
              active={
                loaiImport ===
                "BAN_CHAP_HANH"
              }
              title="Ban Chấp hành"
              description="Tài khoản BCH và Chi hội trưởng."
              onClick={() =>
                handleChangeType(
                  "BAN_CHAP_HANH",
                )
              }
            />
          </div>
        </section>

        {/* STEP 2 */}

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">
                2. Chọn file Excel
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Loại dữ liệu:{" "}
                <strong>
                  {getTypeLabel(
                    loaiImport,
                  )}
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={
                downloadTemplate
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#123b68] bg-white px-4 text-sm font-semibold text-[#123b68] hover:bg-blue-50"
            >
              <Download
                size={16}
              />

              Tải file mẫu
            </button>
          </div>

          <div className="p-5">
            <input
              ref={
                fileInputRef
              }
              type="file"
              accept=".xlsx,.xls"
              onChange={
                handleFileChange
              }
              className="hidden"
            />

            {!selectedFile ? (
              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={
                  loadingFile
                }
                className="flex min-h-[190px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 transition hover:border-[#123b68] hover:bg-blue-50/30"
              >
                {loadingFile ? (
                  <Loader2
                    size={32}
                    className="animate-spin text-[#123b68]"
                  />
                ) : (
                  <FileUp
                    size={36}
                    className="text-[#123b68]"
                  />
                )}

                <p className="mt-3 text-sm font-semibold text-slate-800">
                  {loadingFile
                    ? "Đang đọc file..."
                    : "Chọn file Excel"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  .xlsx hoặc .xls · tối đa 10MB
                </p>
              </button>
            ) : (
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <FileSpreadsheet
                      size={22}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {selectedFile.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {rawRows.length} dòng dữ liệu
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    resetFile
                  }
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2
                    size={15}
                  />

                  Bỏ file
                </button>
              </div>
            )}
          </div>
        </section>

        {/* SUMMARY */}

        {rawRows.length >
          0 && (
          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Tổng dòng"
              value={
                validatedRows.length
              }
            />

            <StatCard
              label="Hợp lệ"
              value={
                validCount
              }
              tone="success"
            />

            <StatCard
              label="Có lỗi"
              value={
                invalidCount
              }
              tone={
                invalidCount >
                0
                  ? "danger"
                  : "default"
              }
            />

            <StatCard
              label="Kiểm tra DB"
              value={
                databaseChecked
                  ? "Đã kiểm tra"
                  : "Chưa kiểm tra"
              }
              tone={
                databaseChecked
                  ? "success"
                  : "warning"
              }
            />

            <StatCard
              label="Loại dữ liệu"
              value={getTypeLabel(
                loaiImport,
              )}
            />
          </section>
        )}

        {/* STEP 3 */}

        {rawRows.length >
          0 && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-bold text-slate-950">
                  3. Kiểm tra với cơ sở dữ liệu
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Kiểm tra trùng mã, tài khoản, Chi hội và dữ liệu hiện có trong MongoDB.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void handleDatabaseCheck()
                }
                disabled={
                  checkingDatabase
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#123b68] px-4 text-sm font-semibold text-white hover:bg-[#0e3158] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkingDatabase ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Database
                    size={16}
                  />
                )}

                {checkingDatabase
                  ? "Đang kiểm tra..."
                  : databaseChecked
                    ? "Kiểm tra lại database"
                    : "Kiểm tra database"}
              </button>
            </div>

            <div className="p-5">
              {!databaseChecked ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={20}
                      className="mt-0.5 shrink-0 text-amber-700"
                    />

                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Chưa đối chiếu với database
                      </p>

                      <p className="mt-1 text-sm leading-6 text-amber-700">
                        Hệ thống chưa biết mã Hội viên, username hoặc mã Chi hội trong file có bị trùng với dữ liệu hiện tại hay không.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`rounded-xl border p-4 ${
                    invalidCount ===
                    0
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {invalidCount ===
                    0 ? (
                      <CheckCircle2
                        size={20}
                        className="mt-0.5 shrink-0 text-emerald-700"
                      />
                    ) : (
                      <AlertCircle
                        size={20}
                        className="mt-0.5 shrink-0 text-red-700"
                      />
                    )}

                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          invalidCount ===
                          0
                            ? "text-emerald-900"
                            : "text-red-900"
                        }`}
                      >
                        {invalidCount ===
                        0
                          ? "Dữ liệu sẵn sàng để import"
                          : `Phát hiện ${invalidCount} dòng có lỗi`}
                      </p>

                      <p
                        className={`mt-1 text-sm ${
                          invalidCount ===
                          0
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {validCount} /{" "}
                        {validatedRows.length} dòng hợp lệ.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* PREVIEW */}

        {rawRows.length >
          0 && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-950">
                  4. Xem trước dữ liệu
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Mỗi dòng hiển thị toàn bộ lỗi định dạng và lỗi đối chiếu database.
                </p>
              </div>

              {invalidCount >
                0 && (
                <button
                  type="button"
                  onClick={
                    exportInvalidRows
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Download
                    size={16}
                  />

                  Xuất dòng lỗi
                </button>
              )}
            </div>

            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase text-slate-500 shadow-sm">
                  <tr>
                    <th className="px-4 py-3">
                      Dòng
                    </th>

                    <th className="px-4 py-3">
                      Trạng thái
                    </th>

                    {getHeadersByType(
                      loaiImport,
                    ).map(
                      (
                        header,
                      ) => (
                        <th
                          key={
                            header
                          }
                          className="px-4 py-3"
                        >
                          {header}
                        </th>
                      ),
                    )}

                    <th className="min-w-[320px] px-4 py-3">
                      Chi tiết lỗi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {validatedRows.map(
                    (
                      item,
                    ) => (
                      <tr
                        key={
                          item.row
                            .__rowNumber
                        }
                        className={
                          item.valid
                            ? "hover:bg-slate-50"
                            : "bg-red-50/40"
                        }
                      >
                        <td className="px-4 py-3 font-semibold text-slate-600">
                          {
                            item.row
                              .__rowNumber
                          }
                        </td>

                        <td className="px-4 py-3">
                          {item.valid ? (
                            <span className="inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Hợp lệ
                            </span>
                          ) : (
                            <span className="inline-flex whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                              Có lỗi
                            </span>
                          )}
                        </td>

                        {getHeadersByType(
                          loaiImport,
                        ).map(
                          (
                            header,
                          ) => (
                            <td
                              key={
                                header
                              }
                              className="max-w-[240px] px-4 py-3 text-slate-700"
                            >
                              <div className="max-w-[230px] truncate">
                                {getValueByHeader(
                                  item.row,
                                  header,
                                ) ||
                                  "—"}
                              </div>
                            </td>
                          ),
                        )}

                        <td className="px-4 py-3">
                          {item.errors.length >
                          0 ? (
                            <div className="space-y-1">
                              {item.errors.map(
                                (
                                  rowError,
                                  index,
                                ) => (
                                  <p
                                    key={`${rowError}-${index}`}
                                    className="text-xs leading-5 text-red-600"
                                  >
                                    •{" "}
                                    {
                                      rowError
                                    }
                                  </p>
                                ),
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Không có lỗi
                            </span>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* STEP 5 */}

        {rawRows.length >
          0 && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={22}
                className="mt-0.5 shrink-0 text-[#123b68]"
              />

              <div className="flex-1">
                <h2 className="font-bold text-slate-950">
                  5. Xác nhận import
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Backend sẽ kiểm tra lại một lần nữa trước khi ghi vào MongoDB.
                </p>

                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={
                      skipInvalid
                    }
                    onChange={(
                      event,
                    ) =>
                      setSkipInvalid(
                        event.target
                          .checked,
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Bỏ qua các dòng lỗi
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Import {validCount} dòng hợp lệ và không gửi {invalidCount} dòng đang có lỗi.
                    </p>
                  </div>
                </label>

                {!databaseChecked && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    Bạn cần bấm <strong>Kiểm tra database</strong> trước khi có thể Import.
                  </div>
                )}

                {!skipInvalid &&
                  invalidCount >
                    0 && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      File còn lỗi nên không thể import toàn bộ.
                    </div>
                  )}

                <button
                  type="button"
                  onClick={() =>
                    void handleImport()
                  }
                  disabled={
                    importing ||
                    !databaseChecked ||
                    validCount ===
                      0 ||
                    (!skipInvalid &&
                      invalidCount >
                        0)
                  }
                  className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#123b68] px-5 text-sm font-semibold text-white hover:bg-[#0e3158] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importing ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Upload
                      size={17}
                    />
                  )}

                  {importing
                    ? "Đang import..."
                    : `Import ${validCount} dòng`}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* IMPORT RESULT */}

        {importResult && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
            <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={20}
                  className="text-emerald-600"
                />

                <h2 className="font-bold text-emerald-900">
                  Kết quả import
                </h2>
              </div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Tổng gửi"
                value={
                  importResult.total
                }
              />

              <StatCard
                label="Thành công"
                value={
                  importResult.success
                }
                tone="success"
              />

              <StatCard
                label="Lỗi"
                value={
                  importResult.failed
                }
                tone={
                  importResult.failed >
                  0
                    ? "danger"
                    : "default"
                }
              />

              <StatCard
                label="Bỏ qua"
                value={
                  importResult.skipped
                }
              />
            </div>

            {importResult.errors &&
              importResult.errors
                .length >
                0 && (
                <div className="border-t border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-800">
                    Chi tiết lỗi khi ghi dữ liệu
                  </h3>

                  <div className="mt-3 max-h-[300px] space-y-2 overflow-auto">
                    {importResult.errors.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={`${item.row}-${index}`}
                          className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700"
                        >
                          Dòng{" "}
                          <strong>
                            {item.row}
                          </strong>
                          :{" "}
                          {
                            item.message
                          }
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
          </section>
        )}

        {/* NOTE */}

        <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-blue-700"
            />

            <div className="text-sm leading-6 text-blue-900">
              <p className="font-semibold">
                Quy trình an toàn
              </p>

              <p className="mt-1">
                File Excel được kiểm tra tại trình duyệt, sau đó đối chiếu với MongoDB. Khi bấm Import, backend vẫn kiểm tra lại dữ liệu trước khi tạo hồ sơ hoặc tài khoản. Mật khẩu tài khoản được hash trước khi lưu.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function ImportTypeCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-[#123b68] bg-blue-50 ring-1 ring-[#123b68]"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            active
              ? "bg-[#123b68] text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <FileSpreadsheet
            size={20}
          />
        </div>

        <div>
          <p className="font-bold text-slate-900">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;

  value:
    string | number;

  tone?:
    | "default"
    | "success"
    | "danger"
    | "warning";
}) {
  let valueClass =
    "text-slate-950";

  if (
    tone === "success"
  ) {
    valueClass =
      "text-emerald-700";
  }

  if (
    tone === "danger"
  ) {
    valueClass =
      "text-red-700";
  }

  if (
    tone === "warning"
  ) {
    valueClass =
      "text-amber-700";
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 break-words text-xl font-bold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}