import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getLocalPaperSummaries,
  getLocalPaperSummary,
  LOCAL_ENGLISH_SUBJECT,
} from "@/lib/local-papers";

// `/api/tests?slug=` is public. Question objects must stay keyless until the
// student submits, exactly like the take page payload.
const SECRET_QUESTION_FIELDS = [
  "correctAnswer",
  "sourceCorrectOptionOrder",
  "sourceAnswerLabel",
  "explanationEn",
  "explanationHi",
  "stemHash",
] as const;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const type = searchParams.get("type");
    const slug = searchParams.get("slug");

    if (slug) {
      const localPaper = getLocalPaperSummary(slug);
      if (localPaper) return NextResponse.json([localPaper]);

      const test = await prisma.test.findUnique({
        where: { slug },
        include: { subject: true, questions: { include: { question: true } } },
      });
      if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

      const keyless = {
        ...test,
        questions: test.questions.map((link) => {
          const question = { ...link.question } as Record<string, unknown>;
          for (const field of SECRET_QUESTION_FIELDS) delete question[field];
          return { ...link, question };
        }),
      };
      return NextResponse.json([keyless]);
    }

    // The 2022 English papers are repo-backed and never seeded into D1, so
    // merge their public summaries into the same listing used by the homepage.
    const localPapers = getLocalPaperSummaries().filter((paper) => {
      if (subjectId && subjectId !== LOCAL_ENGLISH_SUBJECT.id) return false;
      if (type && type !== paper.type) return false;
      return true;
    });

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
        _count: { select: { questions: true, attempts: true } },
      },
    });
    return NextResponse.json([...tests, ...localPapers]);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
  }
}
