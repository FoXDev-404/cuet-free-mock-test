import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import {
  parsePayload,
  normalizeRow,
  hashStem,
  IMPORT_ROW_CAP,
  type NormalizedRow,
  type QuestionInput,
  type ImportFormat,
} from "@/lib/admin/import-normalize";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------- list jobs

export async function GET(req: Request) {
  const g = await requirePermission("IMPORT_READ");
  if (g.error) return g.error;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10) || 50, 200);
  try {
    const [jobs, total] = await Promise.all([
      prisma.importJob.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { _count: { select: { errors: true } } },
      }),
      prisma.importJob.count({ where: status ? { status } : undefined }),
    ]);
    return NextResponse.json({ total, jobs: jobs.map((j) => ({ ...j, stagedData: undefined })) });
  } catch (e) {
    console.error("imports GET", e);
    return NextResponse.json({ error: "Failed to list import jobs" }, { status: 500 });
  }
}

// ------------------------------------------------------- create + validate

const OPTIONS_SCHEMA = z.object({
  subjectId: z.string().min(1),
  autoCreateChapters: z.boolean().default(true),
  autoCreateTopics: z.boolean().default(true),
  defaultYear: z.number().int().min(1990).max(2100).optional(),
  defaultSource: z.string().max(120).optional(),
  defaultStatus: z.enum(["DRAFT", "PENDING_VALIDATION", "UNDER_REVIEW", "APPROVED"]).default("DRAFT"),
  defaultMarks: z.number().int().min(1).max(100).default(5),
  defaultNegativeMarks: z.number().int().min(0).max(100).default(1),
  updateExisting: z.boolean().default(false),
});

const createSchema = z.object({
  filename: z.string().max(255).default("pasted-payload"),
  format: z.enum(["JSON", "CSV", "PASTE"]),
  mode: z.enum(["DRY_RUN", "COMMIT"]),
  payload: z.string().min(2).max(4_000_000),
  options: OPTIONS_SCHEMA,
});

