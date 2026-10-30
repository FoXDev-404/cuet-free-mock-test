import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { enforceRateLimit, logApiError } from "@/lib/http";
import { computeStreak, getUserBadges } from "@/lib/badges";
import { SETTING_KEYS, getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const SUBMITTED = ["SUBMITTED", "AUTO_SUBMITTED"] as const;

type SubjectStat = {
  subject: string;
  correct: number;
  attempted: number;
};

/**
 * Private dashboard aggregate.
 *
 * Source of truth is the submitted attempt rows, not browser state. The detailed
 * answer pass is intentionally capped at the latest 80 attempts so one very
 * active learner cannot turn the dashboard into an unbounded D1 query.
 */
export async function GET(req: Request) {
  const { userId } = await getSessionUser();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const limited = await enforceRateLimit(req, {
      bucket: `dashboard:${userId}`,
      limit: 120,
      windowSec: 5 * 60,
      byIp: false,
    });
    if (limited) return limited;

    const [totalAttempts, submittedCount, totals, todayTotals, detailAttempts, continueAttempt, bookmarks, discussions, wrongQuestions, streakRows, badges, settings] =
      await Promise.all([
        prisma.attempt.count({ where: { userId } }),
        prisma.attempt.count({
          where: { userId, status: { in: [...SUBMITTED] }, practice: false },
        }),
        prisma.attempt.aggregate({
          where: { userId, status: { in: [...SUBMITTED] }, practice: false },
          _sum: {
            timeSpentSec: true,
            correctCount: true,
            attemptedCount: true,
          },
          _avg: { percentile: true },
        }),
        prisma.attempt.aggregate({
          where: {
            userId,
            status: { in: [...SUBMITTED] },
            submittedAt: { gte: new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`) },
          },
          _sum: { attemptedCount: true },
        }),
        prisma.attempt.findMany({
          where: { userId, status: { in: [...SUBMITTED] } },
          orderBy: { submittedAt: "desc" },
          take: 80,
          select: {
            id: true,
            testId: true,
            status: true,
            score: true,
            maxScore: true,
            correctCount: true,
            incorrectCount: true,
            attemptedCount: true,
            timeSpentSec: true,
            percentile: true,
            submittedAt: true,
            startedAt: true,
            practice: true,
            test: { select: { title: true, slug: true } },
            answers: {
              select: {
                isCorrect: true,
                question: {
                  select: {
                    subject: { select: { name: true } },
                    topic: { select: { name: true } },
                  },
                },
              },
            },
          },
        }),
        prisma.attempt.findFirst({
          where: {
            userId,
            status: "IN_PROGRESS",
            OR: [{ deadlineAt: null }, { deadlineAt: { gt: new Date() } }],
          },
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            startedAt: true,
            deadlineAt: true,
            lastSavedAt: true,
            test: {
              select: {
                title: true,
                slug: true,
                _count: { select: { questions: true } },
              },
            },
            _count: { select: { answers: true } },
          },
        }),
        prisma.bookmark.count({ where: { userId } }),
        prisma.discussion.count({
          where: { userId, status: { in: ["VISIBLE", "PENDING", "HIDDEN"] } },
        }),
        prisma.questionAttempt.count({
          where: { attempt: { userId }, isCorrect: false },
        }),
        prisma.attempt.findMany({
          where: { userId, status: { in: [...SUBMITTED] } },
          orderBy: { submittedAt: "desc" },
          take: 400,
          select: { submittedAt: true },
        }),
        getUserBadges(userId),
        getSettings(),
      ]);

    const totalTimeSec = totals._sum.timeSpentSec ?? 0;
    const totalCorrect = totals._sum.correctCount ?? 0;
    const totalAttempted = totals._sum.attemptedCount ?? 0;

    const scorePct = (score: number, maxScore: number) =>
      maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;

    const scored = detailAttempts.map((attempt) => scorePct(attempt.score, attempt.maxScore));
    const avgScorePct =
      scored.length > 0
        ? Math.round((scored.reduce((sum, value) => sum + value, 0) / scored.length) * 10) / 10
        : 0;
    const bestScorePct = scored.length > 0 ? Math.max(...scored) : 0;
    const accuracy =
      totalAttempted > 0
        ? Math.round((totalCorrect / totalAttempted) * 1000) / 10
        : 0;
    const avgTimePerQuestionSec =
      totalAttempted > 0 ? Math.round(totalTimeSec / totalAttempted) : 0;

    const subjectMap = new Map<string, SubjectStat>();
    const topicMap = new Map<
      string,
      { topic: string; subject: string; correct: number; attempted: number }
    >();

    for (const attempt of detailAttempts) {
      for (const answer of attempt.answers) {
        const subject = answer.question.subject?.name ?? "Other";
        const topic = answer.question.topic?.name ?? "Unclassified";
        const subjectStat = subjectMap.get(subject) ?? { subject, correct: 0, attempted: 0 };
        subjectStat.attempted += 1;
        if (answer.isCorrect) subjectStat.correct += 1;
        subjectMap.set(subject, subjectStat);

        const key = `${subject}::${topic}`;
        const topicStat =
          topicMap.get(key) ?? { topic, subject, correct: 0, attempted: 0 };
        topicStat.attempted += 1;
        if (answer.isCorrect) topicStat.correct += 1;
        topicMap.set(key, topicStat);
      }
    }

    const subjectAccuracy = [...subjectMap.values()]
      .map((stat) => ({
        ...stat,
        accuracy:
          stat.attempted > 0
            ? Math.round((stat.correct / stat.attempted) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 8);

    const weakTopics = [...topicMap.values()]
      .filter((stat) => stat.attempted >= 2)
      .map((stat) => ({
        ...stat,
        incorrect: stat.attempted - stat.correct,
        accuracy:
          stat.attempted > 0
            ? Math.round((stat.correct / stat.attempted) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.incorrect - a.incorrect || a.accuracy - b.accuracy)
      .slice(0, 6);

    const trendRows = detailAttempts
      .filter((attempt) => !attempt.practice)
      .slice(0, 12)
      .reverse();

    const recentAttempts = detailAttempts.slice(0, 10).map((attempt) => ({
      id: attempt.id,
      testId: attempt.testId,
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.maxScore,
      scorePct: scorePct(attempt.score, attempt.maxScore),
      percentile: attempt.percentile,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      attemptedCount: attempt.attemptedCount,
      timeSpentSec: attempt.timeSpentSec,
      submittedAt: attempt.submittedAt,
      startedAt: attempt.startedAt,
      practice: attempt.practice,
      test: attempt.test,
    }));

    const remainingSec = continueAttempt?.deadlineAt
      ? Math.max(0, Math.floor((continueAttempt.deadlineAt.getTime() - Date.now()) / 1000))
      : null;

    return NextResponse.json({
      totals: {
        totalAttempts,
        submittedCount,
        avgScorePct,
        bestScorePct,
        accuracy,
        totalTimeSec,
        avgTimePerQuestionSec,
        todayAttempted: todayTotals._sum.attemptedCount ?? 0,
        avgPercentile:
          totals._avg.percentile == null
            ? null
            : Math.round(totals._avg.percentile * 10) / 10,
        bookmarks,
        discussions,
        wrongQuestions,
        activeDays: new Set(
          streakRows
            .map((row) => row.submittedAt)
            .filter((date): date is Date => Boolean(date))
            .map((date) => date.toISOString().slice(0, 10)),
        ).size,
      },
      streak: computeStreak(
        streakRows
          .map((row) => row.submittedAt)
          .filter((date): date is Date => Boolean(date)),
      ),
      badges,
      continueAttempt: continueAttempt
        ? {
            attemptId: continueAttempt.id,
            testSlug: continueAttempt.test.slug,
            testTitle: continueAttempt.test.title,
            answered: continueAttempt._count.answers,
            totalQuestions: continueAttempt.test._count.questions,
            remainingSec,
            lastSavedAt: continueAttempt.lastSavedAt,
          }
        : null,
      scoreTrend: trendRows.map((attempt) => ({
        id: attempt.id,
        title: attempt.test.title,
        date: attempt.submittedAt ?? attempt.startedAt,
        scorePct: scorePct(attempt.score, attempt.maxScore),
      })),
      subjectAccuracy,
      weakTopics,
      recentAttempts,
      examDate: settings[SETTING_KEYS.examDate] || null,
    });
  } catch (error) {
    logApiError("me/dashboard", error, req);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
