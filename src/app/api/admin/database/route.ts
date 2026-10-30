import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { hashStem } from "@/lib/admin/import-normalize";

export const dynamic = "force-dynamic";

// DATABASE_TOOLS (SUPER_ADMIN only): read-only JSON export of content tables
// plus maintenance actions. Never exposes password hashes or sessions.
export async function GET(req: Request) {
  const g = await requirePermission("DATABASE_TOOLS");
  if (g.error) return g.error;
  try {
    const { searchParams } = new URL(req.url);
    const resource = searchParams.get("resource") || "counts";
    if (resource === "counts") {
      const [questions, subjects, chapters, topics, tests, attempts, users, imports, auditLogs, leaderboardConfigs] = await Promise.all([
        prisma.question.count(), prisma.subject.count(), prisma.chapter.count(), prisma.topic.count(),
        prisma.test.count(), prisma.attempt.count(), prisma.user.count(), prisma.importJob.count(),
        prisma.adminAuditLog.count(), prisma.leaderboardConfig.count(),
      ]);
      return NextResponse.json({ questions, subjects, chapters, topics, tests, attempts, users, imports, auditLogs, leaderboardConfigs });
    }

    switch (resource) {
      case "questions":
        return NextResponse.json(await prisma.question.findMany({
          select: {
            id: true, stemEn: true, type: true, difficulty: true, status: true, subjectId: true,
            chapterId: true, topicId: true, examId: true, externalId: true, year: true,
            marks: true, negativeMarks: true, isActive: true, createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5000,
        }));
      case "tests":
        return NextResponse.json(await prisma.test.findMany({
          select: { id: true, title: true, slug: true, type: true, status: true, totalQuestions: true, durationMinutes: true, createdAt: true },
          orderBy: { createdAt: "desc" }, take: 1000,
        }));
      case "imports":
        return NextResponse.json(await prisma.importJob.findMany({
          select: {
            id: true, filename: true, format: true, mode: true, status: true, totalRecords: true,
            insertedCount: true, updatedCount: true, skippedCount: true, duplicateCount: true,
            failedCount: true, actorEmail: true, createdAt: true, finishedAt: true,
          },
          orderBy: { createdAt: "desc" }, take: 500,
        }));
      default:
        return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
    }
  } catch (e) {
    console.error("database tools GET", e);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}

// Maintenance: recompute missing stemHash fingerprints (content-duplicate
// detection needs them on rows created before hashing existed).
export async function POST(req: Request) {
  const g = await requirePermission("DATABASE_TOOLS");
  if (g.error) return g.error;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action !== "backfill-stem-hash") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    let processed = 0;
    let batch: Array<{ id: string; stemEn: string; optionsEn: string }> = [];
    do {
      batch = await prisma.question.findMany({
        where: { stemHash: null, isActive: true },
        select: { id: true, stemEn: true, optionsEn: true },
        take: 100,
      });
      for (const q of batch) {
        let options: { text: string }[] = [];
        try {
          const parsed = typeof q.optionsEn === "string" ? JSON.parse(q.optionsEn) : q.optionsEn;
          options = Array.isArray(parsed) ? parsed : [];
        } catch {
          options = [];
        }
        const hash = await hashStem(q.stemEn, options.map((o) => o.text ?? ""));
        await prisma.question.update({ where: { id: q.id }, data: { stemHash: hash } });
        processed++;
      }
    } while (batch.length === 100);

    await writeAudit({
      session: g.session,
      action: "DATABASE_BACKFILL_STEM_HASH",
      entityType: "SYSTEM",
      afterData: { processed },
    });
    return NextResponse.json({ ok: true, processed });
  } catch (e) {
    console.error("database tools POST", e);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
