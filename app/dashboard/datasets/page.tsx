import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DatasetsPage() {
  const session = await getCurrentSession();
  if (session?.role !== "ADMIN") {
    return <DashboardShell title="Datasets" role="USER"><div className="panel"><p className="error">Admin access required.</p></div></DashboardShell>;
  }

  const datasets = await db.dataset.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <DashboardShell title="Datasets" role={session.role}>
      <div className="table-card">
        <table>
          <thead><tr><th>Name</th><th>Status</th><th>Rows</th><th>Last import</th></tr></thead>
          <tbody>
            {datasets.map((d) => <tr key={d.id}><td>{d.name}</td><td><span className="badge">{d.status}</span></td><td>{d.rowCount}</td><td>{d.lastImportAt ? new Date(d.lastImportAt).toLocaleString() : "—"}</td></tr>)}
            {datasets.length === 0 ? <tr><td colSpan={4} className="muted">No datasets yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
