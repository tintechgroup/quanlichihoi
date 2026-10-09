import SystemLog, {
  LogAction,
  LogModule,
} from "@/models/SystemLog";

type WriteSystemLogInput = {
  userId?: string | null;

  username?: string;

  fullName?: string;

  role?: string;

  action: LogAction;

  module: LogModule;

  description: string;

  targetId?: string;

  targetName?: string;

  metadata?: Record<
    string,
    unknown
  >;

  ipAddress?: string;

  userAgent?: string;
};

export async function writeSystemLog(
  input: WriteSystemLogInput,
) {
  try {
    await SystemLog.create({
      userId:
        input.userId || null,

      username:
        input.username || "",

      fullName:
        input.fullName || "",

      role:
        input.role || "",

      action:
        input.action,

      module:
        input.module,

      description:
        input.description,

      targetId:
        input.targetId || "",

      targetName:
        input.targetName || "",

      metadata:
        input.metadata || {},

      ipAddress:
        input.ipAddress || "",

      userAgent:
        input.userAgent || "",
    });
  } catch (error) {
    /*
     * Log không được làm hỏng
     * nghiệp vụ chính.
     */
    console.error(
      "Không thể ghi SystemLog:",
      error,
    );
  }
}

export function getRequestIp(
  request: Request,
) {
  const forwardedFor =
    request.headers.get(
      "x-forwarded-for",
    );

  if (forwardedFor) {
    return (
      forwardedFor
        .split(",")[0]
        ?.trim() || ""
    );
  }

  return (
    request.headers.get(
      "x-real-ip",
    ) || ""
  );
}

export function getUserAgent(
  request: Request,
) {
  return (
    request.headers.get(
      "user-agent",
    ) || ""
  );
}