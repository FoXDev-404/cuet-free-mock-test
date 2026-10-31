"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag, RefreshCw } from "lucide-react";
import { MathText } from "@/components/ui/math-text";
import { QuestionImages } from "@/components/questions/question-images";
import { QuestionPassage } from "@/components/questions/question-passage";
import { OptionText } from "@/components/questions/option-text";
import { OPTION_LETTERS } from "@/lib/question-display";

interface ResultItem {
  questionNumber: number;
  questionId: string;
  stemEn?: string | null;
  optionsEn?: Array<{ id: string; text: string; imageUrl?: string | null; imageAlt?: string | null }> | null;
  questionImages?: unknown;
  selectedOption: string | null;
  selectedOptionText?: string | null;
  isCorrect: boolean | null;
  isPendingReview: boolean;
  correctAnswer: string | null;
  correctAnswerText?: string | null;
  explanation: string | null;
  explanationImageUrl?: string | null;
  explanationImageAlt?: string | null;
  dataQualityNote: string | null;
  passageKey: string | null;
  passageTitle: string | null;
  passageContent?: string | null;
  passageImageUrl?: string | null;
  passageImageAlt?: string | null;
  passageSourceNote?: string | null;
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
    // P1QA 2026-10-30: this read must NOT consume the entry. The previous
    // version removed it on first read, so any re-mount — a refresh, an HMR
    // recompile, or React StrictMode's double mount — left the page stuck on
    // "Loading results…" forever. The entry is cleared by "New Attempt".
    if (stored) {
      return JSON.parse(stored) as ResultsData;
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
        <p className="mt-4 text-neutral-500 dark:text-neutral-400">
          No results stored in this browser session. Start (or finish) an attempt and your
          verified score will appear here.
        </p>
        <div className="mt-6">
          <Button variant="brand" onClick={() => router.push("/english-mock/intro")}>
            Go to the mock test
          </Button>
        </div>
      </section>
    );
  }

  const percentage =
    data.verifiedMaxScore > 0 ? (data.verifiedRawScore / data.verifiedMaxScore) * 100 : 0;
  const flaggedNumbers = data.results
    .filter((item) => item.isPendingReview)
    .map((item) => item.questionNumber);

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
              Questions {flaggedNumbers.length ? flaggedNumbers.join(", ") : "flagged in this paper"} are flagged for manual review. Your answers
              for these questions are not counted as correct or incorrect. Verified score is out of{" "}
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
            const isFlagged = r.isPendingReview;
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
                  <QuestionPassage
                    passage={{
                      title: r.passageTitle,
                      content: r.passageContent,
                      imageUrl: r.passageImageUrl,
                      imageAlt: r.passageImageAlt,
                      sourceNote: r.passageSourceNote,
                    }}
                    className="mb-3"
                  />
                  <div className="mb-3">
                    <MathText
                      text={r.stemEn ?? ""}
                      className="text-neutral-700 dark:text-neutral-300"
                    />
                  </div>
                  <QuestionImages images={r.questionImages} />
                  {r.optionsEn && r.optionsEn.length > 0 ? (
                    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {r.optionsEn.map((option, index) => {
                        const label = OPTION_LETTERS[index] ?? String(index + 1);
                        const isCorrectOption = !isFlagged && label === r.correctAnswer;
                        const isSelectedOption = label === r.selectedOption;
                        return (
                          <div
                            key={option.id}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-sm",
                              isCorrectOption
                                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
                                : isSelectedOption && !isCorrectOption
                                  ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                                  : "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300",
                            )}
                          >
                            <span className="mr-2 font-bold text-primary-600 dark:text-primary-400">
                              {label}.
                            </span>
                            <OptionText option={option} />
                            {isCorrectOption ? (
                              <span className="ml-2 text-xs font-semibold">Correct</span>
                            ) : null}
                            {isSelectedOption ? (
                              <span className="ml-2 text-xs font-semibold">Your answer</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-medium text-neutral-700 dark:text-neutral-200">
                      Your answer:
                    </span>
                    <span className={cn(
                      "rounded border px-2 py-1",
                      isCorrect
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-700"
                        : isIncorrect
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-700"
                        : isFlagged
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
                    )}>
                      {isFlagged ? "— (pending review)" : r.selectedOption ?? "Not answered"}
                      {!isFlagged && r.selectedOptionText ? (
                        <span className="ml-1 font-sans font-normal">{r.selectedOptionText}</span>
                      ) : null}
                    </span>
                  </div>
                  {!isFlagged && isIncorrect && r.correctAnswer && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-medium text-neutral-700 dark:text-neutral-200">
                        Correct answer:
                      </span>
                      <span className="rounded border border-green-200 bg-green-50 px-2 py-1 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
                        {r.correctAnswer}
                        {r.correctAnswerText ? (
                          <span className="ml-1 font-sans">{r.correctAnswerText}</span>
                        ) : null}
                      </span>
                    </div>
                  )}
                  {!isFlagged && (r.explanation || r.explanationImageUrl) && (
                    <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {r.explanation ? (
                        <>
                          <span className="font-semibold">Explanation: </span>
                          <MathText text={r.explanation} />
                        </>
                      ) : null}
                      {r.explanationImageUrl ? (
                        <QuestionImages
                          images={[
                            {
                              url: r.explanationImageUrl,
                              alt: r.explanationImageAlt || "Explanation diagram",
                            },
                          ]}
                        />
                      ) : null}
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
        <Button
          variant="brand"
          onClick={() => {
            // Starting fresh: the previous attempt's results must not linger
            // for the next one (P1QA 2026-10-30).
            try {
              sessionStorage.removeItem("cuet_english_mock_results");
            } catch {}
            router.push("/english-mock/intro");
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" /> New Attempt
        </Button>
      </div>
    </section>
  );
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
