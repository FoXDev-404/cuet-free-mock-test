// Attempts engine — start/submit lifecycle, attempt events, user attribution.
//
// Security contract (spec §5/§6):
//  - Grading happens ONLY here, server-side. Clients must never receive
//    answer keys before submission (take/practice pages pass keyless props).
//  - isCorrect per question is revealed in the submit response (safe: that is
//    the moment the paper ends).
//  - GET /api/attempts requires a session and returns the caller's (or admin's)
//    attempts without embedded question objects (keys never leak via history).
//  - Practice and suspicious attempts are never silently fabricated: they are
//    recorded with truthful fields (practice flag, flagged reason).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { can, normalizeRole } from "@/lib/auth/permissions";
import { recalculateLeaderboard, scopeWhereFor } from "@/lib/leaderboard";
import { ensureSyntheticTest } from "@/lib/attempts";
import { z } from "zod";

export const dynamic = "force-dynamic";

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

/** Correct across option-id keys, source labels (A..F), and PYQ order keys. */
function isCorrectAnswer(
  selected: string | null | undefined,
  q: { correctAnswer: string; sourceCorrectOptionOrder?: number | null },
): boolean {
  if (!selected) return false;
  if (selected === q.correctAnswer) return true;
  const order = optionOrderFromId(selected);
  const label = labelForOrder(order);
  if (q.correctAnswer && label === q.correctAnswer.toUpperCase()) return true;
  if (order !== null && q.sourceCorrectOptionOrder != null && order === q.sourceCorrectOptionOrder) return true;
  return false;
}

async function currentUserId(): Promise<{ userId: string | null; role: string; email: string | null }> {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { id?: string; email?: string; role?: string }
    | undefined;
  return {
    userId: user?.id ?? null,
    role: normalizeRole(user?.role),
    email: user?.email ?? null,
  };
}

/** Reserved non-public tests so every attempt has a FK target. */
// (moved to src/lib/attempts.ts so /start and /submit share one helper)

