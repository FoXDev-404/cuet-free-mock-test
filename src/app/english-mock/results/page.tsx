"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag, RefreshCw } from "lucide-react";

const REVIEW_FLAGGED_QUESTIONS = [8, 32, 41];

interface ResultItem {
  questionNumber: number;
  questionId: string;
  selectedOption: string | null;
  isCorrect: boolean | null;
  isPendingReview: boolean;
  correctAnswer: string | null;
  explanation: string | null;
  dataQualityNote: string | null;
  passageKey: string | null;
  passageTitle: string | null;
}

interface ResultsData {
  verifiedRawScore: number;
  verifiedMaxScore: number;
  attempted: number;
  unanswered: number;
  correct: number;
  incorrect: number;
  reviewFlagged: number;
  results: ResultItem[];
  timeSpentSec: number;
}

function loadStoredResults(): ResultsData | null {
  try {
    const stored = sessionStorage.getItem("cuet_english_mock_results");
    if (stored) {
      const parsed: ResultsData = JSON.parse(stored);
      sessionStorage.removeItem("cuet_english_mock_results");
      return parsed;
    }
  } catch {}
  return null;
}

export default function EnglishMockResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<ResultsData | null>(() => loadStoredResults());

  if (!data) {
    return (
      <section className="py-12 container-page text-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Results</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          CUET UG English - 20 May 2025 Shift 1
        </p>
        <p className="mt-4 text-neutral-500 dark:text-neutral-400">Loading results…</p>
      </section>
    );
  }

  const percentage =
    data.verifiedMaxScore > 0 ? (data.verifiedRawScore / data.verifiedMaxScore) * 100 : 0;

  return (
    <section className="py-12 container-page max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Results</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          CUET UG English - 20 May 2025 Shift 1
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            {data.verifiedRawScore} / {data.verifiedMaxScore}
          </CardTitle>
          <p className="text-neutral-600 dark:text-neutral-400">
            Verified score (excludes 3 questions pending answer-key review)
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">
              {data.attempted}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Attempted</div>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">
              {data.unanswered}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Unanswered</div>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {data.reviewFlagged}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Pending review</div>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.correct}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Correct</div>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {data.incorrect}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Incorrect</div>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">
              {percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Verified percentage
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 p-4">
        <div className="flex items-start gap-3">
          <Flag className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
              Answer-key review pending
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Questions {REVIEW_FLAGGED_QUESTIONS.join(", ")} are flagged for manual review. Your answers
              for these questions are not counted as correct or incorrect. Verified score is out of
              {data.verifiedMaxScore} until these are verified.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
          Response Review
        </h2>
        <div className="space-y-3">
          {data.results.map((r) => {
            const isFlagged = REVIEW_FLAGGED_QUESTIONS.includes(r.questionNumber);
            const isCorrect = r.isCorrect === true;
            const isIncorrect = r.isCorrect === false;

            return (
              <Card key={r.questionId} className="border-neutral-200 dark:border-neutral-700">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      Q{r.questionNumber}
                    </span>
                    {isFlagged && (
                      <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        Pending review
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isFlagged && (
                      <>
                        {isCorrect ? (
                          <span className="text-green-600 dark:text-green-400">✓</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">✗</span>
                        )}
                        {r.selectedOption == null ? (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            Not answered
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="mb-3">
                    <p className="text-neutral-600 dark:text-neutral-300">
                      {/* Question text would be here from API */}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-neutral-700 dark:text-neutral-200">
                      Your answer:
                    </span>
                    <span className={cn(
                      "font-mono px-2 py-1 rounded border",
                      isCorrect
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-700"
                        : isIncorrect
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-700"
                        : isFlagged
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
                    )}>
                      {isFlagged ? "— (pending review)" : r.selectedOption ?? "Not answered"}
                    </span>
                  </div>
                  {!isFlagged && isIncorrect && r.correctAnswer && (
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <span className="font-medium text-neutral-700 dark:text-neutral-200">
                        Correct answer:
                      </span>
                      <span className="font-mono px-2 py-1 rounded bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-700">
                        {r.correctAnswer}
                      </span>
                    </div>
                  )}
                  {!isFlagged && r.explanation && (
                    <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 italic">
                      {r.explanation}
                    </div>
                  )}
                  {isFlagged && r.dataQualityNote && (
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 italic">
                      {r.dataQualityNote}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex gap-3 justify-center">
        <Button variant="brand" onClick={() => router.push("/english-mock/intro")}>
          <RefreshCw className="h-4 w-4 mr-2" /> New Attempt
        </Button>
      </div>
    </section>
  );
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
