import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

// Analytics workspace (read-only aggregates). Small-scale SQL via Prisma
// aggregations keeps the CPU cost within the free plan.
export async function GET() {
  const g = await requirePermission("ANALYTICS_READ");
  if (g.error) return g.error;
  try {
    const [attemptsTotal, submittedTotal, flaggedTotal, practiceTotal, questionsTotal, activeQuestions, usersTotal, pendingReview, importsTotal] =
      await Promise.all([
        prisma.attempt.count(),
        prisma.attempt.count({ where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } } }),
        prisma.attempt.count({ where: { flagged: true } }),
        prisma.attempt.count({ where: { practice: true } }),
        prisma.question.count(),
        prisma.question.count({ where: { isActive: true } }),
        prisma.user.count(),
        prisma.question.count({ where: { answerReviewStatus: "needs_manual_review" } }),
        prisma.importJob.count(),
      ]);

    // Score bands over submitted attempts: 0-40 / 40-60 / 60-80 / 80-100 %.
    const submitted = await prisma.attempt.findMany({
      where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, maxScore: { gt: 0 } },
      select: { score: true, maxScore: true },
      take: 5000,
    });
    const bands = { under40: 0, b40to60: 0, b60to80: 0, over80: 0 };
    for (const a of submitted) {
      const pct = (a.score / a.maxScore) * 100;
      if (pct < 40) bands.under40++;
      else if (pct < 60) bands.b40to60++;
      else if (pct < 80) bands.b60to80++;
      else bands.over80++;
    }

    const byTest = await prisma.test.findMany({
      select: {
        id: true, title: true, slug: true, type: true, status: true,
        _count: { select: { attempts: true } },
      },
      orderBy: { title: "asc" },
      take: 50,
    });

    return NextResponse.json({
      totals: {
        attemptsTotal, submittedTotal, flaggedTotal, practiceTotal,
        questionsTotal, activeQuestions, usersTotal, pendingReview, importsTotal,
      },
      scoreBands: bands,
      tests: byTest.map((t) => ({
        id: t.id, title: t.title, slug: t.slug, type: t.type, status: t.status,
        attempts: t._count.attempts,
      })),
    });
  } catch (e) {
    console.error("admin analytics GET", e);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
