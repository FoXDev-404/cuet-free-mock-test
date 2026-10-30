import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { ensureSyntheticTest } from "@/lib/attempts";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Opens an attempt (IN_PROGRESS) and records a START event. The attempt id is
 * carried by the client and required at submit so results can't be triple-
 * counted and abandoned papers are recorded as ABANDONED rather than missing.
 */
export async function POST(req: Request) {
  try {
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

    // Resolve the test (or the practice arena for keyless practice runs).
    let test: { id: string; title: string; slug: string; config: string } | null = null;
    if (input.practice) {
      const arena = await ensureSyntheticTest("practice-arena", "Practice Arena", {
        markingScheme: { correct: 5, incorrect: 1, unattempted: 0 },
        practice: true,
      });
      test = await prisma.test.findUnique({
        where: { id: arena.id },
        select: { id: true, title: true, slug: true, config: true },
      });
    } else if (input.slug) {
      test = await prisma.test.findUnique({
        where: { slug: input.slug },
        select: { id: true, title: true, slug: true, config: true },
      });
    } else if (input.testId) {
      test = await prisma.test.findUnique({
        where: { id: input.testId },
        select: { id: true, title: true, slug: true, config: true },
      });
    }
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    // Resume: reuse an open attempt for the same signed-in user + test.
    let attempt = await prisma.attempt.findFirst({
      where: {
        testId: test.id,
        status: "IN_PROGRESS",
        userId: userId ?? undefined,
      },
      orderBy: { startedAt: "desc" },
      select: { id: true, sessionId: true, startedAt: true },
    });

    if (!attempt) {
      attempt = await prisma.attempt.create({
        data: {
          sessionId: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
          testId: test.id,
          userId,
          status: "IN_PROGRESS",
          configSnapshot: test.config ?? "",
          practice: Boolean(input.practice) || test.slug === "practice-arena",
        },
        select: { id: true, sessionId: true, startedAt: true },
      });
    }

    await prisma.attemptEvent.create({
      data: {
        attemptId: attempt.id,
        type: "START",
        payload: JSON.stringify({ test: test.slug, practice: Boolean(input.practice), userId }),
      },
    });

    return NextResponse.json({
      attemptId: attempt.id,
      sessionId: attempt.sessionId,
      startedAt: attempt.startedAt,
      test: { id: test.id, title: test.title, slug: test.slug },
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: e.issues }, { status: 400 });
    }
    console.error("attempts/start error", e);
    return NextResponse.json({ error: "Failed to start attempt" }, { status: 500 });
  }
}
