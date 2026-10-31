"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Database, HardDrive, Loader2, Save, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Settings = Record<string, string>;

type Runtime = {
  runtime: string;
  hasD1: boolean;
  hasR2: boolean;
  hasKv: boolean;
  hasAuthSecret: boolean;
};

const KEYS = {
  registration: "registration.enabled",
  discussions: "community.discussions",
  reports: "community.reports",
  examDate: "exam.date",
  maintenance: "maintenance.message",
} as const;

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary-600" : "bg-neutral-300 dark:bg-neutral-600",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
        )}
        aria-hidden="true"
      />
    </button>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
      <span className="text-neutral-700 dark:text-neutral-300">{label}</span>
      <span className={cn("font-semibold", ok ? "text-secondary-700 dark:text-secondary-300" : "text-amber-700 dark:text-amber-300")}>
        {ok ? "Configured" : "Not configured"}
      </span>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings ?? {});
        setRuntime(data.runtime ?? null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === "string" ? data.error : "Could not load settings.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const set = (key: string, value: string) => {
    setSettings((current) => ({ ...(current ?? {}), [key]: value }));
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: {
            [KEYS.registration]: settings[KEYS.registration] ?? "true",
            [KEYS.discussions]: settings[KEYS.discussions] ?? "true",
            [KEYS.reports]: settings[KEYS.reports] ?? "true",
            [KEYS.examDate]: settings[KEYS.examDate] ?? "",
            [KEYS.maintenance]: settings[KEYS.maintenance] ?? "",
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Could not save settings.");
      }
      setSettings(data.settings ?? settings);
      setRuntime(data.runtime ?? runtime);
      setMessage("Settings saved and audited.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
          <Settings className="h-6 w-6 text-primary-600" /> Platform settings
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Feature switches and editorial configuration. Every change is written to the audit log.
        </p>
      </div>

      {message ? (
        <p className="mb-3 rounded-lg bg-secondary-50 p-2.5 text-sm text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-200" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 p-2.5 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {loading || !settings ? (
        <div className="card p-10 text-center text-neutral-500">Loading settings…</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feature switches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    key: KEYS.registration,
                    label: "New registrations",
                    description: "Allow learners to create accounts. Existing users can still sign in.",
                  },
                  {
                    key: KEYS.discussions,
                    label: "Community discussions",
                    description: "Allow signed-in learners to post and vote. Existing posts remain readable.",
                  },
                  {
                    key: KEYS.reports,
                    label: "Question and post reports",
                    description: "Allow learners to flag wrong questions or abusive posts.",
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">{item.label}</p>
                      <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{item.description}</p>
                    </div>
                    <Toggle
                      checked={settings[item.key] !== "false"}
                      onChange={() =>
                        set(item.key, settings[item.key] === "false" ? "true" : "false")
                      }
                      label={item.label}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4 text-primary-600" /> Exam countdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Target CUET date (optional)
                  <input
                    type="date"
                    value={settings[KEYS.examDate] ?? ""}
                    onChange={(event) => set(KEYS.examDate, event.target.value)}
                    className="input mt-1 max-w-xs"
                  />
                </label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Leave blank to hide the countdown. Only set this from an official notification; the dashboard labels
                  it as a target date, not a confirmed NTA schedule.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Maintenance message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  value={settings[KEYS.maintenance] ?? ""}
                  onChange={(event) => set(KEYS.maintenance, event.target.value)}
                  rows={3}
                  maxLength={500}
                  className="input"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Shown on the <code>/maintenance</code> page when you route traffic there during a deploy or
                  incident.
                </p>
              </CardContent>
            </Card>

            <Button variant="brand" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save all changes
            </Button>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary-600" /> Runtime health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Status ok={Boolean(runtime?.hasD1)} label="D1 database binding" />
                <Status ok={Boolean(runtime?.hasR2 || runtime?.hasKv)} label="Media storage binding" />
                <Status ok={Boolean(runtime?.hasAuthSecret)} label="Auth secret" />
                <p className="pt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Runtime: {runtime?.runtime ?? "unknown"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HardDrive className="h-4 w-4 text-primary-600" /> Storage rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
                <p>· Images: PNG, JPEG or WebP, ≤ 500 KB, mandatory alt text.</p>
                <p>· Production keeps bytes in Workers KV and metadata in D1.</p>
                <p>· Local development uses a small inline fallback so uploads remain testable.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4 text-primary-600" /> Reminder
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-neutral-600 dark:text-neutral-300">
                Feature switches are operational, not destructive. Use the audit log to review who changed what and
                when.
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
