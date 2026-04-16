import { db } from "./db";

export async function markExpiredSubscriptions(userId?: string) {
  const now = new Date();
  await db.subscription.updateMany({
    where: {
      status: "ACTIVE",
      endsAt: { lte: now },
      ...(userId ? { userId } : {})
    },
    data: { status: "EXPIRED" }
  });
}

export async function getActiveSubscription(userId: string) {
  await markExpiredSubscriptions(userId);
  const now = new Date();
  return db.subscription.findFirst({
    where: { userId, status: "ACTIVE", endsAt: { gt: now } },
    include: { plan: true },
    orderBy: { endsAt: "desc" }
  });
}

export async function userHasActiveSubscription(userId: string) {
  const sub = await getActiveSubscription(userId);
  return !!sub;
}
