import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOption: z.string().nullable(),
    })
  ),
  timeSpentSec: z.number().default(0),
});

export const dynamic = "force-dynamic";

// Option ids are generated as `opt-<questionId>-<order>` (see seed script).
// The answer key is stored as the source label (A/B/C/D) and order (1..4),
// so scoring parses the order out of the selected option id.
const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

function optionOrderFromId(optionId: string): number | null {
  const last = optionId.split("-").pop();
  if (!last) return null;
  const order = parseInt(last, 10);
  return Number.isNaN(order) ? null : order;
}

function labelForOrder(order: number | null): string | null {
  if (order === null) return null;
  return OPTION_LABELS[order - 1] ?? String(order);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = submitSchema.parse(body);

    const answerMap = new Map(parsed.answers.map((a) => [a.questionId, a.selectedOption]));

    // Load all questions WITH answer key fields (server-side only)
    const questions = await prisma.question.findMany({
      where: {
        subject: { code: "ENG" },
        isActive: true,
      },
      orderBy: { questionNumber: "asc" },
      select: {
        id: true,
        questionNumber: true,
        correctAnswer: true,
        answerReviewStatus: true,
        explanationEn: true,
        dataQualityNote: true,
        sourceCorrectOptionOrder: true,
        sourceAnswerLabel: true,
        marks: true,
        negativeMarks: true,
        passage: {
          select: { passageKey: true, title: true },
        },
      },
    });

    if (questions.length !== 50) {
      return NextResponse.json(
        { error: `Expected 50 questions, found ${questions.length}` },
        { status: 500 }
      );
    }

    let verifiedCorrect = 0;
    let verifiedIncorrect = 0;
    let verifiedUnattempted = 0;
    let totalAttempted = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;

    const results = questions.map((q) => {
      const selected = answerMap.get(q.id);
      const isAnswered = selected !== null && selected !== undefined && selected !== "";
      const selectedOrder = isAnswered ? optionOrderFromId(selected) : null;
      const selectedLabel = isAnswered ? (labelForOrder(selectedOrder) ?? selected) : null;
      const isCorrect = isAnswered && selectedOrder !== null && selectedOrder === q.sourceCorrectOptionOrder;
      const isFlagged = q.answerReviewStatus === "needs_manual_review";

      if (isAnswered) totalAttempted++;
      if (isCorrect) totalCorrect++;
      if (isAnswered && !isCorrect) totalIncorrect++;

      if (!isFlagged) {
        if (isCorrect) verifiedCorrect++;
        else if (isAnswered) verifiedIncorrect++;
        else verifiedUnattempted++;
      }

      return {
        questionNumber: q.questionNumber,
        questionId: q.id,
        selectedOption: selectedLabel,
        selectedOptionId: selected ?? null,
        isCorrect: isFlagged ? null : isCorrect,
        isPendingReview: isFlagged,
        correctAnswer: isFlagged ? null : q.correctAnswer,
        explanation: isFlagged ? null : q.explanationEn ?? null,
        dataQualityNote: isFlagged ? q.dataQualityNote : null,
        passageKey: q.passage?.passageKey ?? null,
        passageTitle: q.passage?.title ?? null,
      };
    });

    const marksCorrect = 1;
    const marksIncorrect = 0;
    const pendingReviewCount = questions.filter(
      (q) => q.answerReviewStatus === "needs_manual_review"
    ).length;
    const verifiedMaxScore = questions.length - pendingReviewCount;
    const verifiedRawScore = verifiedCorrect * marksCorrect - verifiedIncorrect * marksIncorrect;

    const attemptData = {
      totalQuestions: questions.length,
      attempted: totalAttempted,
      unanswered: questions.length - totalAttempted,
      correct: totalCorrect,
      incorrect: totalIncorrect,
      reviewFlagged: pendingReviewCount,
      verifiedCorrect,
      verifiedIncorrect,
      verifiedUnattempted,
      verifiedRawScore,
      verifiedMaxScore,
      results,
      timeSpentSec: parsed.timeSpentSec,
    };

    return NextResponse.json(attemptData);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error("english-mock submit API error", e);
    return NextResponse.json({ error: "Failed to submit exam" }, { status: 500 });
  }
}
