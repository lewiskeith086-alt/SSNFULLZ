import { getMultipartPartUploadUrl } from "@/lib/upload";
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
  const partNumber = Number(body.partNumber || 0);

  if (!key || !uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
    return safeJson({ error: "key, uploadId and valid partNumber are required" }, { status: 400 });
  }

  try {
    const uploadUrl = await getMultipartPartUploadUrl({
      key,
      uploadId,
      partNumber,
    });

    return safeJson({
      ok: true,
      uploadUrl,
    });
  } catch (e: any) {
    return safeJson({ error: e?.message || "Failed to sign part" }, { status: 500 });
  }
}
