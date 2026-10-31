import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/session-user";
import { canAccessAttempt } from "@/lib/attempt-access";
import {
  parseQuestionOptions,
  resolveCorrectOption,
  resolveSelectedOption,
} from "@/lib/question-display";

export const dynamic = "force-dynamic";

/**
 * Blueprint alias: GET /api/results/{id}
 *
 * Own result, with per-question review only after submission. A guest must
 * hold the signed attempt cookie; signed-in users only read their own attempt
 * unless they have student-read admin permission.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { userId, role } = await getSessionUser();

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        test: { select: { id: true, title: true, slug: true, config: true, totalQuestions: true } },
        answers: {
          include: {
            question: {
              include: { subject: true, topic: true, passage: true },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!attempt) return NextResponse.json({ error: "Result not found" }, { status: 404 });

    const isOwner = attempt.userId
      ? attempt.userId === userId
      : await canAccessAttempt(attempt);
    if (!isOwner && !can(role, "STUDENT_READ")) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }
    if (attempt.status === "IN_PROGRESS") {
      return NextResponse.json({ error: "Attempt is not submitted yet" }, { status: 409 });
    }

    const config = safeParse<{
      markingScheme?: { correct?: number; incorrect?: number };
    }>(attempt.test.config);
    const marksCorrect = Number(config.markingScheme?.correct ?? 5);
    const marksIncorrect = Number(config.markingScheme?.incorrect ?? 1);

    const review = attempt.answers.map((answer) => {
      const question = answer.question;
      const options = parseQuestionOptions(question?.optionsEn);
      const correct = resolveCorrectOption(question ?? {}, options);
      const selected = resolveSelectedOption(answer.selectedOption, options);
      const answered = selected.index >= 0;
      return {
        questionId: answer.questionId,
        questionNumber: question?.questionNumber ?? null,
        stemEn: question?.stemEn ?? null,
        optionsEn: options,
        questionImages: safeParse<unknown>(question?.questionImages ?? null),
        passage: question?.passage
          ? {
              title: question.passage.title,
              content: question.passage.content,
              imageUrl: question.passage.imageUrl,
              imageAlt: question.passage.imageAlt,
              sourceNote: question.passage.sourceNote,
            }
          : null,
        selectedOption: answer.selectedOption,
        selectedOptionLabel: selected.label,
        selectedOptionText: selected.text,
        isCorrect: correct ? answer.isCorrect : null,
        status: !correct
          ? "pending"
          : answered
            ? answer.isCorrect
              ? "correct"
              : "incorrect"
            : "unattempted",
        correctOption: correct?.label ?? null,
        correctOptionText: correct?.text ?? null,
        explanation: question?.explanationEn ?? null,
        explanationImageUrl: question?.explanationImageUrl ?? null,
        explanationImageAlt: question?.explanationImageAlt ?? null,
        subject: question?.subject?.name ?? null,
        topic: question?.topic?.name ?? null,
      };
    });

    const attempted = review.filter((item) => item.status !== "unattempted").length;
    const correct = review.filter((item) => item.status === "correct").length;
    const incorrect = review.filter((item) => item.status === "incorrect").length;
    const totalQuestions = review.length || attempt.test.totalQuestions || 0;
    const maxScore = attempt.maxScore && attempt.maxScore > 0
      ? attempt.maxScore
      : totalQuestions * marksCorrect;
    const score = attempt.score ?? correct * marksCorrect - incorrect * marksIncorrect;

    const rankScope: Prisma.AttemptWhereInput = {
      testId: attempt.testId,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      practice: false,
      userId: { not: null },
    };
    const [rankedHigher, rankedLower, rankedTotal] = attempt.practice
      ? [0, 0, 0]
      : await Promise.all([
          prisma.attempt.count({ where: { ...rankScope, score: { gt: score } } }),
          prisma.attempt.count({ where: { ...rankScope, score: { lt: score } } }),
          prisma.attempt.count({ where: rankScope }),
        ]);

    return NextResponse.json({
      id: attempt.id,
      status: attempt.status,
      practice: attempt.practice,
      test: {
        id: attempt.test.id,
        title: attempt.test.title,
        slug: attempt.test.slug,
      },
      score,
      maxScore,
      correct,
      incorrect,
      attempted,
      unattempted: Math.max(0, totalQuestions - attempted),
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 1000) / 10 : 0,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0,
      percentile:
        attempt.percentile ??
        (rankedTotal <= 1
          ? rankedTotal === 1
            ? 100
            : null
          : Math.round((rankedLower / (rankedTotal - 1)) * 1000) / 10),
      rank: rankedHigher + 1,
      rankTotal: rankedTotal,
      timeSpentSec: attempt.timeSpentSec,
      submittedAt: attempt.submittedAt,
      review,
    });
  } catch (error) {
    console.error("result API error", error);
    return NextResponse.json({ error: "Failed to load result" }, { status: 500 });
  }
}

function safeParse<T = Record<string, unknown>>(raw: string | null): T {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === "object" ? parsed : {}) as T;
  } catch {
    return {} as T;
  }
}
