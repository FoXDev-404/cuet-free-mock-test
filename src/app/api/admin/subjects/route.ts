import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(20).toUpperCase(),
  sectionType: z.enum(["LANGUAGE", "DOMAIN", "GENERAL_TEST"]).default("DOMAIN"),
  description: z.string().max(1000).optional(),
  examId: z.string().optional(),
  order: z.number().int().default(0),
});

export async function GET(req: Request) {
  const g = await requirePermission("ACADEMIC_READ");
  if (g.error) return g.error;
  const { searchParams } = new URL(req.url);
  const examId = searchParams.get("examId") ?? undefined;
  try {
    const subjects = await prisma.subject.findMany({
      where: examId ? { examId } : undefined,
      orderBy: [{ order: "asc" }, { code: "asc" }],
      include: {
        _count: { select: { chapters: true, questions: true, tests: true } },
      },
    });
    return NextResponse.json(subjects);
  } catch (e) {
    console.error("admin subjects GET", e);
    return NextResponse.json({ error: "Failed to load subjects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const g = await requirePermission("ACADEMIC_WRITE");
  if (g.error) return g.error;
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    // Default exam: the seeded CUET-UG exam when none supplied.
    const examId =
      data.examId ?? (await prisma.exam.findFirst({ where: { code: "CUET-UG" }, select: { id: true } }))?.id;
    const subject = await prisma.subject.create({ data: { ...data, examId } });
    await writeAudit({ session: g.session, action: "SUBJECT_CREATE", entityType: "SUBJECT", entityId: subject.id, afterData: subject });
    return NextResponse.json(subject, { status: 201 });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Subject code already exists" }, { status: 409 });
    }
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error("admin subjects POST", e);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
