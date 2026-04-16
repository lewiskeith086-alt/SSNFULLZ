import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";

async function createNews(formData: FormData) {
  "use server";
  const { getCurrentSession } = await import("@/lib/session");
  const { db } = await import("@/lib/db");
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") return;
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const isPublished = String(formData.get("isPublished") || "") === "on";
  if (!title || !body) return;
  await db.newsPost.create({ data: { title, body, isPublished, publishedById: session.sub } });
}

async function updateNews(formData: FormData) {
  "use server";
  const { getCurrentSession } = await import("@/lib/session");
  const { db } = await import("@/lib/db");
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") return;
  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const isPublished = String(formData.get("isPublished") || "") === "on";
  if (!id || !title || !body) return;
  await db.newsPost.update({ where: { id }, data: { title, body, isPublished } });
}

export default async function AdminNewsPage() {
  const session = await getCurrentSession();
  if (session?.role !== "ADMIN") return <DashboardShell title="Admin News" role="USER"><div className="panel"><p className="error">Admin access required.</p></div></DashboardShell>;
  const posts = await db.newsPost.findMany({ include: { publishedBy: true }, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <DashboardShell title="Admin News" role={session.role}>
      <div className="grid two">
        <form action={createNews} className="panel">
          <h3 style={{ marginTop: 0 }}>Create news post</h3>
          <label>Title</label>
          <input name="title" placeholder="Update title" required />
          <label>Body</label>
          <textarea name="body" placeholder="Write platform update for users" required />
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}><input type="checkbox" name="isPublished" style={{ width: 18, height: 18 }} defaultChecked />Publish immediately</label>
          <div className="actions" style={{ marginTop: 16 }}><button type="submit">Create post</button></div>
        </form>
        <div className="panel"><h3 style={{ marginTop: 0 }}>How news works</h3><p className="muted">Published posts appear on the News page for all users. Drafts remain visible to admin only until published.</p></div>
      </div>
      <div className="table-card">
        <table>
          <thead><tr><th>Post</th><th>Status</th><th>Content</th><th>Update</th></tr></thead>
          <tbody>
            {posts.map((post) => <tr key={post.id}><td><strong>{post.title}</strong><div className="muted">{new Date(post.createdAt).toLocaleString()}</div></td><td><span className="badge">{post.isPublished ? "PUBLISHED" : "DRAFT"}</span></td><td>{post.body}</td><td><form action={updateNews}><input type="hidden" name="id" value={post.id} /><input name="title" defaultValue={post.title} /><textarea name="body" defaultValue={post.body} /><label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}><input type="checkbox" name="isPublished" style={{ width: 18, height: 18 }} defaultChecked={post.isPublished} />Published</label><div className="actions" style={{ marginTop: 8 }}><button type="submit">Save</button></div></form></td></tr>)}
            {posts.length === 0 ? <tr><td colSpan={4} className="muted">No posts yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
