"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, ChevronLeft, ChevronRight, Download, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MathText } from "@/components/ui/math-text";
import { QuestionImages } from "@/components/questions/question-images";
import { QuestionPassage } from "@/components/questions/question-passage";
import { OptionText } from "@/components/questions/option-text";
import { OPTION_LETTERS, resolveCorrectOption } from "@/lib/question-display";

// Visible option labels. The stored option id is internal
// (opt-<questionId>-<order>) and must never be shown (P1QA 2026-10-30,
// same defect as the practice page).

interface PYQ {
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
  correctAnswer: string;
  sourceCorrectOptionOrder?: number | null;
  explanationEn?: string;
  explanationImageUrl?: string | null;
  explanationImageAlt?: string | null;
  year: number | null;
  subject: string | null;
  topic: string | null;
  difficulty?: string;
}

export default function PYQPage() {
  const [questions, setQuestions] = useState<PYQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ year: "All", subject: "All", topic: "All" });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Study mode keeps answer keys visible for the PYQ study UI (recorded
        // keys only). Anonymous visitors silently fall back to the keyless feed.
        const res = await fetch("/api/questions?source=pyq&limit=200&study=1");
        if (!res.ok) throw new Error("Failed to load PYQs");
        const data = await res.json();
        const q = Array.isArray(data) ? data : data.questions || [];
        if (!cancelled) setQuestions(q);
      } catch {
        try {
          const res = await fetch("/api/questions?source=pyq&limit=200");
          if (!res.ok) throw new Error("Failed to load PYQs");
          const data = await res.json();
          const q = Array.isArray(data) ? data : data.questions || [];
          if (!cancelled) setQuestions(q);
        } catch {
          // leave both failures silent — the empty state renders below
        }
      } finally {}
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const years = Array.from(new Set(questions.map(q => q.year).filter((y): y is number => y != null))).sort((a,b) => b - a);
  const subjects = Array.from(new Set(questions.map(q => q.subject).filter((s): s is string => Boolean(s)))).sort();
  const topics = Array.from(new Set(questions.map(q => q.topic).filter((t): t is string => Boolean(t)))).sort();

  const filtered = questions.filter(q => {
    if (filters.year !== "All" && q.year !== Number(filters.year)) return false;
    if (filters.subject !== "All" && q.subject !== filters.subject) return false;
    if (filters.topic !== "All" && q.topic !== filters.topic) return false;
    if (searchQuery && !q.stemEn.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return <section className="py-12 container-page"><div className="card text-center py-20"><div className="animate-spin mx-auto h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full" /><p className="mt-6 text-neutral-600 dark:text-neutral-400">Loading PYQs…</p></div></section>;

  return (
    <section className="py-8 container-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Previous Year Questions</h1>
        <p className="text-neutral-600 dark:text-neutral-400">Browse PYQs year-wise across CUET subjects and sections.</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <Input placeholder="Search previous year questions…" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-10" aria-label="Search questions" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <select value={filters.year} onChange={e => { setFilters({...filters, year: e.target.value}); setCurrentPage(1); }} className="input" aria-label="Year"><option value="All">All Years</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
              <select value={filters.subject} onChange={e => { setFilters({...filters, subject: e.target.value}); setCurrentPage(1); }} className="input" aria-label="Subject"><option value="All">All Subjects</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <select value={filters.topic} onChange={e => { setFilters({...filters, topic: e.target.value}); setCurrentPage(1); }} className="input" aria-label="Topic"><option value="All">All Topics</option>{topics.map(t => <option key={t} value={t}>{t}</option>)}</select>
              <div className="sm:col-span-2 lg:col-span-2">
                <Button variant="outline" className="w-full justify-center" onClick={() => { setFilters({year:"All",subject:"All",topic:"All"}); setSearchQuery(""); setCurrentPage(1); }} disabled={Object.values(filters).every(v=>v==="All") && !searchQuery}>
                  <Filter className="h-4 w-4 mr-2" />Clear filters
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>PYQ Questions ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { const blob = new Blob([JSON.stringify(filtered, null, 2)], {type:"application/json"}); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "pyq-questions.json"; a.click(); URL.revokeObjectURL(url); }}><Download className="h-4 w-4 mr-2" />Export JSON</Button>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">No PYQs match your filters.</p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Try a different year or subject, or clear the filters.</p>
              <Button variant="outline" className="mt-4" onClick={() => { setFilters({ year: "All", subject: "All", topic: "All" }); setSearchQuery(""); setCurrentPage(1); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {paginated.map((q) => {
                const correct = resolveCorrectOption(q, q.optionsEn);
                return (
                <div key={q.id} className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {q.year != null && <span className="badge badge-primary">PYQ {q.year}</span>}
                    {q.subject && <span className="badge badge-neutral">{q.subject}</span>}
                    {q.topic && <span className="badge badge-neutral">{q.topic}</span>}
                    {q.difficulty && <span className="text-xs capitalize text-neutral-400 dark:text-neutral-500">{q.difficulty}</span>}
                  </div>
                  <QuestionPassage passage={q.passage} />
                  <p className="text-neutral-900 dark:text-white mb-3"><MathText text={q.stemEn} /></p>
                  <QuestionImages images={q.questionImages} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {q.optionsEn.map((opt, optIndex) => (
                      <span key={opt.id} className={cn("text-sm px-3 py-2 rounded-lg border", opt.id === correct?.id ? "bg-secondary-50 border-secondary-200 text-secondary-700 dark:bg-secondary-900/30 dark:border-secondary-800 dark:text-secondary-300" : "bg-neutral-50 border-neutral-200 text-neutral-600 dark:bg-neutral-800/50 dark:border-neutral-700 dark:text-neutral-300")}><span className="font-bold text-primary-600 dark:text-primary-400 mr-2">{OPTION_LETTERS[optIndex] ?? optIndex + 1}.</span><OptionText option={opt} /></span>
                    ))}
                  </div>
                  {(q.explanationEn || q.explanationImageUrl) && (
                    <details className="group"><summary className="text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer flex items-center gap-1">Show Explanation <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary><div className="mt-2 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-sm text-neutral-700 dark:text-neutral-300">{q.explanationEn ? <MathText text={q.explanationEn} /> : null}{q.explanationImageUrl ? <QuestionImages images={[{ url: q.explanationImageUrl, alt: q.explanationImageAlt || "Explanation diagram" }]} /> : null}</div></details>
                  )}
                </div>
                );
              })}
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                let page = i + 1;
                if (totalPages > 5) {
                  if (currentPage > 3 && currentPage < totalPages - 1) page = currentPage - 2 + i;
                  else if (currentPage >= totalPages - 1) page = totalPages - 4 + i;
                }
                return <button key={page} onClick={() => setCurrentPage(page)} className={cn("w-8 h-8 rounded-lg text-sm font-medium", currentPage === page ? "bg-primary-600 text-white" : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}>{page}</button>;
              })}
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}