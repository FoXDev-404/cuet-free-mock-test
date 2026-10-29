"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Target, TrendingUp, Clock, ArrowRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from "recharts";

function ChartEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-6 text-center dark:border-neutral-700 dark:bg-neutral-800/30">
      <BarChart3 className="mb-3 h-8 w-8 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
      <Link href="/mock-tests" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
        Take a mock test <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function AnalyticsPage() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/attempts");
        if (!res.ok) throw new Error("Failed to load attempts");
        const data = await res.json();
        if (!cancelled) setAttempts(Array.isArray(data) ? data : []);
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const submitted = attempts.filter((a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED");
  const avgScore = submitted.length > 0 ? Math.round(submitted.reduce((sum, a) => sum + (a.score || 0), 0) / submitted.length) : 0;

  const subjectAccuracy: Record<string, { correct: number; total: number }> = {};
  for (const a of submitted) {
    for (const ans of (a.answers || [])) {
      if (ans.selectedOption != null && ans.selectedOption !== "" && ans.question) {
        const subj = ans.question.subject?.name || ans.question.subjectId || "Unknown";
        if (!subjectAccuracy[subj]) subjectAccuracy[subj] = { correct: 0, total: 0 };
        subjectAccuracy[subj].total++;
        if (ans.isCorrect) subjectAccuracy[subj].correct++;
      }
    }
  }
  const subjectData = Object.entries(subjectAccuracy).map(([name, v]) => ({
    name, accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0, attempted: v.total
  }));

  const totalCorrect = submitted.reduce((s, a) => s + (a.correctCount || 0), 0);
  const totalIncorrect = submitted.reduce((s, a) => s + (a.incorrectCount || 0), 0);
  const totalUnattempted = submitted.reduce((s, a) => s + Math.max(0, (a.test?.totalQuestions || 0) - (a.attemptedCount || 0)), 0);
  const overallAccuracy = totalCorrect + totalIncorrect > 0 ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100) : 0;

  const stats = [
    { label: "Avg score", value: String(avgScore), icon: TrendingUp, tone: "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300" },
    { label: "Attempts", value: String(submitted.length), icon: Target, tone: "bg-secondary-50 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-300" },
    { label: "Overall accuracy", value: `${overallAccuracy}%`, icon: BarChart3, tone: "bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-300" },
    { label: "Est. percentile", value: "--", icon: Clock, tone: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300" },
  ];

  if (loading) {
    return (
      <section className="container-page py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />)}
        </div>
      </section>
    );
  }

  return (
    <section className="container-page py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">Performance Analytics</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">Track your progress, accuracy, and weak topics over time.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Score trend</CardTitle></CardHeader>
          <CardContent>
            {submitted.length === 0 ? (
              <ChartEmpty title="No attempts yet" description="Your scores will appear here after you submit a mock test." />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={submitted.slice().reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="startedAt" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tickFormatter={(v) => String(Math.round(v))} stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="score" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Answer distribution</CardTitle></CardHeader>
          <CardContent>
            {submitted.length === 0 ? (
              <ChartEmpty title="Nothing to show yet" description="Correct, incorrect and unattempted totals will be charted here." />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: "Correct", value: totalCorrect }, { name: "Incorrect", value: totalIncorrect }, { name: "Unattempted", value: totalUnattempted }]} cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                      <Cell fill="#10b981" /><Cell fill="#ef4444" /><Cell fill="#94a3b8" />
                    </Pie>
                    <Tooltip formatter={(v) => String(v ?? 0)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Accuracy by subject</CardTitle></CardHeader>
          <CardContent>
            {subjectData.length === 0 ? (
              <ChartEmpty title="No subject data" description="Answer questions in a mock test to see subject-wise accuracy." />
            ) : (
              <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={subjectData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="name" tick={{fontSize:12}} stroke="#94a3b8"/><YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`} stroke="#94a3b8"/><Tooltip/><Bar dataKey="accuracy" fill="#10b981" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Time spent vs score</CardTitle></CardHeader>
          <CardContent>
            {submitted.length === 0 ? (
              <ChartEmpty title="No data yet" description="See how the time you spend relates to your score." />
            ) : (
              <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={submitted.slice().reverse()}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="timeSpentSec" tick={{fontSize:12}} tickFormatter={(v)=>`${Math.floor(v/60)}m`} stroke="#94a3b8"/><YAxis stroke="#94a3b8"/><Tooltip/><Area type="monotone" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.12}/></AreaChart></ResponsiveContainer></div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
