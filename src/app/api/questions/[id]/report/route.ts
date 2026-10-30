import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { enforceRateLimit, forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
import { SETTING_KEYS, isSettingEnabled } from "@/lib/settings";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reportSchema = z.object({
  reason: z.enum(["WRONG_ANSWER", "TYPO", "AMBIGUOUS", "MISSING_IMAGE", "OTHER"]),
  details: z.string().trim().max(1000).optional(),
  attemptId: z.string().optional(),
});

/** Learners flag a question for review; keys/explanations are never returned. */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();

    if (!(await isSettingEnabled(SETTING_KEYS.reportsEnabled))) {
      return NextResponse.json(
        { error: "Question reports are temporarily paused. Please try again later." },
        { status: 503 },
      );
    }

    const { userId } = await getSessionUser();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to report a question." },
        { status: 401 },
      );
    }

    const limited = await enforceRateLimit(req, {
      bucket: `question-report:${userId}`,
      limit: 8,
      windowSec: 10 * 60,
      byIp: false,
    });
    if (limited) return limited;

    const { id } = await context.params;
    const input = reportSchema.parse(await req.json());

    const question = await prisma.question.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!question || !question.isActive) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    let attemptId: string | null = null;
    if (input.attemptId) {
      const attempt = await prisma.attempt.findUnique({
        where: { id: input.attemptId },
        select: { id: true, userId: true },
      });
      if (attempt && attempt.userId === userId) attemptId = attempt.id;
    }

    // Collapse accidental double-clicks into one open report.
    const existing = await prisma.questionReport.findFirst({
      where: {
        questionId: id,
        userId,
        reason: input.reason,
        status: { in: ["OPEN", "REVIEWING"] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ id: existing.id, duplicate: true }, { status: 200 });
    }

    const report = await prisma.questionReport.create({
      data: {
        questionId: id,
        userId,
        attemptId,
        reason: input.reason,
        details: input.details || null,
      },
      select: { id: true, status: true, createdAt: true },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("questions/report", error, req);
    return NextResponse.json({ error: "Failed to send report" }, { status: 500 });
  }
}
