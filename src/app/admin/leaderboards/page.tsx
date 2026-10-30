"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminModal } from "@/app/admin/_components/shared";
import { RefreshCw, Trophy, UserX } from "lucide-react";

type Config = {
  id: string; name: string; scope: string; periodType: string;
  examId: string | null; subjectId: string | null; testId: string | null;
  isActive: boolean; rules: string;
  _count?: { entries: number; snapshots: number };
};

type Exclusion = { id: string; userId: string | null; attemptId: string | null; reason: string; excludedBy: string; createdAt: string };

export default function LeaderboardsAdminPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, e] = await Promise.all([
        fetch("/api/admin/leaderboards").then((r) => (r.ok ? r.json() : { configs: [] })),
        fetch("/api/admin/leaderboards/exclusions").then((r) => (r.ok ? r.json() : { exclusions: [] })),
      ]);
      setConfigs(c.configs ?? []);
      setExclusions(e.exclusions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const recalc = async (id: string, action: "recalc" | "snapshot") => {
    const res = await fetch(`/api/admin/leaderboards/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? "Failed"); return; }
    const data = await res.json();
    setMessage(`${action === "snapshot" ? "Snapshot" : "Recalc"} done — ${data.entries ?? 0} entries`);
    await load();
  };

  const toggleActive = async (c: Config) => {
    await fetch(`/api/admin/leaderboards/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    await load();
  };

  const exclude = async () => {
    const userId = prompt("User id to exclude (blank = skip):") ?? "";
    const attemptId = prompt("Attempt id to exclude (blank = skip):") ?? "";
    const reason = prompt("Reason (recorded in audit):") ?? "";
    if (!userId && !attemptId) return;
    const res = await fetch("/api/admin/leaderboards/exclusions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(userId ? { userId } : {}), ...(attemptId ? { attemptId } : {}), reason }),
    });
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? "Failed"); return; }
    await load();
  };

  const removeExclusion = async (id: string) => {
    if (!confirm("Remove exclusion and recalculate?")) return;
    await fetch(`/api/admin/leaderboards/exclusions?id=${id}&confirm=yes`, { method: "DELETE" });
    await load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Leaderboards</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Configs, recalculation, snapshots and exclusions with reason (audited).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exclude}>
            <UserX className="h-4 w-4" /> Exclude…
          </Button>
          <Button variant="brand" onClick={() => setOpen(true)}>
            <Trophy className="h-4 w-4" /> New config
          </Button>
        </div>
      </div>

      {message && <p className="mb-4 rounded-lg bg-secondary-50 p-3 text-sm text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300">{message}</p>}

      {loading ? (
        <div className="card p-10 text-center text-neutral-500">Loading…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {configs.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">{c.name}</p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {c.scope} · {c.periodType} · {c._count?.entries ?? 0} entries · {c._count?.snapshots ?? 0} snapshots
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-400">
                      {c.examId ? `exam:${c.examId.slice(-6)} ` : ""}{c.subjectId ? `subject:${c.subjectId.slice(-6)}` : ""}{c.testId ? `test:${c.testId.slice(-6)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => recalc(c.id, "recalc")}>
                      <RefreshCw className="h-4 w-4" /> Recalc
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => recalc(c.id, "snapshot")}>Snapshot</Button>
                    <Button variant="outline" size="sm" onClick={() => toggleActive(c)}>{c.isActive ? "Disable" : "Enable"}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {configs.length === 0 && <div className="card p-10 text-center text-neutral-500">No leaderboards configured yet.</div>}
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">Exclusions</h2>
        <div className="space-y-2">
          {exclusions.map((x) => (
            <div key={x.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
              <div className="min-w-0">
                <p className="truncate font-medium text-neutral-800 dark:text-neutral-200">{x.reason}</p>
                <p className="text-xs text-neutral-400">by {x.excludedBy} · {new Date(x.createdAt).toLocaleString()} · {x.attemptId ? `attempt ${x.attemptId}` : `user ${x.userId}`}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => removeExclusion(x.id)}>Remove</Button>
            </div>
          ))}
          {exclusions.length === 0 && <p className="text-sm text-neutral-500">No exclusions recorded.</p>}
        </div>
      </div>

      {open && <CreateConfigModal onClose={() => setOpen(false)} onDone={load} />}
    </div>
  );
}

function CreateConfigModal({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const [form, setForm] = useState({ name: "", scope: "GLOBAL", periodType: "ALL_TIME", testId: "", subjectId: "", rules: "{}" });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/leaderboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          scope: form.scope,
          periodType: form.periodType,
          ...(form.testId && form.scope === "TEST" ? { testId: form.testId } : {}),
          ...(form.subjectId && form.scope === "SUBJECT" ? { subjectId: form.subjectId } : {}),
          rules: form.rules,
        }),
      });
      if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? "Failed"); return; }
      onClose();
      await onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminModal title="New leaderboard" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <input className="input" placeholder="Name (e.g. CUET UG 2026 – Global)" value={form.name} onChange={set("name")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="input" value={form.scope} onChange={set("scope")} aria-label="Scope">
            <option value="GLOBAL">Global</option>
            <option value="EXAM">Exam</option>
            <option value="SUBJECT">Subject</option>
            <option value="TEST">Single test</option>
          </select>
          <select className="input" value={form.periodType} onChange={set("periodType")} aria-label="Period">
            <option value="ALL_TIME">All time</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
          {form.scope === "TEST" && <input className="input" placeholder="Test id" value={form.testId} onChange={set("testId")} />}
          {form.scope === "SUBJECT" && <input className="input" placeholder="Subject id" value={form.subjectId} onChange={set("subjectId")} />}
        </div>
        <input className="input font-mono text-xs" placeholder='Rules JSON: {"bestAttempt":true,"excludePractice":true,"minAttempts":1}' value={form.rules} onChange={set("rules")} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={submit} disabled={busy || !form.name}>{busy ? "Creating…" : "Create"}</Button>
        </div>
      </div>
    </AdminModal>
  );
}
