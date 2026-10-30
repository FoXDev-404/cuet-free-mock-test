"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowBigUp, Flag, MessageSquare, Pin, Trash2, CheckCircle2, Loader2 } from "lucide-react";

interface Reply {
  id: string;
  body: string;
  isBestAnswer: boolean;
  upvotes: number;
  createdAt: string;
  author: string;
  authorId: string;
  isOwn: boolean;
  voted: boolean;
}

interface Thread extends Reply {
  isPinned: boolean;
  replies: Reply[];
}

type Target = { testId: string } | { questionId: string };

export function DiscussionThread({
  target,
  title = "Discussion",
  compact = false,
}: {
  target: Target;
  title?: string;
  compact?: boolean;
}) {
  const { status } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<"new" | "top">("top");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("SPAM");
  const [notice, setNotice] = useState("");

  const queryString = new URLSearchParams({
    ...(target as Record<string, string>),
    sort,
    limit: compact ? "10" : "20",
  }).toString();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/discussions?${queryString}`);
      if (!res.ok) {
        setError("Could not load the discussion.");
        return;
      }
      const data = await res.json();
      setThreads(Array.isArray(data.discussions) ? data.discussions : []);
      setError("");
    } catch {
      setError("Could not load the discussion.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const post = async () => {
    if (posting || body.trim().length < 3) return;
    setPosting(true);
    setNotice("");
    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Post failed");
      setThreads((prev) => [{ ...data, isPinned: false, replies: [] }, ...prev]);
      setBody("");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Post failed");
    } finally {
      setPosting(false);
    }
  };

  const reply = async (parentId: string) => {
    if (replyBody.trim().length < 3) return;
    setNotice("");
    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, parentId, body: replyBody.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Reply failed");
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === parentId
            ? { ...thread, replies: [...thread.replies, data] }
            : thread,
        ),
      );
      setReplyBody("");
      setReplyTo(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Reply failed");
    }
  };

  const vote = async (id: string, isReply: boolean, parentId?: string) => {
    const res = await fetch(`/api/discussions/${id}/vote`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === id) return { ...thread, voted: data.voted, upvotes: data.upvotes };
        if (isReply && thread.id === parentId) {
          return {
            ...thread,
            replies: thread.replies.map((item) =>
              item.id === id ? { ...item, voted: data.voted, upvotes: data.upvotes } : item,
            ),
          };
        }
        return thread;
      }),
    );
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this post?")) return;
    const res = await fetch(`/api/discussions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setNotice("Could not delete the post.");
      return;
    }
    setThreads((prev) =>
      prev
        .filter((thread) => thread.id !== id)
        .map((thread) => ({
          ...thread,
          replies: thread.replies.filter((replyItem) => replyItem.id !== id),
        })),
    );
  };

  const report = async (id: string) => {
    const res = await fetch(`/api/discussions/${id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reportReason }),
    });
    const data = await res.json().catch(() => ({}));
    setReporting(null);
    setNotice(
      res.ok
        ? "Thanks — a moderator will review this post."
        : typeof data?.error === "string"
          ? data.error
          : "Could not report the post.",
    );
  };

  return (
    <section className={cn("rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900", compact ? "p-4" : "p-5 sm:p-6")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
          <MessageSquare className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          {title}
          <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">({threads.length})</span>
        </h2>
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
          {(["top", "new"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSort(option)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium capitalize",
                sort === option
                  ? "bg-primary-600 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {status === "authenticated" ? (
        <div className="mb-5">
          <label htmlFor={`discussion-body-${Object.values(target)[0]}`} className="sr-only">
            Write a discussion post
          </label>
          <textarea
            id={`discussion-body-${Object.values(target)[0]}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={compact ? 2 : 3}
            maxLength={2000}
            placeholder="Ask a doubt or share a study tip. Be respectful."
            className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{body.trim().length}/2000</span>
            <Button variant="brand" size="sm" onClick={post} disabled={posting || body.trim().length < 3}>
              {posting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Post
            </Button>
          </div>
        </div>
      ) : status === "unauthenticated" ? (
        <p className="mb-5 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">
          <Link href="/login" className="font-semibold text-primary-600 hover:underline dark:text-primary-400">
            Sign in
          </Link>{" "}
          to ask a doubt or reply.
        </p>
      ) : null}

      {notice ? (
        <p className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-2.5 text-sm text-primary-800 dark:border-primary-900 dark:bg-primary-900/20 dark:text-primary-200" role="status">
          {notice}
        </p>
      ) : null}

      {loading ? (
        <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">Loading discussion…</p>
      ) : error ? (
        <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : threads.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          No posts yet. Start the conversation.
        </p>
      ) : (
        <ul className="space-y-4">
          {threads.map((thread) => (
            <li key={thread.id} className="rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
              <PostBody
                post={thread}
                onVote={() => vote(thread.id, false)}
                onReply={() => setReplyTo(replyTo === thread.id ? null : thread.id)}
                onDelete={() => remove(thread.id)}
                onReport={() => setReporting(reporting === thread.id ? null : thread.id)}
              />
              {reporting === thread.id ? (
                <ReportBox
                  reason={reportReason}
                  onReason={setReportReason}
                  onSubmit={() => report(thread.id)}
                  onCancel={() => setReporting(null)}
                />
              ) : null}

              {replyTo === thread.id ? (
                <div className="mt-3 pl-4">
                  <textarea
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder="Write a reply…"
                    className="w-full rounded-lg border border-neutral-200 bg-white p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="brand" onClick={() => reply(thread.id)} disabled={replyBody.trim().length < 3}>
                      Reply
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setReplyTo(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              {thread.replies.length > 0 ? (
                <ul className="mt-3 space-y-2 border-l-2 border-neutral-100 pl-4 dark:border-neutral-800">
                  {thread.replies.map((item) => (
                    <li key={item.id}>
                      <PostBody
                        post={item}
                        small
                        onVote={() => vote(item.id, true, thread.id)}
                        onDelete={() => remove(item.id)}
                        onReport={() => setReporting(reporting === item.id ? null : item.id)}
                      />
                      {reporting === item.id ? (
                        <ReportBox
                          reason={reportReason}
                          onReason={setReportReason}
                          onSubmit={() => report(item.id)}
                          onCancel={() => setReporting(null)}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PostBody({
  post,
  small,
  onVote,
  onReply,
  onDelete,
  onReport,
}: {
  post: Reply & { isPinned?: boolean };
  small?: boolean;
  onVote: () => void;
  onReply?: () => void;
  onDelete: () => void;
  onReport: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={onVote}
        disabled={post.isOwn}
        aria-label={post.voted ? "Remove upvote" : "Upvote"}
        aria-pressed={post.voted}
        className={cn(
          "mt-0.5 flex shrink-0 flex-col items-center rounded-lg border px-1.5 py-1 text-xs",
          post.voted
            ? "border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
            : "border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800",
        )}
      >
        <ArrowBigUp className={cn("h-4 w-4", post.voted && "fill-current")} />
        {post.upvotes}
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">{post.author}</span>
          <time dateTime={post.createdAt}>{formatRelative(post.createdAt)}</time>
          {post.isPinned ? <span className="inline-flex items-center gap-1 rounded bg-primary-50 px-1.5 py-0.5 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"><Pin className="h-3 w-3" />Pinned</span> : null}
          {post.isBestAnswer ? <span className="inline-flex items-center gap-1 rounded bg-secondary-50 px-1.5 py-0.5 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300"><CheckCircle2 className="h-3 w-3" />Best answer</span> : null}
        </p>
        <p className={cn("mt-1 whitespace-pre-wrap break-words text-neutral-800 dark:text-neutral-200", small ? "text-sm" : "text-sm sm:text-[15px]")}>
          {post.body}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
          {onReply ? (
            <button type="button" onClick={onReply} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Reply
            </button>
          ) : null}
          {post.isOwn ? (
            <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          ) : (
            <button type="button" onClick={onReport} className="inline-flex items-center gap-1 text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400">
              <Flag className="h-3 w-3" /> Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportBox({
  reason,
  onReason,
  onSubmit,
  onCancel,
}: {
  reason: string;
  onReason: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-700 dark:bg-neutral-800/50">
      <label htmlFor="report-reason" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
        Reason
      </label>
      <select
        id="report-reason"
        value={reason}
        onChange={(event) => onReason(event.target.value)}
        className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
      >
        <option value="SPAM">Spam</option>
        <option value="ABUSE">Abusive</option>
        <option value="OFF_TOPIC">Off topic</option>
        <option value="OTHER">Other</option>
      </select>
      <Button size="sm" variant="outline" onClick={onSubmit}>Send report</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

function formatRelative(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
