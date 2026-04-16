import { db } from "../lib/db";
import { downloadTextFromR2 } from "../lib/upload";

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

async function processJob(jobId: string) {
  const job = await db.importJob.findUnique({
    where: { id: jobId },
  });

  if (!job) return;

  await db.importJob.update({
    where: { id: job.id },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      errorMessage: null,
    },
  });

  await db.dataset.update({
    where: { id: job.datasetId },
    data: {
      status: "PROCESSING",
    },
  });

  try {
    const csvText = await downloadTextFromR2(job.storedPath);
    const lines = parseLines(csvText);

    if (lines.length < 2) {
      throw new Error("CSV contains no data rows");
    }

    const dataLines = lines.slice(1);
    const totalRows = dataLines.length;
    const BATCH_SIZE = 500;

    let batch: Array<Record<string, unknown>> = [];
    let processed = 0;
    let inserted = 0;

    for (let index = 0; index < dataLines.length; index++) {
      const line = dataLines[index];
      if (!line.trim()) continue;

      const cols = splitCsvLine(line);
      const dobRaw = clean(cols[5]);

      batch.push({
        datasetId: job.datasetId,
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
      });

      processed++;

      if (batch.length >= BATCH_SIZE) {
        await db.record.createMany({
          data: batch as any,
        });

        inserted += batch.length;
        batch = [];

        await db.importJob.update({
          where: { id: job.id },
          data: {
            totalRows,
            rowsParsed: processed,
            rowsImported: inserted,
            progressPct: Math.floor((processed / totalRows) * 100),
          },
        });

        console.log(`Job ${job.id}: ${inserted}/${totalRows}`);
      }
    }

    if (batch.length > 0) {
      await db.record.createMany({
        data: batch as any,
      });

      inserted += batch.length;
    }

    await db.dataset.update({
      where: { id: job.datasetId },
      data: {
        rowCount: { increment: inserted },
        lastImportAt: new Date(),
        status: "READY",
      },
    });

    await db.importJob.update({
      where: { id: job.id },
      data: {
        totalRows,
        rowsParsed: processed,
        rowsImported: inserted,
        progressPct: 100,
        status: "COMPLETED",
        finishedAt: new Date(),
      },
    });

    console.log(`Job ${job.id} completed: ${inserted}/${totalRows}`);
  } catch (e: any) {
    await db.dataset.update({
      where: { id: job.datasetId },
      data: {
        status: "READY",
      },
    });

    await db.importJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: String(e?.message || "Unknown import error"),
        finishedAt: new Date(),
      },
    });

    console.error(`Job ${job.id} failed:`, e);
  }
}

async function poll() {
  const job = await db.importJob.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
  });

  if (!job) {
    console.log("No queued jobs");
    return;
  }

  await processJob(job.id);
}

async function main() {
  console.log("Import worker started");

  while (true) {
    try {
      await poll();
    } catch (e) {
      console.error("Worker poll error:", e);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

main().catch((e) => {
  console.error("Worker fatal error:", e);
  process.exit(1);
});