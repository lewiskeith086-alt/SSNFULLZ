import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "CHANGE_ME");

export type SessionPayload = { sub: string; email: string; role: "ADMIN" | "USER" };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setSubject(payload.sub).setIssuedAt().setExpirationTime("7d").sign(secret);
}
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { sub: String(payload.sub), email: String(payload.email), role: payload.role as "ADMIN" | "USER" };
  } catch {
    return null;
  }
}
