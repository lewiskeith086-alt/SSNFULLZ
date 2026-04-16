import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { safeJson } from "@/lib/utils";
import { getActiveSubscription } from "@/lib/subscription";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) return safeJson({ error: "Authentication required" }, { status: 401 });

  const [latestPending, activeSub] = await Promise.all([
    db.paymentTransaction.findFirst({
      where: { userId: session.sub, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    getActiveSubscription(session.sub),
  ]);

  if (activeSub) {
    return safeJson({
      ok: true,
      status: "ACTIVE_SUBSCRIPTION",
      message: "Subscription is active.",
    });
  }

  if (!latestPending) {
    return safeJson({
      ok: true,
      status: "NO_PENDING_PAYMENT",
      message: "No pending payment found yet.",
    });
  }

  return safeJson({
    ok: true,
    status: latestPending.status,
    message: "Payment is still pending. If you already paid, wait a bit and check again after webhook confirmation.",
  });
}
