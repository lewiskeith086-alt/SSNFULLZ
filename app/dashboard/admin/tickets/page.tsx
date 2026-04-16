import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";

async function updateTicket(formData: FormData) {
  "use server";
  const { getCurrentSession } = await import("@/lib/session");
  const { db } = await import("@/lib/db");
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") return;
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "OPEN") as "OPEN" | "IN_REVIEW" | "CLOSED";
  const adminReply = String(formData.get("adminReply") || "").trim();
  if (!id) return;
  await db.supportTicket.update({ where: { id }, data: { status, adminReply: adminReply || null } });
}

export default async function AdminTicketsPage() {
  const session = await getCurrentSession();
  if (session?.role !== "ADMIN") return <DashboardShell title="Admin Tickets" role="USER"><div className="panel"><p className="error">Admin access required.</p></div></DashboardShell>;
  const tickets = await db.supportTicket.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <DashboardShell title="Admin Tickets" role={session.role}>
      <div className="table-card">
        <table>
          <thead><tr><th>User</th><th>Subject</th><th>Status</th><th>Message</th><th>Reply / Update</th></tr></thead>
          <tbody>
            {tickets.map((t) => <tr key={t.id}><td>{t.user.email}</td><td>{t.subject}</td><td><span className="badge">{t.status}</span></td><td>{t.message}</td><td><form action={updateTicket}><input type="hidden" name="id" value={t.id} /><select name="status" defaultValue={t.status}><option value="OPEN">OPEN</option><option value="IN_REVIEW">IN_REVIEW</option><option value="CLOSED">CLOSED</option></select><textarea name="adminReply" defaultValue={t.adminReply || ""} placeholder="Write reply to user" /><div className="actions" style={{ marginTop: 8 }}><button type="submit">Save</button></div></form></td></tr>)}
            {tickets.length === 0 ? <tr><td colSpan={5} className="muted">No tickets yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
