"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Clock, RefreshCw, Flag, CheckCircle, XCircle, MinusCircle, Cloud, CloudOff, Loader2 } from "lucide-react";
import { MathText } from "@/components/ui/math-text";
import { QuestionImages } from "@/components/questions/question-images";
import { QuestionPassage } from "@/components/questions/question-passage";
import { OptionText } from "@/components/questions/option-text";
import { QuestionReportButton } from "@/components/questions/question-report-button";
import { optionLabel } from "@/lib/question-display";

// Keyless question contract — the server strips answer keys before this
// component mounts; grading and per-question correctness arrive only from
// the submit response.
interface Question {
  id: string;
  number: number;
  stemEn: string;
  optionsEn: { id: string; text: string; imageUrl?: string | null; imageAlt?: string | null }[];
  questionImages: unknown;
  type: string;
  marks: number;
  subject: string;
  topic: string;
  passage: {
    title: string;
    content: string;
    imageUrl?: string | null;
    imageAlt?: string | null;
    sourceNote?: string | null;
  } | null;
  scorable: boolean;
}

interface ReviewItem {
  questionId: string;
  selectedOption: string | null;
  selectedOptionLabel?: string | null;
  selectedOptionText?: string | null;
  isCorrect: boolean | null;
  status?: "correct" | "incorrect" | "unattempted" | "pending";
  correctOption?: string | null;
  correctOptionText?: string | null;
  explanation?: string | null;
  explanationImageUrl?: string | null;
  explanationImageAlt?: string | null;
}

interface SubmitResult {
  attemptId: string;
  score: number;
  maxScore: number;
  accuracy: number;
  percentage: number;
  correct: number;
  incorrect: number;
  attempted: number;
  unattempted: number;
  pending?: number;
  percentile?: number | null;
  review: ReviewItem[];
}

/** Metadata for repo-backed draft papers. No answer-key data is included. */
export interface LocalPaperNotice {
  draft: boolean;
  sourceQuestionCount: number;
  recoveredQuestionCount: number;
  omittedQuestionCount: number;
  scorableQuestionCount: number;
  pendingReviewCount: number;
}

interface TestConfig {
  totalQuestions: number;
  durationMinutes: number;
  markingScheme: { correct: number; incorrect: number; unattempted: number };
}

/** Keyless link row — the server strips answer keys before this payload is built. */
interface LoadedQuestionLink {
  question: {
    id: string;
    stemEn: string;
    optionsEn: string | { id: string; text: string }[];
    questionImages?: unknown;
    type: string;
    marks: number;
    subject?: { name: string } | null;
    chapter?: { name: string } | null;
    number?: number;
    passage?: {
      title: string;
      content?: string | null;
      imageUrl?: string | null;
      imageAlt?: string | null;
      sourceNote?: string | null;
    } | null;
    scorable?: boolean;
  };
}

interface TakeTestClientProps {
  test: {
    title: string;
    config: string;
    durationMinutes?: number;
    questions: LoadedQuestionLink[];
  };
  slug: string;
  localPaper?: LocalPaperNotice;
}

