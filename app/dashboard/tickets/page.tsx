import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { redirect } from "next/navigation";

async function createTicket(formData: FormData) {
  "use server";
  const { getCurrentSession } = await import("@/lib/session");
  const { db } = await import("@/lib/db");
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!subject || !message) return;
  await db.supportTicket.create({ data: { userId: session.sub, subject, message, status: "OPEN" } });
}

export default async function TicketsPage() {
  const session = await getCurrentSession();
  if (!session) return null;
  const tickets = await db.supportTicket.findMany({ where: session.role === "ADMIN" ? {} : { userId: session.sub }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <DashboardShell title="Tickets" role={session.role}>
      <div className="grid two">
        <form action={createTicket} className="panel">
          <h3 style={{ marginTop: 0 }}>Create ticket</h3>
          <label>Subject</label>
          <input name="subject" placeholder="Report subject" required />
          <label>Message</label>
          <textarea name="message" placeholder="Describe the issue or report for admin" required />
          <div className="actions" style={{ marginTop: 16 }}><button type="submit">Submit ticket</button></div>
        </form>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>How tickets work</h3>
          <p className="muted">Use tickets to report issues, request help, or send admin a detailed message. Admin responses will appear below.</p>
        </div>
      </div>
      <div className="table-card">
        <table>
          <thead><tr>{session.role === "ADMIN" ? <th>User</th> : null}<th>Subject</th><th>Status</th><th>Message</th><th>Admin reply</th><th>Created</th></tr></thead>
          <tbody>
            {tickets.map((t) => <tr key={t.id}>{session.role === "ADMIN" ? <td>{t.user.email}</td> : null}<td>{t.subject}</td><td><span className="badge">{t.status}</span></td><td>{t.message}</td><td>{t.adminReply || "—"}</td><td>{new Date(t.createdAt).toLocaleString()}</td></tr>)}
            {tickets.length === 0 ? <tr><td colSpan={session.role === "ADMIN" ? 6 : 5} className="muted">No tickets yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
