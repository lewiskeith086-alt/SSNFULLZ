import { db } from "@/lib/db";
import Link from "next/link";

function durationLabel(days: number) {
  if (days >= 36500) return "Lifetime access";
  if (days === 1) return "1 day access";
  return `${days} day access`;
}

export default async function PricingPage() {
  const plans = await db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { priceUsd: "asc" } });
  return (
    <main className="page">
      <div className="auth-card">
        <div className="brand">Green Black Portal</div>
        <h1 className="title">Pricing</h1>
        <p className="subtitle">Crypto-only subscriptions. Choose a plan and activate access from Billing after login.</p>
        <div className="actions" style={{ marginBottom: 20 }}>
          <Link className="button" href="/login">Login</Link>
          <Link className="button secondary" href="/register">Register</Link>
        </div>
        <div className="card-grid">
          {plans.map((plan) => (
            <div key={plan.id} className="plan-card">
              <div className="brand">{plan.name}</div>
              <div className="stat">${plan.priceUsd}</div>
              <p className="muted">{durationLabel(plan.durationDays)}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
