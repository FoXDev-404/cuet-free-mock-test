import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessAttempt, secondsUntilDeadline } from "@/lib/attempt-access";
import { enforceRateLimit, forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const saveSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOption: z.string().nullable(),
        markedForReview: z.boolean().optional(),
        timeSpentSec: z.number().min(0).max(86_400).optional(),
      }),
    )
    .max(500),
});

/**
 * Autosave answers for an in-progress attempt.
 *
 * Idempotent by design: each call upserts the supplied rows, so a retried or
 * out-of-order request cannot corrupt the answer sheet. Grading still happens
 * only at submit; nothing here reveals correctness.
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();

    const { id } = await context.params;
    const limited = await enforceRateLimit(req, {
      bucket: `attempts:save:${id}`,
      limit: 120,
      windowSec: 5 * 60,
    });
    if (limited) return limited;

    const payload = saveSchema.parse(await req.json());

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        deadlineAt: true,
        startedAt: true,
        configSnapshot: true,
        test: { select: { durationMinutes: true, questions: { select: { questionId: true } } } },
      },
    });
    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (!(await canAccessAttempt(attempt))) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: `Attempt already ${attempt.status.toLowerCase()}`, status: attempt.status },
        { status: 409 },
      );
    }

    const remaining = secondsUntilDeadline(attempt.deadlineAt);
    if (remaining !== null && remaining <= 0) {
      return NextResponse.json(
        { error: "Time is up. Submit the paper to finish.", expired: true, deadlineAt: attempt.deadlineAt },
        { status: 409 },
      );
    }

    // Only questions belonging to this paper may be written.
    const paperQuestionIds = new Set(attempt.test.questions.map((q) => q.questionId));
    const rows = payload.answers.filter((answer) => paperQuestionIds.has(answer.questionId));

    if (rows.length) {
      await prisma.$transaction(
        rows.map((answer) =>
          prisma.questionAttempt.upsert({
            where: {
              attemptId_questionId: { attemptId: id, questionId: answer.questionId },
            },
            create: {
              attemptId: id,
              questionId: answer.questionId,
              selectedOption: answer.selectedOption,
              markedForReview: answer.markedForReview ?? false,
              timeSpentSec: Math.round(answer.timeSpentSec ?? 0),
            },
            update: {
              selectedOption: answer.selectedOption,
              ...(answer.markedForReview === undefined
                ? {}
                : { markedForReview: answer.markedForReview }),
              ...(answer.timeSpentSec === undefined
                ? {}
                : { timeSpentSec: Math.round(answer.timeSpentSec) }),
            },
          }),
        ),
      );
    }

    const savedAt = new Date();
    await prisma.attempt.update({ where: { id }, data: { lastSavedAt: savedAt } });
    await prisma.attemptEvent.create({
      data: {
        attemptId: id,
        type: "AUTOSAVE",
        payload: JSON.stringify({ rows: rows.length, savedAt: savedAt.toISOString() }),
      },
    });

    return NextResponse.json({
      ok: true,
      savedAt,
      savedCount: rows.length,
      deadlineAt: attempt.deadlineAt,
      remainingSec: remaining,
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("attempts/save", error, req);
    return NextResponse.json({ error: "Failed to save answers" }, { status: 500 });
  }
}
