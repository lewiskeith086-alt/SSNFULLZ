import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { safeJson } from "@/lib/utils";
import { buildStoredFileName, uploadBufferToR2 } from "@/lib/upload";

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out;
}

function clean(value: string | undefined): string | null {
  if (value == null) return null;
  const v = value.trim();
  return v === "" ? null : v;
}

function parseLines(csvText: string) {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function birthYearFromRaw(raw: string | null): number | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 4) {
    const year = Number(digits.slice(0, 4));
    return Number.isFinite(year) ? year : null;
  }
  return null;
}

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
    const lines = parseLines(csvText);

    if (lines.length < 2) {
      throw new Error("CSV contains no data rows");
    }

    const dataLines = lines.slice(1);

    const records = dataLines.map((line, index) => {
      const cols = splitCsvLine(line);
      const dobRaw = clean(cols[5]);

      return {
        datasetId,
        externalId: clean(cols[0]),
        firstName: clean(cols[1]),
        lastName: clean(cols[2]),
        middleName: clean(cols[3]),
        prefix: clean(cols[4]),
        dateOfBirthRaw: dobRaw,
        birthYear: birthYearFromRaw(dobRaw),
        addressLine1: clean(cols[6]),
        city: clean(cols[7]),
        county: clean(cols[8]),
        state: clean(cols[9]),
        zipCode: clean(cols[10]),
        phone: clean(cols[11]),
        ssNumber: cols.length > 0 ? clean(cols[cols.length - 1]) : null,
        sourceRow: index + 2,
        rawJson: JSON.stringify({ values: cols }),
      };
    });

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
        rowsParsed: dataLines.length,
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
