import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import {
  syncQuestionOptions,
  setCorrectOptions,
  isCorrectChoice,
  snapshotQuestionVersion,
  actorEmailOf,
  type OptionInput,
} from "@/lib/admin/question-sync";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type StagedRow = {
  rowNumber: number;
  ok: boolean;
  data: (QuestionInputShape & { stemHash?: string }) | null;
  errors: { rowNumber: number; field?: string; code: string; message: string }[];
  warnings: { field?: string; code: string; message: string }[];
  duplicate: { code: string; againstRow: number } | null;
};

type QuestionInputShape = {
  subjectId?: string;
  chapterName?: string;
  topicName?: string;
  externalId?: string;
  type: string;
  stemEn: string;
  stemHi?: string;
  richTextEn?: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanationEn?: string;
  explanationHi?: string;
  questionImages?: { url: string; alt?: string }[];
  language: string;
  status: string;
  year?: number;
  source?: string;
  paperShift?: string;
  difficulty: string;
  marks: number;
  negativeMarks: number;
  tags: string[];
  answerReviewStatus: string;
};

const COMMIT_BATCH = 100; // rows per request — resumable within free-plan CPU

// ------------------------------------------------------------------- detail

export async function GET(_req: Request, { params }: Ctx) {
  const g = await requirePermission("IMPORT_READ");
  if (g.error) return g.error;
  const { id } = await params;
  try {
    const job = await prisma.importJob.findUnique({
      where: { id },
      include: { _count: { select: { errors: true } } },
    });
    if (!job) return NextResponse.json({ error: "Import job not found" }, { status: 404 });
    const errors = await prisma.importError.findMany({
      where: { jobId: id },
      orderBy: { rowNumber: "asc" },
      take: 500,
    });
    let staged: StagedRow[] = [];
    if (job.stagedData) {
      try {
        const envelope = JSON.parse(job.stagedData) as { rows?: StagedRow[] };
        staged = (envelope.rows ?? []).slice(0, 200); // preview only
      } catch {
        staged = [];
      }
    }
    return NextResponse.json({
      job: { ...job, stagedData: undefined },
      errors,
      preview: staged.map((s) => ({
        rowNumber: s.rowNumber,
        ok: s.ok,
        duplicate: s.duplicate?.code ?? null,
        stem: s.data?.stemEn?.slice(0, 140) ?? null,
        optionsCount: s.data?.options?.length ?? 0,
        correctAnswer: s.data?.correctAnswer || null,
        status: s.data?.status ?? null,
        warnings: s.warnings.map((w) => w.code),
      })),
    });
  } catch (e) {
    console.error("import GET", e);
    return NextResponse.json({ error: "Failed to load import job" }, { status: 500 });
  }
}

// ------------------------------------------------------------------ actions

const actionSchema = z.object({
  action: z.enum(["commit", "resume", "rollback", "cancel"]),
});

export async function POST(req: Request, { params }: Ctx) {
  const g = await requirePermission("IMPORT_RUN");
  if (g.error) return g.error;
  const { id } = await params;
  try {
    const body = await req.json();
    const { action } = actionSchema.parse(body);
    const job = await prisma.importJob.findUnique({ where: { id } });
    if (!job) return NextResponse.json({ error: "Import job not found" }, { status: 404 });
    if (action === "cancel") return cancelJob(g, job.id, job.processedUpTo);
    if (action === "rollback") return rollbackJob(g, id, job.processedUpTo);
    if (job.mode !== "COMMIT") {
      return NextResponse.json({ error: "DRY_RUN jobs cannot be committed" }, { status: 400 });
    }
    if (["ROLLED_BACK", "FAILED"].includes(job.status)) {
      return NextResponse.json({ error: `Job is ${job.status}; not processable` }, { status: 409 });
    }
    return commitChunk(g, job);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("import POST", e);
    return NextResponse.json({ error: "Import action failed" }, { status: 500 });
  }
}

type SessionOf = Awaited<ReturnType<typeof requirePermission>>["session"];

async function cancelJob(g: { session: SessionOf }, jobId: string, processedUpTo: number) {
  const job = await prisma.importJob.update({
    where: { id: jobId },
    data: { status: "FAILED", errorDetails: `Cancelled by admin after ${processedUpTo} rows`, finishedAt: new Date() },
  });
  await writeAudit({ session: g.session, action: "IMPORT_JOB_CANCEL", entityType: "IMPORT_JOB", entityId: jobId, afterData: { status: job.status } });
  return NextResponse.json({ job: { ...job, stagedData: undefined } });
}

