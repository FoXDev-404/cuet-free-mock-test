import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and dashes"),
  type: z.enum(["FULL_LENGTH", "SUBJECT_WISE", "CHAPTER_WISE", "PYQ_YEAR_WISE", "GENERAL_TEST"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  subjectId: z.string().optional().nullable(),
  year: z.number().int().optional().nullable(),
  durationMinutes: z.number().int().min(1).default(60),
  totalQuestions: z.number().int().min(0).default(0),
  isPublic: z.boolean().default(true),
  config: z.string().optional().nullable(),
  questionIds: z.array(z.string()).optional(),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const tests = await prisma.test.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { questions: true } },
      },
    });
    return NextResponse.json({ tests });
  } catch (e) {
    console.error("admin tests GET error", e);
    return NextResponse.json({ error: "Failed to list tests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await req.json();
    const t = createSchema.parse(body);

    const existing = await prisma.test.findUnique({ where: { slug: t.slug } });
    if (existing) {
      return NextResponse.json({ error: "A test with this slug already exists" }, { status: 409 });
    }

    const test = await prisma.test.create({
      data: {
        title: t.title,
        slug: t.slug,
        type: t.type,
        status: t.status,
        subjectId: t.subjectId ?? undefined,
        year: t.year ?? undefined,
        durationMinutes: t.durationMinutes,
        totalQuestions: t.totalQuestions,
        isPublic: t.isPublic,
        config: t.config ?? JSON.stringify({ totalQuestions: t.totalQuestions, durationMinutes: t.durationMinutes }),
        questions: t.questionIds?.length
          ? { create: t.questionIds.map((questionId, i) => ({ questionId, order: i + 1 })) }
          : undefined,
      },
      select: { id: true, slug: true },
    });

    return NextResponse.json(test, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("admin tests POST error", e);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}

// PATCH on the collection is not needed; use /api/admin/tests/[id].
export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
