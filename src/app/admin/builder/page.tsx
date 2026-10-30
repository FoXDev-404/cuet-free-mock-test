"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminModal } from "@/app/admin/_components/shared";
import { CheckCircle2, GraduationCap, Split, Wand2 } from "lucide-react";

type Test = {
  id: string; title: string; slug: string; type: string; status: string;
  totalQuestions: number; durationMinutes: number; isPublic: boolean;
  subject?: { name: string } | null; _count?: { questions: number; attempts: number };
  versions?: { versionNo: number }[];
};

export default function BuilderPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tests");
      if (res.ok) setTests((await res.json()).tests ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  const publish = async (id: string) => {
    if (!confirm("Publish this test? Publish snapshots a restorable TestVersion.")) return;
    const res = await fetch(`/api/admin/tests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? "Publish failed"); }
    await load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Mock Test Builder</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Auto-select questions by difficulty distribution, publish with version snapshots, track attempts.
          </p>
        </div>
        <Button variant="brand" onClick={() => setOpen(true)}>
          <Wand2 className="h-4 w-4" /> Build a test
        </Button>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-neutral-500">Loading tests…</div>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <Card key={t.id}>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
                      <GraduationCap className="h-4 w-4 text-primary-600" /> {t.title}
                      <span className="text-xs font-normal text-neutral-400">/{t.slug}</span>
                    </p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {t.type} · {t.totalQuestions} questions · {t.durationMinutes} min
                      {t.subject ? ` · ${t.subject.name}` : ""}
                      {t.versions?.length ? ` · v${Math.max(...t.versions.map(v => v.versionNo))} snapshot` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${t.status === "PUBLISHED" ? "badge-secondary" : "badge-neutral"}`}>{t.status}</span>
                    <span className="text-xs text-neutral-500">{t._count?.attempts ?? 0} attempts</span>
                    {t.status !== "PUBLISHED" && (
                      <Button variant="brand" size="sm" onClick={() => publish(t.id)}>
                        <CheckCircle2 className="h-4 w-4" /> Publish
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {open && <BuilderWizard onClose={() => setOpen(false)} onDone={load} />}
    </div>
  );
}

function BuilderWizard({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const [subjects, setSubjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [form, setForm] = useState({
    title: "", slug: "", type: "SUBJECT_WISE", subjectId: "", durationMinutes: 60,
    total: 20, easy: 25, medium: 50, hard: 25, seed: "", autoPublish: false,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/subjects");
      if (res.ok) {
        const rows = await res.json();
        setSubjects(Array.isArray(rows) ? rows : []);
      }
    })();
  }, []);

  const submit = async () => {
    setBusy(true);
    try {
      const autoSelect: Record<string, unknown> = {
        total: form.total,
        distribution: { easy: form.easy, medium: form.medium, hard: form.hard },
      };
      if (form.subjectId) autoSelect.subjectId = form.subjectId;
      if (form.seed) autoSelect.seed = parseInt(form.seed, 10) || undefined;

      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          type: form.type,
          subjectId: form.subjectId || null,
          durationMinutes: form.durationMinutes,
          status: form.autoPublish ? "PUBLISHED" : "DRAFT",
          config: JSON.stringify({
            markingScheme: { correct: 5, incorrect: 1, unattempted: 0 },
            durationMinutes: form.durationMinutes,
          }),
          autoSelect,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error ?? "Build failed"); return; }
      const info = data as { shortfall: string | null; snapshotVersion: number | null };
      if (info.shortfall) alert(info.shortfall);
      onClose();
      await onDone();
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof form) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: ev.target.type === "number" ? Number(ev.target.value) : ev.target.value }));

  return (
    <AdminModal title="Build a test (auto-selection)" onClose={onClose} wide>
      <div className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="Test title" value={form.title} onChange={set("title")} />
          <input className="input" placeholder="slug (physics-mock-1)" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} />
          <select className="input" value={form.type} onChange={set("type")} aria-label="Type">
            <option value="SUBJECT_WISE">Subject-wise</option>
            <option value="FULL_LENGTH">Full length</option>
            <option value="CHAPTER_WISE">Chapter-wise</option>
            <option value="PYQ_YEAR_WISE">PYQ year-wise</option>
            <option value="GENERAL_TEST">General test</option>
          </select>
          <select className="input" value={form.subjectId} onChange={set("subjectId")} aria-label="Subject">
            <option value="">Subject… (uses pool filter)</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </select>
          <input className="input" type="number" min={1} max={240} placeholder="Total questions" value={form.total} onChange={set("total")} />
          <input className="input" type="number" min={1} placeholder="Duration (min)" value={form.durationMinutes} onChange={set("durationMinutes")} />
          <input className="input" placeholder="Seed (optional, reproducible)" value={form.seed} onChange={set("seed")} />
          <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <input type="checkbox" checked={form.autoPublish} onChange={() => setForm((f) => ({ ...f, autoPublish: !f.autoPublish }))} />
            Publish immediately (snapshots version)
          </label>
        </div>

        <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <p className="mb-2 flex items-center gap-2 font-medium text-neutral-700 dark:text-neutral-300">
            <Split className="h-4 w-4" /> Difficulty split (weights)
          </p>
          <div className="grid grid-cols-3 gap-3">
            <input className="input" type="number" min={0} max={100} value={form.easy} onChange={set("easy")} aria-label="Easy weight" />
            <input className="input" type="number" min={0} max={100} value={form.medium} onChange={set("medium")} aria-label="Medium weight" />
            <input className="input" type="number" min={0} max={100} value={form.hard} onChange={set("hard")} aria-label="Hard weight" />
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Weights are relative (e.g. 25/50/25 → ¼ easy). Shortfalls fill from remaining difficulties and are reported after build.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={submit} disabled={busy || !form.title || !form.slug}>
            {busy ? "Building…" : "Build test"}
          </Button>
        </div>
      </div>
    </AdminModal>
  );
}
