import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guard";
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
    type: z.string().default("MCQ"),
    stemEn: z.string().min(1),
    stemHi: z.string().optional().nullable(),
    optionsEn: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
    optionsHi: z.array(z.object({ id: z.string(), text: z.string() })).optional().nullable(),
    correctAnswer: z.string().min(1),
    explanationEn: z.string().optional().nullable(),
    explanationHi: z.string().optional().nullable(),
    year: z.number().int().optional().nullable(),
    source: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
    marks: z.number().int().default(1),
    negativeMarks: z.number().int().default(0),
    isActive: z.boolean().default(true),
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
    const search = searchParams.get("search") || undefined;
    const reviewStatus = searchParams.get("reviewStatus") || undefined;
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {
      ...(subjectId ? { subjectId } : {}),
      ...(search ? { stemEn: { contains: search } } : {}),
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
          marks: true,
          negativeMarks: true,
          isActive: true,
          explanationEn: true,
          passage: { select: { passageKey: true, title: true } },
          subject: { select: { id: true, name: true, code: true } },
          chapter: { select: { id: true, name: true } },
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
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await req.json();
    const q = questionCreateSchema.parse(body);

    // Auto-generate option ids when not provided, in the same format the
    // English mock client uses: opt-<questionId>-<order>
    const created = await prisma.question.create({
      data: {
        subjectId: q.subjectId,
        chapterId: q.chapterId ?? undefined,
        type: q.type,
        stemEn: q.stemEn,
        stemHi: q.stemHi,
        optionsEn: q.optionsEn
          ? JSON.stringify(q.optionsEn)
          : JSON.stringify([]),
        optionsHi: q.optionsHi ? JSON.stringify(q.optionsHi) : null,
        correctAnswer: q.correctAnswer,
        explanationEn: q.explanationEn,
        explanationHi: q.explanationHi,
        year: q.year,
        source: q.source ?? "admin",
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

    if (!q.optionsEn || q.optionsEn.length === 0) {
      // Give a bare multiple-choice question 4 placeholder options so the UI
      // can edit them right away.
      const options = ["A", "B", "C", "D"].map((label, i) => ({
        id: `opt-${created.id}-${i + 1}`,
        text: `Option ${label}`,
      }));
      await prisma.question.update({
        where: { id: created.id },
        data: { optionsEn: JSON.stringify(options) },
      });
    }

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("admin questions POST error", e);
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
  }
}
