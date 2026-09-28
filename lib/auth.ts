import { SignJWT, jwtVerify } from "jose";

export type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

export type SessionUser = {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("Chưa khai báo AUTH_SECRET trong file .env.local");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  user: SessionUser
): Promise<string> {
  return new SignJWT({
    userId: user.userId,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    const userId = payload.userId;
    const username = payload.username;
    const fullName = payload.fullName;
    const role = payload.role;

    const validRoles: UserRole[] = [
      "ADMIN",
      "BAN_CHAP_HANH",
      "CHI_HOI_TRUONG",
      "HOI_VIEN",
    ];

    if (
      typeof userId !== "string" ||
      typeof username !== "string" ||
      typeof fullName !== "string" ||
      typeof role !== "string" ||
      !validRoles.includes(role as UserRole)
    ) {
      return null;
    }

    return {
      userId,
      username,
      fullName,
      role: role as UserRole,
    };
  } catch {
    return null;
  }
}