const submitSchema = z.object({
  attemptId: z.string().optional(),
  sessionId: z.string().optional(),
  slug: z.string().optional(),
  testId: z.string().optional(),
  practice: z.boolean().optional(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOption: z.string().nullable(),
    }),
  ),
  timeSpentSec: z.number().min(0).max(24 * 60 * 60).default(0),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = submitSchema.parse(body);
    const { userId } = await currentUserId();

    // Resolve the attempt: an explicit attemptId (from /start) or fallback
    // resolution by test (creates the attempt right here for legacy clients).
    let attempt: { id: string; sessionId: string; testId: string; status: string; configSnapshot: string; startedAt: Date } | null = null;
    if (parsed.attemptId && parsed.attemptId.length > 10) {
      const found = await prisma.attempt.findUnique({
        where: { id: parsed.attemptId },
        select: { id: true, sessionId: true, testId: true, status: true, configSnapshot: true, startedAt: true },
      });
      if (found && found.status === "IN_PROGRESS") attempt = found;
      if (found && found.status !== "IN_PROGRESS") {
        return NextResponse.json(
          { error: `Attempt already ${found.status.toLowerCase()}`, attemptId: found.id },
          { status: 409 },
        );
      }
    }

    // Resolve the test for grading + fallback attempt creation. The link
    // order must match /api/questions (orderBy order asc) so review rows
    // align with the numbered paper the student actually answered.
    const test = await (async () => {
      if (attempt) return prisma.test.findUnique({ where: { id: attempt.testId }, include: { questions: { orderBy: { order: "asc" }, include: { question: true } } } });
      if (parsed.slug) return prisma.test.findUnique({ where: { slug: parsed.slug }, include: { questions: { orderBy: { order: "asc" }, include: { question: true } } } });
      if (parsed.testId) return prisma.test.findUnique({ where: { id: parsed.testId }, include: { questions: { orderBy: { order: "asc" }, include: { question: true } } } });
      // Keyless practice/graders without a test row practice on the arena.
      const arena = await ensureSyntheticTest("practice-arena", "Practice Arena", {
        markingScheme: { correct: 5, incorrect: 1, unattempted: 0 },
        practice: true,
      });
      return prisma.test.findUnique({ where: { id: arena.id }, include: { questions: { orderBy: { order: "asc" }, include: { question: true } } } });
    })();
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    if (!attempt) {
      attempt = await prisma.attempt.create({
        data: {
          sessionId: parsed.sessionId ?? `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          testId: test.id,
          userId,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          configSnapshot: typeof test.config === "string" ? test.config : JSON.stringify(test.config ?? {}),
          practice: parsed.practice ?? Boolean(parsed.slug && parsed.slug === "practice-arena"),
        },
        select: { id: true, sessionId: true, testId: true, status: true, configSnapshot: true, startedAt: true },
      });
    }

    const config = safeParseConfig(attempt.configSnapshot);
    const marksCorrect = config.markingScheme?.correct ?? 1;
    const marksIncorrect = config.markingScheme?.incorrect ?? 0;

    const answerMap = new Map(parsed.answers.map((a) => [a.questionId, a.selectedOption]));

    let correct = 0;
    let incorrect = 0;
    let attempted = 0;

    const questionAttempts = [];
    for (const q of test.questions) {
      const selected = answerMap.get(q.questionId) ?? null;
      const isCorrect = isCorrectAnswer(selected, q.question);
      if (selected !== null && selected !== "") {
        attempted += 1;
        if (isCorrect) correct += 1;
        else incorrect += 1;
      }
      questionAttempts.push({
        questionId: q.questionId,
        selectedOption: selected,
        isCorrect,
        timeSpentSec: 0,
        markedForReview: false,
        cleared: false,
      });
    }

    const unattempted = test.questions.length - attempted;
    const rawScore = correct * marksCorrect - incorrect * marksIncorrect;
    const maxScore = test.questions.length * marksCorrect;
    const accuracy = attempted === 0 ? 0 : (correct / (correct + incorrect || 1)) * 100;

    // Replay-with-same-attempt-id is rejected above; duration heuristics flag
    // likely bots (never silently discard results — flagged for human review).
    const suspicious = attempted > 0 && parsed.timeSpentSec < 15 && test.questions.length >= 10;
    const configSnapshot = JSON.stringify({
      ...config,
      scoredAt: new Date().toISOString(),
      marksCorrect,
      marksIncorrect,
    });

    const finalStatus = "SUBMITTED";

    const saved = await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        status: finalStatus,
        submittedAt: new Date(),
        timeSpentSec: parsed.timeSpentSec,
        score: Math.round(rawScore),
        maxScore: Math.round(maxScore),
        correctCount: correct,
        incorrectCount: incorrect,
        attemptedCount: attempted,
        flagged: suspicious,
        flaggedReason: suspicious ? "impossible duration for question count" : null,
        practice: Boolean(attempt && (parsed.practice ?? false)) || test.slug === "practice-arena",
        configSnapshot,
        answers: { deleteMany: {}, create: questionAttempts },
        events: {
          create: {
            type: "SUBMIT",
            payload: JSON.stringify({
              answered: attempted,
              correct,
              score: Math.round(rawScore),
              maxScore: Math.round(maxScore),
              via: "api/attempts@v2",
            }),
          },
        },
      },
      select: { id: true, sessionId: true, score: true },
    });

    // Leaderboard hooks: global + this test's scope-linked active configs.
    // Practice & flagged attempts are skipped (the engine also filters them).
    if (!suspicious && userId) {
      try {
        const configs = await prisma.leaderboardConfig.findMany({ where: { isActive: true } });
        for (const config of configs) {
          const scopeWhere = await scopeWhereFor(config);
          const matches =
            config.scope === "GLOBAL" ||
            ("testId" in scopeWhere && scopeWhere.testId === test.id) ||
            ("test" in scopeWhere && !!scopeWhere.test);
          if (!matches) continue;
          if (config.scope === "TEST" && config.testId && config.testId !== test.id) continue;
          await recalculateLeaderboard(config);
        }
      } catch (lbError) {
        console.error("leaderboard recalc after submit", lbError);
      }
    }

    // Post-submission review: boards can reveal correctness only AFTER submit.
    const review = questionAttempts.map((qa) => ({
      questionId: qa.questionId,
      selectedOption: qa.selectedOption,
      isCorrect: qa.isCorrect,
    }));

    return NextResponse.json({
      attemptId: saved.id,
      sessionId: saved.sessionId,
      score: rawScore,
      maxScore,
      accuracy: Number(accuracy.toFixed(1)),
      percentage: maxScore === 0 ? 0 : Math.round((rawScore / maxScore) * 1000) / 10,
      correct,
      incorrect,
      attempted,
      unattempted,
      flagged: suspicious,
      review,
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: e.issues }, { status: 400 });
    }
    console.error("attempts POST error", e);
    return NextResponse.json({ error: "Failed to submit attempt" }, { status: 500 });
  }
}

function safeParseConfig(raw: string | null): { markingScheme?: { correct?: number; incorrect?: number; unattempted?: number }; durationMinutes?: number } {
  try {
    return typeof raw === "string" ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Authenticated history: own attempts for students, all for ADMIN/ANALYST.
// Question objects are never embedded — the score rows are summary only.
export async function GET(req: Request) {
  const { userId, role } = await currentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to view your attempt history." },
      { status: 401 },
    );
  }
  try {
    const { searchParams } = new URL(req.url);
    const scopeAll = searchParams.get("scope") === "all";
    const canSeeAll = can(role, "ANALYTICS_READ") || can(role, "STUDENT_READ");

    const attempts = await prisma.attempt.findMany({
      where: scopeAll && canSeeAll ? {} : { userId },
      orderBy: { startedAt: "desc" },
      include: { test: { select: { id: true, title: true, slug: true, type: true, subjectId: true, year: true } } },
      take: 50,
    });
    return NextResponse.json(
      attempts.map((a) => ({
        id: a.id,
        status: a.status,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        timeSpentSec: a.timeSpentSec,
        score: a.score,
        maxScore: a.maxScore,
        correctCount: a.correctCount,
        incorrectCount: a.incorrectCount,
        attemptedCount: a.attemptedCount,
        percentile: a.percentile,
        flagged: a.flagged,
        practice: a.practice,
        test: a.test,
      })),
    );
  } catch (e) {
    console.error("attempts GET error", e);
    return NextResponse.json({ error: "Failed to fetch attempts" }, { status: 500 });
  }
}
