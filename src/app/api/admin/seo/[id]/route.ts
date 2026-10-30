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
    await prisma.pageSeo.delete({ where: { id } });
    await writeAudit({
      session: g.session,
      action: "PAGE_SEO_DELETE",
      entityType: "PAGE_SEO",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError("admin/seo/[id]", error);
    return NextResponse.json({ error: "Failed to delete SEO override" }, { status: 500 });
  }
}
