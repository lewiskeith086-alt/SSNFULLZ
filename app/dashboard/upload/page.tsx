"use client";
import { useEffect, useState } from "react";

type Dataset = { id: string; name: string };

export default function UploadPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [storedPath, setStoredPath] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((data) => {
        setDatasets(data.datasets || []);
        if (data.datasets?.[0]?.id) setDatasetId(data.datasets[0].id);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setStoredPath("");
    setError("");
    if (!file) return setError("Choose a CSV file");

    const form = new FormData();
    form.append("datasetId", datasetId);
    form.append("file", file);

    const res = await fetch("/api/datasets/upload", { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) return setError(data.error || "Upload failed");

    setMessage(`Imported ${data.importedCount} row(s). File stored in R2.`);
    if (data.publicUrl || data.storedPath) setStoredPath(data.publicUrl || data.storedPath);
  }

  return (
    <main className="page">
      <div className="auth-card" style={{ maxWidth: 820 }}>
        <div className="brand">Green Black Portal</div>
        <h1 className="title">Upload CSV</h1>
        <p className="subtitle">Raw files are stored in Cloudflare R2. Parsed rows are saved into the database for search.</p>
        <form onSubmit={submit}>
          <label>Dataset</label>
          <select value={datasetId} onChange={(e) => setDatasetId(e.target.value)} required>
            <option value="">Select dataset</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <label>CSV file</label>
          <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />

          <div className="actions" style={{ marginTop: 16 }}>
            <button type="submit">Upload and process</button>
          </div>

          {message ? <p className="success">{message}</p> : null}
          {storedPath ? <p className="muted">Stored at: {storedPath}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}
