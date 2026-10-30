import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { logApiError } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  body: z.string().trim().min(1).max(2000).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const g = await requirePermission("CONTENT_WRITE");
  if (g.error) return g.error;
  try {
    const { id } = await context.params;
    const input = schema.parse(await req.json());
    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.startsAt !== undefined
          ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
          : {}),
        ...(input.endsAt !== undefined
          ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await writeAudit({
      session: g.session,
      action: "ANNOUNCEMENT_UPDATE",
      entityType: "ANNOUNCEMENT",
      entityId: id,
      afterData: { title: updated.title, isActive: updated.isActive },
    });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("admin/announcements/[id]", error, req);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const g = await requirePermission("CONTENT_WRITE");
  if (g.error) return g.error;
  try {
    const { id } = await context.params;
    await prisma.announcement.delete({ where: { id } });
    await writeAudit({
      session: g.session,
      action: "ANNOUNCEMENT_DELETE",
      entityType: "ANNOUNCEMENT",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError("admin/announcements/[id]", error);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
