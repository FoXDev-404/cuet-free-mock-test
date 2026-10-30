import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  subjectId: z.string(),
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  // Topics may be created in bulk; order = array index offset.
  topics: z.array(z.object({ name: z.string().min(1).max(160), order: z.number().int().default(0) })).max(200).optional(),
  order: z.number().int().optional(),
});

export async function GET(req: Request) {
  const g = await requirePermission("ACADEMIC_READ");
  if (g.error) return g.error;
  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId") ?? undefined;
  const chapters = await prisma.chapter.findMany({
    where: subjectId ? { subjectId } : undefined,
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { questions: true, topics: true } },
      topics: { orderBy: { order: "asc" }, include: { _count: { select: { questions: true } } } },
    },
  });
  return NextResponse.json(chapters);
}

export async function POST(req: Request) {
  const g = await requirePermission("ACADEMIC_WRITE");
  if (g.error) return g.error;
  try {
    const body = await req.json();
    const { topics, ...data } = createSchema.parse(body);
    const chapter = await prisma.chapter.create({ data });
    if (topics?.length) {
      await prisma.topic.createMany({
        data: topics.map((t) => ({ chapterId: chapter.id, name: t.name, order: t.order })),
      });
    }
    await writeAudit({ session: g.session, action: "CHAPTER_CREATE", entityType: "CHAPTER", entityId: chapter.id, afterData: { ...chapter, topicsCount: topics?.length ?? 0 } });
    return NextResponse.json(chapter, { status: 201 });
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error("admin chapters POST", e);
    return NextResponse.json({ error: "Failed to create chapter" }, { status: 500 });
  }
}
