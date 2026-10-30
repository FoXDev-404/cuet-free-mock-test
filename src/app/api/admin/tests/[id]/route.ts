import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { autoSelectQuestions, snapshotTestVersion, type AutoSelectOptions } from "@/lib/admin/test-builder";
import { actorEmailOf } from "@/lib/admin/question-sync";
import { can } from "@/lib/auth/permissions";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Partial update; `questionIds` (if present) replaces the full question list.
const updateSchema = z
  .object({
    title: z.string().min(1).optional(),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and dashes")
      .optional(),
    type: z.enum(["FULL_LENGTH", "SUBJECT_WISE", "CHAPTER_WISE", "PYQ_YEAR_WISE", "GENERAL_TEST"]).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    subjectId: z.string().nullable().optional(),
    examId: z.string().nullable().optional(),
    year: z.number().int().nullable().optional(),
    durationMinutes: z.number().int().min(1).optional(),
    totalQuestions: z.number().int().min(0).optional(),
    isPublic: z.boolean().optional(),
    config: z.string().nullable().optional(),
    questionIds: z.array(z.string()).optional(),
    autoSelect: z
      .object({
        subjectId: z.string().optional(),
        chapterId: z.string().optional(),
        topicId: z.string().optional(),
        examId: z.string().optional(),
        year: z.number().int().optional(),
        type: z.string().optional(),
        tags: z.array(z.string()).optional(),
        total: z.number().int().min(1).max(240),
        distribution: z
          .object({ easy: z.number().min(0), medium: z.number().min(0), hard: z.number().min(0) })
          .optional(),
        seed: z.number().int().optional(),
      })
      .optional(),
  })
  .passthrough();

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const g = await requirePermission("TEST_READ");
  if (g.error) return g.error;

  try {
    const { id } = await params;
    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        questions: {
          orderBy: { order: "asc" },
          select: { questionId: true, order: true },
        },
        versions: {
          orderBy: { versionNo: "desc" },
          take: 10,
          select: { id: true, versionNo: true, note: true, actorEmail: true, createdAt: true },
        },
      },
    });
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });
    return NextResponse.json({
      ...test,
      questionIds: test.questions.map((l) => l.questionId),
    });
  } catch (e) {
    console.error("admin test GET error", e);
    return NextResponse.json({ error: "Failed to load test" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requirePermission("TEST_WRITE");
  if (g.error) return g.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);
    const { questionIds, autoSelect, ...fields } = data;
    const email = actorEmailOf(g.session);

    const before = await prisma.test.findUnique({
      where: { id },
      select: { id: true, status: true, slug: true },
    });
    if (!before) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    // Publishing requires the publish permission.
    if (fields.status === "PUBLISHED" && !can(((g.session.user as { role?: string })?.role) ?? "", "TEST_PUBLISH")) {
      return NextResponse.json({ error: "TEST_PUBLISH permission required to publish" }, { status: 403 });
    }
    let finalQuestionIds = questionIds;
    let shortfallNote: string | null = null;
    if (autoSelect) {
      const result = await autoSelectQuestions(autoSelect as AutoSelectOptions);
      finalQuestionIds = result.questionIds;
      const short = result.shortfalls.easy + result.shortfalls.medium + result.shortfalls.hard;
      shortfallNote = short > 0 ? `Question pool had ${short} fewer approved questions than requested` : null;
    }

    // A test can never be published with zero questions — an empty published
    // test is a dead start target for students (P1QA 2026-10-30: found via
    // the /english-pyq-40 fixture card in browser QA).
    if (fields.status === "PUBLISHED") {
      const finalCount = finalQuestionIds
        ? finalQuestionIds.length
        : await prisma.testQuestionLink.count({ where: { testId: id } });
      if (finalCount === 0) {
        return NextResponse.json(
          { error: "Cannot publish a test with no questions. Add or auto-select at least one question first." },
          { status: 400 },
        );
      }
    }

    const test = await prisma.test.update({
      where: { id },
      data: {
        ...(fields.title !== undefined ? { title: fields.title } : {}),
        ...(fields.slug !== undefined ? { slug: fields.slug } : {}),
        ...(fields.type !== undefined ? { type: fields.type } : {}),
        ...(fields.status !== undefined ? { status: fields.status } : {}),
        ...(fields.subjectId !== undefined ? { subjectId: fields.subjectId } : {}),
        ...(fields.examId !== undefined ? { examId: fields.examId } : {}),
        ...(fields.year !== undefined ? { year: fields.year } : {}),
        ...(fields.durationMinutes !== undefined ? { durationMinutes: fields.durationMinutes } : {}),
        ...(finalQuestionIds !== undefined ? { totalQuestions: finalQuestionIds.length } : {}),
        ...(fields.totalQuestions !== undefined && finalQuestionIds === undefined
          ? { totalQuestions: fields.totalQuestions }
          : {}),
        ...(fields.isPublic !== undefined ? { isPublic: fields.isPublic } : {}),
        ...(fields.config !== undefined ? { config: fields.config ?? "" } : {}),
      },
      select: { id: true, status: true, slug: true },
    });

    if (finalQuestionIds) {
      await prisma.testQuestionLink.deleteMany({ where: { testId: id } });
      if (finalQuestionIds.length) {
        await prisma.testQuestionLink.createMany({
          data: finalQuestionIds.map((questionId, i) => ({ testId: id, questionId, order: i + 1 })),
        });
      }
    }

    let snapshotVersion: number | null = null;
    const becamePublished = test.status === "PUBLISHED" && before.status !== "PUBLISHED";
    if (becamePublished) {
      snapshotVersion = await snapshotTestVersion(id, email, "published");
    }

    await writeAudit({
      session: g.session,
      action: becamePublished ? "TEST_PUBLISH" : "TEST_UPDATE",
      entityType: "TEST",
      entityId: id,
      beforeData: { status: before.status, slug: before.slug },
      afterData: { status: test.status, questions: finalQuestionIds?.length ?? "unchanged", autoSelect: !!autoSelect, shortfall: shortfallNote, snapshotVersion },
    });

    return NextResponse.json({ id: test.id, status: test.status, snapshotVersion, shortfall: shortfallNote });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("admin test PATCH error", e);
    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const g = await requirePermission("TEST_WRITE");
  if (g.error) return g.error;

  try {
    const { id } = await params;
    const confirm = new URL(req.url).searchParams.get("confirm");
    if (confirm !== "yes") {
      return NextResponse.json({ error: "Refusing destructive delete without ?confirm=yes" }, { status: 400 });
    }
    const attemptCount = await prisma.attempt.count({ where: { testId: id } });
    if (attemptCount > 0) {
      // Attempt history is immutable — archive the test instead (spec §10/§16).
      const archived = await prisma.test.update({ where: { id }, data: { status: "ARCHIVED", isPublic: false } });
      await writeAudit({
        session: g.session,
        action: "TEST_ARCHIVE",
        entityType: "TEST",
        entityId: id,
        reason: `had ${attemptCount} attempt(s); archived instead of delete`,
      });
      return NextResponse.json({ archived: true, id: archived.id, attemptCount });
    }
    await prisma.testVersion.deleteMany({ where: { testId: id } });
    await prisma.testQuestionLink.deleteMany({ where: { testId: id } });
    await prisma.test.delete({ where: { id } });
    await writeAudit({ session: g.session, action: "TEST_DELETE", entityType: "TEST", entityId: id, reason: confirm });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin test DELETE error", e);
    return NextResponse.json({ error: "Failed to delete test" }, { status: 500 });
  }
}
