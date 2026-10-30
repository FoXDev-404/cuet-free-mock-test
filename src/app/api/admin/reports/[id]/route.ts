import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { logApiError } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  type: z.enum(["question", "discussion"]),
  status: z.enum(["OPEN", "REVIEWING", "RESOLVED", "REVIEWED", "DISMISSED"]),
  resolutionNote: z.string().trim().max(1000).optional(),
});

/** Resolve or dismiss a report and record the moderator action. */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const g = await requirePermission("MODERATION_WRITE");
  if (g.error) return g.error;

  try {
    const { id } = await context.params;
    const input = patchSchema.parse(await req.json());
    const email = (g.session.user as { email?: string }).email ?? null;

    if (input.type === "question") {
      const before = await prisma.questionReport.findUnique({
        where: { id },
        select: { id: true, status: true, questionId: true },
      });
      if (!before) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      const updated = await prisma.questionReport.update({
        where: { id },
        data: {
          status: input.status === "REVIEWED" ? "RESOLVED" : input.status,
          resolutionNote: input.resolutionNote || null,
          resolvedBy: email,
        },
        select: { id: true, status: true },
      });
      await writeAudit({
        session: g.session,
        action: "QUESTION_REPORT_UPDATE",
        entityType: "QUESTION_REPORT",
        entityId: id,
        beforeData: before,
        afterData: { status: updated.status, note: input.resolutionNote ?? null },
      });
      return NextResponse.json(updated);
    }

    if (!["OPEN", "REVIEWED", "DISMISSED"].includes(input.status)) {
      return NextResponse.json(
        { error: "Discussion reports use OPEN, REVIEWED or DISMISSED" },
        { status: 400 },
      );
    }
    const before = await prisma.discussionReport.findUnique({
      where: { id },
      select: { id: true, status: true, discussionId: true },
    });
    if (!before) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const updated = await prisma.discussionReport.update({
      where: { id },
      data: { status: input.status },
      select: { id: true, status: true },
    });
    await writeAudit({
      session: g.session,
      action: "DISCUSSION_REPORT_UPDATE",
      entityType: "DISCUSSION_REPORT",
      entityId: id,
      beforeData: before,
      afterData: { status: updated.status, note: input.resolutionNote ?? null },
    });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("admin/reports/[id]", error, req);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
