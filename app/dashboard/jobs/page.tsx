import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function JobsPage() {
  const session = await getCurrentSession();
  if (session?.role !== "ADMIN") {
    return (
      <DashboardShell title="Jobs" role="USER">
        <div className="panel">
          <p className="error">Admin access required.</p>
        </div>
      </DashboardShell>
    );
  }

  const jobs = await db.importJob.findMany({
    include: { dataset: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <DashboardShell title="Import Jobs" role={session.role}>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Dataset</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Rows</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.fileName}</td>
                <td>{j.dataset.name}</td>
                <td><span className="badge">{j.status}</span></td>
                <td>{j.progressPct ?? 0}%</td>
                <td>{j.rowsImported} / {j.totalRows || 0}</td>
                <td>{j.errorMessage || "—"}</td>
              </tr>
            ))}
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">No jobs yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
