"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Medal, Trophy } from "lucide-react";

type ConfigLite = {
  id: string; name: string; scope: string; periodType: string;
  examId?: string | null; subjectId?: string | null; testId?: string | null; updatedAt: string;
  _count?: { entries: number };
};

type Entry = {
  rank: number; name: string; bestScore: number; maxScore: number;
  percentage: number; attempts: number; lastSubmittedAt: string;
};

export default function LeaderboardsPage() {
  const [configs, setConfigs] = useState<ConfigLite[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/leaderboards");
        if (res.ok) {
          const data = await res.json();
          setConfigs(data.configs ?? []);
          if (data.configs?.length) setSelected(data.configs[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/leaderboards?configId=${selected}`);
      if (res.ok && !cancelled) setEntries((await res.json()).entries ?? []);
    })();
    return () => { cancelled = true; };
  }, [selected]);

  if (loading) return <section className="py-12 container-page"><div className="card text-center py-20"><div className="animate-spin mx-auto h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full" /><p className="mt-6 text-neutral-600 dark:text-neutral-400">Loading leaderboards…</p></div></section>;

  return (
    <section className="py-8 container-page">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          <Trophy className="h-8 w-8 text-primary-600" /> Leaderboards
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Ranked by best attempt. Practice and suspicious attempts never count.
        </p>
      </div>

      {configs.length === 0 ? (
        <div className="card text-center py-16 max-w-xl mx-auto">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No leaderboards yet</h2>
          <p className="text-neutral-600 dark:text-neutral-400">Take a mock test to appear on a leaderboard when one goes live.</p>
          <Link href="/mock-tests" className="btn-brand mt-4 inline-block">Browse mock tests</Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <Card className="h-fit">
            <CardHeader><CardTitle className="text-base">Boards</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {configs.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      selected === c.id
                        ? "bg-primary-600 text-white"
                        : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span className="block font-medium">{c.name}</span>
                    <span className={`text-xs ${selected === c.id ? "text-white/80" : "text-neutral-400"}`}>
                      {c.scope.toLowerCase()} · {c.periodType.toLowerCase().replace("_", " ")}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Rankings ({entries.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {entries.map((e, i) => (
                  <div key={`${e.name}-${i}`} className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-2.5 dark:border-neutral-800">
                    <div className="flex w-10 shrink-0 items-center justify-center">
                      {e.rank === 1 ? <Medal className="h-5 w-5 text-amber-500" /> : e.rank === 2 ? <Medal className="h-5 w-5 text-neutral-400" /> : e.rank === 3 ? <Medal className="h-5 w-5 text-amber-700" /> : <span className="font-mono text-sm text-neutral-500">#{e.rank}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-neutral-900 dark:text-white">{e.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {e.bestScore} / {e.maxScore} · {e.percentage}% · {e.attempts} attempt{e.attempts === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-neutral-400">{new Date(e.lastSubmittedAt).toLocaleDateString()}</div>
                  </div>
                ))}
                {entries.length === 0 && <p className="text-sm text-neutral-500">Nobody is on this board yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