async function rollbackJob(g: { session: SessionOf }, jobId: string, processedUpTo: number) {
  if (processedUpTo === 0) {
    return NextResponse.json({ error: "Nothing was committed for this job yet" }, { status: 409 });
  }
  const sourceTag = `import:${jobId}`;
  const imported = await prisma.question.findMany({
    where: { source: { startsWith: sourceTag } },
    select: { id: true },
  });
  let deleted = 0;
  let archived = 0;
  for (const q of imported) {
    const attempts = await prisma.questionAttempt.count({ where: { questionId: q.id } });
    if (attempts === 0) {
      await prisma.questionTag.deleteMany({ where: { questionId: q.id } });
      await prisma.questionVersion.deleteMany({ where: { questionId: q.id } });
      await prisma.questionOption.deleteMany({ where: { questionId: q.id } });
      await prisma.testQuestionLink.deleteMany({ where: { questionId: q.id } });
      await prisma.bookmark.deleteMany({ where: { questionId: q.id } });
      await prisma.questionReview.deleteMany({ where: { questionId: q.id } });
      await prisma.question.delete({ where: { id: q.id } });
      deleted++;
    } else {
      // Preserve immutable attempt history — archive instead (spec §10/§16).
      await prisma.question.update({ where: { id: q.id }, data: { isActive: false, status: "ARCHIVED" } });
      archived++;
    }
  }
  const job = await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "ROLLED_BACK",
      errorDetails: `Rollback: ${deleted} deleted, ${archived} archived (had attempt history)`,
      finishedAt: new Date(),
    },
  });
  await writeAudit({
    session: g.session,
    action: "IMPORT_ROLLBACK",
    entityType: "IMPORT_JOB",
    entityId: jobId,
    afterData: { deleted, archived },
  });
  return NextResponse.json({ job: { ...job, stagedData: undefined }, deleted, archived });
}

// ---------------------------------------------------------------- commit

type Envelope = { options?: CommitOptions; rows?: StagedRow[] };
type CommitOptions = {
  subjectId: string;
  autoCreateChapters: boolean;
  autoCreateTopics: boolean;
  updateExisting: boolean;
  defaultSource?: string;
};

