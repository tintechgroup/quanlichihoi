import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".zip",
  ".rar",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
];

const MANAGER_ROLES = [
  "ADMIN",
  "BAN_CHAP_HANH",
  "CHI_HOI_TRUONG",
];

function sanitizeOriginalName(name: string) {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export async function POST(
  request: NextRequest,
) {
  try {
    const session = await getCurrentSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng đăng nhập để tiếp tục",
        },
        {
          status: 401,
        },
      );
    }

    if (!MANAGER_ROLES.includes(session.role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền tải tài liệu lên",
        },
        {
          status: 403,
        },
      );
    }

    const formData = await request.formData();

    const files = formData
      .getAll("files")
      .filter(
        (item): item is File =>
          item instanceof File,
      );

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng chọn ít nhất một tệp",
        },
        {
          status: 400,
        },
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          success: false,
          message: `Chỉ được tải tối đa ${MAX_FILES} tệp mỗi lần`,
        },
        {
          status: 400,
        },
      );
    }

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "thong-bao",
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    const uploadedFiles = [];

    for (const file of files) {
      if (file.size <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Tệp "${file.name}" không có dữ liệu`,
          },
          {
            status: 400,
          },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            message: `Tệp "${file.name}" vượt quá dung lượng 10MB`,
          },
          {
            status: 400,
          },
        );
      }

      const extension = path
        .extname(file.name)
        .toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return NextResponse.json(
          {
            success: false,
            message: `Định dạng tệp "${file.name}" không được hỗ trợ`,
          },
          {
            status: 400,
          },
        );
      }

      const storedFileName = `${Date.now()}-${randomUUID()}${extension}`;

      const absoluteFilePath = path.join(
        uploadDirectory,
        storedFileName,
      );

      const fileBuffer = Buffer.from(
        await file.arrayBuffer(),
      );

      await writeFile(
        absoluteFilePath,
        fileBuffer,
      );

      uploadedFiles.push({
        tenTep:
          sanitizeOriginalName(file.name) ||
          storedFileName,

        duongDan: `/uploads/thong-bao/${storedFileName}`,

        loaiTep:
          file.type ||
          "application/octet-stream",

        kichThuoc: file.size,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message:
          uploadedFiles.length > 1
            ? `Đã tải lên ${uploadedFiles.length} tệp`
            : "Tải tệp lên thành công",

        data: {
          files: uploadedFiles,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Lỗi tải tài liệu thông báo:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Đã xảy ra lỗi khi tải tài liệu lên",
      },
      {
        status: 500,
      },
    );
  }
}