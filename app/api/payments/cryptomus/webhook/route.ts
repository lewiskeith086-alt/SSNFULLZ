import { db } from "@/lib/db";
import { safeJson } from "@/lib/utils";
import { verifyCryptomusWebhook } from "@/lib/cryptomus";

export async function POST(req: Request) {
  const raw = await req.json();

  if (!verifyCryptomusWebhook(raw)) {
    return safeJson({ error: "Invalid webhook signature" }, { status: 403 });
  }

  const orderId = String(raw.order_id || "");
  const uuid = String(raw.uuid || "");
  const status = String(raw.status || "");
  const isFinal = Boolean(raw.is_final);

  const tx = await db.paymentTransaction.findUnique({
    where: { orderId },
    include: { plan: true }
  });
  if (!tx) return safeJson({ ok: true });

  let newStatus = tx.status;
  if (status == "paid") newStatus = "PAID";
  else if (status == "paid_over") newStatus = "PAID_OVER";
  else if (status == "cancel") newStatus = "CANCELED";
  else if (status == "fail" || status == "system_fail" || status == "wrong_amount") newStatus = "FAILED";
  else if (status == "refund_paid") newStatus = "REFUNDED";

  await db.paymentTransaction.update({
    where: { id: tx.id },
    data: {
      gatewayInvoiceId: uuid || tx.gatewayInvoiceId,
      status: newStatus,
      paidAt: newStatus === "PAID" || newStatus === "PAID_OVER" ? new Date() : tx.paidAt,
      gatewayPayload: JSON.stringify(raw)
    }
  });

  if (isFinal && (newStatus === "PAID" || newStatus === "PAID_OVER")) {
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + tx.plan.durationDays * 24 * 60 * 60 * 1000);

    const existing = await db.subscription.findFirst({
      where: {
        userId: tx.userId,
        planId: tx.planId,
        status: "ACTIVE",
        endsAt: { gt: new Date() }
      }
    });

    if (!existing) {
      await db.subscription.create({
        data: {
          userId: tx.userId,
          planId: tx.planId,
          status: "ACTIVE",
          startsAt,
          endsAt
        }
      });
    }
  }

  return safeJson({ ok: true });
}
