import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { normalizeEmail, safeJson } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(String(body.email || ""));
    const password = String(body.password || "");
    const fullName = String(body.fullName || "") || null;

    if (!email || password.length < 8) return safeJson({ error: "Invalid input" }, { status: 400 });

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return safeJson({ error: "Email already in use" }, { status: 409 });

    await db.user.create({
      data: { email, fullName, passwordHash: await hashPassword(password), emailVerifiedAt: new Date() }
    });

    return safeJson({ ok: true, message: "Account created. You can log in now." });
  } catch {
    return safeJson({ error: "Server error" }, { status: 500 });
  }
}
