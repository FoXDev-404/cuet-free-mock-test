import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Partial update; `questionIds` (if present) replaces the full question list.
const updateSchema = z
  .object({
    title: z.string().min(1).optional(),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and dashes")
      .optional(),
    type: z.enum(["FULL_LENGTH", "SUBJECT_WISE", "CHAPTER_WISE", "PYQ_YEAR_WISE", "GENERAL_TEST"]).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    subjectId: z.string().nullable().optional(),
    year: z.number().int().nullable().optional(),
    durationMinutes: z.number().int().min(1).optional(),
    totalQuestions: z.number().int().min(0).optional(),
    isPublic: z.boolean().optional(),
    config: z.string().nullable().optional(),
    questionIds: z.array(z.string()).optional(),
  })
  .passthrough();

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        questions: {
          orderBy: { order: "asc" },
          select: { questionId: true, order: true },
        },
      },
    });
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });
    return NextResponse.json({
      ...test,
      questionIds: test.questions.map((l) => l.questionId),
    });
  } catch (e) {
    console.error("admin test GET error", e);
    return NextResponse.json({ error: "Failed to load test" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);
    const { questionIds, ...fields } = data;

    const test = await prisma.test.update({
      where: { id },
      data: {
        ...(fields.title !== undefined ? { title: fields.title } : {}),
        ...(fields.slug !== undefined ? { slug: fields.slug } : {}),
        ...(fields.type !== undefined ? { type: fields.type } : {}),
        ...(fields.status !== undefined ? { status: fields.status } : {}),
        ...(fields.subjectId !== undefined ? { subjectId: fields.subjectId } : {}),
        ...(fields.year !== undefined ? { year: fields.year } : {}),
        ...(fields.durationMinutes !== undefined ? { durationMinutes: fields.durationMinutes } : {}),
        ...(fields.totalQuestions !== undefined ? { totalQuestions: fields.totalQuestions } : {}),
        ...(fields.isPublic !== undefined ? { isPublic: fields.isPublic } : {}),
        ...(fields.config !== undefined ? { config: fields.config ?? "" } : {}),
      },
      select: { id: true },
    });

    if (questionIds) {
      await prisma.testQuestionLink.deleteMany({ where: { testId: id } });
      if (questionIds.length) {
        await prisma.testQuestionLink.createMany({
          data: questionIds.map((questionId, i) => ({ testId: id, questionId, order: i + 1 })),
        });
      }
    }

    return NextResponse.json({ id: test.id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("admin test PATCH error", e);
    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    await prisma.questionAttempt.deleteMany({ where: { attempt: { testId: id } } });
    await prisma.attempt.deleteMany({ where: { testId: id } });
    await prisma.testQuestionLink.deleteMany({ where: { testId: id } });
    await prisma.test.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin test DELETE error", e);
    return NextResponse.json({ error: "Failed to delete test" }, { status: 500 });
  }
}
