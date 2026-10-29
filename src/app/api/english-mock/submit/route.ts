import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const REVIEW_FLAGGED_QUESTIONS = [8, 32, 41];

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
      const isCorrect = isAnswered && selected === q.correctAnswer;
      const isFlagged = REVIEW_FLAGGED_QUESTIONS.includes(q.questionNumber ?? 0);

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
        selectedOption: selected ?? null,
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
    const verifiedMaxScore = 47;
    const verifiedRawScore = verifiedCorrect * marksCorrect - verifiedIncorrect * marksIncorrect;

    const attemptData = {
      totalQuestions: 50,
      attempted: totalAttempted,
      unanswered: 50 - totalAttempted,
      correct: totalCorrect,
      incorrect: totalIncorrect,
      reviewFlagged: REVIEW_FLAGGED_QUESTIONS.length,
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
