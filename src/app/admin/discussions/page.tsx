"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Pin, EyeOff, Eye, Trash2, Loader2, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Discussion = {
  id: string;
  body: string;
  status: string;
  isPinned: boolean;
  isBestAnswer: boolean;
  upvotes: number;
  createdAt: string;
  parentId: string | null;
  author: string;
  authorId: string;
  test: { id: string; title: string; slug: string } | null;
  questionId: string | null;
  questionStem: string | null;
  reportCount: number;
  replyCount: number;
};

const STATUSES = ["VISIBLE", "PENDING", "HIDDEN", "DELETED", "all"];

export default function AdminDiscussionsPage() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [status, setStatus] = useState("VISIBLE");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/discussions?status=${encodeURIComponent(status)}`);
      if (res.ok) {
        const data = await res.json();
        setDiscussions(data.discussions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const act = async (id: string, body: Record<string, unknown>, label: string) => {
    setBusy(id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/discussions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === "string" ? data.error : "Action failed");
      }
      setMessage(label);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
          <MessageSquare className="h-6 w-6 text-primary-600" /> Discussions
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Community posts. Hiding is reversible; deleting is a soft delete that keeps the audit trail.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          aria-label="Discussion status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="input max-w-[10rem] py-1.5 text-sm"
        >
          {STATUSES.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <Link href="/admin/reports" className="btn-outline px-3 py-1.5 text-sm">Report queue</Link>
      </div>

      {message ? <p className="mb-3 rounded-lg bg-neutral-100 p-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{message}</p> : null}

      {loading ? (
        <div className="card p-10 text-center text-neutral-500">Loading discussions…</div>
      ) : discussions.length === 0 ? (
        <div className="card p-10 text-center text-neutral-500">No posts match this filter.</div>
      ) : (
        <div className="space-y-3">
          {discussions.map((post) => (
            <Card key={post.id}>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{post.author}</span>
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] uppercase", post.status === "VISIBLE" ? "bg-secondary-100 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300")}>{post.status}</span>
                      {post.parentId ? <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] dark:bg-neutral-800">reply</span> : null}
                      {post.isPinned ? <span className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400"><Pin className="h-3 w-3" />pinned</span> : null}
                      <span>{post.upvotes} upvotes · {post.replyCount} replies · {post.reportCount} reports</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-800 dark:text-neutral-200">{post.body}</p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(post.createdAt).toLocaleString()}
                      {post.test ? ` · ${post.test.title}` : ""}
                      {post.questionStem ? ` · ${post.questionStem.slice(0, 90)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy === post.id} onClick={() => act(post.id, { isPinned: !post.isPinned }, post.isPinned ? "Unpinned." : "Pinned.")} className="btn-outline inline-flex items-center gap-1 px-2.5 py-1.5 text-xs">
                      <Pin className="h-3 w-3" /> {post.isPinned ? "Unpin" : "Pin"}
                    </button>
                    {post.status !== "HIDDEN" ? (
                      <button type="button" disabled={busy === post.id} onClick={() => act(post.id, { status: "HIDDEN" }, "Post hidden.")} className="btn-outline inline-flex items-center gap-1 px-2.5 py-1.5 text-xs">
                        <EyeOff className="h-3 w-3" /> Hide
                      </button>
                    ) : (
                      <button type="button" disabled={busy === post.id} onClick={() => act(post.id, { status: "VISIBLE" }, "Post restored.")} className="btn-brand inline-flex items-center gap-1 px-2.5 py-1.5 text-xs">
                        <Eye className="h-3 w-3" /> Restore
                      </button>
                    )}
                    {post.status !== "DELETED" ? (
                      <button type="button" disabled={busy === post.id} onClick={() => act(post.id, { status: "DELETED" }, "Post soft-deleted.")} className="btn-outline inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    ) : null}
                    <button type="button" disabled={busy === post.id} onClick={() => act(post.id, { muteUserId: true, muteHours: 24 }, "Author muted for 24 hours.")} className="btn-outline inline-flex items-center gap-1 px-2.5 py-1.5 text-xs">
                      <BellOff className="h-3 w-3" /> Mute 24h
                    </button>
                  </div>
                </div>
                {busy === post.id ? <p className="mt-2 text-xs text-neutral-500"><Loader2 className="inline h-3 w-3 animate-spin" /> Working…</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
