"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Award,
  BarChart3,
  Bookmark,
  CalendarDays,
  CheckCircle,
  Clock,
  Flame,
  History,
  MessageSquare,
  PlayCircle,
  Settings,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type DashboardData = {
  totals: {
    totalAttempts: number;
    submittedCount: number;
    avgScorePct: number;
    bestScorePct: number;
    accuracy: number;
    totalTimeSec: number;
    avgTimePerQuestionSec: number;
    todayAttempted: number;
    avgPercentile: number | null;
    bookmarks: number;
    discussions: number;
    wrongQuestions: number;
    activeDays: number;
  };
  streak: number;
  badges: Array<{ key: string; label: string; description: string; earnedAt: string }>;
  continueAttempt: {
    attemptId: string;
    testSlug: string;
    testTitle: string;
    answered: number;
    totalQuestions: number;
    remainingSec: number | null;
    lastSavedAt: string | null;
  } | null;
  scoreTrend: Array<{ id: string; title: string; date: string | null; scorePct: number }>;
  subjectAccuracy: Array<{ subject: string; correct: number; attempted: number; accuracy: number }>;
  weakTopics: Array<{
    topic: string;
    subject: string;
    correct: number;
    attempted: number;
    incorrect: number;
    accuracy: number;
  }>;
  recentAttempts: Array<{
    id: string;
    testId: string;
    status: string;
    score: number;
    maxScore: number;
    scorePct: number;
    percentile: number | null;
    correctCount: number;
    incorrectCount: number;
    attemptedCount: number;
    timeSpentSec: number;
    submittedAt: string | null;
    startedAt: string;
    practice: boolean;
    test: { title: string; slug: string };
  }>;
  examDate: string | null;
};

