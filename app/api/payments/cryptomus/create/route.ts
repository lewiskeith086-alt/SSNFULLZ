import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { safeJson } from "@/lib/utils";
import { createCryptomusInvoice } from "@/lib/cryptomus";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return safeJson({ error: "Authentication required" }, { status: 401 });

  const body = await req.json();
  const planId = String(body.planId || "");
  if (!planId) return safeJson({ error: "Plan is required" }, { status: 400 });

  const [user, plan] = await Promise.all([
    db.user.findUnique({ where: { id: session.sub } }),
    db.subscriptionPlan.findUnique({ where: { id: planId } }),
  ]);

  if (!user || !plan) return safeJson({ error: "User or plan not found" }, { status: 404 });

  const existingPending = await db.paymentTransaction.findFirst({
    where: {
      userId: user.id,
      planId: plan.id,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingPending?.paymentUrl) {
    return safeJson({
      ok: true,
      reused: true,
      paymentUrl: existingPending.paymentUrl,
      transactionId: existingPending.id,
    });
  }

  const orderId = `sub_${session.sub}_${Date.now()}`;

  try {
    const invoice = await createCryptomusInvoice({
      amountUsd: plan.priceUsd,
      orderId,
      planName: plan.name,
      userId: user.id,
      userEmail: user.email,
    });

    const tx = await db.paymentTransaction.create({
      data: {
        userId: user.id,
        planId: plan.id,
        amountUsd: plan.priceUsd,
        orderId,
        gatewayInvoiceId: invoice.uuid,
        paymentUrl: invoice.url,
        gatewayPayload: JSON.stringify(invoice),
      },
    });

    return safeJson({ ok: true, paymentUrl: tx.paymentUrl, transactionId: tx.id });
  } catch (error: any) {
    return safeJson({ error: error?.message || "Unable to create invoice" }, { status: 500 });
  }
}
