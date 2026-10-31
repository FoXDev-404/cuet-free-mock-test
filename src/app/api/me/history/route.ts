import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { enforceRateLimit, logApiError } from "@/lib/http";

export const dynamic = "force-dynamic";

const STATUSES = ["IN_PROGRESS", "SUBMITTED", "AUTO_SUBMITTED", "ABANDONED", "EXPIRED"] as const;

/**
 * Blueprint alias: GET /api/me/history
 *
 * Authenticated attempt history. Never accepts a user id from the client, so
 * one learner cannot read another learner's attempts.
 */
export async function GET(req: Request) {
  const { userId } = await getSessionUser();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const limited = await enforceRateLimit(req, {
      bucket: `history:${userId}`,
      limit: 120,
      windowSec: 5 * 60,
      byIp: false,
    });
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(searchParams.get("perPage") || "20", 10) || 20, 1), 100);
    const status = searchParams.get("status") || undefined;
    const practiceParam = searchParams.get("practice");
    const where = {
      userId,
      ...(status && STATUSES.includes(status as (typeof STATUSES)[number]) ? { status } : {}),
      ...(practiceParam === "true" ? { practice: true } : practiceParam === "false" ? { practice: false } : {}),
    };

    const [total, attempts] = await Promise.all([
      prisma.attempt.count({ where }),
      prisma.attempt.findMany({
        where,
        orderBy: [{ startedAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          status: true,
          practice: true,
          score: true,
          maxScore: true,
          correctCount: true,
          incorrectCount: true,
          attemptedCount: true,
          percentile: true,
          timeSpentSec: true,
          startedAt: true,
          submittedAt: true,
          test: {
            select: {
              id: true,
              title: true,
              slug: true,
              type: true,
              subject: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      attempts: attempts.map((attempt) => ({
        ...attempt,
        canResume: attempt.status === "IN_PROGRESS",
        resultUrl: attempt.status === "IN_PROGRESS"
          ? null
          : `/mock-tests/${attempt.test.slug}/result/${attempt.id}`,
      })),
      total,
      page,
      perPage,
      pages: Math.max(1, Math.ceil(total / perPage)),
    });
  } catch (error) {
    logApiError("me/history:list", error, req);
    return NextResponse.json({ error: "Failed to load attempt history" }, { status: 500 });
  }
}
