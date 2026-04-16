import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { safeJson } from "@/lib/utils";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return safeJson({ error: "Authentication required" }, { status: 401 });

  const datasets = await db.dataset.findMany({
    orderBy: { createdAt: "desc" },
  });

  return safeJson({ ok: true, datasets });
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return safeJson({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim() || null;

  if (!name) {
    return safeJson({ error: "Dataset name is required" }, { status: 400 });
  }

  const dataset = await db.dataset.create({
    data: {
      name,
      description,
      uploadedById: session.sub,
    },
  });

  return safeJson({ ok: true, dataset });
}