import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { logApiError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Moderation feed: every discussion state, with report counts. */
export async function GET(req: Request) {
  const g = await requirePermission("MODERATION_READ");
  if (g.error) return g.error;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "VISIBLE";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 30)));
    const where = status === "all" ? {} : { status };

    const [total, discussions] = await Promise.all([
      prisma.discussion.count({ where }),
      prisma.discussion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, username: true, name: true, email: true } },
          test: { select: { id: true, title: true, slug: true } },
          question: { select: { id: true, stemEn: true } },
          _count: { select: { reports: true, replies: true } },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      pageSize,
      discussions: discussions.map((row) => ({
        id: row.id,
        body: row.body,
        status: row.status,
        isPinned: row.isPinned,
        isBestAnswer: row.isBestAnswer,
        upvotes: row.upvotes,
        createdAt: row.createdAt,
        parentId: row.parentId,
        author: row.user.username || row.user.name || row.user.email,
        authorId: row.userId,
        test: row.test,
        questionId: row.questionId,
        questionStem: row.question?.stemEn ?? null,
        reportCount: row._count.reports,
        replyCount: row._count.replies,
      })),
    });
  } catch (error) {
    logApiError("admin/discussions", error, req);
    return NextResponse.json({ error: "Failed to load discussions" }, { status: 500 });
  }
}
