"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function DashboardPage() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/attempts");
        if (!res.ok) throw new Error("Failed to load attempts");
        const data = await res.json();
        setAttempts(data);
      } catch {}
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const submitted = attempts.filter((a) => a.status === "SUBMITTED");
  const totalAttempts = attempts.length;
  const avgScore =
    submitted.length > 0
      ? Math.round(
          submitted.reduce((sum, a) => sum + (a.score || 0), 0) / submitted.length
        )
      : 0;
  const avgAccuracy =
    submitted.length > 0
      ? Math.round(
          submitted.reduce((sum, a) => {
            const attempted = a.attemptedCount || 0;
            const correct = a.correctCount || 0;
            return attempted > 0 ? (correct / attempted) * 100 : 0;
          }, 0) / submitted.length
        )
      : 0;

  // Weak topics: questions answered incorrectly
  const wrongCounts: Record<string, number> = {};
  for (const a of submitted) {
    for (const ans of (a.answers || [])) {
      if (ans.isCorrect === false && ans.question) {
        const subj = (ans.question as any).subjectId || "unknown";
        wrongCounts[subj] = (wrongCounts[subj] || 0) + 1;
      }
    }
  }
  const weakTopics = Object.entries(wrongCounts)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-brand-50">Dashboard</h1>
        <Link href="/mock-tests" className="btn-brand">Start a Test</Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Attempts</div>
            <div className="text-3xl font-bold text-neutral-900 dark:text-white">{totalAttempts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Avg Score</div>
            <div className="text-3xl font-bold text-neutral-900 dark:text-white">{avgScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Avg Accuracy</div>
            <div className="text-3xl font-bold text-neutral-900 dark:text-white">{avgAccuracy}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Est. Percentile</div>
            <div className="text-3xl font-bold text-neutral-900 dark:text-white">--</div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Based on platform attempts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accuracy trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attempt History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {submitted.length === 0 ? (
                <p className="text-neutral-500 dark:text-neutral-400 text-center mt-20">No attempts yet. Start a mock test to see your progress.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={submitted.slice().reverse()}>
                    <XAxis dataKey="startedAt" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => String(Math.round(v))} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#15803d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weak topics pie */}
        <Card>
          <CardHeader>
            <CardTitle>Weak Topics</CardTitle>
          </CardHeader>
          <CardContent>
            {weakTopics.length === 0 ? (
              <p className="text-neutral-500 dark:text-neutral-400 text-center mt-20">No weak topics identified yet.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={weakTopics}
                      dataKey="count"
                      nameKey="subject"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {weakTopics.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={["#15803d", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6"][i % 5]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent attempts list */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {submitted.slice().reverse().slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50">
                  <div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-white">
                      {(a.test as any)?.title || "Test"}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(a.startedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-neutral-900 dark:text-white">
                      {a.score}/{a.maxScore}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {a.attemptedCount} attempted
                    </div>
                  </div>
                </div>
              ))}
              {submitted.length === 0 && (
                <p className="text-neutral-500 dark:text-neutral-400 text-center py-4">No attempts yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
