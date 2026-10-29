import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId");
    const subjectId = searchParams.get("subjectId");
    const chapterId = searchParams.get("chapterId");
    const limit = parseInt(searchParams.get("limit") || "50");

    let questions: any[] = [];

    if (testId) {
      const links = await prisma.testQuestionLink.findMany({
        where: { testId },
        orderBy: { order: "asc" },
        include: { question: true },
        take: limit,
      });
      questions = links.map((l) => l.question);
    } else {
      questions = await prisma.question.findMany({
        where: {
          isActive: true,
          ...(subjectId ? { subjectId } : {}),
          ...(chapterId ? { chapterId } : {}),
        },
        take: limit,
      });
    }

    // Parse JSON string fields back to objects
    const parsed = questions.map((q) => ({
      ...q,
      optionsEn: typeof q.optionsEn === "string" ? JSON.parse(q.optionsEn) : q.optionsEn,
      optionsHi: q.optionsHi ? (typeof q.optionsHi === "string" ? JSON.parse(q.optionsHi) : q.optionsHi) : null,
    }));

    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
