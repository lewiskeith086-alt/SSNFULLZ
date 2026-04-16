import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function NewsPage() {
  const session = await getCurrentSession();
  if (!session) return null;
  const posts = await db.newsPost.findMany({ where: session.role === "ADMIN" ? {} : { isPublished: true }, include: { publishedBy: true }, orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <DashboardShell title="News" role={session.role}>
      <div className="grid two">
        {posts.map((post) => <div key={post.id} className="panel"><div className="brand">{post.isPublished ? "Published" : "Draft"}</div><h3 style={{ marginTop: 0 }}>{post.title}</h3><p className="muted">By {post.publishedBy.fullName || post.publishedBy.email} • {new Date(post.createdAt).toLocaleString()}</p><div>{post.body}</div></div>)}
      </div>
      {posts.length === 0 ? <div className="panel"><p className="muted">No news posts yet.</p></div> : null}
    </DashboardShell>
  );
}
