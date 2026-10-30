import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  category: z.enum(["CUET_UG", "CUET_PG", "OTHER"]).optional(),
  description: z.string().max(2000).nullable().optional(),
  logoUrl: z.string().url().max(300).nullable().optional(),
  coverImageUrl: z.string().url().max(300).nullable().optional(),
  syllabusVersion: z.string().max(120).nullable().optional(),
  instructions: z.string().max(5000).nullable().optional(),
  defaultDurationMinutes: z.number().int().min(1).max(600).optional(),
  defaultMarksCorrect: z.number().int().min(0).max(50).optional(),
  defaultMarksNegative: z.number().int().min(0).max(50).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePermission("ACADEMIC_READ");
  if (g.error) return g.error;
  const { id } = await params;
  try {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        years: { orderBy: { year: "asc" } },
        subjects: { orderBy: { order: "asc" }, include: { _count: { select: { chapters: true, questions: true } } } },
        _count: { select: { questions: true } },
      },
    });
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    return NextResponse.json(exam);
  } catch (e) {
    console.error("admin exam GET", e);
    return NextResponse.json({ error: "Failed to load exam" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePermission("ACADEMIC_WRITE");
  if (g.error) return g.error;
  const { id } = await params;
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const before = await prisma.exam.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    const exam = await prisma.exam.update({ where: { id }, data });
    await writeAudit({ session: g.session, action: "EXAM_UPDATE", entityType: "EXAM", entityId: id, beforeData: before, afterData: exam });
    return NextResponse.json(exam);
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error("admin exam PATCH", e);
    return NextResponse.json({ error: "Failed to update exam" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePermission("ACADEMIC_WRITE");
  if (g.error) return g.error;
  const { id } = await params;
  const reason = new URL(req.url).searchParams.get("confirm");
  if (reason !== "yes") {
    return NextResponse.json({ error: "Refusing destructive delete without ?confirm=yes" }, { status: 400 });
  }
  try {
    const deps = await prisma.exam.findUnique({
      where: { id },
      select: { _count: { select: { subjects: true, questions: true } } },
    });
    if (!deps) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    if (deps._count.subjects > 0 || deps._count.questions > 0) {
      return NextResponse.json(
        { error: "Exam still has dependent subjects/questions — migrate or reassign them first.", subjects: deps._count.subjects, questions: deps._count.questions },
        { status: 409 },
      );
    }
    await prisma.exam.delete({ where: { id } });
    await writeAudit({ session: g.session, action: "EXAM_DELETE", entityType: "EXAM", entityId: id, reason });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin exam DELETE", e);
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 });
  }
}
