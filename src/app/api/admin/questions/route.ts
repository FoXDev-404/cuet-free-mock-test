import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requirePermission, writeAudit } from "@/lib/auth/guard";
import { syncQuestionOptions, setCorrectOptions, snapshotQuestionVersion, isCorrectChoice, actorEmailOf, type OptionInput } from "@/lib/admin/question-sync";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Question shape used by the admin panel (GET list + single create).
const englishFields = {
  questionNumber: z.number().int().optional().nullable(),
  passageId: z.string().optional().nullable(),
  passageKey: z.string().optional().nullable(),
  sourceCorrectOptionOrder: z.number().int().optional().nullable(),
  sourceAnswerLabel: z.string().optional().nullable(),
  answerReviewStatus: z.enum(["source_key_recorded", "needs_manual_review"]).optional(),
  dataQualityNote: z.string().optional().nullable(),
  sourcePageStart: z.number().int().optional().nullable(),
  sourcePageEnd: z.number().int().optional().nullable(),
  sourcePdfFilename: z.string().optional().nullable(),
} as const;

const questionCreateSchema = z
  .object({
    subjectId: z.string().min(1),
    chapterId: z.string().optional().nullable(),
    topicId: z.string().optional().nullable(),
    externalId: z.string().max(120).optional().nullable(),
    type: z.string().default("MCQ"),
    stemEn: z.string().min(1),
    stemHi: z.string().optional().nullable(),
    richTextEn: z.string().optional().nullable(),
    optionsEn: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
    optionsHi: z.array(z.object({ id: z.string(), text: z.string() })).optional().nullable(),
    correctAnswer: z.string().min(1),
    explanationEn: z.string().optional().nullable(),
    explanationHi: z.string().optional().nullable(),
    questionImages: z.array(z.object({ url: z.string(), alt: z.string().optional() })).optional(),
    language: z.enum(["EN", "HI"]).default("EN"),
    // Workflow status: unverified imports must never auto-publish (spec §6).
    status: z.enum(["DRAFT", "PENDING_VALIDATION", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED", "REJECTED"]).default("DRAFT"),
    year: z.number().int().optional().nullable(),
    source: z.string().optional(),
    paperShift: z.string().optional().nullable(),
    difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
    marks: z.number().int().default(1),
    negativeMarks: z.number().int().default(0),
    isActive: z.boolean().default(true),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
    ...englishFields,
  })
  .passthrough();

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(searchParams.get("perPage") || "20", 10) || 20, 1), 100);
    const subjectId = searchParams.get("subjectId") || undefined;
    const chapterId = searchParams.get("chapterId") || undefined;
    const topicId = searchParams.get("topicId") || undefined;
    const examId = searchParams.get("examId") || undefined;
    const status = searchParams.get("status") || undefined;
    const type = searchParams.get("type") || undefined;
    const difficulty = searchParams.get("difficulty") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const search = searchParams.get("search") || undefined;
    const reviewStatus = searchParams.get("reviewStatus") || undefined;
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {
      ...(subjectId ? { subjectId } : {}),
      ...(chapterId ? { chapterId } : {}),
      ...(topicId ? { topicId } : {}),
      ...(examId ? { examId } : {}),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(tag ? { tags: { some: { label: tag } } } : {}),
      ...(search ? { OR: [{ stemEn: { contains: search } }, { externalId: { contains: search } }] } : {}),
      ...(reviewStatus ? { answerReviewStatus: reviewStatus } : {}),
      ...(isActive === "true" ? { isActive: true } : isActive === "false" ? { isActive: false } : {}),
    };

    const [total, questions] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { questionNumber: "asc" }],
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          questionNumber: true,
          externalId: true,
          type: true,
          status: true,
          stemEn: true,
          optionsEn: true,
          correctAnswer: true,
          sourceAnswerLabel: true,
          sourceCorrectOptionOrder: true,
          answerReviewStatus: true,
          dataQualityNote: true,
          difficulty: true,
          year: true,
          source: true,
          paperShift: true,
          marks: true,
          negativeMarks: true,
          isActive: true,
          version: true,
          explanationEn: true,
          topicId: true,
          passage: { select: { passageKey: true, title: true } },
          subject: { select: { id: true, name: true, code: true } },
          chapter: { select: { id: true, name: true } },
          topic: { select: { id: true, name: true } },
          tags: { select: { label: true } },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      perPage,
      pages: Math.max(Math.ceil(total / perPage), 1),
      questions: questions.map((q) => ({
        ...q,
        optionsEn: typeof q.optionsEn === "string" ? JSON.parse(q.optionsEn) : q.optionsEn,
      })),
    });
  } catch (e) {
    console.error("admin questions GET error", e);
    return NextResponse.json({ error: "Failed to list questions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requirePermission("QUESTION_WRITE");
  if (guard.error) return guard.error;

  try {
    const body = await req.json();
    const q = questionCreateSchema.parse(body);

    // Unreviewed imports route through IMPORT_RUN; UI creates default to DRAFT
    // and must never silently publish (spec §6).
    const subject = await prisma.subject.findUnique({ where: { id: q.subjectId }, select: { examId: true } });

    const created = await prisma.question.create({
      data: {
        subjectId: q.subjectId,
        chapterId: q.chapterId ?? undefined,
        topicId: q.topicId ?? undefined,
        examId: subject?.examId ?? undefined,
        externalId: q.externalId ?? undefined,
        type: q.type,
        stemEn: q.stemEn,
        stemHi: q.stemHi,
        richTextEn: q.richTextEn,
        optionsEn: q.optionsEn ? JSON.stringify(q.optionsEn) : JSON.stringify([]),
        optionsHi: q.optionsHi ? JSON.stringify(q.optionsHi) : null,
        correctAnswer: q.correctAnswer,
        explanationEn: q.explanationEn,
        explanationHi: q.explanationHi,
        questionImages: q.questionImages ? JSON.stringify(q.questionImages) : null,
        language: q.language,
        status: q.status,
        year: q.year,
        source: q.source ?? "admin",
        paperShift: q.paperShift ?? undefined,
        difficulty: q.difficulty,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        isActive: q.isActive,
        questionNumber: q.questionNumber ?? undefined,
        passageId: q.passageId ?? undefined,
        passageKey: q.passageKey ?? undefined,
        sourceCorrectOptionOrder: q.sourceCorrectOptionOrder ?? undefined,
        sourceAnswerLabel: q.sourceAnswerLabel ?? undefined,
        answerReviewStatus: q.answerReviewStatus ?? undefined,
        dataQualityNote: q.dataQualityNote ?? undefined,
        sourcePageStart: q.sourcePageStart ?? undefined,
        sourcePageEnd: q.sourcePageEnd ?? undefined,
        sourcePdfFilename: q.sourcePdfFilename ?? undefined,
      },
    });

    // Normalized options + write-through JSON cache.
    const optionInput: OptionInput[] = q.optionsEn?.length
      ? q.optionsEn
      : ["A", "B", "C", "D"].map((label) => ({ id: "", text: `Option ${label}` }));
    const optionIds = await syncQuestionOptions(created.id, optionInput);
    const correctIds = optionIds.filter((optionId) => isCorrectChoice(optionId, q.correctAnswer));
    await setCorrectOptions(created.id, correctIds);

    // Also keep the JSON cache aligned with resolved option ids.
    const resolvedOptions = optionInput.map((o, i) => ({ id: optionIds[i], text: o.text }));
    await prisma.question.update({
      where: { id: created.id },
      data: {
        optionsEn: JSON.stringify(resolvedOptions),
        correctAnswer: correctIds[0] ? correctIds[0] : q.correctAnswer,
      },
    });

    if (q.tags?.length) {
      await prisma.questionTag.createMany({
        data: q.tags.map((label) => ({ questionId: created.id, label })),
      });
    }

    await snapshotQuestionVersion(created.id, actorEmailOf(guard.session), "created");
    await writeAudit({ session: guard.session, action: "QUESTION_CREATE", entityType: "QUESTION", entityId: created.id, afterData: { stem: q.stemEn, status: q.status } });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("admin questions POST error", e);
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
  }
}
