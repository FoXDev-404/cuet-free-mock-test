// Leaderboard engine — recalculation, apply-on-submit, and period handling.
// Rules stored on LeaderboardConfig as JSON:
//   { bestAttempt: true, excludePractice: true, minAttempts: 1,
//     tieBreakers: ["percentage", "accuracy", "bestTimeSec"] }
// The scoring record is the best scored attempt per user (or previous rank
// kept when bestAttempt=false and the user already has higher score — scores
// only increase within the window).

import { prisma } from "@/lib/prisma";

export type LeaderboardRules = {
  bestAttempt?: boolean;
  excludePractice?: boolean;
  minAttempts?: number;
  tieBreakers?: string[];
};

export type AttemptLite = {
  id: string;
  userId: string | null;
  testId: string;
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  attemptedCount: number;
  timeSpentSec: number;
  submittedAt: Date | null;
  status: string;
};

export type EntryCalc = {
  userId: string;
  bestScore: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  attemptsCount: number;
  bestTimeSec: number;
  lastSubmittedAt: Date;
};

export function parseRules(raw: string | null | undefined): LeaderboardRules {
  try {
    const parsed = JSON.parse(raw ?? "{}") as LeaderboardRules;
    return {
      bestAttempt: parsed.bestAttempt !== false,
      excludePractice: parsed.excludePractice !== false,
      minAttempts: parsed.minAttempts ?? 1,
      tieBreakers: Array.isArray(parsed.tieBreakers) ? parsed.tieBreakers : ["percentage", "accuracy", "bestTimeSec"],
    };
  } catch {
    return { bestAttempt: true, excludePractice: true, minAttempts: 1, tieBreakers: ["percentage", "accuracy", "bestTimeSec"] };
  }
}

export function periodKeyOf(periodType: string, now = new Date()): string | null {
  if (periodType === "ALL_TIME") return null;
  if (periodType === "WEEKLY") {
    // Monday-start week, UTC.
    const d = new Date(now);
    const day = d.getUTCDay();
    const diff = (day === 0 ? 6 : day - 1);
    const monday = new Date(d.getTime() - diff * 86_400_000);
    return `week-${monday.toISOString().slice(0, 10)}`;
  }
  if (periodType === "MONTHLY") return `month-${now.toISOString().slice(0, 7)}`;
  return null;
}

function periodStartCutoff(periodType: string, now = new Date()): Date | null {
  const key = typeof periodKeyOf === "function" ? periodKeyOf(periodType, now) : null;
  if (!key) return null;
  if (periodType === "WEEKLY") return new Date(`${key.slice(5)}T00:00:00.000Z`);
  if (periodType === "MONTHLY") return new Date(`${key.slice(6)}-01T00:00:00.000Z`);
  return null;
}

/** Where-clause fragment that matches a config's scope for an attempt. */
export async function scopeWhereFor(
  config: { scope: string; examId?: string | null; subjectId?: string | null; testId?: string | null },
): Promise<Record<string, unknown>> {
  if (config.scope === "TEST" && config.testId) return { testId: config.testId };
  if (config.scope === "SUBJECT" && config.subjectId) {
    return { test: { subjectId: config.subjectId } };
  }
  if (config.scope === "EXAM" && config.examId) {
    // Tests attach to subjects which attach to the exam (examId at exam level).
    return { test: { OR: [{ examId: config.examId }, { subject: { examId: config.examId } }] } };
  }
  return {};
}

