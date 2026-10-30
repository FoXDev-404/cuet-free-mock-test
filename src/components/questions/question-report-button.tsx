"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Flag, Loader2 } from "lucide-react";

const REASONS = [
  { value: "WRONG_ANSWER", label: "Answer key looks wrong" },
  { value: "TYPO", label: "Typo or broken text" },
  { value: "AMBIGUOUS", label: "Question is ambiguous" },
  { value: "MISSING_IMAGE", label: "Image or diagram missing" },
  { value: "OTHER", label: "Other issue" },
] as const;

export function QuestionReportButton({
  questionId,
  attemptId,
}: {
  questionId: string;
  attemptId?: string | null;
}) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("WRONG_ANSWER");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [message, setMessage] = useState("");

  if (status === "unauthenticated") {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400"
      >
        <Flag className="h-3 w-3" /> Sign in to report an issue
      </Link>
    );
  }

  if (state === "done") {
    return <p className="text-xs font-medium text-secondary-700 dark:text-secondary-300">{message}</p>;
  }

  const submit = async () => {
    setState("sending");
    setMessage("");
    try {
      const res = await fetch(`/api/questions/${encodeURIComponent(questionId)}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() || undefined, attemptId: attemptId ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Could not send the report.");
      setState("done");
      setMessage(data.duplicate ? "Already reported — thank you." : "Report sent for review. Thank you.");
    } catch (error) {
      setState("idle");
      setMessage(error instanceof Error ? error.message : "Could not send the report.");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
      >
        <Flag className="h-3 w-3" /> Report an issue
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`report-reason-${questionId}`} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          Issue
        </label>
        <select
          id={`report-reason-${questionId}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
        >
          {REASONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={submit}
          disabled={state === "sending"}
          className="inline-flex items-center gap-1 rounded bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {state === "sending" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Send
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:underline dark:text-neutral-400">
          Cancel
        </button>
      </div>
      <textarea
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Optional details (what looks wrong?)"
        className="mt-2 w-full rounded border border-neutral-200 bg-white p-2 text-xs dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
      />
      {message ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p> : null}
    </div>
  );
}
