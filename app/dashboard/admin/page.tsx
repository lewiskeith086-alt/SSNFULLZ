import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";
import AdminActivateForm from "@/components/admin-activate-form";

export default async function AdminPage() {
  const session = await getCurrentSession();
  if (session?.role !== "ADMIN") {
    return <DashboardShell title="Admin" role="USER"><div className="panel"><p className="error">Admin access required.</p></div></DashboardShell>;
  }

  const [users, plans, subs] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { durationDays: "asc" } }),
    db.subscription.findMany({ include: { user: true, plan: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <DashboardShell title="Admin subscription controls" role={session.role}>
      <div className="grid two">
        <AdminActivateForm users={users.map(u => ({ id: u.id, email: u.email, role: u.role }))} plans={plans.map(p => ({ id: p.id, name: p.name }))} />
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Admin tools</h3>
          <p className="muted">Admins can activate subscriptions here. Users do not see admin tools in the sidebar.</p>
        </div>
      </div>
      <div className="table-card">
        <table>
          <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Ends</th></tr></thead>
          <tbody>
            {subs.map((s) => <tr key={s.id}><td>{s.user.email}</td><td>{s.plan.name}</td><td><span className="badge">{s.status}</span></td><td>{new Date(s.endsAt).toLocaleString()}</td></tr>)}
            {subs.length === 0 ? <tr><td colSpan={4} className="muted">No subscriptions yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
