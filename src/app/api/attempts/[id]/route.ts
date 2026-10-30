import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/session-user";
import { hasGuestAttemptAccess } from "@/lib/guest-token";

/**
 * Attempt summary for the owner, an authorised admin, or the guest holding
 * the signed attempt cookie. Question objects are never embedded, so an
 * in-progress attempt cannot leak answer keys.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    void req; // route context is the second argument
    const { id } = await context.params;
    const { userId, role } = await getSessionUser();

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        startedAt: true,
        deadlineAt: true,
        lastSavedAt: true,
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
        versionId: true,
        configSnapshot: true,
        test: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            subjectId: true,
            year: true,
            durationMinutes: true,
          },
        },
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

    if (attempt.userId) {
      // Do not reveal whether another user's attempt exists.
      if (attempt.userId !== userId && !can(role, "STUDENT_READ")) {
        return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
      }
    } else {
      // A guest may resume only from the test client, which explicitly asks for
      // resume state. A bare API read stays unauthenticated even if a stale
      // guest cookie happens to be attached.
      const resumeRequested = new URL(req.url).searchParams.get("resume") === "1";
      const guestAllowed = resumeRequested && (await hasGuestAttemptAccess(attempt.id));
      if (!guestAllowed) {
        return NextResponse.json(
          { error: "Sign in or use the device that started this attempt." },
          { status: 401 },
        );
      }
    }

    const config = safeParseConfig(attempt.configSnapshot);
    const configuredDuration = Number(
      config.durationMinutes ?? attempt.test.durationMinutes ?? 60,
    );
    const durationMinutes =
      Number.isFinite(configuredDuration) && configuredDuration > 0
        ? configuredDuration
        : 60;
    const deadlineAt =
      attempt.deadlineAt ??
      new Date(attempt.startedAt.getTime() + durationMinutes * 60_000);

    const summary = {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      deadlineAt,
      lastSavedAt: attempt.lastSavedAt,
      submittedAt: attempt.submittedAt,
      timeSpentSec: attempt.timeSpentSec,
      score: attempt.score,
      maxScore: attempt.maxScore,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      attemptedCount: attempt.attemptedCount,
      percentile: attempt.percentile,
      flagged: attempt.flagged,
      practice: attempt.practice,
      versionId: attempt.versionId,
      durationMinutes,
      serverNow: new Date().toISOString(),
      test: attempt.test,
      // Autosave state for resume. For a submitted attempt these rows are the
      // final answers the learner already saw on the result page.
      answers: attempt.answers,
    };
    return NextResponse.json(summary);
  } catch (error) {
    console.error("attempt detail error", error);
    return NextResponse.json({ error: "Failed to fetch attempt" }, { status: 500 });
  }
}

function safeParseConfig(raw: string | null): {
  durationMinutes?: number;
} {
  try {
    return typeof raw === "string" ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
