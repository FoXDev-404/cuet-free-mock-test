import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const REVIEW_FLAGGED_QUESTIONS = [8, 32, 41];

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await prisma.englishMockConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      return NextResponse.json({ error: "English mock config not found" }, { status: 404 });
    }

    const passages = await prisma.passage.findMany({
      where: { examId: config.examId },
      select: {
        id: true,
        passageKey: true,
        title: true,
        content: true,
        sourcePageStart: true,
        sourcePageEnd: true,
      },
      orderBy: { passageKey: "asc" },
    });

    const questionCount = await prisma.question.count({
      where: { subject: { code: "ENG" }, isActive: true },
    });

    return NextResponse.json({
      exam: {
        id: config.examId,
        name: "CUET UG English - 20 May 2025 Shift 1",
        examCode: "CUET-UG",
        subject: "English",
        examDate: "2025-05-20",
        shift: "1",
        sourceFile: "English_2025-05-20_Shift_1.pdf",
        sourcePageCount: 60,
        sourceQuestionCount: 50,
      },
      config: {
        durationMinutes: config.durationMinutes,
        marksCorrect: config.marksCorrect,
        marksIncorrect: config.marksIncorrect,
        totalQuestions: config.totalQuestions,
      },
      passages,
      questionCount,
      reviewPendingCount: REVIEW_FLAGGED_QUESTIONS.length,
      reviewPendingQuestionNumbers: REVIEW_FLAGGED_QUESTIONS,
      verifiedMaxScore: config.totalQuestions - REVIEW_FLAGGED_QUESTIONS.length,
    });
  } catch (e) {
    console.error("english-mock intro API error", e);
    return NextResponse.json({ error: "Failed to load exam intro" }, { status: 500 });
  }
}
