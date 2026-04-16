import { db } from "@/lib/db";
import { normalizeEmail, safeJson } from "@/lib/utils";
import { signSession, verifyPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(String(body.email || ""));
    const password = String(body.password || "");

    const user = await db.user.findUnique({ where: { email } });
    if (!user) return safeJson({ error: "Invalid email or password" }, { status: 401 });

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return safeJson({ error: "Invalid email or password" }, { status: 401 });

    const token = await signSession({ sub: user.id, email: user.email, role: user.role });
    await setSessionCookie(token);
    return safeJson({ ok: true });
  } catch {
    return safeJson({ error: "Server error" }, { status: 500 });
  }
}
