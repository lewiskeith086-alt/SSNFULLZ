import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page center">
      <div className="auth-card" style={{ maxWidth: 860 }}>
        <div className="brand">Green Black Portal</div>
        <h1 className="title">Welcome SSN/FULLZ US</h1>
        <p className="subtitle">Login or view subscription access controls.</p>
        <div className="actions">
          <Link className="button" href="/pricing">View plans</Link>
          <Link className="button secondary" href="/login">Login</Link>
        </div>
      </div>
    </main>
  );
}
