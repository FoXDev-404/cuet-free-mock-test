import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { enforceRateLimit, forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
import { displayUsername } from "@/lib/username";
import { SETTING_KEYS, isSettingEnabled } from "@/lib/settings";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  testId: z.string().optional(),
  questionId: z.string().optional(),
  parentId: z.string().optional(),
  body: z.string().trim().min(3).max(2000),
});

/** Public, username-only discussion feed for a test or a question. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId");
    const questionId = searchParams.get("questionId");
    if (!testId && !questionId) {
      return NextResponse.json(
        { error: "Provide testId or questionId" },
        { status: 400 },
      );
    }

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const sort = searchParams.get("sort") === "top" ? "top" : "new";
    const target = testId ? { testId } : { questionId };
    const where = { ...target, parentId: null, status: "VISIBLE" } as const;

    const { userId } = await getSessionUser();
    const [total, rows] = await Promise.all([
      prisma.discussion.count({ where }),
      prisma.discussion.findMany({
        where,
        orderBy:
          sort === "top"
            ? [{ isPinned: "desc" }, { upvotes: "desc" }, { createdAt: "desc" }]
            : [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, username: true, name: true } },
          votes: userId ? { where: { userId }, select: { id: true } } : false,
          replies: {
            where: { status: "VISIBLE" },
            orderBy: { createdAt: "asc" },
            include: {
              user: { select: { id: true, username: true, name: true } },
              votes: userId ? { where: { userId }, select: { id: true } } : false,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      pageSize,
      discussions: rows.map((row) => ({
        id: row.id,
        body: row.body,
        isPinned: row.isPinned,
        isBestAnswer: row.isBestAnswer,
        upvotes: row.upvotes,
        createdAt: row.createdAt,
        author: displayUsername(row.user),
        authorId: row.userId,
        isOwn: Boolean(userId && row.userId === userId),
        voted: Array.isArray(row.votes) && row.votes.length > 0,
        replies: row.replies.map((reply) => ({
          id: reply.id,
          body: reply.body,
          isBestAnswer: reply.isBestAnswer,
          upvotes: reply.upvotes,
          createdAt: reply.createdAt,
          author: displayUsername(reply.user),
          authorId: reply.userId,
          isOwn: Boolean(userId && reply.userId === userId),
          voted: Array.isArray(reply.votes) && reply.votes.length > 0,
        })),
      })),
    });
  } catch (error) {
    logApiError("discussions/list", error, req);
    return NextResponse.json({ error: "Failed to load discussions" }, { status: 500 });
  }
}

/** Signed-in learners post a question or a single level of replies. */
export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();

    if (!(await isSettingEnabled(SETTING_KEYS.discussionsEnabled))) {
      return NextResponse.json(
        { error: "Discussions are temporarily paused. Please try again later." },
        { status: 503 },
      );
    }

    const { userId } = await getSessionUser();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to join the discussion." },
        { status: 401 },
      );
    }

    const limited = await enforceRateLimit(req, {
      bucket: `discussions:create:${userId}`,
      limit: 6,
      windowSec: 10 * 60,
      byIp: false,
    });
    if (limited) return limited;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, name: true, mutedUntil: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 401 });
    }
    if (user.mutedUntil && user.mutedUntil.getTime() > Date.now()) {
      return NextResponse.json(
        {
          error: `Posting is paused until ${user.mutedUntil.toISOString().slice(0, 10)}.`,
          mutedUntil: user.mutedUntil,
        },
        { status: 403 },
      );
    }

    const input = createSchema.parse(await req.json());
    if (Boolean(input.testId) === Boolean(input.questionId)) {
      return NextResponse.json(
        { error: "Attach the post to exactly one test or question." },
        { status: 400 },
      );
    }

    if (input.testId) {
      const test = await prisma.test.findUnique({
        where: { id: input.testId },
        select: { id: true, status: true, isPublic: true },
      });
      if (!test || test.status !== "PUBLISHED" || !test.isPublic) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
      }
    }
    if (input.questionId) {
      const question = await prisma.question.findUnique({
        where: { id: input.questionId },
        select: { id: true, isActive: true },
      });
      if (!question || !question.isActive) {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }
    }

    if (input.parentId) {
      const parent = await prisma.discussion.findUnique({
        where: { id: input.parentId },
        select: {
          id: true,
          parentId: true,
          status: true,
          testId: true,
          questionId: true,
        },
      });
      if (!parent || parent.status !== "VISIBLE" || parent.parentId) {
        return NextResponse.json(
          { error: "You can reply to a top-level discussion only." },
          { status: 400 },
        );
      }
      if (
        (input.testId && parent.testId !== input.testId) ||
        (input.questionId && parent.questionId !== input.questionId)
      ) {
        return NextResponse.json({ error: "Reply target mismatch" }, { status: 400 });
      }
    }

    const created = await prisma.discussion.create({
      data: {
        testId: input.testId ?? null,
        questionId: input.questionId ?? null,
        parentId: input.parentId ?? null,
        userId,
        body: input.body,
      },
      select: { id: true, body: true, parentId: true, createdAt: true },
    });

    return NextResponse.json(
      {
        ...created,
        author: displayUsername(user),
        upvotes: 0,
        isOwn: true,
        voted: false,
        replies: [],
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("discussions/create", error, req);
    return NextResponse.json({ error: "Failed to post discussion" }, { status: 500 });
  }
}
