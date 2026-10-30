import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { can } from "@/lib/auth/permissions";
import { forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Author delete, or moderator hide. Soft delete keeps report history intact. */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();

    const { userId, role } = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const { id } = await context.params;
    const discussion = await prisma.discussion.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });
    if (!discussion || discussion.status === "DELETED") {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    const moderator = can(role, "MODERATION_WRITE");
    if (discussion.userId !== userId && !moderator) {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    await prisma.discussion.update({
      where: { id },
      data: { status: "DELETED", body: "[deleted]" },
    });
    return NextResponse.json({ ok: true, moderator });
  } catch (error) {
    logApiError("discussions/delete", error, req);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
