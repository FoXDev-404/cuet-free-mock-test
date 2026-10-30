"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminModal } from "@/app/admin/_components/shared";
import { CheckCircle2, Database, Eye, Play, RotateCcw, Upload, XCircle } from "lucide-react";

type Job = {
  id: string; filename: string; format: string; mode: string; status: string;
  totalRecords: number; insertedCount: number; updatedCount: number; skippedCount: number;
  duplicateCount: number; failedCount: number; processedUpTo: number;
  actorEmail: string | null; createdAt: string; finishedAt: string | null; errorDetails: string | null;
};

type JobDetail = {
  job: Job;
  errors: { id: string; rowNumber: number | null; field: string | null; code: string; message: string }[];
  preview: { rowNumber: number; ok: boolean; duplicate: string | null; stem: string | null; optionsCount: number; correctAnswer: string | null; status: string | null; warnings: string[] }[];
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200",
  VALIDATED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  IMPORTING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  COMPLETED: "bg-secondary-100 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-300",
  FAILED: "bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300",
  ROLLED_BACK: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
};

export default function ImportStudioPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/imports");
      if (res.ok) setJobs((await res.json()).jobs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadJobs();
    })();
  }, [loadJobs]);

  const openDetail = async (id: string) => {
    const res = await fetch(`/api/admin/imports/${id}`);
    if (!res.ok) return;
    setDetail((await res.json()) as JobDetail);
  };

  const act = async (id: string, action: string) => {
    const res = await fetch(`/api/admin/imports/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data.error ?? "Action failed"); return; }
    await openDetail(id);
    await loadJobs();
    // Keep resuming until done (processes 100 rows per call).
    if (!data.done && (action === "commit" || action === "resume")) {
      while (true) {
        const next = await fetch(`/api/admin/imports/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resume" }),
        });
        if (!next.ok) break;
        const nd = await next.json();
        if (nd.done) break;
      }
      await openDetail(id);
      await loadJobs();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this import job record?")) return;
    await fetch(`/api/admin/imports/${id}?confirm=yes`, { method: "DELETE" });
    setDetail(null);
    await loadJobs();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Import Studio</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Staged, validated imports with duplicate detection. Nothing auto-publishes; dry-run first.
          </p>
        </div>
        <Button variant="brand" onClick={() => setWizardOpen(true)}>
          <Upload className="h-4 w-4" /> New import
        </Button>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-neutral-500">Loading jobs…</div>
      ) : (
        <div className="space-y-4">
          {jobs.length === 0 && <div className="card p-10 text-center text-neutral-500">No import jobs yet.</div>}
          {jobs.map((j) => (
            <Card key={j.id}>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">{j.filename}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {j.mode} · {j.format} · {new Date(j.createdAt).toLocaleString()} · by {j.actorEmail ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={STATUS_STYLES[j.status] ?? ""}>{j.status}</Badge>
                    <span className="text-xs text-neutral-500">
                      {j.processedUpTo}/{j.totalRecords} rows · +{j.insertedCount} ~{j.updatedCount} ⧖{j.skippedCount} ⇄{j.duplicateCount} ✖{j.failedCount}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => openDetail(j.id)}>
                      <Eye className="h-4 w-4" /> Inspect
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {wizardOpen && <ImportWizard onClose={() => setWizardOpen(false)} onDone={loadJobs} />}

      {detail && (
        <AdminModal title={`Import ${detail.job.filename}`} onClose={() => setDetail(null)} wide>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={STATUS_STYLES[detail.job.status] ?? ""}>{detail.job.status}</Badge>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {detail.job.mode === "DRY_RUN" ? "Dry run (nothing written)" : `Committed ${detail.job.insertedCount} / ${detail.job.totalRecords}`}
              </span>
            </div>

            {detail.job.errorDetails && (
              <p className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700 dark:bg-danger-900/20 dark:text-danger-300">{detail.job.errorDetails}</p>
            )}

            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
              <div className="max-h-48 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                {detail.preview.map((p) => (
                  <div key={p.rowNumber} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <span className="w-10 shrink-0 text-neutral-400">#{p.rowNumber}</span>
                    {p.duplicate
                      ? <XCircle className="h-4 w-4 shrink-0 text-amber-500" />
                      : p.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary-500" /> : <XCircle className="h-4 w-4 shrink-0 text-danger-500" />}
                    <span className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300">{p.stem ?? "(row)"}</span>
                    {p.duplicate && <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-600">{p.duplicate}</span>}
                    {p.warnings.length > 0 && <span className="shrink-0 text-[10px] uppercase tracking-wide text-neutral-400">{p.warnings.join(", ")}</span>}
                  </div>
                ))}
              </div>
            </div>

            {detail.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg bg-neutral-50 p-3 text-xs dark:bg-neutral-800/50">
                {detail.errors.map((e) => (
                  <p key={e.id}>
                    <span className="font-semibold text-danger-600">Row {e.rowNumber}: {e.code}</span>{" "}
                    <span className="text-neutral-600 dark:text-neutral-400">{e.field ? `${e.field} — ` : ""}{e.message}</span>
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {detail.job.mode === "COMMIT" && ["VALIDATED", "IMPORTING"].includes(detail.job.status) && (
                <Button variant="brand" onClick={() => act(detail.job.id, "commit")}>
                  <Play className="h-4 w-4" /> {detail.job.status === "IMPORTING" ? "Resume" : "Commit"}
                </Button>
              )}
              {detail.job.mode === "COMMIT" && detail.job.status === "COMPLETED" && detail.job.insertedCount > 0 && (
                <Button variant="outline" onClick={() => { if (confirm("Roll back ALL rows this job inserted? Archived rows with attempts are kept.")) void act(detail.job.id, "rollback"); }}>
                  <RotateCcw className="h-4 w-4" /> Roll back
                </Button>
              )}
              {!["COMPLETED"].includes(detail.job.status) && (
                <Button variant="outline" onClick={() => { if (confirm("Mark this job failed (will need re-import)?")) void act(detail.job.id, "cancel"); }}>
                  Cancel
                </Button>
              )}
              <Button variant="outline" onClick={() => remove(detail.job.id)}>
                <Database className="h-4 w-4" /> Delete record
              </Button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

function ImportWizard({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const [subjects, setSubjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [filename, setFilename] = useState("pasted-payload.json");
  const [format, setFormat] = useState<"JSON" | "CSV" | "PASTE">("JSON");
  const [mode, setMode] = useState<"DRY_RUN" | "COMMIT">("DRY_RUN");
  const [payload, setPayload] = useState("");
  const [autoCreate, setAutoCreate] = useState(true);
  const [defaultYear, setDefaultYear] = useState<string>("");
  const [defaultStatus, setDefaultStatus] = useState("DRAFT");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/subjects");
      if (res.ok) {
        const data = await res.json();
        const rows = (Array.isArray(data) ? data : []) as { id: string; name: string; code: string }[];
        setSubjects(rows);
        if (rows.length === 1) setSubjectId(rows[0].id);
      }
    })();
  }, []);

  const create = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename, format, mode, payload,
          options: {
            subjectId,
            autoCreateChapters: autoCreate,
            autoCreateTopics: autoCreate,
            ...(defaultYear ? { defaultYear: parseInt(defaultYear, 10) } : {}),
            defaultStatus,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error ?? "Import validation failed"); return; }
      onClose();
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminModal title="Bulk import (staged)" onClose={onClose} wide>
      <div className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">Target subject</span>
            <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Select…</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">Label</span>
            <input className="input" value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="e.g. physics-2025-questions.json" />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">Format</span>
            <select className="input" value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
              <option value="JSON">JSON array / object</option>
              <option value="CSV">CSV</option>
              <option value="PASTE">Pasted JSON</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">Import status default</span>
            <select className="input" value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value)}>
              <option value="DRAFT">DRAFT (recommended)</option>
              <option value="PENDING_VALIDATION">PENDING_VALIDATION</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="APPROVED">APPROVED (validated)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">Mode</span>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="DRY_RUN">Dry run (validate only)</option>
              <option value="COMMIT">Stage then commit</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">Default year (optional)</span>
            <input className="input" inputMode="numeric" value={defaultYear} onChange={(e) => setDefaultYear(e.target.value.replace(/\D/g, ""))} placeholder="2025" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <input type="checkbox" checked={autoCreate} onChange={() => setAutoCreate((v) => !v)} />
          Auto-create chapters/topics from row names
        </label>

        <label className="block">
          <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">Payload (rows: stem, options, correct…)</span>
          <textarea className="input font-mono text-xs" rows={10} value={payload} onChange={(e) => setPayload(e.target.value)} placeholder='[{"stemEn":"...","options":["2","4"],"correctAnswer":"4","chapterName":"..."}]' />
        </label>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={create} disabled={busy || !subjectId || payload.length < 2}>
            {busy ? "Validating…" : mode === "DRY_RUN" ? "Run dry-run" : "Stage import"}
          </Button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Rows importing from unverified sources always land in the selected status; PUBLISHED is never applied by imports.
        </p>
      </div>
    </AdminModal>
  );
}
