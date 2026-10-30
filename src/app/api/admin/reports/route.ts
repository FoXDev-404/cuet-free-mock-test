import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { logApiError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Unified moderation queue for question flags and discussion reports. */
export async function GET(req: Request) {
  const g = await requirePermission("MODERATION_READ");
  if (g.error) return g.error;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "all";
    const status = searchParams.get("status") ?? "OPEN";
    const statusWhere = status === "all" ? undefined : status;

    const [questionReports, discussionReports, questionOpen, discussionOpen] =
      await Promise.all([
        type === "discussion"
          ? []
          : prisma.questionReport.findMany({
              where: statusWhere ? { status: statusWhere } : undefined,
              orderBy: { createdAt: "desc" },
              take: 100,
              include: {
                question: {
                  select: {
                    id: true,
                    stemEn: true,
                    source: true,
                    year: true,
                    subject: { select: { name: true } },
                  },
                },
                user: { select: { id: true, username: true, name: true } },
                attempt: { select: { id: true } },
              },
            }),
        type === "question"
          ? []
          : prisma.discussionReport.findMany({
              where: statusWhere ? { status: statusWhere } : undefined,
              orderBy: { createdAt: "desc" },
              take: 100,
              include: {
                discussion: {
                  select: {
                    id: true,
                    body: true,
                    status: true,
                    createdAt: true,
                    user: { select: { id: true, username: true, name: true } },
                    test: { select: { id: true, title: true, slug: true } },
                    questionId: true,
                  },
                },
                user: { select: { id: true, username: true, name: true } },
              },
            }),
        prisma.questionReport.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
        prisma.discussionReport.count({ where: { status: "OPEN" } }),
      ]);

    return NextResponse.json({
      counts: { questionOpen, discussionOpen, totalOpen: questionOpen + discussionOpen },
      questionReports,
      discussionReports,
    });
  } catch (error) {
    logApiError("admin/reports", error, req);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}