export async function POST(req: Request) {
  const g = await requirePermission("IMPORT_RUN");
  if (g.error) return g.error;
  const email =
    ((g.session.user as { email?: string }).email) ?? "admin";
  try {
    const body = await req.json();
    const input = createSchema.parse(body);
    const opts = input.options;

    // Subject must exist — the UI supplies the import target.
    const subject = await prisma.subject.findUnique({
      where: { id: opts.subjectId },
      select: { id: true, name: true, examId: true },
    });
    if (!subject) return NextResponse.json({ error: "Target subject not found" }, { status: 400 });

    let rawRows: Record<string, unknown>[];
    try {
      rawRows = parsePayload(input.format as ImportFormat, input.payload);
    } catch (e) {
      return NextResponse.json({ error: `Failed to parse payload: ${(e as Error).message}` }, { status: 400 });
    }
    if (rawRows.length === 0) return NextResponse.json({ error: "Payload contains no rows" }, { status: 400 });
    if (rawRows.length > IMPORT_ROW_CAP) {
      return NextResponse.json(
        { error: `Payload has ${rawRows.length} rows; max ${IMPORT_ROW_CAP} per job` },
        { status: 400 },
      );
    }

    // Validation pass: normalize rows, hash content, detect in-batch and
    // existing duplicates via one IN query per axis.
    const rows: NormalizedRow[] = [];
    for (let i = 0; i < rawRows.length; i++) {
      rows.push(normalizeRow(rawRows[i], i + 1, {
        defaultSubjectId: subject.id,
        defaultYear: opts.defaultYear,
        defaultSource: opts.defaultSource,
        defaultStatus: opts.defaultStatus,
        defaultMarks: opts.defaultMarks,
        defaultNegativeMarks: opts.defaultNegativeMarks,
      }));
    }

    const validRows = rows.filter((r) => r.ok);
    // Content hash per valid row (resume-safe: stored on stage).
    for (const r of validRows) {
      const d = r.data as QuestionInput & { stemHash?: string };
      d.stemHash = await hashStem(d.stemEn, d.options.map((o) => o.text));
    }

    // In-batch duplicate detection (externalId + content hash).
    const batchSeen = new Map<string, number>(); // externalId -> first rowNumber
    const hashSeen = new Map<string, number>();
    const dupMarkers = new Map<number, { code: string; againstRow: number }>();
    for (const r of validRows) {
      const d = r.data as QuestionInput & { stemHash?: string };
      if (d.externalId) {
        const prev = batchSeen.get(d.externalId);
        if (prev !== undefined) {
          dupMarkers.set(r.rowNumber, { code: "DUPLICATE_EXTERNAL_ID", againstRow: prev });
          continue;
        }
        batchSeen.set(d.externalId, r.rowNumber);
      }
      const hashPrev = hashSeen.get(d.stemHash ?? "");
      if (hashPrev !== undefined) {
        dupMarkers.set(r.rowNumber, { code: "CONTENT_DUPLICATE", againstRow: hashPrev });
        continue;
      }
      hashSeen.set(d.stemHash ?? "", r.rowNumber);
    }

    // Existing questions in the DB — both axes in two batched queries.
    const externalIds = [...batchSeen.keys()];
    const hashes = [...hashSeen.keys()];
    const [dbExternal, dbHash] = await Promise.all([
      externalIds.length
        ? prisma.question.findMany({ where: { externalId: { in: externalIds } }, select: { externalId: true, id: true } })
        : Promise.resolve([] as { externalId: string | null; id: string }[]),
      hashes.length
        ? prisma.question.findMany({ where: { stemHash: { in: hashes } }, select: { stemHash: true, id: true } })
        : Promise.resolve([] as { stemHash: string | null; id: string }[]),
    ]);
    const dbExternalMap = new Map(dbExternal.filter((q) => q.externalId).map((q) => [q.externalId as string, q.id]));
    const dbHashMap = new Map(
      dbHash.filter((q) => q.stemHash).map((q) => [q.stemHash as string, q.id]),
    );

    // Merge DB-duplicate markers (only for rows not already flagged in-batch).
    for (const r of validRows) {
      const d = r.data as QuestionInput & { stemHash?: string };
      if (dupMarkers.has(r.rowNumber)) continue;
      if (d.externalId && dbExternalMap.has(d.externalId)) {
        dupMarkers.set(r.rowNumber, { code: "DUPLICATE_EXTERNAL_ID", againstRow: -1 });
      } else if (d.stemHash && dbHashMap.has(d.stemHash)) {
        dupMarkers.set(r.rowNumber, { code: "CONTENT_DUPLICATE", againstRow: -1 });
      }
    }

    // Staged rows = validation result + dup marker; the commit pass consumes
    // this array exactly (resume-safe via processedUpTo). updateExisting rows
    // remain ok=true so the commit pass can refresh instead of skipping them.
    const staged = rows.map((r) => {
      const dup = dupMarkers.get(r.rowNumber) ?? null;
      const dupIsUpdatable = dup?.code === "DUPLICATE_EXTERNAL_ID" && opts.updateExisting;
      return {
        rowNumber: r.rowNumber,
        ok: r.ok && (dup === null || dupIsUpdatable),
        data: r.data ?? null,
        errors: r.errors,
        warnings: r.warnings,
        duplicate: dup,
      };
    });

    const failedCount = rows.filter((r) => !r.ok).length;
    const duplicateCount = dupMarkers.size;

    const job = await prisma.importJob.create({
      data: {
        filename: input.filename,
        source: input.mode === "DRY_RUN" ? "MANUAL" : "MANUAL",
        format: input.format,
        mode: input.mode,
        status: input.mode === "DRY_RUN" ? "COMPLETED" : "VALIDATED",
        totalRecords: rawRows.length,
        failedCount,
        duplicateCount,
        stagedData: JSON.stringify({ options: opts, rows: staged }),
        processedUpTo: 0,
        actorEmail: email,
        startedAt: new Date(),
        ...(input.mode === "DRY_RUN" ? { finishedAt: new Date() } : {}),
      },
    });

    // Validation-time errors are final and recorded once here.
    const errorRows: Array<{ jobId: string; rowNumber: number; field?: string; code: string; message: string }> = [];
    for (const r of rows) {
      for (const e of r.errors) {
        errorRows.push({ jobId: job.id, rowNumber: e.rowNumber, field: e.field, code: e.code, message: e.message });
      }
    }
    if (errorRows.length) await prisma.importError.createMany({ data: errorRows });

    await writeAudit({
      session: g.session,
      action: input.mode === "DRY_RUN" ? "IMPORT_DRY_RUN" : "IMPORT_JOB_CREATE",
      entityType: "IMPORT_JOB",
      entityId: job.id,
      afterData: { filename: input.filename, rows: rawRows.length, failed: failedCount, duplicates: duplicateCount, subject: subject.name },
    });

    return NextResponse.json(
      {
        job: { ...job, stagedData: undefined },
        summary: {
          totalRecords: rawRows.length,
          validRows: validRows.length - dupMarkers.size,
          failedRows: failedCount,
          duplicateRows: duplicateCount,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("imports POST", e);
    return NextResponse.json({ error: "Failed to create import job" }, { status: 500 });
  }
}
