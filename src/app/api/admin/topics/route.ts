import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  chapterId: z.string(),
  name: z.string().min(1).max(160),
  order: z.number().int().default(0),
});

export async function GET(req: Request) {
  const g = await requirePermission("ACADEMIC_READ");
  if (g.error) return g.error;
  const { searchParams } = new URL(req.url);
  const chapterId = searchParams.get("chapterId") ?? undefined;
  const topics = await prisma.topic.findMany({
    where: chapterId ? { chapterId } : undefined,
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { questions: true } } },
  });
  return NextResponse.json(topics);
}

export async function POST(req: Request) {
  const g = await requirePermission("ACADEMIC_WRITE");
  if (g.error) return g.error;
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const topic = await prisma.topic.create({ data });
    await writeAudit({ session: g.session, action: "TOPIC_CREATE", entityType: "TOPIC", entityId: topic.id, afterData: topic });
    return NextResponse.json(topic, { status: 201 });
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error("admin topics POST", e);
    return NextResponse.json({ error: "Failed to create topic" }, { status: 500 });
  }
}
