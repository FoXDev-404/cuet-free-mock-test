"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Flag, MessageSquare, ShieldAlert, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type QuestionReport = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  question: { id: string; stemEn: string; source: string | null; year: number | null; subject: { name: string } | null };
  user: { id: string; username: string | null; name: string | null } | null;
  attempt: { id: string } | null;
};

type DiscussionReport = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  discussion: {
    id: string;
    body: string;
    status: string;
    createdAt: string;
    user: { id: string; username: string | null; name: string | null };
    test: { id: string; title: string; slug: string } | null;
    questionId: string | null;
  };
  user: { id: string; username: string | null; name: string | null };
};

const STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED", "all"];

export default function ReportsPage() {
  const [questionReports, setQuestionReports] = useState<QuestionReport[]>([]);
  const [discussionReports, setDiscussionReports] = useState<DiscussionReport[]>([]);
  const [counts, setCounts] = useState({ questionOpen: 0, discussionOpen: 0, totalOpen: 0 });
  const [type, setType] = useState<"all" | "question" | "discussion">("all");
  const [status, setStatus] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, status });
      const res = await fetch(`/api/admin/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setQuestionReports(data.questionReports ?? []);
        setDiscussionReports(data.discussionReports ?? []);
        setCounts(data.counts ?? { questionOpen: 0, discussionOpen: 0, totalOpen: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [type, status]);

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const resolve = async (id: string, kind: "question" | "discussion", next: string) => {
    setBusy(`${kind}:${id}`);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: kind, status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === "string" ? data.error : "Update failed");
      }
      setMessage("Report updated.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
          <ShieldAlert className="h-6 w-6 text-primary-600" /> Reports & moderation
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Learner flags for question issues and community reports. Resolving a report records who acted.
        </p>
        <p className="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {counts.totalOpen} open · {counts.questionOpen} question · {counts.discussionOpen} discussion
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
          {(["all", "question", "discussion"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium capitalize",
                type === option ? "bg-primary-600 text-white" : "text-neutral-600 dark:text-neutral-300",
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <select
          aria-label="Report status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="input max-w-[10rem] py-1.5 text-sm"
        >
          {STATUSES.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {message ? <p className="mb-3 rounded-lg bg-neutral-100 p-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{message}</p> : null}
      {loading ? (
        <div className="card p-10 text-center text-neutral-500">Loading reports…</div>
      ) : (
        <div className="space-y-4">
          {questionReports.map((report) => (
            <Card key={`q-${report.id}`}>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                      <Flag className="h-4 w-4 text-amber-600" />
                      {report.reason.replaceAll("_", " ").toLowerCase()}
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">{report.status}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-700 dark:text-neutral-300">{report.question.stemEn}</p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {report.question.subject?.name ?? "Question"} · Q{report.question.id} ·{" "}
                      {report.user ? report.user.username || report.user.name || "learner" : "guest"} ·{" "}
                      {new Date(report.createdAt).toLocaleString()}
                    </p>
                    {report.details ? <p className="mt-1 rounded bg-neutral-50 p-2 text-xs text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">{report.details}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/question-bank?q=${encodeURIComponent(report.question.id)}`} className="btn-outline px-3 py-1.5 text-xs">Open question</Link>
                    {report.status !== "RESOLVED" ? (
                      <button type="button" disabled={busy === `question:${report.id}`} onClick={() => resolve(report.id, "question", "RESOLVED")} className="btn-brand inline-flex items-center gap-1 px-3 py-1.5 text-xs">
                        {busy === `question:${report.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Resolve
                      </button>
                    ) : null}
                    {report.status !== "DISMISSED" ? (
                      <button type="button" disabled={busy === `question:${report.id}`} onClick={() => resolve(report.id, "question", "DISMISSED")} className="btn-outline inline-flex items-center gap-1 px-3 py-1.5 text-xs">
                        <XCircle className="h-3 w-3" /> Dismiss
                      </button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {discussionReports.map((report) => (
            <Card key={`d-${report.id}`}>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                      <MessageSquare className="h-4 w-4 text-primary-600" />
                      {report.reason.replaceAll("_", " ").toLowerCase()}
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">{report.status}</span>
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">post {report.discussion.status}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-700 dark:text-neutral-300">{report.discussion.body}</p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      by {report.discussion.user.username || report.discussion.user.name || "learner"} · reported by{" "}
                      {report.user.username || report.user.name || "learner"} · {new Date(report.createdAt).toLocaleString()}
                      {report.discussion.test ? ` · ${report.discussion.test.title}` : ""}
                    </p>
                    {report.details ? <p className="mt-1 rounded bg-neutral-50 p-2 text-xs text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">{report.details}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/admin/discussions" className="btn-outline px-3 py-1.5 text-xs">Open moderation</Link>
                    {report.status !== "REVIEWED" ? (
                      <button type="button" disabled={busy === `discussion:${report.id}`} onClick={() => resolve(report.id, "discussion", "REVIEWED")} className="btn-brand inline-flex items-center gap-1 px-3 py-1.5 text-xs">
                        {busy === `discussion:${report.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Reviewed
                      </button>
                    ) : null}
                    {report.status !== "DISMISSED" ? (
                      <button type="button" disabled={busy === `discussion:${report.id}`} onClick={() => resolve(report.id, "discussion", "DISMISSED")} className="btn-outline inline-flex items-center gap-1 px-3 py-1.5 text-xs">
                        <XCircle className="h-3 w-3" /> Dismiss
                      </button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {questionReports.length === 0 && discussionReports.length === 0 ? (
            <div className="card p-10 text-center text-neutral-500">No reports match this filter.</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
