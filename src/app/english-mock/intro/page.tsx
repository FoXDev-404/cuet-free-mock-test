import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag } from "lucide-react";

interface IntroData {
  exam: {
    id: string;
    name: string;
    examCode: string;
    subject: string;
    examDate: string;
    shift: string | number;
    sourceFile: string;
    sourcePageCount: number;
    sourceQuestionCount: number;
  };
  config: {
    durationMinutes: number;
    marksCorrect: number;
    marksIncorrect: number;
    totalQuestions: number;
  };
  passages: Array<{
    id: string;
    passageKey: string;
    title: string;
    content: string;
    sourcePageStart: number | null;
    sourcePageEnd: number | null;
  }>;
  questionCount: number;
  reviewPendingCount: number;
  reviewPendingQuestionNumbers: number[];
  verifiedMaxScore: number;
}

export default async function EnglishMockIntro() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/english-mock/intro`, {
    cache: "no-store",
  });

  if (!res.ok) {
    notFound();
  }

  const data: IntroData = await res.json();

  return (
    <section className="py-12 container-page max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-neutral-900 dark:text-white">
            {data.exam.name}
          </CardTitle>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>{data.exam.subject}</span>
            <span>•</span>
            <span>{data.exam.examDate} Shift {data.exam.shift}</span>
            <span>•</span>
            <span>{data.questionCount} questions</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {data.questionCount}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Questions</div>
            </div>
            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {data.config.durationMinutes}m
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Duration</div>
            </div>
            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                +{data.config.marksCorrect} / –{data.config.marksIncorrect}
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
                  Questions {data.reviewPendingQuestionNumbers.join(", ")} are flagged for manual answer-key review.
                  Verified score is calculated out of {data.verifiedMaxScore} until these are confirmed.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Instructions</h3>
            <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-300">
              <li>Answer all {data.questionCount} questions. One question at a time.</li>
              <li>Use Previous/Next or the question palette to navigate.</li>
              <li>Mark questions for review if you want to revisit them.</li>
              <li>Timer starts when you begin. It runs for {data.config.durationMinutes} minutes.</li>
              <li>If time expires, the test is auto-submitted.</li>
              <li>You can change answers before submitting.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Passages</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {data.passages.length} shared reading passage(s) are linked to relevant questions.
            </p>
            <ul className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1">
              {data.passages.map((p) => (
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
