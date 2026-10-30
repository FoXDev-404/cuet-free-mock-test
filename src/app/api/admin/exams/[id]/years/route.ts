import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  year: z.number().int().min(1990).max(2100),
  syllabusVersion: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const g = await requirePermission("ACADEMIC_READ");
  if (g.error) return g.error;
  const { id } = await params;
  const years = await prisma.examYear.findMany({
    where: { examId: id },
    orderBy: { year: "desc" },
  });
  return NextResponse.json(years);
}

export async function POST(req: Request, { params }: Ctx) {
  const g = await requirePermission("ACADEMIC_WRITE");
  if (g.error) return g.error;
  const { id } = await params;
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const exam = await prisma.exam.findUnique({ where: { id }, select: { syllabusVersion: true, defaultDurationMinutes: true } });
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    const yr = await prisma.examYear.create({
      data: { examId: id, ...data, syllabusVersion: data.syllabusVersion ?? exam.syllabusVersion },
    });
    await writeAudit({ session: g.session, action: "EXAM_YEAR_CREATE", entityType: "EXAM_YEAR", entityId: yr.id, afterData: yr });
    return NextResponse.json(yr, { status: 201 });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Year already exists for this exam" }, { status: 409 });
    }
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error("admin exam years POST", e);
    return NextResponse.json({ error: "Failed to add year" }, { status: 500 });
  }
}
