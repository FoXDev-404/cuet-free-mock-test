"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Clock, Flag, RefreshCw, SlidersHorizontal, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MathText } from "@/components/ui/math-text";
import { QuestionImages } from "@/components/questions/question-images";
import { QuestionPassage } from "@/components/questions/question-passage";
import { OptionText } from "@/components/questions/option-text";
import { OPTION_LETTERS } from "@/lib/question-display";

// Visible option labels. The stored option id is internal
// (opt-<questionId>-<order>) and must never be shown to students
// (P1QA 2026-10-30: raw ids were rendering as the option label).

interface Question {
  id: string;
  stemEn: string;
  optionsEn: { id: string; text: string; imageUrl?: string | null; imageAlt?: string | null }[];
  questionImages?: unknown;
  passage?: {
    title?: string | null;
    content?: string | null;
    imageUrl?: string | null;
    imageAlt?: string | null;
    sourceNote?: string | null;
  } | null;
  explanationEn?: string;
  explanationImageUrl?: string | null;
  explanationImageAlt?: string | null;
  type: string;
  marks: number;
  subject: string;
  topic: string;
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
  review: ReviewItem[];
}

interface TestConfig {
  totalQuestions: number;
  durationMinutes: number;
  markingScheme: { correct: number; incorrect: number; unattempted: number };
}

