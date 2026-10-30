import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  code: z.string().min(1).max(20).toUpperCase().optional(),
  sectionType: z.enum(["LANGUAGE", "DOMAIN", "GENERAL_TEST"]).optional(),
  description: z.string().max(1000).nullable().optional(),
  examId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

/** Safe-move guard: PATCH may re-parent (examId) but never orphans questions. */
export async function GET(_req: Request, { params }: Ctx) {
  const g = await requirePermission("ACADEMIC_READ");
  if (g.error) return g.error;
  const { id } = await params;
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      chapters: { orderBy: { order: "asc" }, include: { _count: { select: { questions: true, topics: true } } } },
      _count: { select: { questions: true, tests: true } },
    },
  });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  return NextResponse.json(subject);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requirePermission("ACADEMIC_WRITE");
  if (g.error) return g.error;
  const { id } = await params;
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const before = await prisma.subject.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    const subject = await prisma.subject.update({ where: { id }, data });
    await writeAudit({ session: g.session, action: "SUBJECT_UPDATE", entityType: "SUBJECT", entityId: id, beforeData: before, afterData: subject });
    return NextResponse.json(subject);
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error("admin subject PATCH", e);
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
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
    const deps = await prisma.subject.findUnique({
      where: { id },
      select: { _count: { select: { questions: true, chapters: true, tests: true } } },
    });
    if (!deps) return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    if (deps._count.questions > 0 || deps._count.tests > 0) {
      return NextResponse.json(
        { error: "Subject still has questions/tests. Reassign or archive it instead.", questions: deps._count.questions, chapters: deps._count.chapters, tests: deps._count.tests },
        { status: 409 },
      );
    }
    await prisma.subject.delete({ where: { id } });
    await writeAudit({ session: g.session, action: "SUBJECT_DELETE", entityType: "SUBJECT", entityId: id, reason: confirm });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin subject DELETE", e);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
