import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { enforceRateLimit, forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
import { SETTING_KEYS, isSettingEnabled } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Toggle an upvote. One vote per learner per post. */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
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
      return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
    }

    const limited = await enforceRateLimit(req, {
      bucket: `discussions:vote:${userId}`,
      limit: 30,
      windowSec: 5 * 60,
      byIp: false,
    });
    if (limited) return limited;

    const { id } = await context.params;
    const discussion = await prisma.discussion.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });
    if (!discussion || discussion.status !== "VISIBLE") {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }
    if (discussion.userId === userId) {
      return NextResponse.json({ error: "You cannot vote on your own post." }, { status: 400 });
    }

    const existing = await prisma.discussionVote.findUnique({
      where: { discussionId_userId: { discussionId: id, userId } },
      select: { id: true },
    });

    const upvotes = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.discussionVote.delete({ where: { id: existing.id } });
        const updated = await tx.discussion.update({
          where: { id },
          data: { upvotes: { decrement: 1 } },
          select: { upvotes: true },
        });
        return Math.max(0, updated.upvotes);
      }
      await tx.discussionVote.create({ data: { discussionId: id, userId } });
      const updated = await tx.discussion.update({
        where: { id },
        data: { upvotes: { increment: 1 } },
        select: { upvotes: true },
      });
      return updated.upvotes;
    });

    return NextResponse.json({ voted: !existing, upvotes });
  } catch (error) {
    logApiError("discussions/vote", error, req);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
