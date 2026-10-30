import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { recalculateLeaderboard } from "@/lib/leaderboard";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  periodType: z.enum(["ALL_TIME", "WEEKLY", "MONTHLY"]).optional(),
  examId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  testId: z.string().nullable().optional(),
  rules: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
});

const actionSchema = z.object({
  action: z.enum(["recalc", "snapshot"]),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requirePermission("LEADERBOARD_CONFIG");
  if (g.error) return g.error;
  const { id } = await params;
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const before = await prisma.leaderboardConfig.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Leaderboard config not found" }, { status: 404 });
    const config = await prisma.leaderboardConfig.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.periodType !== undefined ? { periodType: data.periodType } : {}),
        ...(data.examId !== undefined ? { examId: data.examId } : {}),
        ...(data.subjectId !== undefined ? { subjectId: data.subjectId } : {}),
        ...(data.testId !== undefined ? { testId: data.testId } : {}),
        ...(data.rules !== undefined ? { rules: data.rules } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
    await writeAudit({
      session: g.session,
      action: "LEADERBOARD_CONFIG_UPDATE",
      entityType: "LEADERBOARD_CONFIG",
      entityId: id,
      beforeData: { isActive: before.isActive, name: before.name, periodType: before.periodType },
      afterData: { isActive: config.isActive, name: config.name, periodType: config.periodType },
    });
    return NextResponse.json(config);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("leaderboard PATCH", e);
    return NextResponse.json({ error: "Failed to update leaderboard" }, { status: 500 });
  }
}

// recalc (rebuild entries + ranks) or snapshot (persist top-100 frozen copy).
export async function POST(req: Request, { params }: Ctx) {
  const g = await requirePermission("LEADERBOARD_CONFIG");
  if (g.error) return g.error;
  const { id } = await params;
  try {
    const body = await req.json();
    const { action } = actionSchema.parse(body);
    const config = await prisma.leaderboardConfig.findUnique({ where: { id } });
    if (!config) return NextResponse.json({ error: "Leaderboard config not found" }, { status: 404 });
    const result = await recalculateLeaderboard(config, { withSnapshot: action === "snapshot" });
    await writeAudit({
      session: g.session,
      action: action === "snapshot" ? "LEADERBOARD_SNAPSHOT" : "LEADERBOARD_RECALC",
      entityType: "LEADERBOARD_CONFIG",
      entityId: id,
      afterData: { entries: result.entries },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("leaderboard recalc/snapshot", e);
    return NextResponse.json({ error: "Failed to recalculate leaderboard" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const g = await requirePermission("LEADERBOARD_CONFIG");
  if (g.error) return g.error;
  const { id } = await params;
  const confirm = new URL(req.url).searchParams.get("confirm");
  if (confirm !== "yes") {
    return NextResponse.json({ error: "Refusing destructive delete without ?confirm=yes" }, { status: 400 });
  }
  try {
    await prisma.leaderboardConfig.delete({ where: { id } }); // cascade entries+snapshots
    await writeAudit({
      session: g.session,
      action: "LEADERBOARD_CONFIG_DELETE",
      entityType: "LEADERBOARD_CONFIG",
      entityId: id,
      reason: confirm,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("leaderboard DELETE", e);
    return NextResponse.json({ error: "Failed to delete leaderboard" }, { status: 500 });
  }
}
