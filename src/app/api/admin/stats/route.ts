import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const [
      subjects,
      chapters,
      questions,
      activeQuestions,
      pendingReview,
      tests,
      publishedTests,
      users,
      admins,
      attempts,
      englishConfig,
      englishQuestions,
    ] = await Promise.all([
      prisma.subject.count(),
      prisma.chapter.count(),
      prisma.question.count(),
      prisma.question.count({ where: { isActive: true } }),
      prisma.question.count({ where: { answerReviewStatus: "needs_manual_review" } }),
      prisma.test.count(),
      prisma.test.count({ where: { status: "PUBLISHED" } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.attempt.count(),
      prisma.englishMockConfig.findFirst({ where: { isActive: true } }),
      prisma.question.count({ where: { subject: { code: "ENG" }, isActive: true } }),
    ]);

    return NextResponse.json({
      subjects,
      chapters,
      questions,
      activeQuestions,
      pendingReview,
      tests,
      publishedTests,
      users,
      admins,
      attempts,
      englishPaper: englishConfig
        ? {
            examId: englishConfig.examId,
            durationMinutes: englishConfig.durationMinutes,
            marksCorrect: englishConfig.marksCorrect,
            marksIncorrect: englishConfig.marksIncorrect,
            totalQuestions: englishConfig.totalQuestions,
            questions: englishQuestions,
          }
        : null,
    });
  } catch (e) {
    console.error("admin stats API error", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
