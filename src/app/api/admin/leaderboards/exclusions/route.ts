import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { recalculateLeaderboard } from "@/lib/leaderboard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  userId: z.string().optional(),
  attemptId: z.string().optional(),
  reason: z.string().min(1).max(500),
});

type ExclusionLite = { id: string; userId: string | null; attemptId: string | null; reason: string; excludedBy: string; createdAt: Date };

export async function GET() {
  const g = await requirePermission("LEADERBOARD_READ");
  if (g.error) return g.error;
  try {
    const exclusions: ExclusionLite[] = await prisma.leaderboardExclusion.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ exclusions });
  } catch (e) {
    console.error("leaderboard exclusions GET", e);
    return NextResponse.json({ error: "Failed to list exclusions" }, { status: 500 });
  }
}

// Exclude a user (all attempts) or a single attempt from every leaderboard,
// then recalculate all active boards so rankings reflect it immediately.
export async function POST(req: Request) {
  const g = await requirePermission("LEADERBOARD_OVERRIDE");
  if (g.error) return g.error;
  try {
    const body = await req.json();
    const input = createSchema.parse(body);
    if (!input.userId && !input.attemptId) {
      return NextResponse.json({ error: "Provide userId or attemptId" }, { status: 400 });
    }
    const actorEmail = ((g.session?.user as { email?: string })?.email) ?? "admin";
    const exclusion = await prisma.leaderboardExclusion.create({
      data: {
        userId: input.userId ?? "",
        attemptId: input.attemptId ?? undefined,
        reason: input.reason,
        excludedBy: actorEmail,
      },
    });

    // Full recalc of every active config (cheap at current scale).
    const configs = await prisma.leaderboardConfig.findMany({ where: { isActive: true } });
    const trigger = "user";
    for (const config of configs) await recalculateLeaderboard(config);

    await writeAudit({
      session: g.session,
      action: "LEADERBOARD_EXCLUDE",
      entityType: input.attemptId ? "ATTEMPT" : "USER",
      entityId: input.attemptId ?? input.userId,
      reason: input.reason,
      afterData: { boards: configs.map((c) => c.id), exclusionId: exclusion.id },
    });
    void trigger;
    return NextResponse.json({ ok: true, exclusion, recalculated: configs.length }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("leaderboard exclusions POST", e);
    return NextResponse.json({ error: "Failed to create exclusion" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const g = await requirePermission("LEADERBOARD_OVERRIDE");
  if (g.error) return g.error;
  const confirm = new URL(req.url).searchParams.get("confirm");
  if (confirm !== "yes") {
    return NextResponse.json({ error: "Refusing destructive delete without ?confirm=yes" }, { status: 400 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await prisma.leaderboardExclusion.delete({ where: { id } });
    const configs = await prisma.leaderboardConfig.findMany({ where: { isActive: true } });
    for (const config of configs) await recalculateLeaderboard(config);
    await writeAudit({
      session: g.session,
      action: "LEADERBOARD_EXCLUSION_REMOVE",
      entityType: "LEADERBOARD_EXCLUSION",
      entityId: id,
      reason: confirm,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("leaderboard exclusions DELETE", e);
    return NextResponse.json({ error: "Failed to remove exclusion" }, { status: 500 });
  }
}
