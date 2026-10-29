"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef, useId } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { computeScore } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Clock, X, Circle, RefreshCw } from "lucide-react";

interface Question {
  id: string;
  stemEn: string;
  optionsEn: { id: string; text: string }[];
  correctAnswer: string;
  explanationEn?: string;
  type: string;
  marks: number;
}

interface TestConfig {
  totalQuestions: number;
  durationMinutes: number;
  markingScheme: { correct: number; incorrect: number; unattempted: number };
}

export default function TakeTestPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Test UI state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string>(`session-${useId()}`);

  // Load questions from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/questions?slug=${params.slug}&limit=100`);
        if (!res.ok) throw new Error("Failed to load questions");
        const data = await res.json();
        setQuestions(data);
      } catch (e: any) {
        setError(e.message || "Failed to load questions");
      } finally {
        setLoading(false);
      }
      return () => { cancelled = true; };
    })();
  }, [params.slug]);

  // Persist answers to localStorage on change
  useEffect(() => {
    if (!sessionIdRef.current) return;
    try {
      localStorage.setItem(
        `cuet_answers_${params.slug}`,
        JSON.stringify({ answers, markedForReview: Array.from(markedForReview) })
      );
    } catch {}
  }, [answers, markedForReview, params.slug]);

  // Timer
  useEffect(() => {
    if (!config || !timerRunning) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setTimerRunning(false);
          autoSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, config, params.slug]);

  // Initialize timer and restore answers from localStorage
  useEffect(() => {
    if (!config) return;
    setTimeLeft(config.durationMinutes * 60);
    setTimerRunning(true);
    try {
      const raw = localStorage.getItem(`cuet_answers_${params.slug}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.markedForReview) setMarkedForReview(new Set(parsed.markedForReview));
      }
    } catch {}
  }, [config, params.slug]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (!config) return null;
  const currentQuestion = questions[currentIndex];
  const isAnswered = answers[currentQuestion?.id] != null && answers[currentQuestion?.id] !== "";
  const isMarked = markedForReview.has(currentQuestion?.id ?? "");

  const selectOption = (optionId: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }));
  };

  const clearResponse = () => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: null }));
  };

  const toggleReview = () => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) next.delete(currentQuestion.id);
      else next.add(currentQuestion.id);
      return next;
    });
  };

  const goTo = (index: number) => {
    if (index >= 0 && index < questions.length) setCurrentIndex(index);
  };

  const autoSubmit = async () => {
    await submitTest(true);
  };

  const submitTest = async (auto = false) => {
    if (submitted || submitting) return;
    setSubmitting(true);
    try {
      const answerArray = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      }));
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: params.slug,
          sessionId: sessionIdRef.current,
          answers: answerArray,
          timeSpentSec: config.durationMinutes * 60 - timeLeft,
        }),
      });
      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();
      setSubmitted(true);
      setShowResult(true);
      if (timerRef.current) clearInterval(timerRef.current);
      // clear localStorage
      try { localStorage.removeItem(`cuet_answers_${params.slug}`); } catch {}
    } catch (e: any) {
      setError(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
        <div className="card text-center py-20">
          <div className="animate-spin mx-auto h-12 w-12 border-4 border-brand-200 border-t-brand-600 rounded-full" />
          <p className="mt-6 text-neutral-600 dark:text-neutral-400">Loading test…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
        <div className="card text-center py-20">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Error</h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">{error}</p>
          <Button onClick={() => router.back()} variant="outline">Back</Button>
        </div>
      </section>
    );
  }

  if (!questions.length) {
    return (
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
        <div className="card text-center py-20">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">No questions</h2>
          <p className="text-neutral-600 dark:text-neutral-400">This test has no questions yet.</p>
          <Button onClick={() => router.back()} variant="brand">Back</Button>
        </div>
      </section>
    );
  }

  if (showResult && submitted) {
    return (
      <ResultSummary
        questions={questions}
        answers={answers}
        config={config}
        timeSpent={config.durationMinutes * 60 - timeLeft}
        onRetry={() => {
          setShowResult(false);
          setSubmitted(false);
          setAnswers({});
          setMarkedForReview(new Set());
          setCurrentIndex(0);
          setTimeLeft(config.durationMinutes * 60);
          setTimerRunning(true);
        }}
        onReview={() => setShowResult(false)}
      />
    );
  }

  const correctCount = Object.values(answers).filter((a) => a != null).length; // placeholder
  const attemptedCount = Object.values(answers).filter((a) => a != null && a !== "").length;

  return (
    <section className="py-4 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <LinkBack testSlug={params.slug} />
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Test in Progress</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/50">
            <Clock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <span className="text-sm font-mono font-bold text-neutral-900 dark:text-brand-300">{formatTime(timeLeft)}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => submitTest()} disabled={submitting || submitted}>
            {timerRunning ? "Submit Test" : "Time's up"}
          </Button>
        </div>
      </div>

      {/* Question card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-lg">Question {currentIndex + 1} of {questions.length}</CardTitle>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium rounded px-2 py-0.5 ${isMarked ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"}`}>
                {isMarked ? "Review" : "Normal"}
              </span>
              <button
                onClick={toggleReview}
                className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                aria-label={isMarked ? "Unmark for review" : "Mark for review"}
              >
                <X className={`h-4 w-4 ${isMarked ? "text-amber-600" : "text-neutral-400"}`} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className={cn("font-medium", isAnswered ? "text-brand-600 dark:text-brand-400" : "text-neutral-500")}>
              {isAnswered ? "Answered" : "Not answered"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-neutral-700 dark:text-neutral-200 mb-6">
            {currentQuestion.stemEn}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.optionsEn.map((opt) => {
              const isSelected = answers[currentQuestion.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => selectOption(opt.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border text-left transition",
                    isSelected
                      ? "border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300"
                      : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
                  )}
                >
                  <span className="font-bold text-brand-600 dark:text-brand-400 mr-2">{opt.id}</span>
                  {opt.text}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="outline" size="sm" onClick={clearResponse} disabled={!isAnswered || submitting}>
              <RefreshCw className="h-4 w-4 mr-2" /> Clear
            </Button>
            {currentIndex > 0 && (
              <Button variant="outline" size="sm" onClick={() => goTo(currentIndex - 1)}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Previous
              </Button>
            )}
            {currentIndex < questions.length - 1 ? (
              <Button variant="brand" size="sm" onClick={() => goTo(currentIndex + 1)} disabled={submitting}>
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button variant="brand" size="sm" onClick={() => submitTest()} disabled={submitting || submitted}>
                Submit Test
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question palette */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Question Palette</CardTitle>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Click a number to jump. Grey = unvisited, Green = answered, Amber = marked for review.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, i) => {
              const answered = answers[q.id] != null && answers[q.id] !== "";
              const marked = markedForReview.has(q.id);
              const isCurrent = i === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => goTo(i)}
                  className={cn(
                    "w-8 h-8 rounded text-xs font-medium transition",
                    isCurrent
                      ? "ring-2 ring-brand-600 dark:ring-brand-400"
                      : "",
                    marked && answered
                      ? "bg-amber-200 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                      : marked
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                      : answered
                      ? "bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200"
                      : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-500 dark:bg-brand-400" /> Answered</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" /> Marked</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700" /> Unvisited</span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function LinkBack({ testSlug }: { testSlug: string }) {
  const router = useRouter();
  return (
    <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
      <ChevronLeft className="h-4 w-4" /> Back
    </button>
  );
}

function ResultSummary({
  questions,
  answers,
  config,
  timeSpent,
  onRetry,
  onReview,
}: {
  questions: any[];
  answers: Record<string, string | null>;
  config: any;
  timeSpent: number;
  onRetry: () => void;
  onReview: () => void;
}) {
  let correct = 0;
  let incorrect = 0;
  let attempted = 0;
  for (const q of questions) {
    const sel = answers[q.id];
    if (sel != null && sel !== "") {
      attempted += 1;
      if (sel === q.correctAnswer) correct += 1;
      else incorrect += 1;
    }
  }
  const { rawScore, maxScore, accuracy, percentage } = computeScore(correct, incorrect, questions.length - attempted, config.markingScheme.correct, config.markingScheme.incorrect);

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <div className="card text-center">
        <div className="text-4xl font-bold text-brand-600 dark:text-brand-400 mb-2">{rawScore}</div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Score out of {maxScore}</div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">{correct}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Correct</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{incorrect}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Incorrect</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">{questions.length - attempted}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Unattempted</div>
          </div>
        </div>
        <div className="mb-6">
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mb-1">
            <div className={`h-2 rounded-full transition-all duration-700 bg-brand-600 dark:bg-brand-400`} style={{ width: `${percentage}%` }}></div>
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">Accuracy: {accuracy.toFixed(1)}%</div>
        </div>
        <p className="text-neutral-600 dark:text-neutral-300 mb-6">
          Time taken: {Math.floor(timeSpent / 60)}:{String(timeSpent % 60).padStart(2, "0")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="brand" onClick={onRetry}>Retry Test</Button>
          <Button variant="outline" onClick={onReview} className="w-full sm:w-auto">Review Answers</Button>
        </div>
      </div>
    </section>
  );
}
