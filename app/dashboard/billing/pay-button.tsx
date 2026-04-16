"use client";
import { useState } from "react";

export default function PayButton({ planId, label }: { planId: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/payments/cryptomus/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Unable to create invoice");
    window.location.href = data.paymentUrl;
  }

  return (
    <div>
      <button type="button" onClick={pay} disabled={loading}>
        {loading ? "Creating invoice..." : label}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
