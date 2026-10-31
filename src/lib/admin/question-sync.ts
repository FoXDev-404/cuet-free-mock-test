import { prisma } from "@/lib/prisma";

// Shared helpers for the admin question module.

export type OptionInput = { id: string; text: string; imageUrl?: string | null; imageAlt?: string | null };

/**
 * Keep the normalized QuestionOption table and the legacy JSON cache in sync.
 * The JSON cache (`optionsEn`) is retained so existing student flows that read
 * it (english-mock) keep working; QuestionOption is canonical going forward.
 */
export async function syncQuestionOptions(questionId: string, options: OptionInput[]): Promise<string[]> {
  // Generate ids in the legacy format when missing so option ids remain
  // stable across the two storage shapes: opt-<questionId>-<order>.
  const next = options.map((o, i) => ({
    optionId: o.id || `opt-${questionId}-${i + 1}`,
    label: String.fromCharCode(65 + i),
    text: o.text,
    sortOrder: i + 1,
  }));

  await prisma.questionOption.deleteMany({ where: { questionId } });
  if (next.length > 0) {
    await prisma.questionOption.createMany({
      data: next.map((o) => ({
        questionId,
        optionId: o.optionId,
        label: o.label,
        text: o.text,
        sortOrder: o.sortOrder,
        isCorrect: false,
      })),
    });
  }
  return next.map((o) => o.optionId);
}

export async function setCorrectOptions(questionId: string, correctOptionIds: string[]): Promise<void> {
  await prisma.questionOption.updateMany({
    where: { questionId },
    data: { isCorrect: false },
  });
  if (correctOptionIds.length > 0) {
    await prisma.questionOption.updateMany({
      where: { questionId, optionId: { in: correctOptionIds } },
      data: { isCorrect: true },
    });
  }
}

/**
 * Restore-safe: persist a full question snapshot as a new version row (call
 * BEFORE mutating). Unique per (questionId, versionNo) — safe to retry.
 */
export async function snapshotQuestionVersion(
  questionId: string,
  actorEmail: string,
  reason: string,
): Promise<number> {
  const q = await prisma.question.findUnique({ where: { id: questionId }, include: { options: true } });
  if (!q) return 0;
  const { options, ...rest } = q;
  const last = await prisma.questionVersion.aggregate({
    where: { questionId },
    _max: { versionNo: true },
  });
  const versionNo = (last._max.versionNo ?? 0) + 1;
  await prisma.questionVersion.create({
    // Explicit timestamp: never rely on the column default (older dev
    // databases carry TEXT-affinity datetime columns whose defaults would
    // store a non-ISO literal that Prisma cannot parse back).
    data: {
      questionId,
      versionNo,
      snapshot: JSON.stringify({ ...rest, options }),
      reason,
      actorEmail,
      createdAt: new Date(),
    },
  });
  return versionNo;
}

export async function bumpQuestionVersion(questionId: string): Promise<number> {
  const q = await prisma.question.findUnique({ where: { id: questionId }, select: { version: true } });
  const version = (q?.version ?? 1) + 1;
  await prisma.question.update({ where: { id: questionId }, data: { version } });
  return version;
}

// Correct-answer matching across both key formats: option id ("opt-...-3")
// and source label ("B").
export function isCorrectChoice(optionId: string, correctAnswer: string): boolean {
  if (!correctAnswer) return false;
  if (optionId === correctAnswer) return true;
  const order = parseInt(optionId.split("-").pop() || "", 10);
  if (!Number.isNaN(order)) {
    if (String.fromCharCode(65 + order - 1) === correctAnswer) return true;
  }
  return false;
}

export function actorEmailOf(session: unknown): string {
  const user = ((session as { user?: { email?: string } })?.user ?? {}) as { email?: string };
  return user.email ?? "admin";
}
