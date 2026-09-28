import { cookies } from "next/headers";

import {
  SessionUser,
  verifySessionToken,
} from "@/lib/auth";

export async function getCurrentSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}