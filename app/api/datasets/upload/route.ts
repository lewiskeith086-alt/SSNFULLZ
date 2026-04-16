import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { parseCsv, normalizePhone, safeJson } from "@/lib/utils";
import { buildStoredFileName, uploadBufferToR2 } from "@/lib/upload";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return safeJson({ error: "Admin access required" }, { status: 403 });
  }

  const form = await req.formData();
  const datasetId = String(form.get("datasetId") || "");
  const file = form.get("file");

  if (!datasetId) return safeJson({ error: "Dataset is required" }, { status: 400 });
  if (!(file instanceof File)) return safeJson({ error: "CSV file is required" }, { status: 400 });

  const dataset = await db.dataset.findUnique({ where: { id: datasetId } });
  if (!dataset) return safeJson({ error: "Dataset not found" }, { status: 404 });

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileName = buildStoredFileName(file.name || "upload.csv");
  const r2Key = `datasets/${datasetId}/${fileName}`;

  const job = await db.importJob.create({
    data: {
      datasetId,
      uploadedById: session.sub,
      fileName: file.name || "upload.csv",
      storedPath: `pending://${r2Key}`,
      status: "PROCESSING",
      startedAt: new Date(),
    },
  });

  try {
    const uploaded = await uploadBufferToR2({
      key: r2Key,
      body: fileBuffer,
      contentType: file.type || "text/csv",
    });

    const csvText = fileBuffer.toString("utf8");
    const rows = parseCsv(csvText);

    const records = rows.map((row, index) => ({
      datasetId,
      firstName: row.firstName || null,
      lastName: row.lastName || null,
      birthYear: row.birthYear ? Number(row.birthYear) || null : null,
      phone: row.phone ? normalizePhone(row.phone) : null,
      addressLine1: row.addressLine1 || null,
      city: row.city || null,
      state: row.state || null,
      zipCode: row.zipCode || null,
      sourceRow: index + 2,
    }));

    if (records.length) {
      await db.record.createMany({ data: records });
    }

    await db.dataset.update({
      where: { id: datasetId },
      data: {
        rowCount: { increment: records.length },
        lastImportAt: new Date(),
      },
    });

    await db.importJob.update({
      where: { id: job.id },
      data: {
        storedPath: uploaded.storedPath,
        status: "COMPLETED",
        rowsParsed: rows.length,
        rowsImported: records.length,
        finishedAt: new Date(),
      },
    });

    return safeJson({
      ok: true,
      importedCount: records.length,
      jobId: job.id,
      storedPath: uploaded.storedPath,
      publicUrl: uploaded.publicUrl,
    });
  } catch (e: any) {
    await db.importJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: String(e?.message || "Unknown import error"),
        finishedAt: new Date(),
      },
    });
    return safeJson({ error: "Import failed" }, { status: 500 });
  }
}
