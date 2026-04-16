import { cookies } from "next/headers";
import { safeJson } from "@/lib/utils";

export async function POST() {
  const store = await cookies();

  store.set("gbp_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return safeJson({ ok: true });
}
