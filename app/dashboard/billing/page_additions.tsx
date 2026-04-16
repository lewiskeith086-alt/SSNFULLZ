/*
On your existing billing page:

1. Add:
import PayButton from "./pay-button";

2. Replace each plain plan card action with:
<PayButton planId={plan.id} label={`Pay with crypto - $${plan.priceUsd}`} />

3. Add payment history with:
const paymentHistory = await db.paymentTransaction.findMany({
  where: { userId: session.sub },
  include: { plan: true },
  orderBy: { createdAt: "desc" },
  take: 20,
});
*/
