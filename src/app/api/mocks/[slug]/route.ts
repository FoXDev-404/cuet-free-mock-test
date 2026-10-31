import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalPaperSummary, getLocalPaperTakeData } from "@/lib/local-papers";

export const dynamic = "force-dynamic";

// Never ship answer keys or explanations with a pre-attempt preview.
const SECRET_FIELDS = [
  "correctAnswer",
  "sourceCorrectOptionOrder",
  "sourceAnswerLabel",
  "sourceCorrectOptionOrder",
  "explanationEn",
  "explanationHi",
  "stemHash",
] as const;

/**
 * Blueprint alias: GET /api/mocks/{slug}
 * Public mock detail/preview without private answer keys.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const local = getLocalPaperSummary(slug);
    if (local) {
      const takeData = getLocalPaperTakeData(slug);
      return NextResponse.json({
        mock: local,
        previewQuestions: (takeData?.questions ?? []).slice(0, 5),
        source: "repo",
      });
    }

    const test = await prisma.test.findUnique({
      where: { slug, status: "PUBLISHED", isPublic: true },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { questions: true, attempts: true } },
        questions: {
          orderBy: { order: "asc" },
          take: 5,
          include: { question: { include: { passage: true } } },
        },
      },
    });
    if (!test) return NextResponse.json({ error: "Mock not found" }, { status: 404 });

    const { questions, _count, ...meta } = test;
    const previewQuestions = questions.map((link) => {
      const question = { ...link.question, optionsEn: safeJson(link.question.optionsEn) } as Record<string, unknown>;
      for (const field of SECRET_FIELDS) delete question[field];
      return question;
    });

    return NextResponse.json({
      mock: {
        ...meta,
        questionCount: _count.questions,
        attemptsCount: _count.attempts,
      },
      previewQuestions,
      source: "d1",
    });
  } catch (error) {
    console.error("mock detail API error", error);
    return NextResponse.json({ error: "Failed to load mock" }, { status: 500 });
  }
}

function safeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
