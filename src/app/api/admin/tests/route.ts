import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { autoSelectQuestions, snapshotTestVersion, type AutoSelectOptions } from "@/lib/admin/test-builder";
import { actorEmailOf } from "@/lib/admin/question-sync";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and dashes"),
  type: z.enum(["FULL_LENGTH", "SUBJECT_WISE", "CHAPTER_WISE", "PYQ_YEAR_WISE", "GENERAL_TEST"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  subjectId: z.string().optional().nullable(),
  examId: z.string().optional().nullable(),
  year: z.number().int().optional().nullable(),
  durationMinutes: z.number().int().min(1).default(60),
  totalQuestions: z.number().int().min(0).default(0),
  isPublic: z.boolean().default(true),
  config: z.string().optional().nullable(),
  questionIds: z.array(z.string()).optional(),
  // Builder: resolves questionIds server-side when supplied.
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
});

export async function GET(req: Request) {
  const g = await requirePermission("TEST_READ");
  if (g.error) return g.error;

  try {
    const status = new URL(req.url).searchParams.get("status") || undefined;
    const tests = await prisma.test.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
    return NextResponse.json({ tests });
  } catch (e) {
    console.error("admin tests GET error", e);
    return NextResponse.json({ error: "Failed to list tests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const g = await requirePermission("TEST_WRITE");
  if (g.error) return g.error;

  try {
    const body = await req.json();
    const t = createSchema.parse(body);
    const email = actorEmailOf(g.session);

    // Publishing is a distinct permission (REVIEWER could neither write nor publish).
    if (t.status === "PUBLISHED" && !(await hasPublish(g))) {
      t.status = "DRAFT";
    }

    let questionIds = t.questionIds ?? [];
    let shortfallNote: string | null = null;
    if (t.autoSelect) {
      const result = await autoSelectQuestions(t.autoSelect as AutoSelectOptions);
      questionIds = result.questionIds;
      const short = result.shortfalls.easy + result.shortfalls.medium + result.shortfalls.hard;
      shortfallNote = short > 0
        ? `Question pool had ${short} fewer approved questions than requested`
        : null;
    }

    const existing = await prisma.test.findUnique({ where: { slug: t.slug } });
    if (existing) {
      return NextResponse.json({ error: "A test with this slug already exists" }, { status: 409 });
    }

    const test = await prisma.test.create({
      data: {
        title: t.title,
        slug: t.slug,
        type: t.type,
        status: t.status,
        subjectId: t.subjectId ?? undefined,
        examId: t.examId ?? undefined,
        year: t.year ?? undefined,
        durationMinutes: t.durationMinutes,
        totalQuestions: t.autoSelect ? questionIds.length : t.totalQuestions,
        isPublic: t.isPublic,
        config: t.config ?? JSON.stringify({ totalQuestions: t.totalQuestions, durationMinutes: t.durationMinutes }),
        questions: questionIds.length
          ? { create: questionIds.map((questionId, i) => ({ questionId, order: i + 1 })) }
          : undefined,
      },
      select: { id: true, slug: true, status: true },
    });

    let snapshotVersion: number | null = null;
    if (t.status === "PUBLISHED") {
      snapshotVersion = await snapshotTestVersion(test.id, email, "published at creation");
    }

    await writeAudit({
      session: g.session,
      action: "TEST_CREATE",
      entityType: "TEST",
      entityId: test.id,
      afterData: { slug: test.slug, questionIds: questionIds.length, autoSelect: !!t.autoSelect, shortfall: shortfallNote, snapshotVersion },
    });

    return NextResponse.json({ ...test, snapshotVersion, shortfall: shortfallNote }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("admin tests POST error", e);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}

async function hasPublish(g: Awaited<ReturnType<typeof requirePermission>>): Promise<boolean> {
  const role = ((g.session?.user as { role?: string })?.role) ?? "USER";
  const { can } = await import("@/lib/auth/permissions");
  return can(role, "TEST_PUBLISH");
}

// PATCH on the collection is not needed; use /api/admin/tests/[id].
export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
