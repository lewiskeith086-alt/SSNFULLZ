import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { safeJson } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();

  if (!session || session.role !== "ADMIN") {
    return safeJson({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await context.params;

  const dataset = await db.dataset.findUnique({
    where: { id },
  });

  if (!dataset) {
    return safeJson({ error: "Dataset not found" }, { status: 404 });
  }

  await db.dataset.delete({
    where: { id },
  });

  return safeJson({ ok: true });
}