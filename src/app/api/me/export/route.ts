import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { enforceRateLimit, logApiError } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Personal data export (JSON attachment). Includes the learner's own attempts,
 * chosen answers, bookmarks and posts — never password hashes or other users'
 * data. Answer keys are not part of the learner's personal data.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await getSessionUser();
    if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const limited = await enforceRateLimit(req, {
      bucket: `account:export:${userId}`,
      limit: 3,
      windowSec: 60 * 60,
      byIp: false,
    });
    if (limited) return limited;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        isProfilePublic: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const [attempts, bookmarks, discussions, badges] = await Promise.all([
      prisma.attempt.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 500,
        select: {
          id: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          timeSpentSec: true,
          score: true,
          maxScore: true,
          correctCount: true,
          incorrectCount: true,
          attemptedCount: true,
          percentile: true,
          practice: true,
          flagged: true,
          test: { select: { title: true, slug: true } },
          answers: {
            select: {
              questionId: true,
              selectedOption: true,
              isCorrect: true,
              markedForReview: true,
            },
          },
        },
      }),
      prisma.bookmark.findMany({
        where: { userId },
        select: { questionId: true, question: { select: { stemEn: true, year: true } } },
      }),
      prisma.discussion.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: {
          id: true,
          body: true,
          status: true,
          testId: true,
          questionId: true,
          createdAt: true,
        },
      }),
      prisma.userBadge.findMany({
        where: { userId },
        select: { badgeKey: true, earnedAt: true },
      }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      notice:
        "This export contains personal data stored by CUETFreeMockTest.Com. Mock-test answer keys and other users' records are intentionally excluded.",
      profile: user,
      attempts,
      bookmarks,
      discussions,
      badges,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="cuet-account-${userId.slice(-8)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logApiError("me/export", error, req);
    return NextResponse.json({ error: "Failed to export account data" }, { status: 500 });
  }
}
