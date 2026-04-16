import { cookies } from "next/headers";
import { verifySession } from "./auth";

export const SESSION_COOKIE_NAME = "gbp_session";

export async function setSessionCookie(token: string) {
  const s = await cookies();
  s.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function getCurrentSession() {
  const s = await cookies();
  const token = s.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}