async function commitChunk(
  g: { session: SessionOf },
  job: NonNullable<Awaited<ReturnType<typeof prisma.importJob.findUnique>>>,
) {
  let envelope: Envelope;
  try {
    envelope = JSON.parse(job.stagedData ?? "{}") as Envelope;
  } catch {
    return NextResponse.json({ error: "Job's staged data is corrupted" }, { status: 500 });
  }
  const staged = envelope.rows ?? [];
  if (staged.length === 0) {
    return NextResponse.json({ error: "Job has no staged rows to commit" }, { status: 409 });
  }
  const opts: CommitOptions = envelope.options ?? {
    subjectId: "",
    autoCreateChapters: true,
    autoCreateTopics: true,
    updateExisting: false,
  };

  const startIdx = job.processedUpTo;
  if (startIdx >= staged.length) {
    // Nothing left — finalize if a previous chunk ended exactly on the edge.
    if (job.status !== "COMPLETED") {
      await prisma.importJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED", finishedAt: new Date() },
      });
      await writeAudit({
        session: g.session,
        action: "IMPORT_COMMIT",
        entityType: "IMPORT_JOB",
        entityId: job.id,
        afterData: { total: job.totalRecords, inserted: job.insertedCount, updated: job.updatedCount, skipped: job.skippedCount, duplicates: job.duplicateCount, failed: job.failedCount },
      });
    }
    return NextResponse.json({ done: true, processedUpTo: job.processedUpTo });
  }

  const batch = staged.slice(startIdx, startIdx + COMMIT_BATCH);
  const email = actorEmailOf(g.session);

  // Aggregate lookups for this batch: subject examId + chapter/topic name maps.
  const subject = await prisma.subject.findUnique({
    where: { id: opts.subjectId },
    select: { examId: true },
  });
  const chapterMap = new Map<string, string>(); // lower(name) -> id
  const topicMap = new Map<string, string>(); // `${chapterId}:${lower(name)}` -> id
  try {
    const chapterRows = await prisma.chapter.findMany({
      where: { subjectId: opts.subjectId },
      select: { id: true, name: true },
    });
    for (const c of chapterRows) chapterMap.set(c.name.toLowerCase(), c.id);
    for (const row of batch) {
      const cn = row.data?.chapterName;
      const tn = row.data?.topicName;
      if (!cn || !tn) continue;
      const chapterId = chapterMap.get(cn.toLowerCase());
      if (!chapterId) continue;
      const topicRows = await prisma.topic.findMany({
        where: { chapterId },
        select: { id: true, name: true },
      });
      for (const t of topicRows) topicMap.set(`${chapterId}:${t.name.toLowerCase()}`, t.id);
    }
  } catch (e) {
    console.error("import chapter lookup", e);
  }

  // Retry-safe dup re-checks at commit time (fresh IN queries per batch). This
  // also makes a partially-crashed chunk fully idempotent on re-run: anything
  // this job already inserted is detected and counted without duplicating.
  const batchExternalIds = batch.filter((r) => r.data?.externalId).map((r) => r.data!.externalId!);
  const batchHashes = batch.filter((r) => r.data?.stemHash).map((r) => r.data!.stemHash!);
  const [dbExternal, dbHash] = await Promise.all([
    batchExternalIds.length
      ? prisma.question.findMany({
          where: { externalId: { in: [...new Set(batchExternalIds)] } },
          select: { id: true, externalId: true, source: true },
        })
      : Promise.resolve([] as { id: string; externalId: string | null; source: string | null }[]),
    batchHashes.length
      ? prisma.question.findMany({
          where: { stemHash: { in: [...new Set(batchHashes)] } },
          select: { id: true, stemHash: true },
        })
      : Promise.resolve([] as { id: string; stemHash: string | null }[]),
  ]);
  const dbExternalRows = new Map(dbExternal.filter((q) => q.externalId).map((q) => [q.externalId as string, q]));
  const dbHashIds = new Set(dbHash.map((q) => q.stemHash));
  const ownSourceTag = `import:${job.id}`;

  // Per-chunk counters (added to the job row at the checkpoint).
  let inserted = 0, updated = 0, skipped = 0, duplicated = 0, runtimeFailed = 0;
  const runtimeErrors: Array<{ jobId: string; rowNumber: number; field?: string; code: string; message: string; raw?: string }> = [];

  const ensureChapter = async (name: string): Promise<string | null> => {
    const key = name.toLowerCase();
    const existing = chapterMap.get(key);
    if (existing) return existing;
    if (!opts.autoCreateChapters) return null;
    const created = await prisma.chapter.create({ data: { subjectId: opts.subjectId, name, order: 0 } });
    chapterMap.set(key, created.id);
    return created.id;
  };
  const ensureTopic = async (chapterId: string | null, name: string): Promise<string | null> => {
    if (!chapterId) return null;
    const key = `${chapterId}:${name.toLowerCase()}`;
    const existing = topicMap.get(key);
    if (existing) return existing;
    if (!opts.autoCreateTopics) return null;
    const created = await prisma.topic.create({ data: { chapterId, name, order: 0 } });
    topicMap.set(key, created.id);
    return created.id;
  };

  for (const row of batch) {
    try {
      if (!row.ok || !row.data) { skipped++; continue; }
      const data = row.data;

      // Content duplicates stay skipped regardless of update mode.
      if (row.duplicate?.code === "CONTENT_DUPLICATE" || dbHashIds.has(data.stemHash ?? "")) {
        duplicated++;
        continue;
      }

      const existingByExternal = data.externalId ? dbExternalRows.get(data.externalId) : undefined;
      if (existingByExternal) {
        // Retry re-seeing this job's own inserts: count as done, don't touch.
        if (existingByExternal.source === ownSourceTag) { inserted++; continue; }
        if (row.duplicate?.code === "DUPLICATE_EXTERNAL_ID" && !opts.updateExisting) {
          duplicated++;
          continue;
        }
        if (opts.updateExisting) {
          await updateFromRow(job.id, email, existingByExternal.id, data, opts);
          updated++;
          continue;
        }
        duplicated++;
        runtimeErrors.push({ jobId: job.id, rowNumber: row.rowNumber, code: "DUPLICATE_EXTERNAL_ID", message: `Duplicate of existing question ${existingByExternal.id}` });
        continue;
      }

      const chapterId = data.chapterName ? await ensureChapter(data.chapterName) : null;
      const topicId = data.topicName ? await ensureTopic(chapterId, data.topicName) : null;

      // Normalize numeric correct keys into option labels before compare.
      let correctKey = data.correctAnswer;
      const asIndex = correctKey.match(/^([1-9])$/);
      if (asIndex) correctKey = String.fromCharCode(64 + parseInt(asIndex[1], 10));

      const created = await prisma.question.create({
        data: {
          subjectId: opts.subjectId,
          ...(chapterId ? { chapterId } : {}),
          ...(topicId ? { topicId } : {}),
          ...(subject?.examId ? { examId: subject.examId } : {}),
          ...(data.externalId ? { externalId: data.externalId } : {}),
          type: data.type,
          stemEn: data.stemEn,
          ...(data.stemHi ? { stemHi: data.stemHi } : {}),
          ...(data.richTextEn ? { richTextEn: data.richTextEn } : {}),
          optionsEn: JSON.stringify(data.options),
          correctAnswer: correctKey,
          ...(data.explanationEn ? { explanationEn: data.explanationEn } : {}),
          ...(data.explanationHi ? { explanationHi: data.explanationHi } : {}),
          ...(data.questionImages ? { questionImages: JSON.stringify(data.questionImages) } : {}),
          language: data.language,
          status: data.status,
          ...(data.year !== undefined ? { year: data.year } : {}),
          source: ownSourceTag,
          ...(data.paperShift ? { paperShift: data.paperShift } : {}),
          difficulty: data.difficulty,
          marks: data.marks,
          negativeMarks: data.negativeMarks,
          questionNumber: row.rowNumber,
          answerReviewStatus: data.answerReviewStatus,
          stemHash: data.stemHash ?? null,
        },
      });
      await postInsertOptions(created.id, correctKey, data);
      if (data.tags.length) {
        await prisma.questionTag.createMany({
          data: data.tags.map((label) => ({ questionId: created.id, label })),
        });
      }
      inserted++;
    } catch (e) {
      runtimeFailed++;
      runtimeErrors.push({
        jobId: job.id,
        rowNumber: row.rowNumber,
        code: "INSERT_FAILED",
        message: ((e as Error).message ?? "insert failed").slice(0, 300),
        raw: (row.data?.stemEn ?? "").slice(0, 120),
      });
    }
  }

  const processedUpTo = startIdx + batch.length;
  const finished = processedUpTo >= staged.length;
  const updatedJob = await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: finished ? "COMPLETED" : "IMPORTING",
      processedUpTo,
      insertedCount: job.insertedCount + inserted,
      updatedCount: job.updatedCount + updated,
      skippedCount: job.skippedCount + skipped,
      duplicateCount: job.duplicateCount + duplicated,
      failedCount: job.failedCount + runtimeFailed,
      errorDetails: finished && runtimeFailed > 0 ? `${runtimeFailed} row(s) failed during commit` : job.errorDetails,
      startedAt: job.startedAt ?? new Date(),
      finishedAt: finished ? new Date() : null,
    },
  });
  if (runtimeErrors.length) await prisma.importError.createMany({ data: runtimeErrors });
  if (finished) {
    await writeAudit({
      session: g.session,
      action: "IMPORT_COMMIT",
      entityType: "IMPORT_JOB",
      entityId: job.id,
      afterData: { total: updatedJob.totalRecords, inserted: updatedJob.insertedCount, updated: updatedJob.updatedCount, skipped: updatedJob.skippedCount, duplicates: updatedJob.duplicateCount, failed: updatedJob.failedCount },
    });
  }
  return NextResponse.json({
    done: finished,
    processedUpTo,
    delta: { inserted, updated, skipped, duplicated, runtimeFailed },
    job: { ...updatedJob, stagedData: undefined },
  });
}

