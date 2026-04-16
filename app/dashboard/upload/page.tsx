"use client";
import { useEffect, useMemo, useState } from "react";

type Dataset = { id: string; name: string };

type ResumeState = {
  datasetId: string;
  fileName: string;
  fileSize: number;
  fileLastModified: number;
  uploadId: string;
  key: string;
  storedPath: string;
  parts: Array<{ ETag: string; PartNumber: number }>;
  uploadedBytes: number;
};

const PART_SIZE = 25 * 1024 * 1024;
const STORAGE_KEY = "multipart-upload-resume-state";

function loadResumeState(): ResumeState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResumeState;
  } catch {
    return null;
  }
}

function saveResumeState(state: ResumeState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearResumeState() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function UploadPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [storedPath, setStoredPath] = useState("");
  const [error, setError] = useState("");
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(false);

  useEffect(() => {
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((data) => {
        setDatasets(data.datasets || []);
        if (data.datasets?.[0]?.id) setDatasetId(data.datasets[0].id);
      });

    if (typeof window !== "undefined") {
      setResumeAvailable(!!loadResumeState());
    }
  }, []);

  const totalParts = useMemo(() => {
    if (!file) return 0;
    return Math.ceil(file.size / PART_SIZE);
  }, [file]);

  async function signPart(key: string, uploadId: string, partNumber: number) {
    const res = await fetch("/api/upload/multipart/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key, uploadId, partNumber }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to sign upload part");
    return data.uploadUrl as string;
  }

  async function uploadPart(url: string, blob: Blob) {
    const res = await fetch(url, {
      method: "PUT",
      body: blob,
    });

    if (!res.ok) {
      throw new Error("Part upload failed");
    }

    const etag = res.headers.get("ETag");
    if (!etag) throw new Error("Missing ETag from part upload");

    return etag.replaceAll('"', "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setStoredPath("");
    setError("");
    setUploadPct(0);

    if (!file) {
      setError("Choose a CSV file");
      return;
    }

    setUploading(true);

    try {
      let resume = loadResumeState();

      const sameFile =
        !!resume &&
        resume.datasetId === datasetId &&
        resume.fileName === file.name &&
        resume.fileSize === file.size &&
        resume.fileLastModified === file.lastModified;

      if (!sameFile) {
        const initRes = await fetch("/api/upload/multipart/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            datasetId,
            fileName: file.name,
            contentType: file.type || "text/csv",
          }),
        });

        const initData = await initRes.json();
        if (!initRes.ok) throw new Error(initData.error || "Failed to start upload");

        resume = {
          datasetId,
          fileName: file.name,
          fileSize: file.size,
          fileLastModified: file.lastModified,
          uploadId: initData.uploadId,
          key: initData.key,
          storedPath: initData.storedPath,
          parts: [],
          uploadedBytes: 0,
        };

        saveResumeState(resume);
        setResumeAvailable(true);
      }

      const uploadedPartNumbers = new Set(resume.parts.map((p) => p.PartNumber));

      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        const start = (partNumber - 1) * PART_SIZE;
        const end = Math.min(start + PART_SIZE, file.size);

        if (uploadedPartNumbers.has(partNumber)) {
          continue;
        }

        const chunk = file.slice(start, end);
        const url = await signPart(resume.key, resume.uploadId, partNumber);
        const etag = await uploadPart(url, chunk);

        resume.parts.push({ ETag: etag, PartNumber: partNumber });
        resume.uploadedBytes += chunk.size;
        saveResumeState(resume);

        const pct = Math.min(
          100,
          Math.round((resume.uploadedBytes / file.size) * 100)
        );
        setUploadPct(pct);
      }

      const completeRes = await fetch("/api/upload/multipart/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: resume.key,
          uploadId: resume.uploadId,
          parts: resume.parts,
        }),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error || "Failed to complete upload");
      }

      const form = new FormData();
      form.append("datasetId", datasetId);
      form.append("storedPath", resume.storedPath);
      form.append("fileName", file.name);

      const queueRes = await fetch("/api/datasets/upload", {
        method: "POST",
        body: form,
      });

      const queueData = await queueRes.json();
      if (!queueRes.ok) {
        throw new Error(queueData.error || "Failed to queue processing job");
      }

      setMessage("Upload complete. File queued for background processing.");
      setStoredPath(resume.storedPath);
      setUploadPct(100);
      clearResumeState();
      setResumeAvailable(false);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function resetResume() {
    clearResumeState();
    setResumeAvailable(false);
    setUploadPct(0);
    setMessage("");
    setStoredPath("");
    setError("");
  }

  return (
    <main className="page">
      <div className="auth-card" style={{ maxWidth: 820 }}>
        <div className="brand">Green Black Portal</div>
        <h1 className="title">Upload CSV</h1>
        <p className="subtitle">
          Files upload directly to Cloudflare R2 in chunks. After upload finishes,
          a background worker processes the file.
        </p>

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
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          {file ? (
            <p className="muted" style={{ marginTop: 8 }}>
              Selected: {file.name} ({Math.ceil(file.size / (1024 * 1024))} MB, {totalParts} parts)
            </p>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <div
              style={{
                width: "100%",
                height: 12,
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${uploadPct}%`,
                  height: "100%",
                  background: "#b5f56b",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <p className="muted" style={{ marginTop: 8 }}>
              Upload progress: {uploadPct}%
            </p>
          </div>

          <div className="actions" style={{ marginTop: 16, gap: 12 }}>
            <button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload and process"}
            </button>

            {resumeAvailable ? (
              <button type="button" className="button secondary" onClick={resetResume}>
                Clear saved resume
              </button>
            ) : null}
          </div>

          {message ? <p className="success">{message}</p> : null}
          {storedPath ? <p className="muted">Stored at: {storedPath}</p> : null}
          {error ? <p className="error">{error}</p> : null}

          <p className="muted" style={{ marginTop: 16 }}>
            You must keep this page open until upload reaches 100%. After that, you can leave and track processing in Jobs.
          </p>
        </form>
      </div>
    </main>
  );
}
