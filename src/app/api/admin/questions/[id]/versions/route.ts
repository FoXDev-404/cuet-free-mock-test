import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requirePermission, writeAudit } from "@/lib/auth/guard";
import { snapshotQuestionVersion, syncQuestionOptions, actorEmailOf, type OptionInput } from "@/lib/admin/question-sync";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const { id } = await params;
  const versions = await prisma.questionVersion.findMany({
    where: { questionId: id },
    orderBy: { versionNo: "desc" },
    select: { id: true, versionNo: true, reason: true, actorEmail: true, createdAt: true },
  });
  return NextResponse.json(versions);
}

// Restore: writes the stored snapshot onto the live row after snapshotting the
// current state, so the restore itself is a versioned, reversible operation.
const restoreSchema = z.object({ versionNo: z.number().int().min(1), reason: z.string().max(300).optional() });

export async function POST(req: Request, { params }: Ctx) {
  const g = await requirePermission("QUESTION_WRITE");
  if (g.error) return g.error;
  const { id } = await params;
  try {
    const body = await req.json();
    const { versionNo, reason } = restoreSchema.parse(body);
    const target = await prisma.questionVersion.findUnique({
      where: { questionId_versionNo: { questionId: id, versionNo } },
    });
    if (!target) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    const snapshot = JSON.parse(target.snapshot) as Record<string, unknown> & { options?: OptionInput[] };
    const email = actorEmailOf(g.session);

    await snapshotQuestionVersion(id, email, `pre-restore of v${versionNo}`);

    const { options, ...row } = snapshot;

    const currentVersion = await prisma.question.findUnique({ where: { id }, select: { version: true } });

    await prisma.question.update({
      where: { id },
      data: {
        subjectId: String(row.subjectId),
        chapterId: (row.chapterId as string) ?? null,
        topicId: (row.topicId as string) ?? null,
        externalId: (row.externalId as string) ?? null,
        type: String(row.type),
        stemEn: String(row.stemEn),
        stemHi: (row.stemHi as string) ?? null,
        richTextEn: (row.richTextEn as string) ?? null,
        optionsEn: String(row.optionsEn),
        optionsHi: (row.optionsHi as string) ?? null,
        correctAnswer: String(row.correctAnswer),
        explanationEn: (row.explanationEn as string) ?? null,
        explanationHi: (row.explanationHi as string) ?? null,
        questionImages: (row.questionImages as string) ?? null,
        language: String(row.language ?? "EN"),
        status: String(row.status ?? "DRAFT"),
        year: (row.year as number) ?? null,
        source: String(row.source ?? "admin"),
        paperShift: (row.paperShift as string) ?? null,
        difficulty: String(row.difficulty ?? "medium"),
        marks: Number(row.marks ?? 5),
        negativeMarks: Number(row.negativeMarks ?? 1),
        isActive: Boolean(row.isActive ?? true),
        version: (currentVersion?.version ?? 1) + 1,
      },
    });

    if (Array.isArray(options) && options.length) {
      await syncQuestionOptions(id, (options as OptionInput[]).map((o) => ({ id: o.id, text: o.text })));
    }

    await writeAudit({
      session: g.session,
      action: "QUESTION_RESTORE_VERSION",
      entityType: "QUESTION",
      entityId: id,
      afterData: { restoredFrom: versionNo },
      reason: reason ?? null,
    });
    return NextResponse.json({ ok: true, restoredFrom: versionNo });
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error("question version restore error", e);
    return NextResponse.json({ error: "Failed to restore version" }, { status: 500 });
  }
}
