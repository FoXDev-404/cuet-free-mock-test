import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

const questionInclude = {
  subject: { select: { name: true, code: true } },
  chapter: { select: { name: true } },
} as const;

// Key-bearing fields that must never reach the client before submission.
const SECRET_FIELDS = [
  "correctAnswer",
  "sourceCorrectOptionOrder",
  "sourceAnswerLabel",
  "explanationEn",
  "explanationHi",
  "stemHash",
] as const;

function stripKey<T extends Record<string, unknown>>(q: T): T {
  const copy = { ...q };
  for (const f of SECRET_FIELDS) delete copy[f];
  return copy;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId");
    const slug = searchParams.get("slug");
    const subjectId = searchParams.get("subjectId");
    const chapterId = searchParams.get("chapterId");
    const source = searchParams.get("source");
    const year = searchParams.get("year");
    const difficulty = searchParams.get("difficulty");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10) || 50, 500);

    // Study mode: answer keys / explanations for the PYQ study UI. Only logged
    // in users may use it, and only for paper questions with recorded keys —
    // unreviewed imports never expose their keys (spec §6).
    const study = searchParams.get("study") === "1";
    let studyMode = false;
    if (study) {
      const session = await getServerSession(authOptions);
      studyMode = Boolean(session?.user);
    }

    const where = {
      isActive: true,
      ...(subjectId ? { subjectId } : {}),
      ...(chapterId ? { chapterId } : {}),
      // "pyq" is a synthetic selector (prev-year questions attached to an exam
      // paper), not a literal source string — rows carry paper labels like
      // "CUET UG English 2025 Shift 1".
      ...(source
        ? source.toLowerCase() === "pyq"
          ? { examId: { not: null }, year: { not: null } }
          : { source }
        : {}),
      ...(year ? { year: parseInt(year, 10) } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(search ? { stemEn: { contains: search } } : {}),
    };

    let questions: Prisma.QuestionGetPayload<{ include: typeof questionInclude }>[] = [];

    if (slug) {
      const test = await prisma.test.findUnique({
        where: { slug },
        include: {
          questions: {
            include: { question: { include: questionInclude } },
            orderBy: { order: "asc" },
          },
        },
      });
      if (!test) return NextResponse.json([]);
      questions = test.questions.map((l) => l.question);
    } else if (testId) {
      const links = await prisma.testQuestionLink.findMany({
        where: { testId },
        orderBy: { order: "asc" },
        include: { question: { include: questionInclude } },
        take: limit,
      });
      questions = links.map((l) => l.question);
    } else {
      questions = await prisma.question.findMany({
        where,
        include: questionInclude,
        orderBy: [{ year: "desc" }, { createdAt: "asc" }],
        take: limit,
      });
    }

    const parsed = questions.map((q) => {
      // Keys are never included for: unreviewed PYQ rows, and always excluded
      // in default (exam) mode; study mode unlocks recorded keys only.
      const reviewable =
        studyMode &&
        q.answerReviewStatus === "source_key_recorded" &&
        Boolean(q.correctAnswer);
      const keyless = stripKey(q);
      const { subject, chapter, ...rest } = keyless;
      if (!reviewable) delete (rest as Record<string, unknown>).explanationEn;
      if (!reviewable) delete (rest as Record<string, unknown>).explanationHi;
      return {
        ...rest,
        subject: subject?.name ?? null,
        subjectCode: subject?.code ?? null,
        topic: chapter?.name ?? null,
        optionsEn:
          typeof q.optionsEn === "string" ? JSON.parse(q.optionsEn) : q.optionsEn,
        optionsHi: q.optionsHi
          ? typeof q.optionsHi === "string"
            ? JSON.parse(q.optionsHi)
            : q.optionsHi
          : null,
        // Present only when legitimately revealed to this caller.
        ...(reviewable
          ? { correctAnswer: q.correctAnswer, explanationEn: q.explanationEn, explanationHi: q.explanationHi }
          : {}),
      };
    });

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("questions API error", e);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
