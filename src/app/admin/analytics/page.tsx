"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sigma } from "lucide-react";

type Analytics = {
  totals: {
    attemptsTotal: number; submittedTotal: number; flaggedTotal: number; practiceTotal: number;
    questionsTotal: number; activeQuestions: number; usersTotal: number; pendingReview: number; importsTotal: number;
  };
  scoreBands: { under40: number; b40to60: number; b60to80: number; over80: number };
  tests: { id: string; title: string; slug: string; type: string; status: string; attempts: number }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/analytics");
        if (res.ok) setData((await res.json()) as Analytics);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="card p-10 text-center text-neutral-500">Crunching numbers…</div>;
  if (!data) return <div className="card p-10 text-center text-neutral-500">Analytics unavailable.</div>;

  const t = data.totals;

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
          <Sigma className="h-6 w-6 text-primary-600" /> Analytics
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Read-only platform health: content, attempts, flagged rates and score bands.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attempts (all)" value={t.attemptsTotal} sub={`${t.submittedTotal} submitted`} />
        <StatCard label="Questions" value={t.questionsTotal} sub={`${t.activeQuestions} active · ${t.pendingReview} pending review`} />
        <StatCard label="Accounts" value={t.usersTotal} sub={`${t.practiceTotal} practice attempts`} />
        <StatCard label="Flagged" value={t.flaggedTotal} sub={`${t.importsTotal} import jobs`} tone={t.flaggedTotal > 0 ? "danger" : "ok"} />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-lg">Score bands (submitted, % of max)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <BandBar label="&lt; 40%" value={data.scoreBands.under40} color="bg-danger-500" />
            <BandBar label="40–60%" value={data.scoreBands.b40to60} color="bg-amber-500" />
            <BandBar label="60–80%" value={data.scoreBands.b60to80} color="bg-primary-500" />
            <BandBar label="&gt;= 80%" value={data.scoreBands.over80} color="bg-secondary-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Attempts by test</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.tests.filter((x) => x.attempts > 0).map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-neutral-800 dark:text-neutral-200">{x.title} <span className="text-xs text-neutral-400">/{x.slug} · {x.status.toLowerCase()}</span></span>
                <span className="badge badge-neutral">{x.attempts}</span>
              </div>
            ))}
            {data.tests.every((x) => x.attempts === 0) && <p className="text-sm text-neutral-500">No attempts recorded yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: "ok" | "danger" }) {
  return (
    <div className={`card p-4 ${tone === "danger" && value > 0 ? "border-danger-300 dark:border-danger-700" : ""}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{sub}</p>}
    </div>
  );
}

function BandBar({ label, value, color }: { label: string; value: number; color: string }) {
  const max = Math.max(value, 1);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="font-bold text-neutral-900 dark:text-white">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}
