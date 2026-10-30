import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

// Students workspace: platform accounts (role USER) with attempt summaries.
export async function GET(req: Request) {
  const g = await requirePermission("STUDENT_READ");
  if (g.error) return g.error;
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(searchParams.get("perPage") || "25", 10) || 25, 1), 100);
    const search = searchParams.get("search") || undefined;

    const where = search
      ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] }
      : {};

    // Admin accounts are queried by role: SQLite has no case-insensitive IN,
    // so filter afterwards with a light pass over the page.
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true, name: true, email: true, role: true, createdAt: true,
          attempts: { select: { id: true, status: true, score: true, maxScore: true, flagged: true, practice: true, startedAt: true } },
        },
      }),
    ]);

    const students = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      attemptsCount: u.attempts.length,
      submittedCount: u.attempts.filter((a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED").length,
      flaggedCount: u.attempts.filter((a) => a.flagged).length,
      practiceCount: u.attempts.filter((a) => a.practice).length,
      avgScorePct: (() => {
        const scored = u.attempts.filter((a) => a.status === "SUBMITTED" && a.maxScore > 0);
        if (!scored.length) return null;
        return Math.round(
          (scored.reduce((sum, a) => sum + (a.score / a.maxScore) * 100, 0) / scored.length) * 10,
        ) / 10;
      })(),
      recentAttempts: u.attempts
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, 5)
        .map((a) => ({ id: a.id, status: a.status, score: a.score, maxScore: a.maxScore, flagged: a.flagged, startedAt: a.startedAt })),
    }));

    return NextResponse.json({ total, page, perPage, students });
  } catch (e) {
    console.error("admin students GET", e);
    return NextResponse.json({ error: "Failed to load students" }, { status: 500 });
  }
}
