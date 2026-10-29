"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { computeScore } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Clock, RefreshCw, Flag, CheckCircle, XCircle, MinusCircle } from "lucide-react";

interface Question {
  id: string;
  stemEn: string;
  optionsEn: { id: string; text: string }[];
  correctAnswer: string;
  explanationEn?: string;
  type: string;
  marks: number;
  subject: string;
  topic: string;
}

interface TestConfig {
  totalQuestions: number;
  durationMinutes: number;
  markingScheme: { correct: number; incorrect: number; unattempted: number };
}

interface TakeTestClientProps {
  test: any;
  slug: string;
}

export function TakeTestClient({ test, slug }: TakeTestClientProps) {
  const router = useRouter();
  const config = typeof test.config === "string" ? JSON.parse(test.config) : test.config;
  const questions: Question[] = (test.questions || []).map((l: any) => ({
    id: l.question.id,
    stemEn: l.question.stemEn,
    optionsEn: typeof l.question.optionsEn === "string" ? JSON.parse(l.question.optionsEn) : l.question.optionsEn,
    correctAnswer: l.question.correctAnswer,
    explanationEn: l.question.explanationEn,
    type: l.question.type,
    marks: l.question.marks,
    subject: l.question.subject,
    topic: l.question.topic,
  }));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(config.durationMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`cuet_answers_${slug}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAnswers(parsed.answers || {});
        setMarkedForReview(new Set(parsed.markedForReview || []));
      }
    } catch {}
  }, [slug]);

  useEffect(() => {
    try {
      localStorage.setItem(`cuet_answers_${slug}`, JSON.stringify({ answers, markedForReview: Array.from(markedForReview) }));
    } catch {}
  }, [answers, markedForReview, slug]);

  useEffect(() => {
    if (!timerRunning) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setTimerRunning(false); autoSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const formatTime = (seconds: number) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; };
  const currentQuestion = questions[currentIndex];
  const isAnswered = answers[currentQuestion?.id] != null && answers[currentQuestion?.id] !== "";
  const isMarked = markedForReview.has(currentQuestion?.id ?? "");

  const autoSubmit = async () => await submitTest();
  const selectOption = (optionId: string) => setAnswers(prev => ({ ...prev, [currentQuestion!.id]: optionId }));
  const clearResponse = () => setAnswers(prev => ({ ...prev, [currentQuestion!.id]: null }));
  const toggleReview = () => setMarkedForReview(prev => { const n = new Set(prev); n.has(currentQuestion!.id) ? n.delete(currentQuestion!.id) : n.add(currentQuestion!.id); return n; });
  const goTo = (i: number) => { if (i >= 0 && i < questions.length) setCurrentIndex(i); };

  const submitTest = async () => {
    if (submitted || submitting) return;
    setSubmitting(true);
    try {
      const answerArray = Object.entries(answers).map(([questionId, selectedOption]) => ({ questionId, selectedOption }));
      const res = await fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, sessionId: `session-${Date.now()}`, answers: answerArray, timeSpentSec: config.durationMinutes * 60 - timeLeft }) });
      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();
      setSubmitted(true); setShowResult(true);
      if (timerRef.current) clearInterval(timerRef.current);
      try { localStorage.removeItem(`cuet_answers_${slug}`); } catch {}
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  if (loading) return <section className="py-12 container-page"><div className="card text-center py-20"><div className="animate-spin mx-auto h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full" /><p className="mt-6 text-neutral-600 dark:text-neutral-400">Loading test…</p></div></section>;
  if (error) return <section className="py-12 container-page"><div className="card text-center py-20 max-w-xl mx-auto"><h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Error</h2><p className="mt-2 text-neutral-600 dark:text-neutral-400">{error}</p><Button onClick={() => window.history.back()} variant="brand">Back</Button></div></section>;
  if (!questions.length) return <section className="py-12 container-page"><div className="card text-center py-20 max-w-xl mx-auto"><h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No questions</h2><p className="text-neutral-600 dark:text-neutral-400">This test has no questions yet.</p><Button onClick={() => window.history.back()} variant="brand">Back</Button></div></section>;

  if (showResult && submitted) {
    let correct = 0, incorrect = 0, attempted = 0;
    for (const q of questions) { const sel = answers[q.id]; if (sel != null && sel !== "") { attempted++; if (sel === q.correctAnswer) correct++; else incorrect++; } }
    const { rawScore, maxScore, accuracy, percentage } = computeScore(correct, incorrect, questions.length - attempted, config.markingScheme.correct, config.markingScheme.incorrect);
    return (
      <section className="py-12 container-page max-w-2xl mx-auto">
        <div className="card text-center p-8 animate-scale-in">
          <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">{rawScore}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Score out of {maxScore}</div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"><div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{correct}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">Correct</div></div>
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"><div className="text-2xl font-bold text-red-600 dark:text-red-400">{incorrect}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">Incorrect</div></div>
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"><div className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">{questions.length - attempted}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">Unattempted</div></div>
          </div>
          <div className="mb-6"><div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mb-1"><div className="h-2 rounded-full bg-primary-600 dark:bg-primary-400 transition-all duration-700" style={{ width: `${percentage}%` }} /></div><div className="text-sm text-neutral-600 dark:text-neutral-400">Accuracy: {accuracy.toFixed(1)}%</div></div>
          <p className="text-neutral-600 dark:text-neutral-300 mb-6">Time taken: {Math.floor((config.durationMinutes * 60 - timeLeft) / 60)}:{String((config.durationMinutes * 60 - timeLeft) % 60).padStart(2, "0")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="brand" onClick={() => { setShowResult(false); setSubmitted(false); setAnswers({}); setMarkedForReview(new Set()); setCurrentIndex(0); setTimeLeft(config.durationMinutes * 60); setTimerRunning(true); }}>Retry Test</Button>
            <Button variant="outline" onClick={() => setShowResult(false)} className="w-full sm:w-auto">Review Answers</Button>
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
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Test in progress — answers are saved on this device.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900" aria-label="Time remaining">
            <Clock className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            <span className={cn("font-mono text-sm font-bold", timeLeft <= 300 ? "text-danger-600 dark:text-danger-400" : "text-neutral-900 dark:text-white")}>{formatTime(timeLeft)}</span>
          </div>
          <Button variant="brand" size="sm" onClick={submitTest} disabled={submitting || submitted}>{submitting ? "Submitting…" : "Submit Test"}</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-lg">Question {currentIndex + 1} of {questions.length}</CardTitle><div className="flex items-center gap-2"><span className={cn("text-xs font-medium rounded-full px-2.5 py-1", isMarked ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400")}>{isMarked ? "Marked for review" : "Not marked"}</span><button type="button" onClick={toggleReview} className={cn("rounded-lg p-1.5 transition hover:bg-neutral-100 dark:hover:bg-neutral-800", isMarked ? "text-amber-600 dark:text-amber-400" : "text-neutral-400")} aria-label={isMarked ? "Remove review mark" : "Mark for review"} aria-pressed={isMarked}><Flag className={cn("h-4 w-4", isMarked && "fill-current")} /></button></div></div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400"><span className={cn("font-medium", isAnswered ? "text-secondary-600 dark:text-secondary-400" : "text-neutral-500")}>{isAnswered ? "Answered" : "Not answered"}</span>{currentQuestion?.subject && <span className="badge badge-neutral">{currentQuestion.subject}</span>}{currentQuestion?.topic && <span className="badge badge-neutral">{currentQuestion.topic}</span>}</div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-neutral-700 dark:text-neutral-200 mb-6">{currentQuestion?.stemEn}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{currentQuestion?.optionsEn.map(opt => { const selected = answers[currentQuestion!.id] === opt.id; return <button key={opt.id} onClick={() => selectOption(opt.id)} className={cn("w-full text-left p-3 rounded-lg border text-left transition", selected ? "border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300" : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200")}><span className="font-bold text-primary-600 dark:text-primary-400 mr-2">{opt.id}</span>{opt.text}</button>; })}</div>
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