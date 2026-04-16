import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";

async function createDataset(formData: FormData) {
  "use server";

  const { getCurrentSession } = await import("@/lib/session");
  const { db } = await import("@/lib/db");

  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") return;

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;

  if (!name) return;

  await db.dataset.create({
    data: {
      name,
      description,
      uploadedById: session.sub,
    },
  });
}

async function deleteDataset(formData: FormData) {
  "use server";

  const { getCurrentSession } = await import("@/lib/session");
  const { db } = await import("@/lib/db");

  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") return;

  const id = String(formData.get("id") || "");
  if (!id) return;

  await db.dataset.delete({
    where: { id },
  });
}

export default async function DatasetsPage() {
  const session = await getCurrentSession();

  if (session?.role !== "ADMIN") {
    return (
      <DashboardShell title="Datasets" role="USER">
        <div className="panel">
          <p className="error">Admin access required.</p>
        </div>
      </DashboardShell>
    );
  }

  const datasets = await db.dataset.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell title="Datasets" role={session.role}>
      <div className="grid two">
        <form action={createDataset} className="panel">
          <h3 style={{ marginTop: 0 }}>Create dataset</h3>

          <label>Name</label>
          <input name="name" placeholder="Dataset name" required />

          <label>Description</label>
          <textarea name="description" placeholder="Optional description" />

          <div className="actions" style={{ marginTop: 16 }}>
            <button type="submit">Create dataset</button>
          </div>
        </form>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Notes</h3>
          <p className="muted">
            Create a dataset here first, then go to Upload and attach CSV files to it.
          </p>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Rows</th>
              <th>Status</th>
              <th>Last import</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.description || "—"}</td>
                <td>{d.rowCount}</td>
                <td><span className="badge">{d.status}</span></td>
                <td>{d.lastImportAt ? new Date(d.lastImportAt).toISOString() : "—"}</td>
                <td>
                  <form action={deleteDataset}>
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {datasets.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">No datasets yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}