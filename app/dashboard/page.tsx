import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { getActiveSubscription } from "@/lib/subscription";
import { formatRemainingTime } from "@/lib/utils";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const [sub, datasets, records, jobs] = await Promise.all([
    session.role === "ADMIN" ? Promise.resolve(null) : getActiveSubscription(session.sub),
    db.dataset.count(),
    db.record.count(),
    db.importJob.count(),
  ]);

  return (
    <DashboardShell title="Overview" role={session.role}>
      <div className="grid four">
        <div className="panel"><div className="muted">Account</div><div className="stat">{session.role}</div><div className="muted">{session.email}</div></div>
        <div className="panel"><div className="muted">Subscription</div><div className="stat">{session.role === "ADMIN" ? "Admin" : sub ? "Active" : "Locked"}</div><div className="muted">{session.role === "ADMIN" ? "Bypass enabled" : sub ? sub.plan.name : "Subscription required"}</div></div>
        <div className="panel"><div className="muted">Remaining time</div><div className="stat">{session.role === "ADMIN" ? "∞" : sub ? formatRemainingTime(sub.endsAt) : "0"}</div><div className="muted">{sub ? new Date(sub.endsAt).toLocaleString() : "No active plan"}</div></div>
        <div className="panel"><div className="muted">{session.role === "ADMIN" ? "Datasets / Jobs" : "Search access"}</div><div className="stat">{session.role === "ADMIN" ? `${datasets} / ${jobs}` : sub ? "Ready" : "Locked"}</div><div className="muted">{session.role === "ADMIN" ? `${records} records` : "Use Search after activation"}</div></div>
      </div>
    </DashboardShell>
  );
}
