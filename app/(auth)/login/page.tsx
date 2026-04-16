"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Login failed");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="page center">
      <form className="auth-card" style={{ maxWidth: 520 }} onSubmit={submit}>
        <div className="brand">Green Black Portal</div>
        <h1 className="title">Login</h1>
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e)=>setForm((s)=>({...s,email:e.target.value}))} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={(e)=>setForm((s)=>({...s,password:e.target.value}))} required />
        <div className="actions" style={{ marginTop: 18 }}>
          <button type="submit">Login</button>
          <Link className="button secondary" href="/pricing">View plans</Link>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </main>
  );
}
