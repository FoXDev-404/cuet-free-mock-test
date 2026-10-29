import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const type = searchParams.get("type");

    const tests = await prisma.test.findMany({
      where: {
        status: "PUBLISHED",
        isPublic: true,
        ...(subjectId ? { subjectId } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        subject: true,
        _count: { select: { questions: true } },
      },
    });
    return NextResponse.json(tests);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
  }
}