export default function PracticePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ mainCategory: "All", topic: "All", status: "All", source: "All" });
  const [searchQuery, setSearchQuery] = useState("");

  const [attemptId, setAttemptId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/questions?limit=50");
        if (!res.ok) throw new Error("Failed to load questions");
        const data = await res.json();
        const q = Array.isArray(data) ? data : data.questions || [];
        setQuestions(q);
        const cfg = { totalQuestions: q.length, durationMinutes: 60, markingScheme: { correct: 5, incorrect: 1, unattempted: 0 } };
        setConfig(cfg);
        setTimeLeft(cfg.durationMinutes * 60);
        setTimerRunning(true);
        // Open a practice attempt server-side (START event + persistence).
        const startRes = await fetch("/api/attempts/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            practice: true,
            questionIds: q.map((row: { id?: string }) => row.id).filter(Boolean),
          }),
        });
        if (startRes.ok) {
          const startData = await startRes.json();
          if (!cancelled) setAttemptId(startData.attemptId);
        }
      } catch (e) { setError(e instanceof Error ? e.message : "Failed to load questions"); }
      finally { setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Declared before the timer hooks so the auto-submit hook can depend on the
  // latest closure instead of reading a variable before it is declared.
  const submitTest = useCallback(async () => {
    if (submitted || submitting) return;
    setSubmitting(true);
    try {
      const answerArray = Object.entries(answers).map(([questionId, selectedOption]) => ({ questionId, selectedOption }));
      const res = await fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ practice: true, attemptId: attemptId ?? undefined, questionIds: questions.map((question) => question.id), answers: answerArray, timeSpentSec: config!.durationMinutes * 60 - timeLeft }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Submit failed");
      const data = (await res.json()) as SubmitResult;
      setResult(data);
      setSubmitted(true); setShowResult(true);
    } catch (e) { alert(e instanceof Error ? e.message : "Submit failed"); }
    finally { setSubmitting(false); }
  }, [answers, attemptId, timeLeft, submitted, submitting, config, questions]);

  useEffect(() => {
    if (!timerRunning || !config) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, config]);

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

  const selectOption = (optionId: string) => setAnswers(prev => ({ ...prev, [currentQuestion!.id]: optionId }));
  const clearResponse = () => setAnswers(prev => ({ ...prev, [currentQuestion!.id]: null }));
  const toggleReview = () => setMarkedForReview(prev => { const n = new Set(prev); if (n.has(currentQuestion!.id)) n.delete(currentQuestion!.id); else n.add(currentQuestion!.id); return n; });
  const goTo = (i: number) => { if (i >= 0 && i < questions.length) setCurrentIndex(i); };

  if (loading) return <section className="py-12 container-page"><div className="card text-center py-20"><div className="animate-spin mx-auto h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full" /><p className="mt-6 text-neutral-600 dark:text-neutral-400">Loading practice questions…</p></div></section>;
  if (error) return <section className="py-12 container-page"><div className="card text-center py-20 max-w-xl mx-auto"><h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Error</h2><p className="mt-2 text-neutral-600 dark:text-neutral-400">{error}</p><Button onClick={() => window.location.reload()} variant="brand" className="mt-4">Retry</Button></div></section>;
  if (!questions.length) return <section className="py-12 container-page"><div className="card text-center py-20 max-w-xl mx-auto"><h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No questions available</h2><p className="text-neutral-600 dark:text-neutral-400">No practice questions available at the moment.</p></div></section>;

  if (showResult && submitted && result) {
    const { rawScore, maxScore, accuracy, percentage } = { rawScore: result.score, maxScore: result.maxScore, accuracy: result.accuracy, percentage: result.percentage };
    if (showReview) {
      const reviewMap = new Map(result.review.map((r) => [r.questionId, r]));
      return (
        <section className="py-8 container-page">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Answer Review</h2>
            <Button variant="outline" onClick={() => setShowReview(false)}>Back to summary</Button>
          </div>
          <div className="space-y-4">
            {questions.map((q, i) => {
              const rv = reviewMap.get(q.id);
              const sel = answers[q.id];
              const answered = sel != null && sel !== "";
              const selectedIndex = sel ? q.optionsEn.findIndex((option) => option.id === sel) : -1;
              const selectedLabel =
                rv?.selectedOptionLabel ??
                (selectedIndex >= 0 ? OPTION_LETTERS[selectedIndex] : null);
              const isPending = rv?.status === "pending";
              const selectedOptionObj = sel
                ? q.optionsEn.find((option) => option.id === sel)
                : undefined;
              const correctIndex = rv?.correctOption
                ? OPTION_LETTERS.indexOf(rv.correctOption as (typeof OPTION_LETTERS)[number])
                : -1;
              const correctOptionObj =
                correctIndex >= 0 ? q.optionsEn[correctIndex] : undefined;
              return (
                <Card key={q.id}>
                  <CardContent className="pt-5">
                    <QuestionPassage passage={q.passage} />
                    <p className="font-medium text-neutral-900 dark:text-white">Q{i + 1}. <MathText text={q.stemEn} /></p>
                    <QuestionImages images={q.questionImages} />
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <span className="font-semibold">Your answer:</span>{" "}
                      {answered ? (
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
                      <p className="mt-1 text-sm font-semibold text-accent-700 dark:text-accent-300">
                        Answer key unavailable — pending review (not scored)
                      </p>
                    ) : (
                      <>
                        <p className={cn("mt-1 text-sm font-semibold", rv?.isCorrect ? "text-secondary-700 dark:text-secondary-300" : answered ? "text-red-700 dark:text-red-300" : "text-neutral-500")}>{rv?.isCorrect ? "Correct" : answered ? "Incorrect" : "Unattempted"}</p>
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
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      );
    }
    const correct = result.correct, incorrect = result.incorrect, attempted = result.attempted;
    return (
      <section className="py-12 container-page max-w-2xl mx-auto">
        <div className="card text-center p-8 animate-scale-in">
          <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">{Math.round(rawScore)}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Score out of {maxScore}</div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"><div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{correct}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">Correct</div></div>
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"><div className="text-2xl font-bold text-red-600 dark:text-red-400">{incorrect}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">Incorrect</div></div>
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"><div className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">{questions.length - attempted}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">Unattempted</div></div>
          </div>
          <div className="mb-6"><div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mb-1"><div className="h-2 rounded-full bg-primary-600 dark:bg-primary-400 transition-all duration-700" style={{ width: `${percentage}%` }} /></div><div className="text-sm text-neutral-600 dark:text-neutral-400">Accuracy: {accuracy.toFixed(1)}%</div></div>
          <p className="text-neutral-600 dark:text-neutral-300 mb-6">Time taken: {Math.floor((config!.durationMinutes * 60 - timeLeft) / 60)}:{String((config!.durationMinutes * 60 - timeLeft) % 60).padStart(2, "0")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="brand" onClick={() => window.location.reload()}>Retry Test</Button>
            <Button variant="outline" onClick={() => setShowReview(true)} className="w-full sm:w-auto">Review Answers</Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page max-w-6xl py-8">
      {/* Header Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">Practice</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Work through questions at your own pace. Filters apply as you type.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900" aria-label="Time remaining">
            <Clock className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            <span className="font-mono text-sm font-bold text-neutral-900 dark:text-white">{formatTime(timeLeft)}</span>
          </div>
          <Button variant="brand" size="sm" onClick={submitTest} disabled={submitting || submitted}>
            {submitting ? "Submitting…" : "Submit Test"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <Input placeholder="Search questions…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" aria-label="Search questions" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <select value={filters.mainCategory} onChange={e => setFilters({...filters, mainCategory: e.target.value})} className="input" aria-label="Subject"><option value="All">All Subjects</option><option value="Computer Science">Computer Science</option><option value="Physics">Physics</option><option value="Chemistry">Chemistry</option><option value="Mathematics">Mathematics</option><option value="Biology">Biology</option><option value="English">English</option><option value="General Test">General Test</option></select>
              <select value={filters.topic} onChange={e => setFilters({...filters, topic: e.target.value})} className="input" aria-label="Topic"><option value="All">All Topics</option><option value="Operating System">Operating System</option><option value="Database Management">Database Management</option><option value="Computer Networks">Computer Networks</option><option value="Programming">Programming</option><option value="Data Structures">Data Structures</option></select>
              <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="input" aria-label="Status"><option value="All">All Status</option><option value="Unattempted">Unattempted</option><option value="Attempted">Attempted</option><option value="Correct">Correct</option><option value="Incorrect">Incorrect</option><option value="Bookmarked">Bookmarked</option><option value="Review">Marked for Review</option></select>
              <select value={filters.source} onChange={e => setFilters({...filters, source: e.target.value})} className="input" aria-label="Source"><option value="All">All Sources</option><option value="Practice">Practice Questions</option><option value="PYQ">PYQs</option></select>
              <Button variant="outline" onClick={() => { setFilters({mainCategory:"All",topic:"All",status:"All",source:"All"}); setSearchQuery(""); }} disabled={Object.values(filters).every(v=>v==="All") && !searchQuery} className="justify-center">
                <SlidersHorizontal className="mr-2 h-4 w-4" />Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Question {currentIndex + 1} of {questions.length}</CardTitle>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-medium rounded-full px-2.5 py-1", isMarked ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400")}>{isMarked ? "Marked for review" : "Not marked"}</span>
              <button type="button" onClick={toggleReview} className={cn("rounded-lg p-1.5 transition hover:bg-neutral-100 dark:hover:bg-neutral-800", isMarked ? "text-amber-600 dark:text-amber-400" : "text-neutral-400")} aria-label={isMarked ? "Remove review mark" : "Mark for review"} aria-pressed={isMarked}>
                <Flag className={cn("h-4 w-4", isMarked && "fill-current")} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className={cn("font-medium", isAnswered ? "text-secondary-600 dark:text-secondary-400" : "text-neutral-500")}>{isAnswered ? "Answered" : "Not answered"}</span>
            {currentQuestion?.subject ? <span className="badge badge-neutral">{currentQuestion.subject}</span> : null}
            {currentQuestion?.topic ? <span className="badge badge-neutral">{currentQuestion.topic}</span> : null}
            {currentQuestion?.type && <span className="badge badge-primary">{currentQuestion.type}</span>}
          </div>
        </CardHeader>
        <CardContent>
          <QuestionPassage passage={currentQuestion?.passage} />
          <div className="prose prose-sm max-w-none text-neutral-700 dark:text-neutral-200 mb-6"><MathText text={currentQuestion?.stemEn} /></div>
          <QuestionImages images={currentQuestion?.questionImages} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion?.optionsEn.map((opt, optIndex) => {
              const selected = answers[currentQuestion!.id] === opt.id;
              return <button key={opt.id} onClick={() => selectOption(opt.id)} className={cn("w-full text-left p-3 rounded-lg border text-left transition", selected ? "border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300" : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200")}><span className="font-bold text-primary-600 dark:text-primary-400 mr-2">{OPTION_LETTERS[optIndex] ?? optIndex + 1}.</span><OptionText option={opt} /></button>;
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={clearResponse} disabled={!isAnswered || submitting}><RefreshCw className="h-4 w-4 mr-2" />Clear</Button>
            <Button variant="outline" size="sm" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}><ChevronLeft className="h-4 w-4 mr-2" />Previous</Button>
            {currentIndex < questions.length - 1 ? <Button variant="brand" size="sm" onClick={() => goTo(currentIndex + 1)} disabled={submitting}>Next <ChevronRight className="h-4 w-4 ml-2" /></Button> : <Button variant="brand" size="sm" onClick={submitTest} disabled={submitting || submitted}>Submit Test</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Question Palette */}
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