"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

type Student = {
  id: string; name: string | null; email: string | null; role: string | null; createdAt: string;
  attemptsCount: number; submittedCount: number; flaggedCount: number; practiceCount: number;
  avgScorePct: number | null;
  recentAttempts: { id: string; status: string; score: number; maxScore: number; flagged: boolean; startedAt: string }[];
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [loading, setLoading] = useState(true);
  const perPage = 25;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
        if (applied) params.set("search", applied);
        const res = await fetch(`/api/admin/students?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setStudents(data.students ?? []);
            setTotal(data.total ?? 0);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, applied]);

  const pages = Math.max(Math.ceil(total / perPage), 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
          <Users className="h-6 w-6 text-primary-600" /> Students
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Platform accounts and their attempt health. Flagged attempts surface here for review first.
        </p>
      </div>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); setPage(1); setApplied(search); }}
      >
        <input className="input max-w-xs" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn-brand px-4 py-2 text-sm" type="submit">Search</button>
      </form>

      {loading ? (
        <div className="card p-10 text-center text-neutral-500">Loading students…</div>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900 dark:text-white">{s.name ?? "—"} <span className="ml-1 text-xs font-normal text-neutral-400">{s.email}</span></p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {s.role ?? "USER"} · joined {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="badge badge-neutral">{s.attemptsCount} attempts</span>
                    <span className="badge badge-secondary">{s.submittedCount} submitted</span>
                    {s.practiceCount > 0 && <span className="badge badge-neutral">{s.practiceCount} practice</span>}
                    {s.flaggedCount > 0 && <span className="badge bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300">{s.flaggedCount} flagged</span>}
                    {s.avgScorePct !== null && <span className="badge badge-primary">avg {s.avgScorePct}%</span>}
                  </div>
                </div>
                {s.recentAttempts.length > 0 && (
                  <p className="mt-2 truncate text-xs text-neutral-400">
                    Recent: {s.recentAttempts.map((a) => `${a.score}/${a.maxScore} (${a.status.toLowerCase()}${a.flagged ? ", flagged" : ""})`).join(" · ")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          {students.length === 0 && <div className="card p-10 text-center text-neutral-500">No accounts match.</div>}
        </div>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button className="btn-outline px-3 py-1.5 text-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="text-sm text-neutral-500">Page {page} / {pages}</span>
          <button className="btn-outline px-3 py-1.5 text-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
