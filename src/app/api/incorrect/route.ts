import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const attempts = await prisma.attempt.findMany({
      where: { userId: session.user.id, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
      include: {
        test: { select: { slug: true } },
        answers: {
          include: { question: { include: { subject: true, topic: true, passage: true } } },
          where: { isCorrect: false },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const incorrect = attempts.flatMap((a) => (a.answers || []).map((ans) => ({
      id: ans.id,
      stemEn: ans.question.stemEn,
      optionsEn: typeof ans.question.optionsEn === "string" ? JSON.parse(ans.question.optionsEn) : ans.question.optionsEn,
      questionImages:
        typeof ans.question.questionImages === "string"
          ? (() => {
              try {
                return JSON.parse(ans.question.questionImages as string);
              } catch {
                return [];
              }
            })()
          : ans.question.questionImages ?? [],
      correctAnswer: ans.question.correctAnswer,
      sourceCorrectOptionOrder: ans.question.sourceCorrectOptionOrder,
      explanationEn: ans.question.explanationEn,
      explanationImageUrl: ans.question.explanationImageUrl,
      explanationImageAlt: ans.question.explanationImageAlt,
      passage: ans.question.passage
        ? {
            title: ans.question.passage.title,
            content: ans.question.passage.content,
            imageUrl: ans.question.passage.imageUrl,
            imageAlt: ans.question.passage.imageAlt,
            sourceNote: ans.question.passage.sourceNote,
          }
        : null,
      subject: ans.question.subject?.name || ans.question.subjectId,
      topic: ans.question.topic?.name || null,
      testId: a.testId,
      testSlug: a.test.slug,
      selectedOption: ans.selectedOption,
      createdAt: a.submittedAt?.toISOString() || a.startedAt.toISOString(),
    })));

    return NextResponse.json(incorrect);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch incorrect questions" }, { status: 500 });
  }
}