import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EnglishMockIntro() {
  // Read the DB directly — no internal self-fetch (fails on the deployed Worker).
  const config = await prisma.englishMockConfig.findFirst({
    where: { isActive: true },
  });

  if (!config) {
    notFound();
  }

  const passages = await prisma.passage.findMany({
    where: { examId: config.examId },
    select: {
      passageKey: true,
      title: true,
      sourcePageStart: true,
      sourcePageEnd: true,
    },
    orderBy: { passageKey: "asc" },
  });

  // Review flags are data-driven (seeded from exam.json answerReviewStatus).
  const [questionCount, pendingReviews] = await Promise.all([
    prisma.question.count({ where: { subject: { code: "ENG" }, isActive: true } }),
    prisma.question.findMany({
      where: {
        subject: { code: "ENG" },
        isActive: true,
        answerReviewStatus: "needs_manual_review",
      },
      orderBy: { questionNumber: "asc" },
      select: { questionNumber: true },
    }),
  ]);
  const reviewPendingQuestionNumbers = pendingReviews.map((q) => q.questionNumber);

  return (
    <section className="py-12 container-page max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-neutral-900 dark:text-white">
            CUET UG English - 20 May 2025 Shift 1
          </CardTitle>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>English</span>
            <span>•</span>
            <span>2025-05-20 Shift 1</span>
            <span>•</span>
            <span>{questionCount} questions</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {questionCount}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Questions</div>
            </div>
            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {config.durationMinutes}m
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Duration</div>
            </div>
            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                +{config.marksCorrect} / –{config.marksIncorrect}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Marking</div>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 p-4">
            <div className="flex items-start gap-3">
              <Flag className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                  Answer-key review pending
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Questions {reviewPendingQuestionNumbers.join(", ")} are flagged for manual answer-key review.
                  Verified score is calculated out of {questionCount - reviewPendingQuestionNumbers.length} until these are confirmed.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Instructions</h3>
            <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-300">
              <li>Answer all {questionCount} questions. One question at a time.</li>
              <li>Use Previous/Next or the question palette to navigate.</li>
              <li>Mark questions for review if you want to revisit them.</li>
              <li>Timer starts when you begin. It runs for {config.durationMinutes} minutes.</li>
              <li>If time expires, the test is auto-submitted.</li>
              <li>You can change answers before submitting.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Passages</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {passages.length} shared reading passage(s) are linked to relevant questions.
            </p>
            <ul className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1">
              {passages.map((p) => (
                <li key={p.passageKey}>
                  {p.title} (pp. {p.sourcePageStart}–{p.sourcePageEnd})
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 flex gap-3">
            <Link href="/english-mock/take">
              <Button variant="brand" size="lg" className="w-full sm:w-auto">
                Start Test
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Practice Mode
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
