"use client";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Registration failed");
    setMessage(data.message || "Account created");
  }

  return (
    <main className="page center">
      <form className="auth-card" style={{ maxWidth: 520 }} onSubmit={submit}>
        <div className="brand">Green Black Portal</div>
        <h1 className="title">Register</h1>
        <label>Full name</label>
        <input value={form.fullName} onChange={(e)=>setForm((s)=>({...s,fullName:e.target.value}))} />
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e)=>setForm((s)=>({...s,email:e.target.value}))} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={(e)=>setForm((s)=>({...s,password:e.target.value}))} required />
        <div className="actions" style={{ marginTop: 18 }}>
          <button type="submit">Create account</button>
          <Link className="button secondary" href="/login">Login</Link>
        </div>
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </form>
    </main>
  );
}
