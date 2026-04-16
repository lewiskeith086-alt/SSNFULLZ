import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { safeJson } from "@/lib/utils";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return safeJson({ error: "Authentication required" }, { status: 401 });

  const items = await db.paymentTransaction.findMany({
    where: { userId: session.sub },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return safeJson({ ok: true, items });
}
