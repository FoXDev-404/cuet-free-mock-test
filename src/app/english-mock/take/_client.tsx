"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptionText } from "@/components/questions/option-text";
import { QuestionImages } from "@/components/questions/question-images";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Flag,
  AlertTriangle,
} from "lucide-react";

const REVIEW_FLAGGED_QUESTIONS = [8, 32, 41];
// Paper size for the seeded CUET UG English paper (matches intro config).
// P1QA 2026-10-30: unanswered counts must be measured against the whole
// paper — questions are loaded into `questions` one page at a time, so any
// count filtered over that array only sees questions the student visited.
const TOTAL_QUESTIONS = 50;
const STORAGE_KEY = "cuet_english_mock_answers";
const TIMER_STORAGE_KEY = "cuet_english_mock_timer";

interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
}

export interface PassageData {
  id: string;
  passageKey: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  sourceNote?: string | null;
  sourcePageStart: number | null;
  sourcePageEnd: number | null;
}

export interface QuestionData {
  id: string;
  questionNumber: number;
  stemEn: string;
  optionsEn: QuestionOption[];
  passage?: PassageData;
}

interface TimerState {
  startTime: number;
  durationSeconds: number;
  pausedTime: number;
}

interface IntroData {
  config: {
    durationMinutes: number;
  };
}

const ORDER_TO_LABEL = ["A", "B", "C", "D"];

/**
 * P1QA 2026-10-30: restore-on-load persistence helpers.
 *
 * The previous implementation restored via a mount effect that ran after the
 * autosave effect had already written an empty snapshot (and under React
 * StrictMode the double mount then re-read the already-clobbered storage),
 * so every reload silently wiped the attempt. State is now initialized
 * lazily at first render — before any effect can save — so the autosave
 * effect only ever writes real, current state.
 */
function readPersistedAnswers(): Record<string, string | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw).answers || {};
  } catch {
    return {};
  }
}

function readPersistedMarked(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).markedForReview || [];
  } catch {
    return [];
  }
}

