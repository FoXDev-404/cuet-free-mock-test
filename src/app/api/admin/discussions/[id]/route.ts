import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { logApiError } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["VISIBLE", "PENDING", "HIDDEN", "DELETED"]).optional(),
  isPinned: z.boolean().optional(),
  isBestAnswer: z.boolean().optional(),
  muteUserId: z.boolean().optional(),
  muteHours: z.number().int().min(1).max(24 * 90).optional(),
});

/** Moderator actions on a discussion, including a temporary posting mute. */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const g = await requirePermission("MODERATION_WRITE");
  if (g.error) return g.error;

  try {
    const { id } = await context.params;
    const input = patchSchema.parse(await req.json());

    const before = await prisma.discussion.findUnique({
      where: { id },
      select: { id: true, status: true, isPinned: true, userId: true },
    });
    if (!before) {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    const updated = await prisma.discussion.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.isPinned === undefined ? {} : { isPinned: input.isPinned }),
        ...(input.isBestAnswer === undefined ? {} : { isBestAnswer: input.isBestAnswer }),
      },
      select: { id: true, status: true, isPinned: true, isBestAnswer: true },
    });

    let mutedUntil: Date | null = null;
    if (input.muteUserId) {
      mutedUntil = new Date(Date.now() + (input.muteHours ?? 24) * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: before.userId },
        data: { mutedUntil },
      });
    }

    await writeAudit({
      session: g.session,
      action: "DISCUSSION_MODERATE",
      entityType: "DISCUSSION",
      entityId: id,
      beforeData: before,
      afterData: { ...updated, mutedUntil, muteHours: input.muteHours ?? null },
    });

    return NextResponse.json({ ...updated, mutedUntil });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("admin/discussions/[id]", error, req);
    return NextResponse.json({ error: "Failed to moderate discussion" }, { status: 500 });
  }
}

/** Hard delete is never offered: moderation uses a recoverable soft delete. */
export async function DELETE() {
  return NextResponse.json(
    { error: "Use PATCH with status DELETED (soft delete) instead." },
    { status: 405 },
  );
}
