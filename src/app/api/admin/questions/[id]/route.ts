import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requirePermission, writeAudit } from "@/lib/auth/guard";
import {
  syncQuestionOptions,
  setCorrectOptions,
  snapshotQuestionVersion,
  isCorrectChoice,
  type OptionInput,
} from "@/lib/admin/question-sync";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Partial update — only provided fields are committed.
const updateSchema = z
  .object({
    subjectId: z.string().min(1).optional(),
    chapterId: z.string().nullable().optional(),
    topicId: z.string().nullable().optional(),
    externalId: z.string().max(120).nullable().optional(),
    type: z.string().optional(),
    stemEn: z.string().min(1).optional(),
    stemHi: z.string().nullable().optional(),
    richTextEn: z.string().nullable().optional(),
    optionsEn: z.array(z.object({ id: z.string(), text: z.string(), imageUrl: z.string().optional().nullable(), imageAlt: z.string().optional().nullable() })).optional(),
    optionsHi: z.array(z.object({ id: z.string(), text: z.string() })).nullable().optional(),
    correctAnswer: z.string().min(1).optional(),
    explanationEn: z.string().nullable().optional(),
    explanationHi: z.string().nullable().optional(),
    questionImages: z.array(z.object({ url: z.string(), alt: z.string().optional() })).nullable().optional(),
    explanationImageUrl: z.string().nullable().optional(),
    explanationImageAlt: z.string().nullable().optional(),
    language: z.enum(["EN", "HI"]).optional(),
    status: z
      .enum(["DRAFT", "PENDING_VALIDATION", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED", "REJECTED"])
      .optional(),
    year: z.number().int().nullable().optional(),
    source: z.string().optional(),
    paperShift: z.string().nullable().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    marks: z.number().int().optional(),
    negativeMarks: z.number().int().optional(),
    isActive: z.boolean().optional(),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      tags: { select: { label: true } },
      versions: { orderBy: { versionNo: "desc" }, take: 20, select: { id: true, versionNo: true, reason: true, actorEmail: true, createdAt: true } },
      subject: { select: { id: true, name: true, code: true } },
      chapter: { select: { id: true, name: true } },
      topic: { select: { id: true, name: true } },
      passage: { select: { id: true, title: true, content: true, imageUrl: true, imageAlt: true, sourceNote: true } },
    },
  });
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  return NextResponse.json({
    ...question,
    optionsEn: typeof question.optionsEn === "string" ? JSON.parse(question.optionsEn) : question.optionsEn,
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requirePermission("QUESTION_WRITE");
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);
    const email =
      ((guard.session.user as { email?: string }).email) ?? "admin";

    const before = await prisma.question.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    // Snapshot the pre-change state as a restorable version.
    const snapshotVersion = await snapshotQuestionVersion(id, email, body?.reason ?? "edit");

    const question = await prisma.question.update({
      where: { id },
      data: {
        ...(data.subjectId !== undefined ? { subjectId: data.subjectId } : {}),
        ...(data.chapterId !== undefined ? { chapterId: data.chapterId } : {}),
        ...(data.topicId !== undefined ? { topicId: data.topicId } : {}),
        ...(data.externalId !== undefined ? { externalId: data.externalId } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.stemEn !== undefined ? { stemEn: data.stemEn } : {}),
        ...(data.stemHi !== undefined ? { stemHi: data.stemHi } : {}),
        ...(data.richTextEn !== undefined ? { richTextEn: data.richTextEn } : {}),
        ...(data.optionsEn !== undefined ? { optionsEn: JSON.stringify(data.optionsEn) } : {}),
        ...(data.optionsHi !== undefined
          ? { optionsHi: data.optionsHi ? JSON.stringify(data.optionsHi) : null }
          : {}),
        ...(data.correctAnswer !== undefined ? { correctAnswer: data.correctAnswer } : {}),
        ...(data.explanationEn !== undefined ? { explanationEn: data.explanationEn } : {}),
        ...(data.explanationHi !== undefined ? { explanationHi: data.explanationHi } : {}),
        ...(data.questionImages !== undefined
          ? { questionImages: data.questionImages ? JSON.stringify(data.questionImages) : null }
          : {}),
        ...(data.explanationImageUrl !== undefined
          ? { explanationImageUrl: data.explanationImageUrl }
          : {}),
        ...(data.explanationImageAlt !== undefined
          ? { explanationImageAlt: data.explanationImageAlt }
          : {}),
        ...(data.language !== undefined ? { language: data.language } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.year !== undefined ? { year: data.year } : {}),
        ...(data.source !== undefined ? { source: data.source } : {}),
        ...(data.paperShift !== undefined ? { paperShift: data.paperShift } : {}),
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
      select: { id: true, correctAnswer: true },
    });

    if (data.optionsEn !== undefined) {
      const optionIds = await syncQuestionOptions(id, data.optionsEn as OptionInput[]);
      const correctIds = optionIds.filter((optionId) =>
        isCorrectChoice(optionId, question.correctAnswer),
      );
      await setCorrectOptions(id, correctIds);
      // Keep the JSON cache ids aligned with resolved option ids.
      const options = (data.optionsEn as OptionInput[]).map((o, i) => ({
        id: optionIds[i],
        text: o.text,
        ...(o.imageUrl ? { imageUrl: o.imageUrl, imageAlt: o.imageAlt ?? "Option diagram" } : {}),
      }));
      await prisma.question.update({
        where: { id },
        data: { optionsEn: JSON.stringify(options) },
      });
    } else if (data.correctAnswer !== undefined) {
      // Answer-key change with unchanged options: refresh normalized flags.
      const rows = await prisma.questionOption.findMany({
        where: { questionId: id },
        select: { optionId: true },
      });
      await setCorrectOptions(
        id,
        rows.map((r) => r.optionId).filter((oid) => isCorrectChoice(oid, data.correctAnswer!)),
      );
    }

    if (data.tags !== undefined) {
      await prisma.questionTag.deleteMany({ where: { questionId: id } });
      if (data.tags.length) {
        await prisma.questionTag.createMany({
          data: data.tags.map((label) => ({ questionId: id, label })),
        });
      }
    }

    const answerKeyChanged =
      data.correctAnswer !== undefined && data.correctAnswer !== before.correctAnswer;

    await writeAudit({
      session: guard.session,
      action: answerKeyChanged ? "QUESTION_ANSWER_KEY_CHANGE" : "QUESTION_UPDATE",
      entityType: "QUESTION",
      entityId: id,
      beforeData: {
        stem: before.stemEn,
        correctAnswer: before.correctAnswer,
        status: before.status,
        options: before.optionsEn,
      },
      afterData: { correctAnswer: question.correctAnswer, snapshotVersion },
      reason: body?.reason ?? null,
    });

    return NextResponse.json({ id, snapshotVersion });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("admin question PATCH error", e);
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requirePermission("QUESTION_WRITE");
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    // Legacy endpoint contract (pre-existing admin UI + API callers delete
    // without an explicit confirm); destructive intent is assumed for
    // QUESTION_WRITE holders and every call is audit-logged below.
    const attemptCount = await prisma.questionAttempt.count({ where: { questionId: id } });
    if (attemptCount > 0) {
      // Preserve immutable submission data: archive instead of destroying
      // attempt history (spec §10/§16).
      const archived = await prisma.question.update({
        where: { id },
        data: { isActive: false, status: "ARCHIVED" },
      });
      await writeAudit({
        session: guard.session,
        action: "QUESTION_ARCHIVE",
        entityType: "QUESTION",
        entityId: id,
        reason: `had ${attemptCount} attempt record(s); archived instead of delete`,
      });
      return NextResponse.json({ archived: true, id: archived.id, attemptCount });
    }

    await prisma.questionTag.deleteMany({ where: { questionId: id } });
    await prisma.questionVersion.deleteMany({ where: { questionId: id } });
    await prisma.questionOption.deleteMany({ where: { questionId: id } });
    await prisma.testQuestionLink.deleteMany({ where: { questionId: id } });
    await prisma.bookmark.deleteMany({ where: { questionId: id } });
    await prisma.questionReview.deleteMany({ where: { questionId: id } });
    await prisma.question.delete({ where: { id } });

    await writeAudit({ session: guard.session, action: "QUESTION_DELETE", entityType: "QUESTION", entityId: id, reason: "admin question delete" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin question DELETE error", e);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
