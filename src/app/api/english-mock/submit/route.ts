import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { ensureSyntheticTest } from "@/lib/attempts";
import {
  parseQuestionOptions,
  resolveCorrectOption,
  resolveSelectedOption,
} from "@/lib/question-display";
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
        stemEn: true,
        optionsEn: true,
        questionImages: true,
        correctAnswer: true,
        answerReviewStatus: true,
        explanationEn: true,
        explanationImageUrl: true,
        explanationImageAlt: true,
        dataQualityNote: true,
        sourceCorrectOptionOrder: true,
        sourceAnswerLabel: true,
        marks: true,
        negativeMarks: true,
        passage: {
          select: {
            passageKey: true,
            title: true,
            content: true,
            imageUrl: true,
            imageAlt: true,
            sourceNote: true,
          },
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
      const options = parseQuestionOptions(q.optionsEn);
      const correctOption = resolveCorrectOption(
        {
          correctAnswer: q.correctAnswer,
          sourceCorrectOptionOrder: q.sourceCorrectOptionOrder,
        },
        options,
      );
      const selectedResolved = resolveSelectedOption(selected ?? null, options);

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
        stemEn: q.stemEn,
        optionsEn: options,
        questionImages: q.questionImages,
        selectedOption: selectedLabel,
        selectedOptionId: selected ?? null,
        selectedOptionText: selectedResolved.text,
        isCorrect: isFlagged ? null : isCorrect,
        isPendingReview: isFlagged,
        correctAnswer: isFlagged ? null : correctOption?.label ?? q.correctAnswer,
        correctAnswerText: isFlagged ? null : correctOption?.text ?? null,
        explanation: isFlagged ? null : q.explanationEn ?? null,
        explanationImageUrl: isFlagged ? null : q.explanationImageUrl ?? null,
        explanationImageAlt: isFlagged ? null : q.explanationImageAlt ?? null,
        dataQualityNote: isFlagged ? q.dataQualityNote : null,
        passageKey: q.passage?.passageKey ?? null,
        passageTitle: q.passage?.title ?? null,
        passageContent: q.passage?.content ?? null,
        passageImageUrl: q.passage?.imageUrl ?? null,
        passageImageAlt: q.passage?.imageAlt ?? null,
        passageSourceNote: q.passage?.sourceNote ?? null,
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

    // Persist the attempt (previously results were computed but never stored).
    // Attempts attach to a reserved non-public test so the FK is valid; the
    // response shape is unchanged for the client.
    try {
      const session = await getServerSession(authOptions);
      const user = session?.user as { id?: string } | undefined;
      const arena = await ensureSyntheticTest(
        "english-pyq-40",
        "English PYQ Mock (CUET UG)",
        { markingScheme: { correct: 1, incorrect: 0, unattempted: 0 }, englishMock: true },
        "PYQ_YEAR_WISE",
      );
      await prisma.attempt.create({
        data: {
          sessionId: `eng-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
          testId: arena.id,
          userId: user?.id ?? null,
          status: "SUBMITTED",
          submittedAt: new Date(),
          timeSpentSec: parsed.timeSpentSec,
          score: verifiedRawScore,
          maxScore: verifiedMaxScore,
          correctCount: verifiedCorrect,
          incorrectCount: verifiedIncorrect,
          attemptedCount: totalAttempted,
          configSnapshot: JSON.stringify({ englishMock: true, pendingReviewCount, timeSpentSec: parsed.timeSpentSec }),
          answers: {
            create: results.map((r) => ({
              questionId: r.questionId,
              selectedOption: r.selectedOptionId,
              // Flagged rows carry null correctness in the response; the row
              // itself records the raw grading fact (mocking is done via
              // answerReviewStatus-aware reporting, not by rewriting facts).
              isCorrect: r.isCorrect ?? false,
              cleared: false,
              markedForReview: false,
            })),
          },
          events: {
            create: {
              type: "SUBMIT",
              payload: JSON.stringify({ verifiedRawScore, verifiedMaxScore, pendingReviewCount }),
            },
          },
        },
      });
    } catch (persistError) {
      console.error("english-mock attempt persistence failed", persistError);
      // Results still return — persistence failure is logged, not hidden.
    }

    return NextResponse.json(attemptData);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error("english-mock submit API error", e);
    return NextResponse.json({ error: "Failed to submit exam" }, { status: 500 });
  }
}
