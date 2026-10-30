import { prisma } from "@/lib/prisma";

export const BADGES = {
  FIRST_STEP: {
    label: "First step",
    description: "Completed your first mock test.",
  },
  STREAK_3: {
    label: "Three-day streak",
    description: "Practised on three consecutive days.",
  },
  STREAK_7: {
    label: "Seven-day streak",
    description: "Practised on seven consecutive days.",
  },
  PERFECT_SCORE: {
    label: "Perfect score",
    description: "Answered every scored question correctly.",
  },
  TEN_ATTEMPTS: {
    label: "Ten attempts",
    description: "Completed ten mock tests.",
  },
  HUNDRED_QUESTIONS: {
    label: "Century",
    description: "Attempted one hundred questions.",
  },
} as const;

export type BadgeKey = keyof typeof BADGES;

/** Consecutive UTC practice days, allowing today or yesterday as the anchor. */
export function computeStreak(dates: Date[]): number {
  const days = Array.from(
    new Set(
      dates
        .filter((date) => !Number.isNaN(date.getTime()))
        .map((date) => date.toISOString().slice(0, 10)),
    ),
  ).sort((a, b) => (a < b ? 1 : -1));
  if (!days.length) return 0;

  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterdayKey = new Date(today.getTime() - dayMs).toISOString().slice(0, 10);
  if (days[0] !== todayKey && days[0] !== yesterdayKey) return 0;

  let streak = 1;
  let cursor = new Date(`${days[0]}T00:00:00.000Z`).getTime();
  for (let i = 1; i < days.length; i += 1) {
    cursor -= dayMs;
    if (days[i] !== new Date(cursor).toISOString().slice(0, 10)) break;
    streak += 1;
  }
  return streak;
}

export async function awardBadges(userId: string): Promise<BadgeKey[]> {
  const attempts = await prisma.attempt.findMany({
    where: { userId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, practice: false },
    select: {
      submittedAt: true,
      score: true,
      maxScore: true,
      attemptedCount: true,
    },
    orderBy: { submittedAt: "desc" },
    take: 500,
  });
  if (!attempts.length) return [];

  const earned: BadgeKey[] = ["FIRST_STEP"];
  const streak = computeStreak(
    attempts.map((attempt) => attempt.submittedAt).filter((d): d is Date => Boolean(d)),
  );
  if (streak >= 3) earned.push("STREAK_3");
  if (streak >= 7) earned.push("STREAK_7");
  if (
    attempts.some(
      (attempt) =>
        attempt.maxScore > 0 &&
        attempt.score === attempt.maxScore &&
        attempt.attemptedCount > 0,
    )
  ) {
    earned.push("PERFECT_SCORE");
  }
  if (attempts.length >= 10) earned.push("TEN_ATTEMPTS");
  if (attempts.reduce((sum, attempt) => sum + attempt.attemptedCount, 0) >= 100) {
    earned.push("HUNDRED_QUESTIONS");
  }

  await Promise.all(
    earned.map((badgeKey) =>
      prisma.userBadge.upsert({
        where: { userId_badgeKey: { userId, badgeKey } },
        create: { userId, badgeKey },
        update: {},
      }),
    ),
  );
  return earned;
}

export async function getUserBadges(userId: string) {
  const rows = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
  });
  return rows.map((row) => ({
    key: row.badgeKey,
    earnedAt: row.earnedAt,
    ...(BADGES[row.badgeKey as BadgeKey] ?? {
      label: row.badgeKey,
      description: "Achievement unlocked.",
    }),
  }));
}
