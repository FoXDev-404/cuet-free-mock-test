import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Partial update — only provided fields are committed.
const updateSchema = z
  .object({
    subjectId: z.string().min(1).optional(),
    chapterId: z.string().nullable().optional(),
    type: z.string().optional(),
    stemEn: z.string().min(1).optional(),
    stemHi: z.string().nullable().optional(),
    optionsEn: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
    optionsHi: z.array(z.object({ id: z.string(), text: z.string() })).nullable().optional(),
    correctAnswer: z.string().min(1).optional(),
    explanationEn: z.string().nullable().optional(),
    explanationHi: z.string().nullable().optional(),
    year: z.number().int().nullable().optional(),
    source: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    marks: z.number().int().optional(),
    negativeMarks: z.number().int().optional(),
    isActive: z.boolean().optional(),
    questionNumber: z.number().int().nullable().optional(),
    passageId: z.string().nullable().optional(),
    passageKey: z.string().nullable().optional(),
    sourceCorrectOptionOrder: z.number().int().nullable().optional(),
    sourceAnswerLabel: z.string().nullable().optional(),
    answerReviewStatus: z.enum(["source_key_recorded", "needs_manual_review"]).optional(),
    dataQualityNote: z.string().nullable().optional(),
    sourcePageStart: z.number().int().nullable().optional(),
    sourcePageEnd: z.number().int().nullable().optional(),
    sourcePdfFilename: z.string().nullable().optional(),
  })
  .passthrough();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const question = await prisma.question.update({
      where: { id },
      data: {
        ...(data.subjectId !== undefined ? { subjectId: data.subjectId } : {}),
        ...(data.chapterId !== undefined ? { chapterId: data.chapterId } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.stemEn !== undefined ? { stemEn: data.stemEn } : {}),
        ...(data.stemHi !== undefined ? { stemHi: data.stemHi } : {}),
        ...(data.optionsEn !== undefined ? { optionsEn: JSON.stringify(data.optionsEn) } : {}),
        ...(data.optionsHi !== undefined
          ? { optionsHi: data.optionsHi ? JSON.stringify(data.optionsHi) : null }
          : {}),
        ...(data.correctAnswer !== undefined ? { correctAnswer: data.correctAnswer } : {}),
        ...(data.explanationEn !== undefined ? { explanationEn: data.explanationEn } : {}),
        ...(data.explanationHi !== undefined ? { explanationHi: data.explanationHi } : {}),
        ...(data.year !== undefined ? { year: data.year } : {}),
        ...(data.source !== undefined ? { source: data.source } : {}),
        ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
        ...(data.marks !== undefined ? { marks: data.marks } : {}),
        ...(data.negativeMarks !== undefined ? { negativeMarks: data.negativeMarks } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.questionNumber !== undefined ? { questionNumber: data.questionNumber } : {}),
        ...(data.passageId !== undefined ? { passageId: data.passageId } : {}),
        ...(data.passageKey !== undefined ? { passageKey: data.passageKey } : {}),
        ...(data.sourceCorrectOptionOrder !== undefined
          ? { sourceCorrectOptionOrder: data.sourceCorrectOptionOrder }
          : {}),
        ...(data.sourceAnswerLabel !== undefined
          ? { sourceAnswerLabel: data.sourceAnswerLabel }
          : {}),
        ...(data.answerReviewStatus !== undefined
          ? { answerReviewStatus: data.answerReviewStatus }
          : {}),
        ...(data.dataQualityNote !== undefined ? { dataQualityNote: data.dataQualityNote } : {}),
        ...(data.sourcePageStart !== undefined ? { sourcePageStart: data.sourcePageStart } : {}),
        ...(data.sourcePageEnd !== undefined ? { sourcePageEnd: data.sourcePageEnd } : {}),
        ...(data.sourcePdfFilename !== undefined
          ? { sourcePdfFilename: data.sourcePdfFilename }
          : {}),
      },
      select: { id: true },
    });

    return NextResponse.json({ id: question.id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("admin question PATCH error", e);
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    // Remove dependent rows first (no DB-level cascade on all relations in D1).
    await prisma.questionAttempt.deleteMany({ where: { questionId: id } });
    await prisma.questionReview.deleteMany({ where: { questionId: id } });
    await prisma.bookmark.deleteMany({ where: { questionId: id } });
    await prisma.testQuestionLink.deleteMany({ where: { questionId: id } });
    await prisma.question.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin question DELETE error", e);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
