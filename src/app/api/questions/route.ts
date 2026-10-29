import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const questionInclude = {
  subject: { select: { name: true, code: true } },
  chapter: { select: { name: true } },
} as const;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId");
    const slug = searchParams.get("slug");
    const subjectId = searchParams.get("subjectId");
    const chapterId = searchParams.get("chapterId");
    const source = searchParams.get("source");
    const year = searchParams.get("year");
    const difficulty = searchParams.get("difficulty");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10) || 50, 500);

    const where = {
      isActive: true,
      ...(subjectId ? { subjectId } : {}),
      ...(chapterId ? { chapterId } : {}),
      ...(source ? { source } : {}),
      ...(year ? { year: parseInt(year, 10) } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(search ? { stemEn: { contains: search } } : {}),
    };

    let questions: any[] = [];

    if (slug) {
      const test = await prisma.test.findUnique({
        where: { slug },
        include: {
          questions: {
            include: { question: { include: questionInclude } },
            orderBy: { order: "asc" },
          },
        },
      });
      if (!test) return NextResponse.json([]);
      questions = test.questions.map((l) => l.question);
    } else if (testId) {
      const links = await prisma.testQuestionLink.findMany({
        where: { testId },
        orderBy: { order: "asc" },
        include: { question: { include: questionInclude } },
        take: limit,
      });
      questions = links.map((l) => l.question);
    } else {
      questions = await prisma.question.findMany({
        where,
        include: questionInclude,
        orderBy: [{ year: "desc" }, { createdAt: "asc" }],
        take: limit,
      });
    }

    const parsed = questions.map((q) => {
      const { subject, chapter, ...rest } = q;
      return {
        ...rest,
        subject: subject?.name ?? null,
        subjectCode: subject?.code ?? null,
        topic: chapter?.name ?? null,
        optionsEn:
          typeof q.optionsEn === "string" ? JSON.parse(q.optionsEn) : q.optionsEn,
        optionsHi: q.optionsHi
          ? typeof q.optionsHi === "string"
            ? JSON.parse(q.optionsHi)
            : q.optionsHi
          : null,
      };
    });

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("questions API error", e);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
