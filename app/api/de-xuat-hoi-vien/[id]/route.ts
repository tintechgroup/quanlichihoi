import {
  NextResponse,
} from "next/server";

import {
  Types,
} from "mongoose";

import {
  getCurrentSession,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

async function validateRequest(
  context: RouteContext,
) {
  const session =
    await getCurrentSession();

  if (!session) {
    return {
      error:
        responseError(
          "Bạn chưa đăng nhập",
          401,
        ),

      session:
        null,

      id:
        "",
    };
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
    return {
      error:
        responseError(
          "Mã đề xuất Hội viên không hợp lệ",
          400,
        ),

      session,

      id:
        "",
    };
  }

  return {
    error:
      null,

    session,

    id,
  };
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const validation =
    await validateRequest(
      context,
    );

  if (
    validation.error
  ) {
    return validation.error;
  }

  return NextResponse.json(
    {
      success:
        false,

      message:
        "API chi tiết đề xuất Hội viên chưa được nối với model dữ liệu hiện tại.",
    },
    {
      status:
        501,
    },
  );
}

/* =========================================================
   PUT
========================================================= */

export async function PUT(
  _request: Request,
  context: RouteContext,
) {
  const validation =
    await validateRequest(
      context,
    );

  if (
    validation.error
  ) {
    return validation.error;
  }

  if (
    validation.session
      ?.role !==
      "ADMIN" &&
    validation.session
      ?.role !==
      "BAN_CHAP_HANH" &&
    validation.session
      ?.role !==
      "CHI_HOI_TRUONG"
  ) {
    return responseError(
      "Bạn không có quyền cập nhật đề xuất Hội viên",
      403,
    );
  }

  return NextResponse.json(
    {
      success:
        false,

      message:
        "API cập nhật đề xuất Hội viên chưa được nối với model dữ liệu hiện tại.",
    },
    {
      status:
        501,
    },
  );
}

/* =========================================================
   PATCH
========================================================= */

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  return PUT(
    request,
    context,
  );
}

/* =========================================================
   DELETE
========================================================= */

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const validation =
    await validateRequest(
      context,
    );

  if (
    validation.error
  ) {
    return validation.error;
  }

  if (
    validation.session
      ?.role !==
      "ADMIN" &&
    validation.session
      ?.role !==
      "BAN_CHAP_HANH" &&
    validation.session
      ?.role !==
      "CHI_HOI_TRUONG"
  ) {
    return responseError(
      "Bạn không có quyền xóa đề xuất Hội viên",
      403,
    );
  }

  return NextResponse.json(
    {
      success:
        false,

      message:
        "API xóa đề xuất Hội viên chưa được nối với model dữ liệu hiện tại.",
    },
    {
      status:
        501,
    },
  );
}