import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  scope: z.enum(["GLOBAL", "EXAM", "SUBJECT", "TEST", "COMPETITION"]),
  periodType: z.enum(["ALL_TIME", "WEEKLY", "MONTHLY"]).default("ALL_TIME"),
  examId: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  testId: z.string().optional().nullable(),
  rules: z.string().max(2000).optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const g = await requirePermission("LEADERBOARD_READ");
  if (g.error) return g.error;
  try {
    const configs = await prisma.leaderboardConfig.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { entries: true, snapshots: true } },
      },
    });
    return NextResponse.json({ configs });
  } catch (e) {
    console.error("admin leaderboards GET", e);
    return NextResponse.json({ error: "Failed to list leaderboards" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const g = await requirePermission("LEADERBOARD_CONFIG");
  if (g.error) return g.error;
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const config = await prisma.leaderboardConfig.create({
      data: {
        name: data.name,
        scope: data.scope,
        periodType: data.periodType,
        examId: data.examId ?? undefined,
        subjectId: data.subjectId ?? undefined,
        testId: data.testId ?? undefined,
        rules: data.rules ?? "{}",
        isActive: data.isActive,
      },
    });
    await writeAudit({
      session: g.session,
      action: "LEADERBOARD_CONFIG_CREATE",
      entityType: "LEADERBOARD_CONFIG",
      entityId: config.id,
      afterData: config,
    });
    return NextResponse.json(config, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("admin leaderboards POST", e);
    return NextResponse.json({ error: "Failed to create leaderboard config" }, { status: 500 });
  }
}
