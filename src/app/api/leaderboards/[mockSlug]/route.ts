import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalPaperSummary } from "@/lib/local-papers";

export const dynamic = "force-dynamic";

interface RankedRow {
  userId: string;
  name: string;
  score: number;
  maxScore: number;
  timeSpentSec: number;
  accuracy: number;
  submittedAt: Date;
}

function maskName(name: string | null, email: string | null): string {
  const display = name?.trim() || email?.split("@")[0] || "Student";
  return display.length > 12 ? `${display.slice(0, 12)}…` : display;
}

/**
 * Blueprint alias: GET /api/leaderboards/{mockSlug}
 *
 * Public username-only ranking. Uses the learner's first submitted,
 * non-practice attempt on the paper, matching the documented fairness rule.
 * Emails are never returned.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ mockSlug: string }> },
) {
  try {
    const { mockSlug } = await context.params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 100);

    const test = await prisma.test.findUnique({
      where: { slug: mockSlug },
      select: { id: true, title: true, slug: true, status: true, isPublic: true },
    });
    if (!test) {
      const local = getLocalPaperSummary(mockSlug);
      if (local) {
        return NextResponse.json({
          mock: { slug: local.slug, title: local.title, questionCount: local.scorableQuestionCount },
          entries: [],
          note: "Repo-backed paper attempts are graded in-browser and are not ranked on the site leaderboard.",
        });
      }
      return NextResponse.json({ error: "Leaderboard not found" }, { status: 404 });
    }
    if (!test.isPublic || test.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Leaderboard not found" }, { status: 404 });
    }

    // First completed attempt per user is the only eligible row.
    const attempts = await prisma.attempt.findMany({
      where: {
        testId: test.id,
        practice: false,
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        userId: { not: null },
      },
      orderBy: [{ submittedAt: "asc" }],
      select: {
        userId: true,
        score: true,
        maxScore: true,
        correctCount: true,
        attemptedCount: true,
        timeSpentSec: true,
        submittedAt: true,
        user: { select: { name: true, email: true } },
      },
    });

    const firstByUser = new Map<string, (typeof attempts)[number]>();
    for (const attempt of attempts) {
      if (!attempt.userId || firstByUser.has(attempt.userId)) continue;
      firstByUser.set(attempt.userId, attempt);
    }

    const rows: RankedRow[] = [...firstByUser.values()].map((attempt) => {
      const score = attempt.score ?? 0;
      const maxScore = attempt.maxScore ?? 0;
      const attempted = attempt.attemptedCount ?? 0;
      return {
        userId: attempt.userId as string,
        name: maskName(attempt.user?.name ?? null, attempt.user?.email ?? null),
        score,
        maxScore,
        timeSpentSec: attempt.timeSpentSec ?? 0,
        accuracy: attempted > 0 ? Math.round(((attempt.correctCount ?? 0) / attempted) * 1000) / 10 : 0,
        submittedAt: attempt.submittedAt ?? new Date(0),
      };
    });

    rows.sort(
      (a, b) =>
        b.score - a.score ||
        a.timeSpentSec - b.timeSpentSec ||
        b.accuracy - a.accuracy,
    );

    let lastScore: number | null = null;
    let lastRank = 0;
    const entries = rows.slice(0, limit).map((row, index) => {
      const rank = lastScore === row.score ? lastRank : index + 1;
      lastScore = row.score;
      lastRank = rank;
      return {
        rank,
        name: row.name,
        score: row.score,
        maxScore: row.maxScore,
        accuracy: row.accuracy,
        timeSpentSec: row.timeSpentSec,
        submittedAt: row.submittedAt,
      };
    });

    return NextResponse.json({
      mock: { id: test.id, slug: test.slug, title: test.title },
      entries,
      total: rows.length,
    });
  } catch (error) {
    console.error("leaderboard slug API error", error);
    return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}
