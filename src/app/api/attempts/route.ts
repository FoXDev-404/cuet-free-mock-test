// Attempts engine — start/submit lifecycle, attempt events, user attribution.
//
// Security contract (spec §5/§6):
//  - Grading happens ONLY here, server-side. Clients must never receive
//    answer keys before submission (take/practice pages pass keyless props).
//  - isCorrect per question is revealed in the submit response (safe: that is
//    the moment the paper ends).
//  - The server owns the deadline; a paused tab cannot buy extra time.
//  - Guests must present the signed attempt cookie issued at start.
//  - Submitted attempts are immutable; a replay returns 409.
//  - GET /api/attempts requires a session and returns the caller's (or admin's)
//    attempts without embedded question objects (keys never leak via history).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/permissions";
import { recalculateLeaderboard, scopeWhereFor } from "@/lib/leaderboard";
import { ensureSyntheticTest } from "@/lib/attempts";
import { getSessionUser } from "@/lib/session-user";
import { canAccessAttempt } from "@/lib/attempt-access";
import { awardBadges } from "@/lib/badges";
import { enforceRateLimit, forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
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

type AttemptRow = {
  id: string;
  userId: string | null;
  sessionId: string;
  testId: string;
  status: string;
  configSnapshot: string;
  startedAt: Date;
  deadlineAt: Date | null;
  versionId: string | null;
  practice: boolean;
};

export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();
    const limited = await enforceRateLimit(req, {
      bucket: "attempts:submit",
      limit: 20,
      windowSec: 10 * 60,
    });
    if (limited) return limited;

    const body = await req.json();
    const parsed = submitSchema.parse(body);
    const { userId } = await getSessionUser();

    // Resolve the attempt: an explicit attemptId (from /start) or fallback
    // resolution by test (creates the attempt right here for legacy clients).
    let attempt: AttemptRow | null = null;
    if (parsed.attemptId && parsed.attemptId.length > 10) {
      const found = await prisma.attempt.findUnique({
        where: { id: parsed.attemptId },
        select: {
          id: true,
          userId: true,
          sessionId: true,
          testId: true,
          status: true,
          configSnapshot: true,
          startedAt: true,
          deadlineAt: true,
          versionId: true,
          practice: true,
        },
      });
      if (!found) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

      if (!(await canAccessAttempt(found))) {
        // Do not reveal whether another learner's attempt exists.
        return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
      }

      if (found.status !== "IN_PROGRESS") {
        return NextResponse.json(
          { error: `Attempt already ${found.status.toLowerCase()}`, attemptId: found.id },
          { status: 409 },
        );
      }
      attempt = found;
    }

    // Resolve the test for grading + fallback attempt creation. The link
    // order must match /api/questions (orderBy order asc) so review rows
    // align with the numbered paper the student actually answered.
    const test = await (async () => {
      if (attempt) return prisma.test.findUnique({ where: { id: attempt.testId }, include: { questions: { orderBy: { order: "asc" }, include: { question: true } } } });
      if (parsed.slug) return prisma.test.findUnique({ where: { slug: parsed.slug, status: "PUBLISHED" }, include: { questions: { orderBy: { order: "asc" }, include: { question: true } } } });
      if (parsed.testId) return prisma.test.findUnique({ where: { id: parsed.testId, status: "PUBLISHED" }, include: { questions: { orderBy: { order: "asc" }, include: { question: true } } } });
      // Keyless practice/graders without a test row practice on the arena.
      const arena = await ensureSyntheticTest("practice-arena", "Practice Arena", {
        markingScheme: { correct: 5, incorrect: 1, unattempted: 0 },
        practice: true,
      });
      return prisma.test.findUnique({ where: { id: arena.id }, include: { questions: { orderBy: { order: "asc" }, include: { question: true } } } });
    })();
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    if (!attempt) {
      const deadlineAt = new Date(Date.now() + Math.max(1, test.durationMinutes || 60) * 60_000);
      const version = await prisma.testVersion.findFirst({
        where: { testId: test.id },
        orderBy: { versionNo: "desc" },
        select: { id: true },
      });
      attempt = await prisma.attempt.create({
        data: {
          sessionId: parsed.sessionId ?? `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          testId: test.id,
          userId,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          deadlineAt,
          versionId: version?.id ?? null,
          configSnapshot: typeof test.config === "string" ? test.config : JSON.stringify(test.config ?? {}),
          practice: parsed.practice ?? Boolean(parsed.slug && parsed.slug === "practice-arena"),
        },
        select: {
          id: true,
          userId: true,
          sessionId: true,
          testId: true,
          status: true,
          configSnapshot: true,
          startedAt: true,
          deadlineAt: true,
          versionId: true,
          practice: true,
        },
      });
    }

    const config = safeParseConfig(attempt.configSnapshot);
    const marksCorrect = config.markingScheme?.correct ?? 1;
    const marksIncorrect = config.markingScheme?.incorrect ?? 0;

    // Server-owned deadline. Late submissions are still accepted once so the
    // learner keeps their answers, but they are recorded as AUTO_SUBMITTED.
    const configuredDuration = Number(config.durationMinutes ?? test.durationMinutes ?? 60);
    const durationMinutes = Number.isFinite(configuredDuration) && configuredDuration > 0 ? configuredDuration : 60;
    const deadlineAt =
      attempt.deadlineAt ?? new Date(attempt.startedAt.getTime() + durationMinutes * 60_000);
    const deadlineSec = Math.round(durationMinutes * 60);
    const serverElapsedSec = Math.max(0, Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000));
    const deadlineExceeded = Date.now() > deadlineAt.getTime() + 30_000;
    const reportedTimeSec = Math.min(Math.max(parsed.timeSpentSec, 0), deadlineSec);

    // Grade against the pinned version when the snapshot carries its ordered
    // question ids. Fall back to the current paper order for older snapshots
    // or attempts started before version pinning existed.
    let paperQuestions = test.questions;
    if (attempt.versionId) {
      const version = await prisma.testVersion.findUnique({
        where: { id: attempt.versionId },
        select: { snapshot: true },
      });
      const snapshot = safeParseSnapshot(version?.snapshot);
      if (snapshot?.questionIds?.length) {
        const byId = new Map(test.questions.map((row) => [row.questionId, row]));
        const pinned = snapshot.questionIds
          .map((id) => byId.get(id))
          .filter((row): row is (typeof test.questions)[number] => Boolean(row));
        if (pinned.length) paperQuestions = pinned;
      }
    }

    const answerMap = new Map(parsed.answers.map((a) => [a.questionId, a.selectedOption]));

    let correct = 0;
    let incorrect = 0;
    let attempted = 0;

    const questionAttempts: Array<{
      questionId: string;
      selectedOption: string | null;
      isCorrect: boolean;
      timeSpentSec: number;
      markedForReview: boolean;
      cleared: boolean;
    }> = [];
    for (const q of paperQuestions) {
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

    const unattempted = paperQuestions.length - attempted;
    const rawScore = correct * marksCorrect - incorrect * marksIncorrect;
    const maxScore = paperQuestions.length * marksCorrect;
    const accuracy = attempted === 0 ? 0 : (correct / (correct + incorrect || 1)) * 100;

    // Duration heuristics flag likely bots (never silently discard results).
    const suspicious = attempted > 0 && reportedTimeSec < 15 && paperQuestions.length >= 10;
    const configSnapshot = JSON.stringify({
      ...config,
      scoredAt: new Date().toISOString(),
      marksCorrect,
      marksIncorrect,
      serverElapsedSec,
      deadlineExceeded,
      versionId: attempt.versionId,
    });

    const finalStatus = deadlineExceeded ? "AUTO_SUBMITTED" : "SUBMITTED";
    const isPractice = attempt.practice || test.slug === "practice-arena" || Boolean(parsed.practice);

    const saved = await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        status: finalStatus,
        submittedAt: new Date(),
        lastSavedAt: new Date(),
        timeSpentSec: reportedTimeSec,
        score: Math.round(rawScore),
        maxScore: Math.round(maxScore),
        correctCount: correct,
        incorrectCount: incorrect,
        attemptedCount: attempted,
        flagged: suspicious,
        flaggedReason: suspicious ? "impossible duration for question count" : null,
        practice: isPractice,
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
              serverElapsedSec,
              deadlineExceeded,
              versionId: attempt.versionId,
              via: "api/attempts@v3",
            }),
          },
        },
      },
      select: { id: true, sessionId: true, score: true },
    });

    // Percentile across comparable submitted attempts on the same paper.
    let percentile: number | null = null;
    if (userId && !suspicious && !isPractice && maxScore > 0) {
      try {
        const [total, lower] = await Promise.all([
          prisma.attempt.count({
            where: {
              testId: test.id,
              status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
              practice: false,
              userId: { not: null },
            },
          }),
          prisma.attempt.count({
            where: {
              testId: test.id,
              status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
              practice: false,
              userId: { not: null },
              score: { lt: Math.round(rawScore) },
            },
          }),
        ]);
        percentile = total <= 1 ? 100 : Math.round((lower / (total - 1)) * 1000) / 10;
        await prisma.attempt.update({ where: { id: saved.id }, data: { percentile } });
      } catch (percentileError) {
        console.error("percentile computation failed", percentileError);
      }
    }

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

    if (userId && !isPractice && !suspicious) {
      try {
        await awardBadges(userId);
      } catch (badgeError) {
        console.error("badge award failed", badgeError);
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
      status: finalStatus,
      autoSubmitted: deadlineExceeded,
      percentile,
      versionId: attempt.versionId,
      review,
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: e.issues }, { status: 400 });
    }
    logApiError("attempts/submit", e, req);
    return NextResponse.json({ error: "Failed to submit attempt" }, { status: 500 });
  }
}

function safeParseConfig(raw: string | null): {
  markingScheme?: { correct?: number; incorrect?: number; unattempted?: number };
  durationMinutes?: number;
} {
  try {
    return typeof raw === "string" ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function safeParseSnapshot(raw: string | null | undefined): { questionIds?: string[] } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { questionIds?: unknown };
    return Array.isArray(parsed.questionIds)
      ? { questionIds: parsed.questionIds.filter((id): id is string => typeof id === "string") }
      : null;
  } catch {
    return null;
  }
}

// Authenticated history: own attempts for students, all for ADMIN/ANALYST.
// Question objects are never embedded — the score rows are summary only.
export async function GET(req: Request) {
  const { userId, role } = await getSessionUser();
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
