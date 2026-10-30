// Mock Test Builder — deterministic auto-selection and publish snapshots.

import { prisma } from "@/lib/prisma";

export type DifficultyRatio = { easy: number; medium: number; hard: number };

export type AutoSelectOptions = {
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  examId?: string;
  year?: number;
  type?: string;
  tags?: string[];
  total: number; // target count
  distribution?: DifficultyRatio; // if omitted => proportional fill
  seed?: number; // deterministic shuffle for reproducible builds
  excludeIds?: string[];
};

const DIFFS = ["easy", "medium", "hard"] as const;
export type Diff = (typeof DIFFS)[number];

/** Mulberry32 — tiny deterministic PRNG so builds are reproducible. */
function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    // Canonical mulberry32 finalization — `>>> 0` is mandatory here: it keeps
    // `s` in uint32 so `j = s % (i + 1)` can never go negative. Without it `j`
    // may index the out-of-bounds negative range, and the swap writes
    // `undefined` into `out`, silently dropping elements (P1QA 2026-10-30).
    s = (t ^ (t >>> 22)) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function largestRemainder(ratios: DifficultyRatio, total: number): Record<Diff, number> {
  // Ratios can be weights (sum to 100, 1, whatever) — normalized internally.
  const w: Record<Diff, number> = {
    easy: Math.max(ratios.easy, 0),
    medium: Math.max(ratios.medium, 0),
    hard: Math.max(ratios.hard, 0),
  };
  const sum = w.easy + w.medium + w.hard;
  const counts: Record<Diff, number> = { easy: 0, medium: 0, hard: 0 };
  if (sum <= 0) return { easy: total, medium: 0, hard: 0 };
  const exact = DIFFS.reduce((acc, d) => { acc[d] = (w[d] / sum) * total; return acc; }, {} as Record<Diff, number>);
  let assigned = 0;
  for (const d of DIFFS) {
    counts[d] = Math.floor(exact[d]);
    assigned += counts[d];
  }
  const remainders = [...DIFFS]
    .sort((a, b) => (exact[b] - Math.floor(exact[b])) - (exact[a] - Math.floor(exact[a])));
  let i = 0;
  while (assigned < total && i < remainders.length * 100) {
    counts[remainders[i % remainders.length]]++;
    assigned++;
    i++;
  }
  return counts;
}

export type AutoSelectResult = {
  questionIds: string[];
  pool: { easy: number; medium: number; hard: number };
  picked: { easy: number; medium: number; hard: number };
  shortfalls: { easy: number; medium: number; hard: number };
};

/**
 * Active, answerable questions only (isActive, status APPROVED/PUBLISHED).
 * Deterministic when `seed` is provided; otherwise randomized order.
 */
export async function autoSelectQuestions(o: AutoSelectOptions): Promise<AutoSelectResult> {
  const statuses = ["APPROVED", "PUBLISHED"];
  const counts = o.distribution
    ? largestRemainder(o.distribution, o.total)
    : ({ easy: 0, medium: 0, hard: 0 } as Record<Diff, number>);

  // Per-difficulty pools.
  const pools: Record<Diff, string[]> = { easy: [], medium: [], hard: [] };
  for (const d of DIFFS) {
    const rows = await prisma.question.findMany({
      where: {
        difficulty: d,
        isActive: true,
        status: { in: statuses },
        ...(o.subjectId ? { subjectId: o.subjectId } : {}),
        ...(o.chapterId ? { chapterId: o.chapterId } : {}),
        ...(o.topicId ? { topicId: o.topicId } : {}),
        ...(o.examId ? { examId: o.examId } : {}),
        ...(o.year ? { year: o.year } : {}),
        ...(o.type ? { type: o.type } : {}),
        ...(o.tags?.length ? { tags: { some: { label: { in: o.tags } } } } : {}),
        ...(o.excludeIds?.length ? { id: { notIn: o.excludeIds } } : {}),
      },
      select: { id: true },
      orderBy: { questionNumber: "asc" },
    });
    pools[d] = (rows.length > 0 ? rows : []).map((r) => r.id);
  }

  const picked: Record<Diff, number> = { easy: 0, medium: 0, hard: 0 };
  const ids: string[] = [];
  const used = new Set<string>();

  const takeFrom = (d: Diff, n: number) => {
    const candidate = shuffle(pools[d].filter((id) => !used.has(id)), o.seed ?? Date.now() % 2 ** 31);
    const take = candidate.slice(0, n);
    take.forEach((id) => used.add(id));
    picked[d] += take.length;
    ids.push(...take);
    return take.length;
  };

  if (o.distribution) {
    for (const d of DIFFS) takeFrom(d, counts[d]);
    // Shortfalls: fill from remaining difficulties (keep total).
    let remaining = o.total - ids.length;
    const leftovers = [...DIFFS];
    for (const d of shuffle(leftovers, o.seed ?? 7)) {
      while (remaining > 0) {
        const got = takeFrom(d, remaining);
        if (got === 0) break;
        remaining -= got;
      }
      remaining = o.total - ids.length;
      if (remaining <= 0) break;
    }
  } else {
    // No distribution: mixed sweep through all pools round-robin by difficulty.
    let remaining = o.total;
    const order = shuffle(DIFFS as unknown as Diff[], o.seed ?? 3);
    let i = 0;
    while (remaining > 0 && i < 1000) {
      const d = order[i % order.length];
      const got = takeFrom(d, 1);
      remaining -= got;
      i++;
      if (pools.easy.length + pools.medium.length + pools.hard.length === ids.length) break;
    }
  }

  return {
    questionIds: ids,
    pool: { easy: pools.easy.length, medium: pools.medium.length, hard: pools.hard.length },
    picked,
    shortfalls: o.distribution
      ? {
          easy: Math.max(counts.easy - picked.easy, 0),
          medium: Math.max(counts.medium - picked.medium, 0),
          hard: Math.max(counts.hard - picked.hard, 0),
        }
      : { easy: 0, medium: 0, hard: 0 },
  };
}

/** Versioned publish snapshot: config + ordered questions at publish time. */
export async function snapshotTestVersion(
  testId: string,
  actorEmail: string,
  note?: string,
): Promise<number> {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { questions: { orderBy: { order: "asc" }, select: { questionId: true } } },
  });
  if (!test) return 0;
  const last = await prisma.testVersion.aggregate({
    where: { testId },
    _max: { versionNo: true },
  });
  const versionNo = (last._max.versionNo ?? 0) + 1;
  const { questions, ...row } = test;
  void questions;
  await prisma.testVersion.create({
    // Explicit timestamp — never depend on the column default (older dev
    // databases may have TEXT-affinity datetime columns).
    data: {
      testId,
      versionNo,
      snapshot: JSON.stringify({
        title: row.title,
        slug: row.slug,
        type: row.type,
        status: row.status,
        subjectId: row.subjectId,
        year: row.year,
        config: row.config,
        totalQuestions: row.totalQuestions,
        durationMinutes: row.durationMinutes,
        isPublic: row.isPublic,
        examId: (row as { examId?: string | null }).examId ?? null,
        questionIds: test.questions.map((l) => l.questionId),
      }),
      note: note ?? "publish",
      actorEmail,
      createdAt: new Date(),
    },
  });
  return versionNo;
}
