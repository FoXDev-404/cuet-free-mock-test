"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuestionsManager } from "./_components/questions-manager";
import { TestsManager } from "./_components/tests-manager";
import { PyqCardManager } from "./_components/pyq-card-manager";
import { ImportManager } from "./_components/import-manager";
import { BookOpen, ClipboardCheck, FlaskConical, LayoutDashboard, Loader2, ShieldAlert, Upload } from "lucide-react";
import { isAdminRole } from "@/lib/auth/permissions";

interface Stats {
  subjects: number;
  chapters: number;
  questions: number;
  activeQuestions: number;
  pendingReview: number;
  tests: number;
  publishedTests: number;
  users: number;
  admins: number;
  attempts: number;
  englishPaper: {
    examId: string;
    totalQuestions: number;
    questions: number;
  } | null;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "questions", label: "Questions", icon: ClipboardCheck },
  { id: "tests", label: "Mock Test Cards", icon: FlaskConical },
  { id: "pyq", label: "English PYQ Paper", icon: BookOpen },
  { id: "import", label: "Bulk Import", icon: Upload },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isLord = isAdminRole(role);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!isLord) return;
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      const [statsRes, subjectsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/subjects"),
      ]);
      if (cancelled) return;
      if (statsRes.ok) setStats(await statsRes.json());
      if (subjectsRes.ok) {
        let data = await subjectsRes.json();
        try {
          if (typeof data === "string") data = JSON.parse(data);
        } catch {
          /* keep */
        }
        setSubjects(Array.isArray(data) ? data : data.subjects ?? []);
      }
      setLoadingData(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLord]);

  if (status === "loading") {
    return (
      <section className="py-16 flex items-center justify-center text-neutral-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </section>
    );
  }

  if (session && !isLord) {
    return (
      <section className="py-16 px-4 max-w-lg mx-auto text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-red-400 mb-3" />
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Admin access required</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          This area is restricted to administrator accounts.
        </p>
        <Link href="/dashboard" className="btn-outline mt-6 inline-flex">Back to dashboard</Link>
      </section>
    );
  }

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-primary-50">Admin Panel</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage questions, mock test cards, the English PYQ paper and imports.
          </p>
        </div>
        <Link href="/mock-tests" className="btn-outline">View site</Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "brand" : "outline"}
            size="sm"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </Button>
        ))}
      </div>

      {tab !== "overview" && loadingData && !stats ? (
        <div className="card p-10 text-center text-neutral-400">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {tab === "overview" && (
            <AdminOverview stats={stats} loading={loadingData} onRefresh={() => window.location.reload()} />
          )}
          {tab === "questions" && <QuestionsManager subjects={subjects} />}
          {tab === "tests" && <TestsManager subjects={subjects} />}
          {tab === "pyq" && <PyqCardManager totalQuestions={stats?.englishPaper?.totalQuestions ?? null} />}
          {tab === "import" && <ImportManager />}
        </>
      )}
    </section>
  );
}

function AdminOverview({
  stats,
  loading,
  onRefresh,
}: {
  stats: Stats | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading || !stats) {
    return (
      <div className="card p-10 text-center text-neutral-400">
        {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "No stats available."}
      </div>
    );
  }

  const cards = [
    { label: "Questions", value: stats.questions, sub: `${stats.activeQuestions} active`, icon: ClipboardCheck },
    { label: "Needs manual review", value: stats.pendingReview, sub: "answer-key flagged", icon: ShieldAlert, warn: stats.pendingReview > 0 },
    { label: "Subjects", value: stats.subjects, sub: `${stats.chapters} chapters`, icon: BookOpen },
    { label: "Mock test cards", value: stats.tests, sub: `${stats.publishedTests} published`, icon: FlaskConical },
    { label: "Users", value: stats.users, sub: `${stats.admins} admin(s)`, icon: LayoutDashboard },
    { label: "Attempts", value: stats.attempts, sub: "all time", icon: ClipboardCheck },
  ];

  return (
    <div className="space-y-6" data-testid="admin-overview">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">English PYQ paper</p>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                CUET UG English — 20 May 2025 Shift 1
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">{stats.englishPaper?.questions ?? 0} questions</Badge>
              <Badge variant="warning">{stats.pendingReview} flagged</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {c.label}
                </span>
                <c.icon className={`h-4 w-4 ${c.warn ? "text-amber-500" : "text-primary-500"}`} />
              </div>
              <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-white">{c.value}</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-right">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Refresh stats
        </Button>
      </div>
    </div>
  );
}
