import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { safeJson } from "@/lib/utils";
import { buildStoredFileName, uploadBufferToR2 } from "@/lib/upload";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return safeJson({ error: "Admin access required" }, { status: 403 });
  }

  const form = await req.formData();
  const datasetId = String(form.get("datasetId") || "");
  const file = form.get("file");

  if (!datasetId) {
    return safeJson({ error: "Dataset is required" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return safeJson({ error: "CSV file is required" }, { status: 400 });
  }

  const dataset = await db.dataset.findUnique({ where: { id: datasetId } });
  if (!dataset) {
    return safeJson({ error: "Dataset not found" }, { status: 404 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileName = buildStoredFileName(file.name || "upload.csv");
  const r2Key = `datasets/${datasetId}/${fileName}`;

  try {
    const uploaded = await uploadBufferToR2({
      key: r2Key,
      body: fileBuffer,
      contentType: file.type || "text/csv",
    });

    const job = await db.importJob.create({
      data: {
        datasetId,
        uploadedById: session.sub,
        fileName: file.name || "upload.csv",
        storedPath: uploaded.storedPath,
        status: "QUEUED",
      },
    });

    return safeJson({
      ok: true,
      queued: true,
      jobId: job.id,
      storedPath: uploaded.storedPath,
      publicUrl: uploaded.publicUrl,
    });
  } catch {
    return safeJson({ error: "Upload failed" }, { status: 500 });
  }
}
