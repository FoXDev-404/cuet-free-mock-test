import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { enforceRateLimit, forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
import { SETTING_KEYS, isSettingEnabled } from "@/lib/settings";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reportSchema = z.object({
  reason: z.enum(["SPAM", "ABUSE", "OFF_TOPIC", "OTHER"]),
  details: z.string().trim().max(1000).optional(),
});

/** Reader report. It never hides the post automatically; moderators decide. */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();

    if (!(await isSettingEnabled(SETTING_KEYS.reportsEnabled))) {
      return NextResponse.json(
        { error: "Reports are temporarily paused. Please try again later." },
        { status: 503 },
      );
    }

    const { userId } = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Sign in to report a post." }, { status: 401 });
    }

    const limited = await enforceRateLimit(req, {
      bucket: `discussions:report:${userId}`,
      limit: 8,
      windowSec: 10 * 60,
      byIp: false,
    });
    if (limited) return limited;

    const { id } = await context.params;
    const input = reportSchema.parse(await req.json());

    const discussion = await prisma.discussion.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });
    if (!discussion || discussion.status !== "VISIBLE") {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }
    if (discussion.userId === userId) {
      return NextResponse.json({ error: "You cannot report your own post." }, { status: 400 });
    }

    try {
      const report = await prisma.discussionReport.create({
        data: {
          discussionId: id,
          userId,
          reason: input.reason,
          details: input.details || null,
        },
        select: { id: true, status: true, createdAt: true },
      });
      return NextResponse.json(report, { status: 201 });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        return NextResponse.json({ error: "You already reported this post." }, { status: 409 });
      }
      throw error;
    }
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("discussions/report", error, req);
    return NextResponse.json({ error: "Failed to report post" }, { status: 500 });
  }
}