export function TakeTestClient({ test, slug, localPaper }: TakeTestClientProps) {
  const config = useMemo(() => JSON.parse(test.config) as TestConfig, [test.config]);
  const questions: Question[] = (test.questions || []).map((l, index) => ({
    id: l.question.id,
    number: l.question.number ?? index + 1,
    stemEn: l.question.stemEn,
    optionsEn: typeof l.question.optionsEn === "string" ? JSON.parse(l.question.optionsEn) : l.question.optionsEn,
    questionImages: l.question.questionImages ?? null,
    type: l.question.type,
    marks: l.question.marks,
    subject: l.question.subject?.name ?? "",
    topic: l.question.chapter?.name ?? "",
    passage:
      l.question.passage?.content && l.question.passage.title
        ? {
            title: l.question.passage.title,
            content: l.question.passage.content,
            imageUrl: l.question.passage.imageUrl,
            imageAlt: l.question.passage.imageAlt,
            sourceNote: l.question.passage.sourceNote,
          }
        : null,
    scorable: l.question.scorable !== false,
  }));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(config.durationMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error] = useState("");
  const [loading] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [resumed, setResumed] = useState(false);
  const [startError, setStartError] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const serverOffsetRef = useRef(0);
  const answersRef = useRef(answers);
  const markedRef = useRef(markedForReview);
  const questionsRef = useRef<Question[]>([]);
  const submitRef = useRef<() => Promise<void>>(async () => {});
  const dirtyRef = useRef(false);
  const changeSeqRef = useRef(0);
  const [dirty, setDirty] = useState(false);

  // Declared up front so the auto-submit hook below can depend on the latest
  // closure instead of reading a variable before it is declared.
  const submitTest = useCallback(async () => {
    if (submitted || submitting) return;
    setSubmitting(true);
    try {
      const answerArray = Object.entries(answers).map(([questionId, selectedOption]) => ({ questionId, selectedOption }));
      const endpoint = localPaper ? `/api/local-mocks/${encodeURIComponent(slug)}/submit` : "/api/attempts";
      const body = localPaper
        ? { answers: answerArray, timeSpentSec: config.durationMinutes * 60 - timeLeft }
        : { slug, attemptId: attemptId ?? undefined, answers: answerArray, timeSpentSec: config.durationMinutes * 60 - timeLeft };
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Submit failed");
      const data = (await res.json()) as SubmitResult;
      setResult(data);
      setSubmitted(true); setShowResult(true);
      setTimerRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      try { localStorage.removeItem(`cuet_answers_${slug}`); } catch {}
    } catch (e) { alert(e instanceof Error ? e.message : "Submit failed"); }
    finally { setSubmitting(false); }
  }, [answers, attemptId, timeLeft, submitted, submitting, config, slug, localPaper]);

  useEffect(() => {
    answersRef.current = answers;
    markedRef.current = markedForReview;
    questionsRef.current = questions;
  }, [answers, markedForReview, questions]);

  useEffect(() => {
    submitRef.current = submitTest;
  }, [submitTest]);

  const saveNow = useCallback(async (options?: { silent?: boolean }) => {
    if (!attemptId || localPaper || submitted) return;
    const answersNow = answersRef.current;
    const markedNow = markedRef.current;
    const rows = questionsRef.current
      .filter(
        (q) =>
          Object.prototype.hasOwnProperty.call(answersNow, q.id) || markedNow.has(q.id),
      )
      .map((q) => ({
        questionId: q.id,
        selectedOption: answersNow[q.id] ?? null,
        markedForReview: markedNow.has(q.id),
      }));
    if (!rows.length) {
      dirtyRef.current = false;
      setDirty(false);
      return;
    }

    const seq = changeSeqRef.current;
    if (!options?.silent) setSaveState("saving");
    try {
      const res = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/answers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: rows }),
        keepalive: true,
      });
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        if (data?.expired) {
          dirtyRef.current = false;
          setDirty(false);
          void submitRef.current();
          return;
        }
      }
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      if (data?.deadlineAt) deadlineRef.current = Date.parse(data.deadlineAt);
      setSavedAt(data?.savedAt ? new Date(data.savedAt) : new Date());
      setSaveState("saved");
      if (changeSeqRef.current === seq) {
        dirtyRef.current = false;
        setDirty(false);
      }
    } catch {
      setSaveState("error");
    }
  }, [attemptId, localPaper, submitted]);

  const touchAnswer = useCallback(() => {
    changeSeqRef.current += 1;
    dirtyRef.current = true;
    setDirty(true);
  }, []);

  // Start (or resume) the server attempt, then hydrate the autosaved sheet.
  // Local papers have no D1 row and skip this entirely.
  useEffect(() => {
    if (localPaper) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/attempts/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(typeof data?.error === "string" ? data.error : "Could not start the test.");
        }
        const started = await res.json();
        if (cancelled) return;
        setAttemptId(started.attemptId);
        setResumed(Boolean(started.resumed));
        serverOffsetRef.current = Date.parse(started.serverNow) - Date.now();
        if (started.deadlineAt) {
          deadlineRef.current = Date.parse(started.deadlineAt);
          const remaining = Math.max(
            0,
            Math.ceil((deadlineRef.current - (Date.now() + serverOffsetRef.current)) / 1000),
          );
          setTimeLeft(remaining);
        }

        const detail = await fetch(`/api/attempts/${encodeURIComponent(started.attemptId)}?resume=1`);
        if (!detail.ok) {
          if (detail.status === 401) {
            setStartError("This attempt belongs to another device. Start a new test to continue.");
          }
          return;
        }
        const data = await detail.json();
        if (cancelled) return;
        if (data.status && data.status !== "IN_PROGRESS") {
          window.location.href = `/mock-tests/${encodeURIComponent(slug)}/result/${encodeURIComponent(started.attemptId)}`;
          return;
        }
        if (data.deadlineAt) {
          deadlineRef.current = Date.parse(data.deadlineAt);
          const remaining = Math.max(
            0,
            Math.ceil((deadlineRef.current - (Date.now() + serverOffsetRef.current)) / 1000),
          );
          setTimeLeft(remaining);
        }
        const savedAnswers = Array.isArray(data.answers) ? data.answers : [];
        if (savedAnswers.length) {
          setAnswers((prev) => {
            const next = { ...prev };
            for (const row of savedAnswers) {
              if (typeof row.questionId === "string" && row.selectedOption !== undefined) {
                next[row.questionId] = row.selectedOption;
              }
            }
            return next;
          });
          setMarkedForReview(
            new Set(
              savedAnswers
                .filter((row: { markedForReview?: boolean }) => row.markedForReview)
                .map((row: { questionId: string }) => row.questionId),
            ),
          );
        }
      } catch (e) {
        if (!cancelled) setStartError(e instanceof Error ? e.message : "Could not start the test.");
      }
    })();
    return () => { cancelled = true; };
  }, [slug, localPaper]);

  // Restore saved answers asynchronously: setState in a timeout avoids a
  // cascading synchronous re-render out of the effect itself.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const stored = localStorage.getItem(`cuet_answers_${slug}`);
        if (stored) {
          const parsed = JSON.parse(stored) as { answers?: Record<string, string | null>; markedForReview?: string[] };
          setAnswers(parsed.answers ?? {});
          setMarkedForReview(new Set(parsed.markedForReview ?? []));
        }
      } catch {}
    }, 0);
    return () => clearTimeout(id);
  }, [slug]);

  useEffect(() => {
    try {
      localStorage.setItem(`cuet_answers_${slug}`, JSON.stringify({ answers, markedForReview: Array.from(markedForReview) }));
    } catch {}
  }, [answers, markedForReview, slug]);

  useEffect(() => {
    if (!timerRunning) return;
    const tick = () => {
      if (deadlineRef.current) {
        const remaining = Math.max(
          0,
          Math.ceil((deadlineRef.current - (Date.now() + serverOffsetRef.current)) / 1000),
        );
        setTimeLeft(remaining);
      } else {
        setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  // Debounced autosave: every answer/mark change is persisted to D1 shortly
  // after the learner stops clicking. The timer also keeps the server copy
  // fresh on slow sessions.
  useEffect(() => {
    if (localPaper || !attemptId || submitted || !dirty) return;
    const id = setTimeout(() => { void saveNow(); }, 1200);
    return () => clearTimeout(id);
  }, [answers, markedForReview, dirty, attemptId, submitted, localPaper, saveNow]);

  useEffect(() => {
    if (localPaper || !attemptId || submitted) return;
    const id = setInterval(() => {
      if (dirtyRef.current) void saveNow({ silent: true });
    }, 15_000);
    const flush = () => {
      if (dirtyRef.current) void saveNow({ silent: true });
    };
    document.addEventListener("visibilitychange", flush);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [attemptId, submitted, localPaper, saveNow]);

  // Auto-submit once the clock reaches zero — deferred out of the timer's
  // state updater so each tick stays a pure state change.
  useEffect(() => {
    if (!timerRunning || timeLeft > 0) return;
    const id = setTimeout(() => { void submitTest(); }, 0);
    return () => clearTimeout(id);
  }, [timeLeft, timerRunning, submitTest]);

  const formatTime = (seconds: number) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; };
  const currentQuestion = questions[currentIndex];
  const isAnswered = answers[currentQuestion?.id] != null && answers[currentQuestion?.id] !== "";
  const isMarked = markedForReview.has(currentQuestion?.id ?? "");

  const selectOption = (optionId: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion!.id]: optionId }));
    touchAnswer();
  };
  const clearResponse = () => {
    setAnswers(prev => ({ ...prev, [currentQuestion!.id]: null }));
    touchAnswer();
  };
  const toggleReview = () => {
    setMarkedForReview(prev => {
      const n = new Set(prev);
      if (n.has(currentQuestion!.id)) n.delete(currentQuestion!.id);
      else n.add(currentQuestion!.id);
      return n;
    });
    touchAnswer();
  };
  const goTo = (i: number) => { if (i >= 0 && i < questions.length) setCurrentIndex(i); };

  if (loading) return <section className="py-12 container-page"><div className="card text-center py-20"><div className="animate-spin mx-auto h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full" /><p className="mt-6 text-neutral-600 dark:text-neutral-400">Loading test…</p></div></section>;
  if (error) return <section className="py-12 container-page"><div className="card text-center py-20 max-w-xl mx-auto"><h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Error</h2><p className="mt-2 text-neutral-600 dark:text-neutral-400">{error}</p><Button onClick={() => window.history.back()} variant="brand">Back</Button></div></section>;
  if (!questions.length) return <section className="py-12 container-page"><div className="card text-center py-20 max-w-xl mx-auto"><h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No questions</h2><p className="text-neutral-600 dark:text-neutral-400">This test has no questions yet.</p><Button onClick={() => window.history.back()} variant="brand">Back</Button></div></section>;

  if (showResult && submitted && result) {
    const correct = result.correct, incorrect = result.incorrect;
    const rawScore = result.score, maxScore = result.maxScore, accuracy = result.accuracy, percentage = result.percentage;
    const pending = result.pending ?? 0;
    const reviewMap = new Map(result.review.map((r) => [r.questionId, r]));
    if (showReview) {
      return (
        <section className="py-8 container-page">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Answer Review</h2>
            <Button variant="outline" onClick={() => setShowReview(false)}>Back to summary</Button>
          </div>
          {pending > 0 ? (
            <p className="mb-4 rounded-lg border border-accent-200 bg-accent-50 p-3 text-sm text-accent-800 dark:border-accent-900 dark:bg-accent-900/20 dark:text-accent-200">
              {pending} {pending === 1 ? "question has" : "questions have"} no answer key in the source paper and {pending === 1 ? "is" : "are"} shown as pending review. {pending === 1 ? "It is" : "They are"} excluded from scoring.
            </p>
          ) : null}
          <div className="space-y-4">
            {questions.map((q) => {
              const rv = reviewMap.get(q.id);
              const sel = answers[q.id];
              const selectedIndex = sel ? q.optionsEn.findIndex((option) => option.id === sel) : -1;
              const selectedLabel =
                rv?.selectedOptionLabel ??
                (selectedIndex >= 0 ? optionLabel(selectedIndex) : undefined);
              const status = rv?.status ?? (rv?.isCorrect ? "correct" : sel && sel !== "" ? "incorrect" : "unattempted");
              const isCorrect = status === "correct";
              const isPending = status === "pending";
              const selectedOptionObj = sel ? q.optionsEn.find((option) => option.id === sel) : undefined;
              const correctOptionObj = rv?.correctOption
                ? q.optionsEn.find((_option, index) => optionLabel(index) === rv.correctOption)
                : undefined;
              return (
                <Card key={q.id} data-testid="review-item">
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-1">{isCorrect ? <CheckCircle className="h-5 w-5 text-secondary-600 dark:text-secondary-400" /> : isPending ? <MinusCircle className="h-5 w-5 text-accent-600 dark:text-accent-400" /> : sel && sel !== "" ? <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" /> : <MinusCircle className="h-5 w-5 text-neutral-400" />}</div>
                      <div className="min-w-0">
                        <QuestionPassage passage={q.passage} />
                        <p className="font-medium text-neutral-900 dark:text-white">Q{q.number}. <MathText text={q.stemEn} /></p>
                        <QuestionImages images={q.questionImages} />
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <span className="font-semibold">Your answer:</span>{" "}
                          {sel && sel !== "" ? (
                            <>
                              {selectedLabel ? <span className="font-semibold">{selectedLabel}. </span> : null}
                              {selectedOptionObj ? (
                                <OptionText option={selectedOptionObj} />
                              ) : (
                                <MathText text={rv?.selectedOptionText ?? sel} />
                              )}
                            </>
                          ) : (
                            "Not answered"
                          )}
                        </p>
                        {isPending ? (
                          <p className="mt-1 text-sm font-semibold text-accent-700 dark:text-accent-300">Answer key unavailable — pending review (not scored)</p>
                        ) : (
                          <>
                            <p className="mt-1 text-sm"><span className={cn("font-semibold", isCorrect ? "text-secondary-700 dark:text-secondary-300" : sel && sel !== "" ? "text-red-700 dark:text-red-300" : "text-neutral-500")} >{isCorrect ? "Correct" : sel && sel !== "" ? "Incorrect" : "Unattempted"}</span></p>
                            {rv?.correctOption ? (
                              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                                <span className="font-semibold">Correct answer:</span>{" "}
                                <span className="font-semibold">{rv.correctOption}.</span>{" "}
                                {correctOptionObj ? (
                                  <OptionText option={correctOptionObj} />
                                ) : (
                                  <MathText text={rv.correctOptionText} />
                                )}
                              </p>
                            ) : null}
                            {rv?.explanation || rv?.explanationImageUrl ? (
                              <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                                {rv.explanation ? (
                                  <p>
                                    <span className="font-semibold">Explanation:</span>{" "}
                                    <MathText text={rv.explanation} />
                                  </p>
                                ) : null}
                                {rv.explanationImageUrl ? (
                                  <QuestionImages
                                    images={[
                                      {
                                        url: rv.explanationImageUrl,
                                        alt: rv.explanationImageAlt || "Explanation diagram",
                                      },
                                    ]}
                                  />
                                ) : null}
                              </div>
                            ) : null}
                            <div className="mt-2">
                              <QuestionReportButton questionId={q.id} attemptId={attemptId} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      );
    }
    return (
      <section className="py-12 container-page max-w-2xl mx-auto">
        <div className="card text-center p-8 animate-scale-in">
          <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">{maxScore > 0 ? Math.round(rawScore) : "—"}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{maxScore > 0 ? `Score out of ${maxScore}` : "Not scored — no answer key available"}</div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"><div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{correct}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">Correct</div></div>
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"><div className="text-2xl font-bold text-red-600 dark:text-red-400">{incorrect}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">Incorrect</div></div>
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"><div className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">{result.unattempted}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">Unattempted</div></div>
          </div>
          {maxScore > 0 ? <div className="mb-6"><div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mb-1"><div className="h-2 rounded-full bg-primary-600 dark:bg-primary-400 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} /></div><div className="text-sm text-neutral-600 dark:text-neutral-400">Accuracy: {accuracy.toFixed(1)}%</div></div> : null}
          {pending > 0 ? <p className="mb-6 rounded-lg border border-accent-200 bg-accent-50 p-3 text-sm text-accent-800 dark:border-accent-900 dark:bg-accent-900/20 dark:text-accent-200">{pending} {pending === 1 ? "question is" : "questions are"} pending answer-key review and {pending === 1 ? "is" : "are"} not included in the score.</p> : null}
          <p className="text-neutral-600 dark:text-neutral-300 mb-6">Time taken: {Math.floor((config.durationMinutes * 60 - timeLeft) / 60)}:{String((config.durationMinutes * 60 - timeLeft) % 60).padStart(2, "0")}</p>
          {result.percentile != null ? <p className="mb-6 text-sm font-medium text-secondary-700 dark:text-secondary-300">Percentile: {result.percentile}%</p> : null}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="brand" onClick={() => { window.location.reload(); }}>Retry Test</Button>
            <Button variant="outline" onClick={() => setShowReview(true)} className="w-full sm:w-auto">Review Answers</Button>
          </div>
        </div>
      </section>
    );
  }

  const attemptedCount = Object.values(answers).filter(a => a != null && a !== "").length;

  return (
    <section className="container-page max-w-6xl py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button type="button" onClick={() => window.history.back()} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"><ChevronLeft className="h-4 w-4" />Back to test</button>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">{test?.title || "Mock Test"}</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {localPaper
              ? "Test in progress — answers are saved on this device."
              : resumed
                ? "Resumed where you left off — your answers autosave."
                : "Test in progress — your answers autosave."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!localPaper ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium",
                saveState === "error"
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300"
                  : "border-neutral-200 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400",
              )}
              aria-live="polite"
            >
              {saveState === "saving" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : saveState === "error" ? (
                <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {saveState === "saving"
                ? "Saving…"
                : saveState === "error"
                  ? "Not saved — retrying"
                  : saveState === "saved"
                    ? `Saved${savedAt ? ` ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}`
                    : "Autosave on"}
            </span>
          ) : null}
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900" aria-label="Time remaining">
            <Clock className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            <span className={cn("font-mono text-sm font-bold", timeLeft <= 300 ? "text-danger-600 dark:text-danger-400" : "text-neutral-900 dark:text-white")}>{formatTime(timeLeft)}</span>
          </div>
          <Button variant="brand" size="sm" onClick={submitTest} disabled={submitting || submitted}>{submitting ? "Submitting…" : "Submit Test"}</Button>
        </div>
      </div>

      {startError ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200" role="alert">
          <p className="font-semibold">Could not resume this attempt</p>
          <p className="mt-1">{startError}</p>
        </div>
      ) : null}

      {localPaper?.draft ? (
        <div className="mb-6 rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm dark:border-accent-900 dark:bg-accent-900/20">
          <p className="font-semibold text-accent-900 dark:text-accent-200">Draft OCR paper</p>
          <p className="mt-1 text-accent-800 dark:text-accent-300">
            {localPaper.recoveredQuestionCount} of {localPaper.sourceQuestionCount} source questions were recovered.{" "}
            {localPaper.omittedQuestionCount > 0 ? `${localPaper.omittedQuestionCount} records could not be recovered and were omitted. ` : ""}
            {localPaper.scorableQuestionCount > 0 ? `${localPaper.scorableQuestionCount} questions have an answer key.` : "No answer key is available in the source."}{" "}
            {localPaper.pendingReviewCount > 0 ? `${localPaper.pendingReviewCount} ${localPaper.pendingReviewCount === 1 ? "is" : "are"} pending review and not scored.` : ""}
          </p>
        </div>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-lg">Question {currentIndex + 1} of {questions.length}{currentQuestion && currentQuestion.number !== currentIndex + 1 ? <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">Source Q{currentQuestion.number}</span> : null}</CardTitle><div className="flex items-center gap-2"><span className={cn("text-xs font-medium rounded-full px-2.5 py-1", isMarked ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400")}>{isMarked ? "Marked for review" : "Not marked"}</span><button type="button" onClick={toggleReview} className={cn("rounded-lg p-1.5 transition hover:bg-neutral-100 dark:hover:bg-neutral-800", isMarked ? "text-amber-600 dark:text-amber-400" : "text-neutral-400")} aria-label={isMarked ? "Remove review mark" : "Mark for review"} aria-pressed={isMarked}><Flag className={cn("h-4 w-4", isMarked && "fill-current")} /></button></div></div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400"><span className={cn("font-medium", isAnswered ? "text-secondary-600 dark:text-secondary-400" : "text-neutral-500")}>{isAnswered ? "Answered" : "Not answered"}</span><span className="badge badge-neutral">{attemptedCount} attempted</span>{currentQuestion?.subject && <span className="badge badge-neutral">{currentQuestion.subject}</span>}{currentQuestion?.topic && <span className="badge badge-neutral">{currentQuestion.topic}</span>}{currentQuestion?.scorable === false ? <span className="badge badge-warning">Pending answer key</span> : null}</div>
        </CardHeader>
        <CardContent>
          {currentQuestion?.passage ? (
            <details className="mb-5 rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/40">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Reading passage — {currentQuestion.passage.title}
              </summary>
              <div className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words border-t border-neutral-200 px-4 py-3 text-sm leading-6 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
                <MathText text={currentQuestion.passage.content} />
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
                  <MathText
                    text={currentQuestion.passage.sourceNote}
                    className="mt-2 block text-xs italic text-neutral-500 dark:text-neutral-400"
                  />
                ) : null}
              </div>
            </details>
          ) : null}
          <div className="prose prose-sm max-w-none text-neutral-700 dark:text-neutral-200 mb-6"><MathText text={currentQuestion?.stemEn} /></div>
          <QuestionImages images={currentQuestion?.questionImages} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{currentQuestion?.optionsEn.map((opt, optIndex) => { const selected = answers[currentQuestion!.id] === opt.id; return <button key={opt.id} onClick={() => selectOption(opt.id)} className={cn("w-full text-left p-3 rounded-lg border text-left transition", selected ? "border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300" : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200")}><span className="font-bold text-primary-600 dark:text-primary-400 mr-2">{optionLabel(optIndex)}.</span><OptionText option={opt} /></button>; })}</div>
          <div className="mt-4 flex flex-wrap gap-3"><Button variant="outline" size="sm" onClick={clearResponse} disabled={!isAnswered || submitting}><RefreshCw className="h-4 w-4 mr-2" />Clear</Button><Button variant="outline" size="sm" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}><ChevronLeft className="h-4 w-4 mr-2" />Previous</Button>{currentIndex < questions.length - 1 ? <Button variant="brand" size="sm" onClick={() => goTo(currentIndex + 1)} disabled={submitting}>Next <ChevronRight className="h-4 w-4 ml-2" /></Button> : <Button variant="brand" size="sm" onClick={submitTest} disabled={submitting || submitted}>Submit Test</Button>}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Question Palette</CardTitle><p className="text-xs text-neutral-500 dark:text-neutral-400">Click a number to jump. Indigo = answered, amber = marked for review, grey = unvisited.</p></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">{questions.map((q, i) => { const answered = answers[q.id] != null && answers[q.id] !== ""; const marked = markedForReview.has(q.id); const current = i === currentIndex; return <button key={q.id} onClick={() => goTo(i)} className={cn("w-8 h-8 rounded text-xs font-medium transition", current && "ring-2 ring-primary-600 dark:ring-primary-400", marked && answered ? "bg-amber-200 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200" : marked ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" : answered ? "bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200" : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700")}>{i + 1}</button>; })}</div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400" />Answered</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />Marked</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700" />Unvisited</span></div>
        </CardContent>
      </Card>
    </section>
  );
}
