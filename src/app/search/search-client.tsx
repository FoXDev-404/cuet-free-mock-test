"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";

type Results = {
  query: string;
  tests: { id: string; title: string; slug: string; year: number | null; questionCount: number }[];
  questions: { id: string; stem: string; year: number | null; subject: string | null }[];
  subjects: { id: string; name: string; code: string; questionCount: number }[];
};

const EMPTY: Results = { query: "", tests: [], questions: [], subjects: [] };

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      const id = setTimeout(() => {
        setResults(EMPTY);
        setSearched(false);
      }, 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          setResults(await res.json());
          setSearched(true);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const total = results.tests.length + results.questions.length + results.subjects.length;

  return (
    <div>
      <form role="search" className="relative" onSubmit={(event) => event.preventDefault()}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search mock tests, subjects or a question phrase…"
          aria-label="Search the site"
          className="input w-full py-3 pl-12 text-base"
          autoFocus
        />
        {loading ? <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-primary-600" /> : null}
      </form>

      {query.trim().length < 2 ? (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          Type at least two characters. Try “English”, “2022” or “probability”.
        </p>
      ) : null}

      {searched && total === 0 && !loading ? (
        <div className="mt-6 card p-8 text-center">
          <p className="font-medium text-neutral-900 dark:text-white">No results for “{results.query}”</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Try a shorter phrase or browse the mock-test library.</p>
          <Link href="/mock-tests" className="btn-brand mt-4 inline-block px-4 py-2 text-sm">Browse mock tests</Link>
        </div>
      ) : null}

      {results.tests.length ? (
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Mock tests</h2>
          <div className="mt-2 space-y-2">
            {results.tests.map((test) => (
              <Link key={test.id} href={`/mock-tests/${encodeURIComponent(test.slug)}`} className="card block p-4 hover:border-primary-300">
                <p className="font-medium text-neutral-900 dark:text-white">{test.title}</p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {test.questionCount} questions{test.year ? ` · ${test.year}` : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {results.subjects.length ? (
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Subjects</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {results.subjects.map((subject) => (
              <Link key={subject.id} href="/practice" className="badge badge-primary px-3 py-1.5">
                {subject.name} · {subject.questionCount}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {results.questions.length ? (
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Questions</h2>
          <div className="mt-2 space-y-2">
            {results.questions.map((question) => (
              <Link key={question.id} href="/practice" className="card block p-4 hover:border-primary-300">
                <p className="line-clamp-2 text-sm text-neutral-800 dark:text-neutral-200">{question.stem}</p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {question.subject ?? "Question"}{question.year ? ` · ${question.year}` : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
