import { buildStoredFileName, createMultipartUpload } from "@/lib/upload";
import { getCurrentSession } from "@/lib/session";
import { safeJson } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return safeJson({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const fileName = String(body.fileName || "").trim();
  const datasetId = String(body.datasetId || "").trim();
  const contentType = String(body.contentType || "text/csv");

  if (!fileName || !datasetId) {
    return safeJson({ error: "fileName and datasetId are required" }, { status: 400 });
  }

  const safeName = buildStoredFileName(fileName);
  const key = `datasets/${datasetId}/${safeName}`;

  try {
    const result = await createMultipartUpload({
      key,
      contentType,
    });

    return safeJson({
      ok: true,
      key: result.key,
      uploadId: result.uploadId,
      storedPath: result.storedPath,
    });
  } catch (e: any) {
    return safeJson({ error: e?.message || "Failed to initiate upload" }, { status: 500 });
  }
}
