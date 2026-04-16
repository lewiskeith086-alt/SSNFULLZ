import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { safeJson } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return safeJson({ error: "Admin access required" }, { status: 403 });
  }

  const form = await req.formData();
  const datasetId = String(form.get("datasetId") || "");
  const storedPath = String(form.get("storedPath") || "");
  const fileName = String(form.get("fileName") || "upload.csv");

  if (!datasetId) {
    return safeJson({ error: "Dataset is required" }, { status: 400 });
  }

  if (!storedPath) {
    return safeJson({ error: "Missing storedPath" }, { status: 400 });
  }

  const dataset = await db.dataset.findUnique({ where: { id: datasetId } });
  if (!dataset) {
    return safeJson({ error: "Dataset not found" }, { status: 404 });
  }

  try {
    const job = await db.importJob.create({
      data: {
        datasetId,
        uploadedById: session.sub,
        fileName,
        storedPath,
        status: "QUEUED",
      },
    });

    return safeJson({
      ok: true,
      queued: true,
      jobId: job.id,
      storedPath,
    });
  } catch (e: any) {
    return safeJson({ error: e?.message || "Failed to queue job" }, { status: 500 });
  }
}
