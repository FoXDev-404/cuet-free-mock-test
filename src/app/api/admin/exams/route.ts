import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  category: z.enum(["CUET_UG", "CUET_PG", "OTHER"]).default("CUET_UG"),
  description: z.string().max(2000).optional(),
  syllabusVersion: z.string().max(120).optional(),
  instructions: z.string().max(5000).optional(),
  defaultDurationMinutes: z.number().int().min(1).max(600).default(60),
  defaultMarksCorrect: z.number().int().min(0).max(50).default(5),
  defaultMarksNegative: z.number().int().min(0).max(50).default(1),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  years: z.array(z.number().int().min(1990).max(2100)).optional(),
});

export async function GET() {
  const g = await requirePermission("ACADEMIC_READ");
  if (g.error) return g.error;
  try {
    const exams = await prisma.exam.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { _count: { select: { subjects: true, questions: true, years: true } } },
    });
    return NextResponse.json(exams);
  } catch (e) {
    console.error("admin exams GET", e);
    return NextResponse.json({ error: "Failed to load exams" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const g = await requirePermission("ACADEMIC_WRITE");
  if (g.error) return g.error;
  try {
    const body = await req.json();
    const { years, ...data } = createSchema.parse(body);
    const exam = await prisma.exam.create({ data });
    if (years?.length) {
      await prisma.examYear.createMany({
        data: years.map((year) => ({
          examId: exam.id,
          year,
          syllabusVersion: exam.syllabusVersion,
        })),
      });
    }
    await writeAudit({ session: g.session, action: "EXAM_CREATE", entityType: "EXAM", entityId: exam.id, afterData: exam });
    return NextResponse.json(exam, { status: 201 });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Exam code already exists" }, { status: 409 });
    }
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error("admin exams POST", e);
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
  }
}
