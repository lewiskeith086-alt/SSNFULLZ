import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { safeJson } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") return safeJson({ error: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const userId = String(body.userId || "");
  const planId = String(body.planId || "");
  if (!userId || !planId) return safeJson({ error: "userId and planId are required" }, { status: 400 });

  const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) return safeJson({ error: "Plan not found" }, { status: 404 });

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  await db.subscription.create({
    data: { userId, planId, status: "ACTIVE", startsAt, endsAt }
  });

  return safeJson({ ok: true });
}
