import Link from "next/link";
import LogoutButton from "./logout-button";

export function DashboardShell({ title, role, children }: { title: string; role: "ADMIN" | "USER"; children: React.ReactNode; }) {
  const admin = role === "ADMIN";
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="logo">GBP</div>
        <div className="caption">{admin ? "Admin portal" : "User portal"}</div>
        <nav className="nav">
          <Link href="/dashboard">Overview</Link>
          <Link href="/dashboard/records">{admin ? "Records" : "Search"}</Link>
          <Link href="/dashboard/billing">Billing</Link>
          <Link href="/dashboard/tickets">Tickets</Link>
          <Link href="/dashboard/news">News</Link>
          {admin ? <Link href="/dashboard/datasets">Datasets</Link> : null}
          {admin ? <Link href="/dashboard/upload">Upload</Link> : null}
          {admin ? <Link href="/dashboard/jobs">Jobs</Link> : null}
          {admin ? <Link href="/dashboard/admin">Admin</Link> : null}
          {admin ? <Link href="/dashboard/admin/payments">Payments</Link> : null}
          {admin ? <Link href="/dashboard/admin/tickets">Admin Tickets</Link> : null}
          {admin ? <Link href="/dashboard/admin/news">Admin News</Link> : null}
        </nav>
      </aside>
      <section className="content">
        <div className="header">
          <div><div className="brand">Green Black Portal</div><h1 style={{ margin: 0 }}>{title}</h1></div>
          <LogoutButton />
        </div>
        {children}
      </section>
    </div>
  );
}
