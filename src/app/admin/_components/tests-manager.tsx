"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminModal, ResultBanner } from "./shared";
import { BarChart3, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface TestRow {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  year: number | null;
  totalQuestions: number;
  durationMinutes: number;
  isPublic: boolean;
  subject: { id: string; name: string; code: string } | null;
  _count: { questions: number };
}

const TYPE_LABELS: Record<string, string> = {
  FULL_LENGTH: "Full Length",
  SUBJECT_WISE: "Subject Wise",
  CHAPTER_WISE: "Chapter Wise",
  PYQ_YEAR_WISE: "PYQ Year Wise",
  GENERAL_TEST: "General Test",
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

interface TestForm {
  id?: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  subjectId: string;
  year: string;
  durationMinutes: string;
  totalQuestions: string;
  isPublic: boolean;
  questionIds: string[];
}

function emptyTestForm(): TestForm {
  return {
    title: "",
    slug: "",
    type: "SUBJECT_WISE",
    status: "DRAFT",
    subjectId: "",
    year: new Date().getFullYear().toString(),
    durationMinutes: "60",
    totalQuestions: "25",
    isPublic: true,
    questionIds: [],
  };
}

export function TestsManager({ subjects }: { subjects: Subject[] }) {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [banner, setBanner] = useState<{ ok: boolean; message: string } | null>(null);
  const [editing, setEditing] = useState<TestForm | null>(null);
  const [saving, setSaving] = useState(false);

  // Tests are fetched from the effect; mutations bump `reloadKey` to refetch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/tests");
        const out = (await res.json()) as { tests?: TestRow[]; error?: string };
        if (cancelled) return;
        if (!res.ok) throw new Error(out.error ?? "Failed to fetch tests");
        setTests(out.tests ?? []);
      } catch (e) {
        if (!cancelled) {
          setBanner({
            ok: false,
            message: e instanceof Error ? e.message : "Failed to fetch tests",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const publishToggle = async (t: TestRow) => {
    const next = t.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/admin/tests/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Update failed");
      setBanner({ ok: true, message: `${t.title} is now ${next.toLowerCase()}.` });
      refresh();
    } catch (e) {
      setBanner({
        ok: false,
        message: e instanceof Error ? e.message : "Update failed",
      });
    }
  };

  const remove = async (t: TestRow) => {
    if (!confirm(`Delete test "${t.title}"? Attempts for it are removed too.`)) return;
    try {
      const res = await fetch(`/api/admin/tests/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      setBanner({ ok: true, message: "Test deleted." });
      refresh();
    } catch (e) {
      setBanner({
        ok: false,
        message: e instanceof Error ? e.message : "Delete failed",
      });
    }
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setBanner(null);
    try {
      const payload: Record<string, unknown> = {
        title: editing.title,
        slug: editing.slug || slugify(editing.title),
        type: editing.type,
        status: editing.status,
        subjectId: editing.subjectId || null,
        durationMinutes: parseInt(editing.durationMinutes, 10) || 60,
        totalQuestions: parseInt(editing.totalQuestions, 10) || 0,
        isPublic: editing.isPublic,
        year: editing.year ? parseInt(editing.year, 10) : null,
        questionIds: editing.questionIds,
      };
      if (editing.questionIds.length > 0) {
        payload.config = JSON.stringify({
          totalQuestions: payload.totalQuestions,
          durationMinutes: payload.durationMinutes,
        });
      }
      if (editing.id) {
        const res = await fetch(`/api/admin/tests/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Update failed");
        setBanner({ ok: true, message: "Test updated." });
      } else {
        const res = await fetch("/api/admin/tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Create failed");
        setBanner({ ok: true, message: "Test created." });
      }
      setEditing(null);
      refresh();
    } catch (e) {
      setBanner({
        ok: false,
        message: e instanceof Error ? e.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" data-testid="tests-manager">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="font-semibold text-neutral-900 dark:text-white">Mock test cards</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Standard tests shown on the Mock Tests page. The English PYQ paper card is managed on its own tab.
          </p>
        </div>
        <Button onClick={() => setEditing(emptyTestForm())}>
          <Plus className="h-4 w-4" /> New test
        </Button>
      </div>

      <div className="p-5 space-y-4">
        <ResultBanner ok={banner?.ok ?? null} message={banner?.message ?? ""} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map((t) => (
            <div key={t.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800" data-testid={`test-card-${t.slug}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={t.status === "PUBLISHED" ? "success" : t.status === "DRAFT" ? "warning" : "neutral"}>
                      {t.status}
                    </Badge>
                    <span className="text-xs text-neutral-400">{TYPE_LABELS[t.type] ?? t.type}</span>
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white truncate">{t.title}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    /mock-tests/{t.slug} · {t._count.questions} linked question(s) · {t.durationMinutes}m
                    {t.subject ? ` · ${t.subject.code}` : ""}
                  </p>
                </div>
                <BarChart3 className="h-5 w-5 text-neutral-300 dark:text-neutral-600 shrink-0" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => publishToggle(t)}>
                  {t.status === "PUBLISHED" ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" /> Publish
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      id: t.id,
                      title: t.title,
                      slug: t.slug,
                      type: t.type,
                      status: t.status,
                      subjectId: t.subject?.id ?? "",
                      year: t.year?.toString() ?? "",
                      durationMinutes: String(t.durationMinutes),
                      totalQuestions: String(t.totalQuestions),
                      isPublic: t.isPublic,
                      questionIds: [],
                    })
                  }
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(t)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-500" /> Delete
                </Button>
              </div>
            </div>
          ))}
          {!loading && tests.length === 0 && (
            <div className="col-span-full py-10 text-center text-neutral-400">
              <BarChart3 className="mx-auto h-8 w-8 mb-2 opacity-50" />
              No standard tests yet. The English PYQ paper card is configured on its own tab.
            </div>
          )}
        </div>
      </div>

      {editing && (
        <AdminModal title={editing.id ? "Edit test" : "New test"} onClose={() => setEditing(null)} wide>
          <TestFormModal editing={editing} setEditing={setEditing} subjects={subjects} saving={saving} onSave={save} />
        </AdminModal>
      )}
    </div>
  );
}

function TestFormModal({
  editing,
  setEditing,
  subjects,
  saving,
  onSave,
}: {
  editing: TestForm;
  setEditing: React.Dispatch<React.SetStateAction<TestForm | null>>;
  subjects: Subject[];
  saving: boolean;
  onSave: () => void;
}) {
  const set = <K extends keyof TestForm>(key: K, value: TestForm[K]) =>
    setEditing({ ...editing, [key]: value });

  // Question picker state
  const [pool, setPool] = useState<PoolQuestion[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolSubject, setPoolSubject] = useState(editing.subjectId || subjects[0]?.id || "");

  interface PoolQuestion {
    id: string;
    questionNumber: number | null;
    stemEn: string;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPoolLoading(true);
      try {
        const res = await fetch(`/api/admin/questions?subjectId=${poolSubject}&perPage=100&isActive=true`);
        const out = (await res.json()) as { questions?: PoolQuestion[]; error?: string };
        if (cancelled) return;
        setPool(res.ok ? out.questions ?? [] : []);
      } catch {
        if (!cancelled) setPool([]);
      } finally {
        if (!cancelled) setPoolLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [poolSubject]);

  const toggle = (id: string) => {
    const has = editing.questionIds.includes(id);
    set(
      "questionIds",
      has ? editing.questionIds.filter((x) => x !== id) : [...editing.questionIds, id]
    );
  };

  const canSave = editing.title.trim() && editing.subjectId;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Title</label>
          <Input
            value={editing.title}
            onChange={(e) => {
              set("title", e.target.value);
              if (!editing.id) set("slug", slugify(e.target.value));
            }}
            required
          />
        </div>
        <div>
          <label className="label">Slug (URL)</label>
          <Input value={editing.slug} onChange={(e) => set("slug", e.target.value)} placeholder="english-practice-set-01" required />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="label">Type</label>
          <select className="input" value={editing.type} onChange={(e) => set("type", e.target.value)}>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={editing.status} onChange={(e) => set("status", e.target.value)}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div>
          <label className="label">Duration (min)</label>
          <Input type="number" min={1} value={editing.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} />
        </div>
        <div>
          <label className="label">Year</label>
          <Input type="number" value={editing.year} onChange={(e) => set("year", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Subject</label>
        <select
          className="input"
          value={editing.subjectId}
          onChange={(e) => {
            set("subjectId", e.target.value);
            setPoolSubject(e.target.value);
          }}
          required
        >
          <option value="">Select subject…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Questions ({editing.questionIds.length} selected)</label>
          <select
            className="input w-auto text-xs py-1"
            value={poolSubject}
            onChange={(e) => setPoolSubject(e.target.value)}
            aria-label="Pick questions from subject"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                from {s.code}
              </option>
            ))}
          </select>
        </div>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
          {poolLoading && <p className="p-4 text-sm text-neutral-400">Loading questions…</p>}
          {!poolLoading &&
            pool.map((q) => (
              <label
                key={q.id}
                className="flex items-start gap-2 p-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="mt-1 rounded"
                  checked={editing.questionIds.includes(q.id)}
                  onChange={() => toggle(q.id)}
                />
                <span className="min-w-0">
                  <span className="text-neutral-400 mr-2">{q.questionNumber ?? "—"}</span>
                  <span className="line-clamp-2 text-neutral-700 dark:text-neutral-300">{q.stemEn}</span>
                </span>
              </label>
            ))}
          {!poolLoading && pool.length === 0 && (
            <p className="p-4 text-sm text-neutral-400">
              No active questions for this subject. Add some in the Questions tab first.
            </p>
          )}
        </div>
        {editing.questionIds.length > 0 && (
          <Button variant="ghost" size="sm" type="button" onClick={() => set("questionIds", [])} className="mt-2">
            Clear selection
          </Button>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
        <input type="checkbox" checked={editing.isPublic} onChange={(e) => set("isPublic", e.target.checked)} className="rounded" />
        Public (visible on site)
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" type="button" onClick={() => setEditing(null)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSave || saving} isLoading={saving}>
          {editing.id ? "Save changes" : "Create test"}
        </Button>
      </div>
    </form>
  );
}