const DAILY_GOAL = 15;

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function daysUntil(date: string): number | null {
  const target = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/dashboard");
        if (res.status === 401) {
          if (!cancelled) setUnauthorized(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load dashboard");
        const payload = await res.json();
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) setError("Could not load your dashboard. Please retry in a moment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="container-page py-12">
        <div className="card py-20 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="mt-6 text-neutral-600 dark:text-neutral-400">Loading dashboard…</p>
        </div>
      </section>
    );
  }

  if (unauthorized) {
    return (
      <section className="container-page max-w-lg py-16">
        <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-white">Dashboard</h1>
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <Trophy className="mx-auto h-10 w-10 text-primary-500" />
            <h1 className="mt-4 text-xl font-bold text-neutral-900 dark:text-white">
              Sign in to see your progress
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Your dashboard is private. Sign in to track scores, streaks, weak topics and saved questions.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="btn-brand px-4 py-2 text-sm">
                Log in
              </Link>
              <Link href="/register" className="btn-outline px-4 py-2 text-sm">
                Create an account
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="container-page py-12">
        <div className="card py-16 text-center">
          <p className="text-red-600 dark:text-red-400">{error || "Dashboard unavailable."}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-brand mt-4 px-4 py-2 text-sm"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  const { totals, streak, badges, continueAttempt, scoreTrend, subjectAccuracy, weakTopics, recentAttempts } = data;
  const examInDays = data.examDate ? daysUntil(data.examDate) : null;
  const goalProgress = Math.min(100, Math.round((totals.todayAttempted / DAILY_GOAL) * 100));
  const hasActivity = totals.submittedCount > 0;

  return (
    <section className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Your private progress across {totals.submittedCount} submitted {totals.submittedCount === 1 ? "test" : "tests"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/mock-tests" className="btn-brand px-4 py-2 text-sm">
            Start a test
          </Link>
          <Link href="/settings" className="btn-outline px-4 py-2 text-sm">
            <Settings className="mr-1.5 h-4 w-4" /> Settings
          </Link>
        </div>
      </div>

      {continueAttempt ? (
        <Card className="mb-6 border-primary-200 bg-primary-50 dark:border-primary-900 dark:bg-primary-900/20">
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary-900 dark:text-primary-100">
                <PlayCircle className="h-4 w-4" /> Continue where you left off
              </p>
              <p className="mt-1 truncate font-medium text-neutral-900 dark:text-white">
                {continueAttempt.testTitle}
              </p>
              <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                {continueAttempt.answered}/{continueAttempt.totalQuestions} answered
                {continueAttempt.remainingSec != null
                  ? ` · ${formatDuration(continueAttempt.remainingSec)} remaining`
                  : ""}
                {continueAttempt.lastSavedAt
                  ? ` · saved ${new Date(continueAttempt.lastSavedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </p>
            </div>
            <Link
              href={`/mock-tests/${continueAttempt.testSlug}/take?attempt=${continueAttempt.attemptId}`}
              className="btn-brand shrink-0 px-4 py-2 text-sm"
            >
              Resume test
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Submitted tests" value={String(totals.submittedCount)} icon={CheckCircle} tone="primary" />
        <StatCard label="Average score" value={`${totals.avgScorePct}%`} icon={BarChart3} tone="secondary" />
        <StatCard label="Accuracy" value={`${totals.accuracy}%`} icon={Target} tone="green" />
        <StatCard
          label="Average percentile"
          value={totals.avgPercentile == null ? "—" : `${totals.avgPercentile}`}
          icon={TrendingUp}
          tone="amber"
          hint="Across submitted platform tests"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle>Score trend</CardTitle>
              <Link href="/mock-history" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                View all attempts
              </Link>
            </CardHeader>
            <CardContent>
              {scoreTrend.length < 2 ? (
                <EmptyState
                  icon={BarChart3}
                  text={
                    hasActivity
                      ? "Attempt one more test to see your score trend."
                      : "No submitted tests yet. Your score trend appears after your first mock test."
                  }
                />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scoreTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) =>
                          value
                            ? new Date(String(value)).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })
                            : ""
                        }
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
                      <RechartsTooltip
                        labelFormatter={(value) =>
                          value ? new Date(String(value)).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }) : ""
                        }
                        formatter={(value) => [`${value ?? 0}%`, "Score"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="scorePct"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Subject accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                {subjectAccuracy.length === 0 ? (
                  <EmptyState icon={Target} text="Subject accuracy appears after a submitted test." />
                ) : (
                  <ul className="space-y-3">
                    {subjectAccuracy.map((item) => (
                      <li key={item.subject}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                            {item.subject}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 font-semibold",
                              item.accuracy >= 60
                                ? "text-secondary-700 dark:text-secondary-300"
                                : "text-amber-700 dark:text-amber-300",
                            )}
                          >
                            {item.accuracy}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <div
                            className={cn(
                              "h-2 rounded-full",
                              item.accuracy >= 60 ? "bg-secondary-500" : "bg-amber-500",
                            )}
                            style={{ width: `${Math.min(100, item.accuracy)}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          {item.correct}/{item.attempted} correct
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Weak topics</CardTitle>
                <Link
                  href="/dashboard/wrong-questions"
                  className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  Retry wrong
                </Link>
              </CardHeader>
              <CardContent>
                {weakTopics.length === 0 ? (
                  <EmptyState icon={Award} text="Answer more questions to surface topic-level weaknesses." />
                ) : (
                  <ul className="space-y-2.5">
                    {weakTopics.map((topic) => (
                      <li
                        key={`${topic.subject}-${topic.topic}`}
                        className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                            {topic.topic}
                          </p>
                          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {topic.subject}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-red-600 dark:text-red-400">
                          {topic.incorrect} wrong
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent attempts</CardTitle>
            </CardHeader>
            <CardContent>
              {recentAttempts.length === 0 ? (
                <EmptyState icon={History} text="No attempts yet. Start your first mock test." />
              ) : (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                        <th className="px-2 py-2 font-semibold">Test</th>
                        <th className="px-2 py-2 font-semibold">Date</th>
                        <th className="px-2 py-2 font-semibold">Score</th>
                        <th className="px-2 py-2 font-semibold">Correct</th>
                        <th className="px-2 py-2 font-semibold">Time</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {recentAttempts.map((attempt) => (
                        <tr
                          key={attempt.id}
                          className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                        >
                          <td className="max-w-[180px] truncate px-2 py-2.5 font-medium text-neutral-900 dark:text-white">
                            {attempt.test.title}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-neutral-600 dark:text-neutral-400">
                            {new Date(attempt.submittedAt ?? attempt.startedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5">
                            <span className="font-semibold text-neutral-900 dark:text-white">{attempt.score}</span>
                            <span className="text-neutral-500 dark:text-neutral-400">/{attempt.maxScore}</span>
                            <span className="ml-1 text-xs text-primary-600 dark:text-primary-400">
                              {attempt.scorePct}%
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-neutral-600 dark:text-neutral-400">
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-secondary-500" /> {attempt.correctCount}
                            </span>
                            <span className="ml-2 inline-flex items-center gap-1">
                              <XCircle className="h-3 w-3 text-red-500" /> {attempt.incorrectCount}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-neutral-600 dark:text-neutral-400">
                            {formatDuration(attempt.timeSpentSec)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-right">
                            <Link
                              href={`/mock-tests/${attempt.test.slug}/result/${attempt.id}`}
                              className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                            >
                              Review
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary-600 dark:text-primary-400" /> Exam countdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {examInDays != null && data.examDate ? (
                <div className="text-center">
                  <p className="text-4xl font-bold text-neutral-900 dark:text-white">
                    {examInDays > 0 ? examInDays : 0}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {examInDays > 0 ? "days to the target date" : "Target date reached"}
                  </p>
                  <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {new Date(`${data.examDate}T00:00:00.000Z`).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                    Target date, not an official NTA announcement.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No target date set. An administrator can add the official CUET date in platform settings.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" /> Streak & daily goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-neutral-900 dark:text-white">{streak}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {streak === 1 ? "day streak" : "day streak"}
                  </p>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {totals.activeDays} active {totals.activeDays === 1 ? "day" : "days"}
                </p>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                  <span>Today: {totals.todayAttempted} questions</span>
                  <span>{DAILY_GOAL} goal</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <div
                    className="h-2 rounded-full bg-primary-600 transition-all"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                {totals.todayAttempted >= DAILY_GOAL
                  ? "Daily goal complete — keep the streak alive."
                  : `${Math.max(0, DAILY_GOAL - totals.todayAttempted)} more questions to hit today's goal.`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary-600 dark:text-primary-400" /> Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              {badges.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Complete your first mock test to start earning badges.
                </p>
              ) : (
                <ul className="space-y-2">
                  {badges.map((badge) => (
                    <li
                      key={badge.key}
                      className="rounded-lg border border-primary-200 bg-primary-50 p-2.5 dark:border-primary-900 dark:bg-primary-900/20"
                    >
                      <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                        {badge.label}
                      </p>
                      <p className="text-xs text-primary-800 dark:text-primary-200">{badge.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <QuickLink href="/dashboard/wrong-questions" icon={XCircle} label="Wrong questions" count={totals.wrongQuestions} />
              <QuickLink href="/bookmarks" icon={Bookmark} label="Bookmarked questions" count={totals.bookmarks} />
              <QuickLink href="/dashboard/discussions" icon={MessageSquare} label="My discussions" count={totals.discussions} />
              <QuickLink href="/mock-history" icon={History} label="Attempt history" />
              <QuickLink href="/dashboard/settings" icon={Settings} label="Account & privacy" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>At a glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <p className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Practice time</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{formatDuration(totals.totalTimeSec)}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Avg / question</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{totals.avgTimePerQuestionSec}s</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" /> Best score</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{totals.bestScorePct}%</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: typeof Target;
  tone: "primary" | "secondary" | "green" | "amber";
  hint?: string;
}) {
  const tones = {
    primary: "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
    secondary: "bg-secondary-100 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  } as const;

  return (
    <Card className="card-hover">
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {label}
          </p>
          <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-white">{value}</p>
          {hint ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p> : null}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Target; text: string }) {
  return (
    <div className="py-10 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
      <p className="mx-auto max-w-xs text-sm text-neutral-500 dark:text-neutral-400">{text}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  icon: typeof Target;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
        {label}
      </span>
      {count != null ? (
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
