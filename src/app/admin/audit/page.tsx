"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

type Entry = {
  id: string; actorEmail: string; actorRole: string | null; action: string;
  entityType: string; entityId: string | null; reason: string | null;
  beforeData: string | null; afterData: string | null; createdAt: string;
};

export default function AuditPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: "", actor: "", entityType: "" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), perPage: "50" });
      if (filters.action) params.set("action", filters.action);
      if (filters.actor) params.set("actor", filters.actor);
      if (filters.entityType) params.set("entityType", filters.entityType);
      const res = await fetch(`/api/admin/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? p);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void (async () => {
      await load(1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pages = Math.max(Math.ceil(total / 50), 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
          <ShieldCheck className="h-6 w-6 text-primary-600" /> Audit Log
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Every privileged mutation is recorded here — who, what, before/after, and why.
        </p>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <input className="input" placeholder="Filter action (e.g. QUESTION_)" value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} />
        <input className="input" placeholder="Filter actor email" value={filters.actor} onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))} />
        <select className="input" value={filters.entityType} onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))} aria-label="Entity">
          <option value="">All entity types</option>
          {["QUESTION", "TEST", "SUBJECT", "CHAPTER", "TOPIC", "EXAM", "EXAM_YEAR", "IMPORT_JOB", "LEADERBOARD_CONFIG", "LEADERBOARD_EXCLUSION", "USER", "ATTEMPT", "SYSTEM"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="mb-4 flex gap-2">
        <Button variant="brand" size="sm" onClick={() => load(1)}>Apply filters</Button>
        <Button variant="outline" size="sm" onClick={() => { setFilters({ action: "", actor: "", entityType: "" }); setTimeout(() => load(1), 0); }}>Clear</Button>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-neutral-500">Loading audit trail…</div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardContent className="pt-4 pb-4">
                <button className="flex w-full flex-wrap items-center justify-between gap-2 text-left" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-neutral-900 dark:text-white">{e.action}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {e.entityType}{e.entityId ? ` · ${e.entityId}` : ""} · by {e.actorEmail} ({e.actorRole ?? "—"}) · {new Date(e.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-400">{expanded === e.id ? "hide" : "details"}</span>
                </button>
                {expanded === e.id && (
                  <div className="mt-3 space-y-1 text-xs">
                    {e.reason && <p><span className="font-semibold">Reason:</span> {e.reason}</p>}
                    {e.beforeData && <pre className="max-h-40 overflow-auto rounded bg-neutral-100 p-2 dark:bg-neutral-800">{e.beforeData}</pre>}
                    {e.afterData && <pre className="max-h-40 overflow-auto rounded bg-neutral-100 p-2 dark:bg-neutral-800">{e.afterData}</pre>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</Button>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">Page {page} of {pages} · {total} entries</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => load(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
