import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { safeJson } from "@/lib/utils";

export async function GET() {
  const datasets = await db.dataset.findMany({ select: { id: true, name: true, status: true, rowCount: true }, orderBy: { createdAt: "desc" } });
  return safeJson({ datasets });
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") return safeJson({ error: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim() || null;
  if (name.length < 2) return safeJson({ error: "Invalid dataset input" }, { status: 400 });

  const dataset = await db.dataset.create({
    data: { name, description, uploadedById: session.sub }
  });

  return safeJson({ ok: true, dataset });
}