function readPersistedTimer(): TimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const parsed: TimerState = JSON.parse(raw);
    if (
      typeof parsed?.startTime !== "number" ||
      typeof parsed?.durationSeconds !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

interface EnglishMockTakeProps {
  initialQuestion: QuestionData;
}

export default function EnglishMockTake({
  initialQuestion,
}: EnglishMockTakeProps) {
  const router = useRouter();
  const autoSubmitFiredRef = useRef(false);
  // P1QA 2026-10-30: seed one slot per paper question so the palette always
  // renders the full 1..50 range (its legend promises "grey = unvisited").
  // Unvisited slots are placeholders (id === "") that loadQuestion overwrites;
  // goTo fetches any placeholder before switching to it.
  const [questions, setQuestions] = useState<QuestionData[]>(() => {
    const seeded: QuestionData[] = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => ({
      id: "",
      questionNumber: i + 1,
      stemEn: "",
      optionsEn: [] as QuestionOption[],
    }));
    seeded[0] = initialQuestion;
    return seeded;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>(() =>
    readPersistedAnswers(),
  );
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(() =>
    new Set(readPersistedMarked()),
  );
  const [timeLeft, setTimeLeft] = useState(() => {
    // Lazy initializer (StrictMode-safe): read the persisted timer before any
    // effect can clobber localStorage with an empty state. Pure render — the
    // boot effect below re-reads localStorage itself instead of using a ref
    // written during render (react-hooks: cannot access refs during render).
    const persisted = readPersistedTimer();
    if (!persisted) return 3600;
    const elapsed =
      Math.floor((Date.now() - persisted.startTime) / 1000) - persisted.pausedTime;
    return Math.max(0, persisted.durationSeconds - elapsed);
  });
  const [timerRunning, setTimerRunning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStateRef = useRef<TimerState>({
    startTime: 0,
    durationSeconds: 3600,
    pausedTime: 0,
  });

  const loadQuestion = (n: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      fetch(`/api/english-mock/questions/${n}`, { cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error("Question not found");
          return r.json();
        })
        .then((q: QuestionData) => {
          setQuestions((prev) => {
            const updated = [...prev];
            updated[n - 1] = q;
            return updated;
          });
          setLoading(false);
          resolve();
        })
        .catch(() => {
          setError("Failed to load question");
          setLoading(false);
          reject();
        });
    });
  };

  const submitTest = async (auto = false) => {
    if (submitted || submitting) return;

    if (!auto) {
      // P1QA 2026-10-30: count against the whole paper. The previous filter
      // over `questions` (lazily filled, visited-only) made the confirm step
      // silently skip whenever every visited question had been answered.
      const answeredCountLocal = Object.values(answers).filter(
        (v) => v !== null && v !== ""
      ).length;
      const unansweredCountLocal = TOTAL_QUESTIONS - answeredCountLocal;
      const markedCountLocal = markedForReview.size;
      if (unansweredCountLocal > 0 || markedCountLocal > 0) {
        setConfirmSubmit(true);
        return;
      }
    }

    setSubmitting(true);
    try {
      const answerArray = Object.entries(answers).map(
        ([questionId, selectedOption]) => ({ questionId, selectedOption })
      );

      const res = await fetch("/api/english-mock/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answerArray,
          timeSpentSec: 3600 - timeLeft,
        }),
      });

      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();

      setSubmitted(true);
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TIMER_STORAGE_KEY);
      } catch {}

      if (timerRef.current) clearInterval(timerRef.current);

      // Save results to sessionStorage for the results page
      const resultsData = {
        verifiedRawScore: data.verifiedRawScore,
        verifiedMaxScore: data.verifiedMaxScore,
        attempted: data.attempted,
        unanswered: data.unanswered,
        correct: data.correct,
        incorrect: data.incorrect,
        reviewFlagged: data.reviewFlagged,
        results: data.results,
        timeSpentSec: 3600 - timeLeft,
      };
      try {
        sessionStorage.setItem(
          "cuet_english_mock_results",
          JSON.stringify(resultsData)
        );
      } catch {}

      router.push("/english-mock/results");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const autoSubmit = async () => {
    await submitTest(true);
  };

  // Load exam config for timer duration. A persisted timer always wins over
  // the config default so a page reload continues the SAME attempt clock
  // (P1QA 2026-10-30). An already-expired persisted attempt auto-submits.
  useEffect(() => {
    let cancelled = false;
    let autoSubmitScheduled = false;
    // Re-read localStorage here (effect time — refs-free) rather than seeding
    // a ref during render (P1QA 2026-10-30).
    const persisted = readPersistedTimer();

    const startTimer = (persisted: TimerState | null) => {
      if (persisted) {
        timerStateRef.current = {
          startTime: persisted.startTime,
          durationSeconds: persisted.durationSeconds,
          pausedTime: persisted.pausedTime,
        };
        autoSubmitScheduled = persisted.durationSeconds - (Math.floor((Date.now() - persisted.startTime) / 1000) - persisted.pausedTime) <= 0;
      } else {
        timerStateRef.current.startTime = Date.now();
      }
      setTimerRunning(true);
      if (autoSubmitScheduled && !autoSubmitFiredRef.current) {
        // Timer effect skips === 0; honour expiry exactly once.
        autoSubmitFiredRef.current = true;
        void Promise.resolve().then(() => void autoSubmit());
      }
    };

    fetch("/api/english-mock/intro", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: IntroData) => {
        if (cancelled) return;
        if (!persisted) {
          setTimeLeft(data.config.durationMinutes * 60);
          timerStateRef.current.durationSeconds = data.config.durationMinutes * 60;
        }
        startTimer(persisted);
        setLoading(false);
      })
      .catch(() => {
        // Timer defaults to 60 minutes if config fetch fails
        startTimer(persisted);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Timer state is initialized lazily at first render — nothing left to race
  // with the autosave effect below (P1QA 2026-10-30).

  // Save answers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          answers,
          markedForReview: Array.from(markedForReview),
          startedAt: Date.now(),
        })
      );
    } catch {}
  }, [answers, markedForReview]);

  // Save timer state periodically
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      try {
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerStateRef.current));
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Timer
  useEffect(() => {
    if (!timerRunning || timeLeft <= 0) return;
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
  }, [timerRunning, timeLeft]);

  const currentQuestion = questions[currentIndex];
  const isAnswered =
    currentQuestion && answers[currentQuestion.id] != null && answers[currentQuestion.id] !== "";
  const isMarked = currentQuestion ? markedForReview.has(currentQuestion.id) : false;
  const isFlagged = currentQuestion ? REVIEW_FLAGGED_QUESTIONS.includes(currentQuestion.questionNumber) : false;

  // Unanswered spans the whole paper (the `questions` array only ever holds
  // visited pages — see TOTAL_QUESTIONS note at the top, P1QA 2026-10-30).
  const answeredCount = Object.values(answers).filter(
    (v) => v !== null && v !== ""
  ).length;
  const unansweredCount = TOTAL_QUESTIONS - answeredCount;
  const markedCount = markedForReview.size;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const optionLabelFor = (optId: string): string => {
    const parts = optId.split("-");
    const order = parseInt(parts[parts.length - 1], 10);
    return ORDER_TO_LABEL[order - 1] || optId;
  };

  const selectOption = (optionId: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }));
  };

  const clearResponse = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: null }));
  };

  const toggleReview = () => {
    if (!currentQuestion) return;
    setMarkedForReview((prev) => {
      const n = new Set(prev);
      n.has(currentQuestion.id) ? n.delete(currentQuestion.id) : n.add(currentQuestion.id);
      return n;
    });
  };

  const goTo = async (i: number) => {
    if (i >= 0 && i < 50) {
      if (!questions[i] || questions[i].id === "") {
        await loadQuestion(i + 1);
      }
      setCurrentIndex(i);
    }
  };

  if (loading) {
    return (
      <section className="py-12 container-page">
        <div className="card text-center py-20">
          <div className="animate-spin mx-auto h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full" />
          <p className="mt-6 text-neutral-600 dark:text-neutral-400">Loading test…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 container-page">
        <div className="card text-center py-20 max-w-xl mx-auto">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Error</h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">{error}</p>
          <Button onClick={() => window.history.back()} variant="brand">
            Back
          </Button>
        </div>
      </section>
    );
  }

  if (confirmSubmit) {
    return (
      <section className="py-12 container-page max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirm Submit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              You have {unansweredCount} unanswered and {markedCount} question(s) marked for review.
              Are you sure you want to submit?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setConfirmSubmit(false)}>
                Keep Working
              </Button>
              <Button variant="brand" onClick={() => submitTest(true)}>
                Submit Anyway
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="container-page max-w-6xl py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
            CUET UG English Mock Test
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Question {currentIndex + 1} of {TOTAL_QUESTIONS}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900" aria-label="Time remaining">
            <Clock className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            <span
              className={`font-mono text-sm font-bold ${
                timeLeft <= 300 ? "text-danger-600 dark:text-danger-400" : "text-neutral-900 dark:text-white"
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
          <Button variant="brand" size="sm" className="min-h-9" onClick={() => submitTest()} disabled={submitting || submitted}>
            {submitting ? "Submitting…" : "Submit Test"}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Question {currentQuestion.questionNumber}</CardTitle>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-medium rounded-full px-2.5 py-1",
                isMarked ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
              )}>
                {isMarked ? "Marked for review" : "Not marked"}
              </span>
              {isFlagged && (
                <span className="text-xs font-medium rounded-full px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  Answer key under review
                </span>
              )}
              <button
                type="button"
                onClick={toggleReview}
                className={cn(
                  "rounded-lg p-1.5 transition hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  isMarked ? "text-amber-600 dark:text-amber-400" : "text-neutral-400"
                )}
                aria-label={isMarked ? "Remove review mark" : "Mark for review"}
                aria-pressed={isMarked}
              >
                <Flag className={cn("h-4 w-4", isMarked && "fill-current")} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className={cn("font-medium", isAnswered ? "text-secondary-600 dark:text-secondary-400" : "text-neutral-500")}>
              {isAnswered ? "Answered" : "Not answered"}
            </span>
            {currentQuestion.passage && (
              <span className="badge badge-neutral">Passage: {currentQuestion.passage.title}</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentQuestion.passage && (
            <div className="mb-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                  Reading Passage: {currentQuestion.passage.title}
                </span>
              </div>
              <div className="prose prose-sm max-w-none text-neutral-600 dark:text-neutral-300">
                {currentQuestion.passage.content}
              </div>
              {currentQuestion.passage.imageUrl ? (
                <QuestionImages
                  images={[
                    {
                      url: currentQuestion.passage.imageUrl,
                      alt: currentQuestion.passage.imageAlt || "Passage diagram",
                    },
                  ]}
                />
              ) : null}
              {currentQuestion.passage.sourceNote ? (
                <p className="mt-2 text-xs italic text-neutral-500 dark:text-neutral-400">
                  {currentQuestion.passage.sourceNote}
                </p>
              ) : null}
            </div>
          )}
          <div className="prose prose-sm max-w-none text-neutral-700 dark:text-neutral-200 mb-6">
            {currentQuestion.stemEn}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.optionsEn.map((opt) => {
              const selected = answers[currentQuestion.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => selectOption(opt.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border text-left transition",
                    selected
                      ? "border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                      : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
                  )}
                >
                  <span className="font-bold text-primary-600 dark:text-primary-400 mr-2">
                    {optionLabelFor(opt.id)}
                  </span>
                  <OptionText option={opt} />
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={clearResponse} disabled={!isAnswered || submitting} className="min-h-9">
              <RefreshCw className="h-4 w-4 mr-2" /> Clear
            </Button>
            <Button variant="outline" size="sm" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} className="min-h-9">
              <ChevronLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
            {currentIndex < 49 ? (
              <Button variant="brand" size="sm" onClick={() => goTo(currentIndex + 1)} disabled={submitting} className="min-h-9">
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button variant="brand" size="sm" className="min-h-9" onClick={() => submitTest()} disabled={submitting || submitted}>
                Submit Test
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Question Palette</CardTitle>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Click a number to jump. Indigo = answered, amber = marked for review, grey = unvisited. Blue = answer key under review.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, i) => {
              const answered = answers[q.id] != null && answers[q.id] !== "";
              const marked = markedForReview.has(q.id);
              const current = i === currentIndex;
              const flagged = REVIEW_FLAGGED_QUESTIONS.includes(q.questionNumber);
              return (
                <button
                  key={q.questionNumber}
                  onClick={() => goTo(i)}
                  className={cn(
                    "w-8 h-8 rounded text-xs font-medium transition",
                    current && "ring-2 ring-primary-600 dark:ring-primary-400",
                    marked && answered
                      ? "bg-amber-200 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                      : marked
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                      : answered
                      ? "bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200"
                      : flagged
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  )}
                >
                  {q.questionNumber}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400" /> Answered
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" /> Marked
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700" /> Unvisited
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-100 dark:bg-blue-900/30" /> Under review
            </span>
          </div>
          <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
            {unansweredCount} unanswered • {markedCount} marked for review
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