/** Full recalculation for one config: rebuild entries + ranks (+snapshot). */
export async function recalculateLeaderboard(
  config: {
    id: string;
    scope: string;
    examId?: string | null;
    subjectId?: string | null;
    testId?: string | null;
    periodType: string;
    rules: string;
  },
  options: { withSnapshot?: boolean; now?: Date } = {},
): Promise<{ entries: number; excluded: number }> {
  const rules = parseRules(config.rules);
  const now = options.now ?? new Date();
  const cutoff = periodStartCutoff(config.periodType, now);

  const exclusions = await prisma.leaderboardExclusion.findMany({ select: { userId: true, attemptId: true } });
  const excludedUserIds = new Set(exclusions.filter((e) => !e.attemptId).map((e) => e.userId));
  const excludedAttemptIds = new Set(exclusions.filter((e) => e.attemptId).map((e) => e.attemptId));

  const scopeWhere = await scopeWhereFor(config);
  const attempts = await prisma.attempt.findMany({
    where: {
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      score: { gt: 0 },
      ...(cutoff ? { submittedAt: { gte: cutoff } } : {}),
      ...scopeWhere,
    },
    select: {
      id: true, userId: true, testId: true, score: true, maxScore: true,
      correctCount: true, incorrectCount: true, attemptedCount: true,
      timeSpentSec: true, submittedAt: true, status: true, practice: true, flagged: true,
    },
    take: 20_000,
    orderBy: { submittedAt: "desc" },
  });

  const perUser = new Map<string, AttemptLite[]>();
  for (const a of attempts) {
    if (!a.userId) continue; // guest attempts are not placed on leaderboards
    if (rules.excludePractice && a.practice) continue;
    if (a.flagged) continue; // suspicious attempts pending review are ignored
    if (excludedUserIds.has(a.userId) || excludedAttemptIds.has(a.id)) continue;
    const list = perUser.get(a.userId) ?? [];
    list.push(a);
    perUser.set(a.userId, list);
  }

  const calcs: EntryCalc[] = [];
  for (const [userId, list] of perUser) {
    if (list.length < (rules.minAttempts ?? 1)) continue;
    const best = list.reduce((best, a) => (a.score > best.score ? a : best), list[0]);
    const accuracyDen = best.correctCount + best.incorrectCount;
    calcs.push({
      userId,
      bestScore: best.score,
      maxScore: best.maxScore || 1,
      percentage: best.maxScore > 0 ? (best.score / best.maxScore) * 100 : 0,
      accuracy: accuracyDen > 0 ? (best.correctCount / accuracyDen) * 100 : 0,
      attemptsCount: list.length,
      bestTimeSec: best.timeSpentSec,
      lastSubmittedAt: list.reduce((max, a) => ((a.submittedAt ?? 0) > (max.submittedAt ?? 0) ? a : max), best).submittedAt ?? now,
    });
  }

  await prisma.leaderboardEntry.deleteMany({ where: { configId: config.id } });
  if (calcs.length) {
    await prisma.leaderboardEntry.createMany({
      data: calcs.map((c) => ({
        configId: config.id,
        userId: c.userId,
        bestScore: c.bestScore,
        maxScore: c.maxScore,
        percentage: c.percentage,
        accuracy: c.accuracy,
        attemptsCount: c.attemptsCount,
        bestTimeSec: c.bestTimeSec,
        lastSubmittedAt: c.lastSubmittedAt,
        rank: 0,
      })),
    });
  }

  await reRank(config.id, rules.tieBreakers ?? []);

  if (options.withSnapshot) {
    const key = periodKeyOf(config.periodType, now) ?? "all-time";
    const top = await prisma.leaderboardEntry.findMany({
      where: { configId: config.id },
      orderBy: { rank: "asc" },
      take: 100,
      select: { userId: true, rank: true, bestScore: true, percentage: true, attemptsCount: true },
    });
    const data = JSON.stringify({ generatedAt: now.toISOString(), top });
    await prisma.leaderboardSnapshot.upsert({
      where: { configId_periodKey: { configId: config.id, periodKey: key } },
      create: { configId: config.id, periodKey: key, data },
      update: { data, createdAt: new Date() },
    });
  }

  return { entries: calcs.length, excluded: exclusions.length };
}

/** Competition ranking: equal rows share a rank, later rows skip places. */
export async function reRank(configId: string, tieBreakers: string[]): Promise<void> {
  const entries = await prisma.leaderboardEntry.findMany({
    where: { configId },
    orderBy: [{ bestScore: "desc" }],
    select: {
      id: true, bestScore: true, percentage: true, accuracy: true, bestTimeSec: true, lastSubmittedAt: true, rank: true,
    },
  });
  const cmp = (a: (typeof entries)[number], b: (typeof entries)[number]): number => {
    for (const t of tieBreakers) {
      if (t === "percentage" && b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (t === "accuracy" && b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (t === "accuracyDesc" && b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (t === "bestTimeSec" && b.bestTimeSec !== a.bestTimeSec) return a.bestTimeSec - b.bestTimeSec;
      if (t === "faster" && b.bestTimeSec !== a.bestTimeSec) return a.bestTimeSec - b.bestTimeSec;
      if (t === "earlier" && b.lastSubmittedAt.getTime() !== a.lastSubmittedAt.getTime()) {
        return a.lastSubmittedAt.getTime() - b.lastSubmittedAt.getTime();
      }
    }
    return 0;
  };
  const sorted = [...entries].sort((a, b) => cmp(a, b) || a.lastSubmittedAt.getTime() - b.lastSubmittedAt.getTime());
  let rank = 0;
  let prev: (typeof entries)[number] | null = null;
  const writes: Array<{ id: string; rank: number }> = [];
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    const tied = prev !== null && cmp(prev, e) === 0;
    if (!tied) rank = i + 1;
    if (e.rank !== rank) writes.push({ id: e.id, rank });
    prev = e;
  }
  for (const w of writes) {
    await prisma.leaderboardEntry.update({ where: { id: w.id }, data: { rank: w.rank } });
  }
}

/** Incremental update after a submission: recompute that user's entry only. */
export async function onAttemptSubmitted(configId: string): Promise<void> {
  const config = await prisma.leaderboardConfig.findUnique({ where: { id: configId } });
  if (!config || !config.isActive) return;
  await recalculateLeaderboard(config);
}
