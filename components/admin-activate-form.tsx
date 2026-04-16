"use client";
import { useState } from "react";

type User = { id: string; email: string; role: string };
type Plan = { id: string; name: string };

export default function AdminActivateForm({ users, plans }: { users: User[]; plans: Plan[] }) {
  const [userId, setUserId] = useState(users[0]?.id || "");
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch("/api/admin/subscriptions/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, planId }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Activation failed");
    setMessage("Subscription activated.");
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h3 style={{ marginTop: 0 }}>Activate subscription</h3>
      <label>User</label>
      <select value={userId} onChange={(e) => setUserId(e.target.value)}>
        {users.map((u) => <option key={u.id} value={u.id}>{u.email} ({u.role})</option>)}
      </select>
      <label>Plan</label>
      <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
        {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="actions" style={{ marginTop: 16 }}><button type="submit">Activate plan</button></div>
      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
