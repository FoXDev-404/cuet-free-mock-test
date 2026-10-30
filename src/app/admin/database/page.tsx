"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, HardDriveDownload } from "lucide-react";

type Counts = Record<string, number>;

export default function DatabaseToolsPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/database?resource=counts");
      if (res.ok) setCounts((await res.json()) as Counts);
    } catch {
      setCounts(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadCounts();
    })();
  }, [loadCounts]);

  const exportJson = async (resource: string) => {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/admin/database?resource=${resource}`);
      if (!res.ok) { setNote(`Export failed for ${resource}`); return; }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resource}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNote(`Exported ${Array.isArray(data) ? data.length : "counts"} row(s) of ${resource}.`);
    } finally {
      setBusy(false);
    }
  };

  const backfillHashes = async () => {
    if (!confirm("Recompute content fingerprints for questions created before hashing existed?")) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backfill-stem-hash" }),
      });
      const data = await res.json().catch(() => ({}));
      setNote(res.ok ? `Backfilled stem hashes for ${data.processed || 0} question(s).` : data.error ?? "Backfill failed");
      await loadCounts();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
          <Database className="h-6 w-6 text-primary-600" /> Database Tools
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Read-only exports (never exposes credentials or session data) and maintenance actions. SUPER_ADMIN only.
        </p>
      </div>

      {counts && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Row counts</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Object.entries(counts).map(([label, value]) => (
                <div key={label} className="rounded-lg bg-neutral-50 p-3 text-center dark:bg-neutral-800/50">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
                  <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {["questions", "tests", "imports"].map((r) => (
          <Button key={r} variant="outline" onClick={() => exportJson(r)} disabled={busy}>
            <Download className="h-4 w-4" /> Export {r}
          </Button>
        ))}
        <Button variant="brand" onClick={backfillHashes} disabled={busy}>
          <HardDriveDownload className="h-4 w-4" /> Backfill stem hashes
        </Button>
      </div>

      {note && <p className="rounded-lg bg-secondary-50 p-3 text-sm text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300">{note}</p>}
    </div>
  );
}
