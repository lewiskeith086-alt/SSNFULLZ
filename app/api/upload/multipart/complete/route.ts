import { completeMultipartUpload } from "@/lib/upload";
import { getCurrentSession } from "@/lib/session";
import { safeJson } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return safeJson({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const key = String(body.key || "").trim();
  const uploadId = String(body.uploadId || "").trim();
  const parts = Array.isArray(body.parts) ? body.parts : [];

  if (!key || !uploadId || parts.length === 0) {
    return safeJson({ error: "key, uploadId and parts are required" }, { status: 400 });
  }

  try {
    const result = await completeMultipartUpload({
      key,
      uploadId,
      parts,
    });

    return safeJson({
      ok: true,
      storedPath: result.storedPath,
      publicUrl: result.publicUrl,
    });
  } catch (e: any) {
    return safeJson({ error: e?.message || "Failed to complete multipart upload" }, { status: 500 });
  }
}