/** Normalized options + write-through JSON cache, mirroring the create route. */
async function postInsertOptions(
  questionId: string,
  correctKey: string,
  data: QuestionInputShape,
): Promise<void> {
  const optionIds = await syncQuestionOptions(questionId, data.options as OptionInput[]);
  const correctIds = optionIds.filter((oid) => isCorrectChoice(oid, correctKey));
  await setCorrectOptions(questionId, correctIds);
  const resolvedOptions = (data.options as OptionInput[]).map((o, i) => ({ id: optionIds[i], text: o.text }));
  await prisma.question.update({
    where: { id: questionId },
    data: {
      optionsEn: JSON.stringify(resolvedOptions),
      ...(correctIds[0] && correctIds[0] !== correctKey ? { correctAnswer: correctIds[0] } : {}),
    },
  });
}

async function updateFromRow(
  jobId: string,
  email: string,
  existingId: string,
  data: QuestionInputShape & { stemHash?: string },
  opts: CommitOptions,
): Promise<void> {
  await snapshotQuestionVersion(existingId, email, `import update (job ${jobId})`);
  const chapterId = data.chapterName
    ? (await prisma.chapter.findFirst({ where: { subjectId: opts.subjectId, name: { equals: data.chapterName } }, select: { id: true } }))?.id ?? null
    : null;
  await prisma.question.update({
    where: { id: existingId },
    data: {
      type: data.type,
      stemEn: data.stemEn,
      optionsEn: JSON.stringify(data.options),
      correctAnswer: data.correctAnswer,
      ...(data.explanationEn !== undefined ? { explanationEn: data.explanationEn } : {}),
      status: data.status,
      difficulty: data.difficulty,
      marks: data.marks,
      negativeMarks: data.negativeMarks,
      ...(chapterId !== null ? { chapterId } : {}),
      ...(data.stemHash ? { stemHash: data.stemHash } : {}),
    },
  });
  await postInsertOptions(existingId, data.correctAnswer, data);
  await prisma.questionTag.deleteMany({ where: { questionId: existingId } });
  if (data.tags.length) {
    await prisma.questionTag.createMany({ data: data.tags.map((label) => ({ questionId: existingId, label })) });
  }
}
