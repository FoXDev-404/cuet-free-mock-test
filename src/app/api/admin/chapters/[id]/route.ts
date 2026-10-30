import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).nullable().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requirePermission("ACADEMIC_WRITE");
  if (g.error) return g.error;
  const { id } = await params;
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const before = await prisma.chapter.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    const chapter = await prisma.chapter.update({ where: { id }, data });
    await writeAudit({ session: g.session, action: "CHAPTER_UPDATE", entityType: "CHAPTER", entityId: id, beforeData: before, afterData: chapter });
    return NextResponse.json(chapter);
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error("admin chapter PATCH", e);
    return NextResponse.json({ error: "Failed to update chapter" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const g = await requirePermission("ACADEMIC_WRITE");
  if (g.error) return g.error;
  const { id } = await params;
  const confirm = new URL(req.url).searchParams.get("confirm");
  if (confirm !== "yes") {
    return NextResponse.json({ error: "Refusing destructive delete without ?confirm=yes" }, { status: 400 });
  }
  try {
    const deps = await prisma.chapter.findUnique({
      where: { id },
      select: { _count: { select: { questions: true } } },
    });
    if (!deps) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    if (deps._count.questions > 0) {
      return NextResponse.json(
        { error: "Chapter still has questions — reassign them first.", questions: deps._count.questions },
        { status: 409 },
      );
    }
    await prisma.chapter.delete({ where: { id } });
    await writeAudit({ session: g.session, action: "CHAPTER_DELETE", entityType: "CHAPTER", entityId: id, reason: confirm });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin chapter DELETE", e);
    return NextResponse.json({ error: "Failed to delete chapter" }, { status: 500 });
  }
}
