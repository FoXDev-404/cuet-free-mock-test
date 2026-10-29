import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const submitSchema = z.object({
  testId: z.string(),
  sessionId: z.string().optional(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOption: z.string().nullable(),
    })
  ),
  timeSpentSec: z.number().default(0),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = submitSchema.parse(body);

    // Fetch test config and questions for scoring
    const test = await prisma.test.findUnique({
      where: { id: parsed.testId },
      include: {
        questions: { include: { question: true } },
      },
    });
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const config = typeof test.config === "string" ? JSON.parse(test.config) : test.config;
    const marksCorrect = config.markingScheme?.correct ?? 5;
    const marksIncorrect = config.markingScheme?.incorrect ?? 1;

    const answerMap = new Map(parsed.answers.map((a) => [a.questionId, a.selectedOption]));

    let correct = 0;
    let incorrect = 0;
    let attempted = 0;

    const questionAttempts = [];
    for (const tq of test.questions) {
      const q = tq.question;
      const selected = answerMap.get(q.id);
      const isCorrect = selected !== null && selected !== undefined && selected === q.correctAnswer;
      if (selected !== null && selected !== undefined && selected !== "") {
        attempted += 1;
        if (isCorrect) correct += 1;
        else incorrect += 1;
      }
      questionAttempts.push({
        questionId: q.id,
        selectedOption: selected ?? null,
        isCorrect,
        timeSpentSec: 0,
        markedForReview: false,
        cleared: false,
      });
    }

    const { rawScore, maxScore, accuracy, percentage } = computeScore(correct, incorrect, test.totalQuestions - attempted, marksCorrect, marksIncorrect);

    const attempt = await prisma.attempt.create({
      data: {
        sessionId: parsed.sessionId ?? `anon-${Date.now()}`,
        testId: parsed.testId,
        status: "SUBMITTED",
        submittedAt: new Date(),
        timeSpentSec: parsed.timeSpentSec,
        score: Math.round(rawScore),
        maxScore: Math.round(maxScore),
        correctCount: correct,
        incorrectCount: incorrect,
        attemptedCount: attempted,
        percentile: null,
        configSnapshot: test.config,
        answers: {
          create: questionAttempts,
        },
      },
      include: { answers: true },
    });

    return NextResponse.json({ attempt, score: rawScore, maxScore, accuracy, percentage, correct, incorrect, attempted });
  } catch (e: any) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit attempt" }, { status: 500 });
  }
}

function computeScore(correct: number, incorrect: number, unattempted: number, marksCorrect = 5, marksIncorrect = 1) {
  const rawScore = correct * marksCorrect - incorrect * marksIncorrect;
  const maxScore = (correct + incorrect + unattempted) * marksCorrect;
  const accuracy = correct + incorrect === 0 ? 0 : (correct / (correct + incorrect)) * 100;
  const percentage = maxScore === 0 ? 0 : (rawScore / maxScore) * 100;
  return { rawScore, maxScore, accuracy, percentage };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const testId = searchParams.get("testId");

    const attempts = await prisma.attempt.findMany({
      where: {
        ...(sessionId ? { sessionId } : {}),
        ...(testId ? { testId } : {}),
      },
      orderBy: { startedAt: "desc" },
      include: {
        test: true,
        answers: { include: { question: true } },
      },
      take: 20,
    });
    return NextResponse.json(attempts);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch attempts" }, { status: 500 });
  }
}
