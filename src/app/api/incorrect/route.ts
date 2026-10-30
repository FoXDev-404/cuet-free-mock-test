import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const attempts = await prisma.attempt.findMany({
      where: { userId: session.user.id, status: "SUBMITTED" },
      include: {
        test: true,
        answers: {
          include: { question: { include: { subject: true, topic: true } } },
          where: { isCorrect: false },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const incorrect = attempts.flatMap((a) => (a.answers || []).map((ans) => ({
      id: ans.id,
      stemEn: ans.question.stemEn,
      optionsEn: typeof ans.question.optionsEn === "string" ? JSON.parse(ans.question.optionsEn) : ans.question.optionsEn,
      correctAnswer: ans.question.correctAnswer,
      explanationEn: ans.question.explanationEn,
      subject: ans.question.subject?.name || ans.question.subjectId,
      topic: ans.question.topic?.name || null,
      testId: a.testId,
      selectedOption: ans.selectedOption,
      createdAt: a.submittedAt?.toISOString() || a.startedAt.toISOString(),
    })));

    return NextResponse.json(incorrect);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch incorrect questions" }, { status: 500 });
  }
}