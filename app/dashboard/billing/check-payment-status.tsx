"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CheckPaymentStatusButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function checkStatus() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/payments/cryptomus/check", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Unable to check payment status");
      setLoading(false)
      return;
    }

    setMessage(data.message || "Status checked");
    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <button type="button" className={compact ? "button secondary" : "button"} onClick={checkStatus} disabled={loading}>
        {loading ? "Checking..." : "Check Payment Status"}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
