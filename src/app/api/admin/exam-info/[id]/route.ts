import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { logApiError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const g = await requirePermission("CONTENT_WRITE");
  if (g.error) return g.error;
  try {
    const { id } = await context.params;
    await prisma.examInfo.delete({ where: { id } });
    await writeAudit({
      session: g.session,
      action: "EXAM_INFO_DELETE",
      entityType: "EXAM_INFO",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError("admin/exam-info/[id]", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
