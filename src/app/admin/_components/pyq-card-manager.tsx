"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResultBanner } from "./shared";
import { BookOpen } from "lucide-react";

interface Config {
  durationMinutes: number;
  marksCorrect: number;
  marksIncorrect: number;
  totalQuestions: number;
  isActive: boolean;
}

export function PyqCardManager({ totalQuestions }: { totalQuestions: number | null }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; message: string } | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/english-mock-config");
        const out = (await res.json()) as {
          config?: Config | null;
          questionCount?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) throw new Error(out.error ?? "Failed to load PYQ config");
        setConfig(out.config ? { ...out.config } : null);
        setQuestionCount(out.questionCount ?? 0);
      } catch (e) {
        if (!cancelled) {
          setBanner({
            ok: false,
            message: e instanceof Error ? e.message : "Failed to load PYQ config",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/english-mock-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes: config.durationMinutes,
          marksCorrect: config.marksCorrect,
          marksIncorrect: config.marksIncorrect,
          totalQuestions: config.totalQuestions,
          isActive: config.isActive,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setBanner({ ok: true, message: "PYQ paper card updated." });
    } catch (e) {
      setBanner({
        ok: false,
        message: e instanceof Error ? e.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-8 text-sm text-neutral-400" data-testid="pyq-config-manager">
        Loading PYQ paper configuration…
      </div>
    );
  }

  return (
    <div className="card" data-testid="pyq-config-manager">
      <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="font-semibold text-neutral-900 dark:text-white">English PYQ paper card</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          The “Previous Year Papers” card on the Mock Tests page. It runs through the dedicated
          English mock flow — not through standard tests.
        </p>
      </div>

      <div className="p-5 space-y-5">
        <ResultBanner ok={banner?.ok ?? null} message={banner?.message ?? ""} />

        {!config ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No active English mock config found. Re-run the seed
            (<code className="font-mono text-xs">npx tsx prisma/seed.ts</code>) to restore it.
          </p>
        ) : (
          <>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex items-start gap-4">
              <BookOpen className="h-8 w-8 text-primary-500 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="primary">PYQ · Real Exam Paper</Badge>
                  <Badge variant={config.isActive ? "success" : "neutral"}>
                    {config.isActive ? "Visible on Mock Tests page" : "Hidden"}
                  </Badge>
                </div>
                <h3 className="mt-2 font-semibold text-neutral-900 dark:text-white">
                  CUET UG English — 20 May 2025 Shift 1
                </h3>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {questionCount} question{questionCount === 1 ? "" : "s"} available in the bank
                  {totalQuestions !== null && ` · papers expect ${totalQuestions}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="label">Duration (min)</label>
                <Input
                  type="number"
                  min={1}
                  value={config.durationMinutes}
                  onChange={(e) => setConfig({ ...config, durationMinutes: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
              <div>
                <label className="label">Marks (correct)</label>
                <Input
                  type="number"
                  min={0}
                  value={config.marksCorrect}
                  onChange={(e) => setConfig({ ...config, marksCorrect: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div>
                <label className="label">Negative marks</label>
                <Input
                  type="number"
                  min={0}
                  value={config.marksIncorrect}
                  onChange={(e) => setConfig({ ...config, marksIncorrect: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div>
                <label className="label">Total questions</label>
                <Input
                  type="number"
                  min={1}
                  value={config.totalQuestions}
                  onChange={(e) => setConfig({ ...config, totalQuestions: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                className="rounded"
                checked={config.isActive}
                onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
              />
              Show this paper card on the Mock Tests page
            </label>

            <div className="flex justify-end">
              <Button onClick={save} isLoading={saving}>
                Save changes
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
