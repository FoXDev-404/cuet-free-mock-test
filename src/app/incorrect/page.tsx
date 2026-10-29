"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { XCircle, RefreshCw, ChevronLeft, ChevronRight, Clock, BookOpen, ChevronDown } from "lucide-react";

interface IncorrectItem {
  id: string;
  stemEn: string;
  optionsEn: { id: string; text: string }[];
  correctAnswer: string;
  explanationEn?: string;
  subject: string;
  topic: string;
  testId?: string;
  selectedOption?: string;
  createdAt: string;
}

export default function IncorrectPage() {
  const [incorrect, setIncorrect] = useState<IncorrectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/incorrect");
        if (!res.ok) throw new Error("Failed to load incorrect questions");
        const data = await res.json();
        setIncorrect(data);
      } catch {}
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const totalPages = Math.ceil(incorrect.length / pageSize);
  const paginated = incorrect.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const optionClass = (optId: string, correct: string, selected?: string) => {
    if (optId === correct) return "bg-secondary-50 border-secondary-200 text-secondary-700 dark:bg-secondary-900/30 dark:border-secondary-800 dark:text-secondary-300";
    if (optId === selected) return "bg-danger-50 border-danger-200 text-danger-700 dark:bg-danger-900/30 dark:border-danger-800 dark:text-danger-300";
    return "bg-neutral-50 border-neutral-200 text-neutral-600 dark:bg-neutral-800/50 dark:border-neutral-700 dark:text-neutral-300";
  };

  const pageButtonClass = (page: number, current: number) =>
    "w-8 h-8 rounded-lg text-sm font-medium " + (page === current ? "bg-primary-600 text-white" : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800");

  if (loading) return <section className="py-12 container-page"><div className="card text-center py-20"><p className="text-neutral-600 dark:text-neutral-400">Loading incorrect questions…</p></div></section>;

  return (
    <section className="py-8 container-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Incorrect Bank</h1>
        <p className="text-neutral-600 dark:text-neutral-400">Review questions you got wrong to improve your weak areas.</p>
      </div>

      {incorrect.length === 0 ? (
        <div className="card text-center py-16">
          <XCircle className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No incorrect questions</h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">Take practice tests to see questions you answered incorrectly.</p>
          <Link href="/practice" className="btn-brand inline-flex">Start Practicing</Link>
        </div>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader><CardTitle>Questions to Review ({incorrect.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginated.map((q) => (
                  <div key={q.id} className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="badge badge-danger">Incorrect</span>
                      <span className="badge badge-neutral">{q.subject}</span>
                      <span className="badge badge-neutral">{q.topic}</span>
                    </div>
                    <p className="text-neutral-900 dark:text-white mb-3">{q.stemEn}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {q.optionsEn.map(opt => (
                        <span key={opt.id} className={"text-sm px-3 py-2 rounded-lg border " + optionClass(opt.id, q.correctAnswer, q.selectedOption)}><span className="font-bold text-primary-600 dark:text-primary-400 mr-2">{opt.id}</span>{opt.text}</span>
                      ))}
                    </div>
                    {q.explanationEn && (
                      <details className="group"><summary className="text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer flex items-center gap-1">Show Explanation <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary><div className="mt-2 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-sm text-neutral-700 dark:text-neutral-300">{q.explanationEn}</div></details>
                    )}
                    {q.testId && (
                      <Link href={"/mock-tests/" + q.testId + "/take"} className="mt-3 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline dark:text-primary-400"><RefreshCw className="h-4 w-4" />Retry in Test</Link>
                    )}
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                  {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                    let page = i + 1;
                    if (totalPages > 5) {
                      if (currentPage > 3 && currentPage < totalPages - 1) page = currentPage - 2 + i;
                      else if (currentPage >= totalPages - 1) page = totalPages - 4 + i;
                    }
                    return <button key={page} onClick={() => setCurrentPage(page)} className={pageButtonClass(page, currentPage)}>{page}</button>;
                  })}
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}