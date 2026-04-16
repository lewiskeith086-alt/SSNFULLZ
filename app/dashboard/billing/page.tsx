import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { getActiveSubscription } from "@/lib/subscription";
import { formatRemainingTime } from "@/lib/utils";
import { DashboardShell } from "@/components/dashboard-shell";
import PayButton from "./pay-button";
import CheckPaymentStatusButton from "./check-payment-status";

function durationLabel(days: number) {
  if (days >= 36500) return "Lifetime access";
  if (days === 1) return "1 day access";
  return `${days} day access`;
}

export default async function BillingPage() {
  const session = await getCurrentSession();
  if (!session) return null;
  const [plans, activeSub, history, payments] = await Promise.all([
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { priceUsd: "asc" } }),
    getActiveSubscription(session.sub),
    db.subscription.findMany({ where: { userId: session.sub }, include: { plan: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.paymentTransaction.findMany({ where: { userId: session.sub }, include: { plan: true }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const pendingPayment = payments.find((p) => p.status === "PENDING");

  return (
    <DashboardShell title="Billing" role={session.role}>
      <div className="grid two">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Current status</h3>
          <p>{session.role === "ADMIN" ? "Admin bypass enabled." : activeSub ? `Active: ${activeSub.plan.name}` : "No active subscription."}</p>
          <p className="muted">{session.role === "ADMIN" ? "Unlimited internal access" : activeSub ? `${formatRemainingTime(activeSub.endsAt)} • ends ${new Date(activeSub.endsAt).toLocaleString()}` : "Choose a plan below and pay with crypto to activate access"}</p>
          {session.role !== "ADMIN" && pendingPayment ? (
            <div className="actions" style={{ marginTop: 12 }}>
              <CheckPaymentStatusButton />
              {pendingPayment.paymentUrl ? <a className="button secondary" href={pendingPayment.paymentUrl} target="_blank" rel="noreferrer">Open pending invoice</a> : null}
            </div>
          ) : null}
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Plans</h3>
          <div className="card-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
            {plans.map((plan) => (
              <div key={plan.id} className="plan-card">
                <div className="brand">{plan.name}</div>
                <div className="stat">${plan.priceUsd}</div>
                <p className="muted">{durationLabel(plan.durationDays)}</p>
                {session.role === "ADMIN" ? <p className="muted">Admin does not need payment</p> : <div className="actions" style={{ marginTop: 12 }}><PayButton planId={plan.id} label={`Pay with crypto - $${plan.priceUsd}`} /></div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead><tr><th>Plan</th><th>Status</th><th>Starts</th><th>Ends</th><th>Remaining</th></tr></thead>
          <tbody>
            {history.map((row) => <tr key={row.id}><td>{row.plan.name}</td><td><span className="badge">{row.status}</span></td><td>{new Date(row.startsAt).toLocaleString()}</td><td>{new Date(row.endsAt).toLocaleString()}</td><td>{row.status === "ACTIVE" ? (row.plan.durationDays >= 36500 ? "Lifetime" : formatRemainingTime(row.endsAt)) : "Expired / inactive"}</td></tr>)}
            {history.length === 0 ? <tr><td colSpan={5} className="muted">No subscription history yet.</td></tr> : null}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <table>
          <thead><tr><th>Plan</th><th>Payment status</th><th>Amount</th><th>Order</th><th>Created</th><th>Action</th></tr></thead>
          <tbody>
            {payments.map((p) => <tr key={p.id}><td>{p.plan.name}</td><td><span className="badge">{p.status}</span></td><td>${p.amountUsd}</td><td>{p.orderId}</td><td>{new Date(p.createdAt).toLocaleString()}</td><td>{p.status === "PENDING" ? <div className="actions"><CheckPaymentStatusButton compact />{p.paymentUrl ? <a className="button secondary" href={p.paymentUrl} target="_blank" rel="noreferrer">Open invoice</a> : null}</div> : p.status === "PAID" || p.status === "PAID_OVER" ? "Confirmed" : "—"}</td></tr>)}
            {payments.length === 0 ? <tr><td colSpan={6} className="muted">No payment history yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
