"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3, BookOpen, FlaskConical, Target, Zap, Shield,
  Users, Award, TrendingUp, Clock, CheckCircle, XCircle,
  Star, Flame, Trophy, ArrowRight
} from "lucide-react";
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { cn } from "@/lib/utils";
import { computeScore } from "@/lib/utils";

const achievements = [
  { id: "first", label: "First Question", icon: "🐣", desc: "Complete your first question", unlocked: true },
  { id: "champion", label: "Champion", icon: "🏆", desc: "Get 10 answers correct", unlocked: false },
  { id: "streak", label: "Streak Pro", icon: "🔥", desc: "Maintain 3 day streak", unlocked: false },
  { id: "century", label: "Century", icon: "💯", desc: "Solve 100 questions", unlocked: false },
];

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
  const avgScore = submitted.length > 0 ? Math.round(submitted.reduce((sum, a) => sum + (a.score || 0), 0) / submitted.length) : 0;
  const avgAccuracy = submitted.length > 0 ? Math.round(submitted.reduce((sum, a) => { const att = a.attemptedCount || 0; const cor = a.correctCount || 0; return sum + (att > 0 ? (cor / att) * 100 : 0); }, 0) / submitted.length) : 0;

  const wrongCounts: Record<string, number> = {};
  for (const a of submitted) {
    for (const ans of (a.answers || [])) {
      if (ans.isCorrect === false && ans.question) {
        const subj = (ans.question as any).subject?.name || (ans.question as any).subjectId || "unknown";
        wrongCounts[subj] = (wrongCounts[subj] || 0) + 1;
      }
    }
  }
  const weakTopics = Object.entries(wrongCounts).map(([subject, count]) => ({ subject, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  if (loading) return <section className="py-12 container-page"><div className="card text-center py-20"><div className="animate-spin mx-auto h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full" /><p className="mt-6 text-neutral-600 dark:text-neutral-400">Loading dashboard…</p></div></section>;

  return (
    <section className="py-8 container-page">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard</h1>
        <Link href="/mock-tests" className="btn-brand">Start a Test</Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="card-hover">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Attempts</div>
              <div className="text-3xl font-bold text-neutral-900 dark:text-white">{totalAttempts}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"><FlaskConical className="h-6 w-6 text-primary-600 dark:text-primary-400" /></div>
          </div>
        </Card>
        <Card className="card-hover">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Avg Score</div>
              <div className="text-3xl font-bold text-neutral-900 dark:text-white">{avgScore}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center"><Award className="h-6 w-6 text-secondary-600 dark:text-secondary-400" /></div>
          </div>
        </Card>
        <Card className="card-hover">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Avg Accuracy</div>
              <div className="text-3xl font-bold text-neutral-900 dark:text-white">{avgAccuracy}%</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" /></div>
          </div>
        </Card>
        <Card className="card-hover">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Est. Percentile</div>
              <div className="text-3xl font-bold text-neutral-900 dark:text-white">--</div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Based on platform attempts</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center"><TrendingUp className="h-6 w-6 text-accent-600 dark:text-accent-400" /></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Attempt History</CardTitle>
              <Link href="/mock-history" className="text-sm text-primary-600 hover:underline">View All</Link>
            </CardHeader>
            <CardContent>
              {submitted.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                  <p className="text-neutral-500 dark:text-neutral-400 text-center">No attempts yet. Start a mock test to see your progress.</p>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={submitted.slice().reverse()}>
                      <XAxis dataKey="startedAt" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => String(Math.round(v))} />
                      <RechartsTooltip />
                      <Bar dataKey="score" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Weak Topics</CardTitle></CardHeader>
              <CardContent>
                {weakTopics.length === 0 ? (
                  <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">No weak topics identified yet.</p>
                ) : (
                  <div className="space-y-4">
                    {weakTopics.map((t) => (
                      <div key={t.subject} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-sm font-medium text-neutral-900 dark:text-white">{t.subject}</span>
                        </div>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">{t.count} incorrect</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Daily Goal Tracker</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">Solve 15 Questions</span>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">0/15</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                      <div className="h-2 bg-primary-600 rounded-full transition-all duration-500" style={{ width: "0%" }} />
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">🌟 Complete daily goal to earn <strong>+50 Bonus XP</strong>!</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">"The work you do today makes tomorrow easier."</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column */}
        <Card>
          <CardHeader><CardTitle>Achievements</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {achievements.map((a) => (
                <div key={a.id} className={cn("p-4 rounded-xl text-center border-2 transition-all", a.unlocked ? "border-primary-200 bg-primary-50 dark:bg-primary-900/30" : "border-neutral-200 dark:border-neutral-700 opacity-50")}>
                  <div className="text-3xl mb-1">{a.icon}</div>
                  <div className="font-semibold text-neutral-900 dark:text-white">{a.label}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{a.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}