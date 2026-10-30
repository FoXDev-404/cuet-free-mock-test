import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public student API: active configs and, for one config, its current entries.
 * Never exposes emails — only display names (masked handles).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const configId = searchParams.get("configId") || undefined;
    const scope = searchParams.get("scope") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10) || 50, 100);

    if (configId) {
      const config = await prisma.leaderboardConfig.findUnique({
        where: { id: configId },
        include: {
          entries: {
            orderBy: { rank: "asc" },
            take: limit,
            select: { userId: true, rank: true, bestScore: true, maxScore: true, percentage: true, accuracy: true, attemptsCount: true, lastSubmittedAt: true },
          },
        },
      });
      if (!config || !config.isActive) {
        return NextResponse.json({ error: "Leaderboard not found" }, { status: 404 });
      }
      const users = await prisma.user.findMany({
        where: { id: { in: config.entries.map((e) => e.userId) } },
        select: { id: true, name: true, email: true },
      });
      const nameOf = new Map(
        users.map((u) => {
          const handle = u.email?.split("@")[0] ?? "student";
          const display = u.name?.trim() || handle;
          // Mask to first name + domain letter to keep it privacy-safe.
          const masked = display.length > 12 ? `${display.slice(0, 12)}…` : display;
          return [u.id, masked];
        }),
      );
      return NextResponse.json({
        config: {
          id: config.id, name: config.name, scope: config.scope, periodType: config.periodType,
          examId: config.examId, subjectId: config.subjectId, testId: config.testId, updatedAt: config.updatedAt,
        },
        entries: config.entries.map((e) => ({
          rank: e.rank,
          name: nameOf.get(e.userId) ?? "Student",
          bestScore: e.bestScore,
          maxScore: e.maxScore,
          percentage: Math.round(e.percentage * 10) / 10,
          attempts: e.attemptsCount,
          lastSubmittedAt: e.lastSubmittedAt,
        })),
      });
    }

    const configs = await prisma.leaderboardConfig.findMany({
      where: { isActive: true, ...(scope ? { scope } : {}) },
      orderBy: [{ scope: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, scope: true, periodType: true,
        examId: true, subjectId: true, testId: true, updatedAt: true,
        _count: { select: { entries: true } },
      },
    });
    return NextResponse.json({ configs });
  } catch (e) {
    console.error("public leaderboards GET", e);
    return NextResponse.json({ error: "Failed to load leaderboards" }, { status: 500 });
  }
}
