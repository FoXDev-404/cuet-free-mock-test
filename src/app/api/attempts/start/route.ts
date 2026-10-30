import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { ensureSyntheticTest } from "@/lib/attempts";
import { setGuestAttemptCookie } from "@/lib/guest-token";
import { enforceRateLimit, forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Opens an attempt (IN_PROGRESS) and records a START event.
 *
 * The server owns the deadline and pins the published test version. Guests
 * receive a signed, attempt-scoped cookie so an unguessable id alone is no
 * longer sufficient to read or submit their paper.
 */
export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();
    const limited = await enforceRateLimit(req, {
      bucket: "attempts:start",
      limit: 30,
      windowSec: 10 * 60,
    });
    if (limited) return limited;

    const body = await req.json();
    const input = z
      .object({
        slug: z.string().optional(),
        testId: z.string().optional(),
        practice: z.boolean().optional(),
      })
      .parse(body);

    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string } | undefined;
    const userId = user?.id ?? null;

    let test: {
      id: string;
      title: string;
      slug: string;
      config: string;
      durationMinutes: number;
    } | null = null;
    if (input.practice) {
      const arena = await ensureSyntheticTest("practice-arena", "Practice Arena", {
        markingScheme: { correct: 5, incorrect: 1, unattempted: 0 },
        practice: true,
      });
      test = await prisma.test.findUnique({
        where: { id: arena.id },
        select: { id: true, title: true, slug: true, config: true, durationMinutes: true },
      });
    } else if (input.slug) {
      test = await prisma.test.findUnique({
        where: { slug: input.slug, status: "PUBLISHED" },
        select: { id: true, title: true, slug: true, config: true, durationMinutes: true },
      });
    } else if (input.testId) {
      test = await prisma.test.findUnique({
        where: { id: input.testId, status: "PUBLISHED" },
        select: { id: true, title: true, slug: true, config: true, durationMinutes: true },
      });
    }
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    const config = safeParseConfig(test.config);
    const configuredDuration = Number(config.durationMinutes ?? test.durationMinutes ?? 60);
    const durationMinutes =
      Number.isFinite(configuredDuration) && configuredDuration > 0 ? configuredDuration : 60;

    // Resume: reuse an open attempt for the same learner + test. A null userId
    // matches only guest attempts, and guests still need their signed cookie.
    const openAttempt = await prisma.attempt.findFirst({
      where: { testId: test.id, status: "IN_PROGRESS", userId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        sessionId: true,
        startedAt: true,
        deadlineAt: true,
        versionId: true,
      },
    });

    let attempt = openAttempt;
    let resumed = Boolean(openAttempt);
    if (openAttempt) {
      const deadline =
        openAttempt.deadlineAt ??
        new Date(openAttempt.startedAt.getTime() + durationMinutes * 60_000);
      if (deadline.getTime() + 30_000 < Date.now()) {
        await prisma.attempt.update({
          where: { id: openAttempt.id },
          data: { status: "ABANDONED", submittedAt: new Date() },
        });
        attempt = null;
        resumed = false;
      } else if (!openAttempt.deadlineAt) {
        await prisma.attempt.update({
          where: { id: openAttempt.id },
          data: { deadlineAt: deadline },
        });
        attempt = { ...openAttempt, deadlineAt: deadline };
      }
    }

    if (!attempt) {
      const version = await prisma.testVersion.findFirst({
        where: { testId: test.id },
        orderBy: { versionNo: "desc" },
        select: { id: true },
      });
      const deadlineAt = new Date(Date.now() + durationMinutes * 60_000);
      attempt = await prisma.attempt.create({
        data: {
          sessionId: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
          testId: test.id,
          userId,
          status: "IN_PROGRESS",
          deadlineAt,
          versionId: version?.id ?? null,
          configSnapshot: test.config ?? "",
          practice: Boolean(input.practice) || test.slug === "practice-arena",
        },
        select: {
          id: true,
          sessionId: true,
          startedAt: true,
          deadlineAt: true,
          versionId: true,
        },
      });
      resumed = false;
    }

    if (!userId) {
      await setGuestAttemptCookie(attempt.id);
    }

    await prisma.attemptEvent.create({
      data: {
        attemptId: attempt.id,
        type: resumed ? "RESUME" : "START",
        payload: JSON.stringify({
          test: test.slug,
          practice: Boolean(input.practice),
          userId,
          deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
        }),
      },
    });

    const deadlineAt =
      attempt.deadlineAt ??
      new Date(attempt.startedAt.getTime() + durationMinutes * 60_000);

    return NextResponse.json({
      attemptId: attempt.id,
      sessionId: attempt.sessionId,
      startedAt: attempt.startedAt,
      deadlineAt,
      serverNow: new Date().toISOString(),
      durationMinutes,
      resumed,
      guest: !userId,
      test: { id: test.id, title: test.title, slug: test.slug },
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: e.issues }, { status: 400 });
    }
    logApiError("attempts/start", e, req);
    return NextResponse.json({ error: "Failed to start attempt" }, { status: 500 });
  }
}

function safeParseConfig(raw: string | null): { durationMinutes?: number } {
  try {
    return typeof raw === "string" ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
