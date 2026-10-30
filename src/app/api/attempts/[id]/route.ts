import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/session-user";

/**
 * Attempt summary for the owner (or an authorised admin role).
 *
 * The response deliberately omits question objects: embedding them would leak
 * correctAnswer/explanation for an attempt that may still be in progress.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    void req; // route context is the second argument
    const { userId, role } = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Sign in to view this attempt." }, { status: 401 });
    }

    const { id } = await context.params;
    const attempt = await prisma.attempt.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
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
        flagged: true,
        practice: true,
        test: { select: { id: true, title: true, slug: true, type: true, subjectId: true, year: true } },
        answers: {
          select: {
            questionId: true,
            selectedOption: true,
            isCorrect: true,
            timeSpentSec: true,
            markedForReview: true,
            cleared: true,
          },
        },
      },
    });
    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Do not reveal whether another user's attempt exists.
    if (attempt.userId !== userId && !can(role, "STUDENT_READ")) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const summary = { ...attempt } as Record<string, unknown>;
    delete summary.userId;
    return NextResponse.json(summary);
  } catch (error) {
    console.error("attempt detail error", error);
    return NextResponse.json({ error: "Failed to fetch attempt" }, { status: 500 });
  }
}
