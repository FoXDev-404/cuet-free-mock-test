"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminModal } from "@/app/admin/_components/shared";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

type Subject = {
  id: string; name: string; code: string; sectionType: string; examId?: string | null; isActive?: boolean;
  chapters: Chapter[]; _count?: { questions: number };
};
type Chapter = { id: string; name: string; order?: number; topics: Topic[]; _count?: { questions: number } };
type Topic = { id: string; name: string; _count?: { questions: number } };

export default function AcademicPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<null | "subject" | "chapter" | "topic">(null);
  const [target, setTarget] = useState<{ subjectId?: string; chapterId?: string }>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Reuse the admin subjects API; chapter/topic details arrive embedded.
      const res = await fetch("/api/admin/subjects");
      const data = await res.json();
      const rows: Subject[] = Array.isArray(data) ? data : [];
      // Chapters load lazily per subject (kept compact for the free plan).
      const detailed = await Promise.all(
        rows.map(async (s) => {
          const chapterRes = await fetch(`/api/admin/chapters?subjectId=${s.id}`);
          if (!chapterRes.ok) return { ...s, chapters: [] as Chapter[] };
          const chapters: Chapter[] = (await chapterRes.json()) as Chapter[];
          const withTopics = await Promise.all(
            chapters.map(async (c) => {
              const topicRes = await fetch(`/api/admin/topics?chapterId=${c.id}`);
              const topics: Topic[] = topicRes.ok ? ((await topicRes.json()) as Topic[]) : [];
              return { ...c, topics };
            }),
          );
          return { ...s, chapters: withTopics };
        }),
      );
      setSubjects(detailed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const remove = async (kind: "subject" | "chapter" | "topic", id: string) => {
    if (!confirm(`Delete ${kind}? Dependent questions block deletion.`)) return;
    const res = await fetch(`/api/admin/${kind}s/${id}?confirm=yes`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Delete failed (dependent rows?)");
      return;
    }
    await load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Academic Tree</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Exam → subjects → chapters → topics. Questions attach at any level; deletes are guarded.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setTarget({}); setModal("chapter"); }}>
            <Plus className="h-4 w-4" /> Add chapter
          </Button>
          <Button variant="brand" size="sm" onClick={() => { setTarget({}); setModal("subject"); }}>
            <Plus className="h-4 w-4" /> Add subject
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-neutral-500">Loading tree…</div>
      ) : (
        <div className="space-y-4">
          {subjects.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button className="flex items-center gap-2" onClick={() => toggle(s.id)}>
                    {expanded.has(s.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <CardTitle className="text-lg">{s.code} · {s.name}</CardTitle>
                    <span className="badge badge-neutral">{s.sectionType}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setTarget({ subjectId: s.id }); setModal("chapter"); }}>
                      <Plus className="h-4 w-4" /> Chapter
                    </Button>
                    <Button variant="outline" size="sm" aria-label={`Delete ${s.name}`} onClick={() => remove("subject", s.id)}>
                      <Trash2 className="h-4 w-4 text-danger-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {expanded.has(s.id) && (
                <CardContent>
                  <div className="space-y-3">
                    {s.chapters.length === 0 && <p className="text-sm text-neutral-500">No chapters yet.</p>}
                    {s.chapters.map((c) => (
                      <div key={c.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-neutral-800 dark:text-neutral-200">{c.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="badge badge-neutral">{c._count?.questions ?? 0} questions</span>
                            <Button variant="outline" size="sm" onClick={() => { setTarget({ subjectId: s.id, chapterId: c.id }); setModal("topic"); }}>
                              <Plus className="h-4 w-4" /> Topic
                            </Button>
                            <Button variant="outline" size="sm" aria-label={`Delete ${c.name}`} onClick={() => remove("chapter", c.id)}>
                              <Trash2 className="h-4 w-4 text-danger-600" />
                            </Button>
                          </div>
                        </div>
                        {c.topics.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {c.topics.map((t) => (
                              <span key={t.id} className="group inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                                {t.name}
                                <button aria-label={`Delete ${t.name}`} onClick={() => remove("topic", t.id)}>
                                  <Trash2 className="h-3 w-3 text-neutral-400 hover:text-danger-600" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {modal === "subject" && (
        <CreateSubjectModal onClose={() => setModal(null)} onDone={load} />
      )}
      {modal === "chapter" && (
        <CreateChapterModal subjectId={target.subjectId} onClose={() => setModal(null)} onDone={load} />
      )}
      {modal === "topic" && target.chapterId && (
        <CreateTopicModal chapterId={target.chapterId} onClose={() => setModal(null)} onDone={load} />
      )}
    </div>
  );
}

function CreateSubjectModal({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sectionType, setSectionType] = useState("DOMAIN");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const res = await fetch("/api/admin/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code, sectionType }),
    });
    setBusy(false);
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? "Failed"); return; }
    onClose();
    await onDone();
  };
  return (
    <AdminModal title="Add subject" onClose={onClose}>
      <div className="space-y-3">
        <input className="input" placeholder="Name (e.g. Chemistry)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Code (e.g. CHEM)" value={code} onChange={(e) => setCode(e.target.value)} />
        <select className="input" value={sectionType} onChange={(e) => setSectionType(e.target.value)} aria-label="Section">
          <option value="DOMAIN">Domain</option>
          <option value="LANGUAGE">Language</option>
          <option value="GENERAL_TEST">General Test</option>
        </select>
        <Button variant="brand" onClick={submit} disabled={busy || !name || !code} className="w-full">
          {busy ? "Creating…" : "Create subject"}
        </Button>
      </div>
    </AdminModal>
  );
}

function CreateChapterModal({ subjectId, onClose, onDone }: { subjectId?: string; onClose: () => void; onDone: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [sid, setSid] = useState(subjectId ?? "");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const res = await fetch("/api/admin/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: sid, name }),
    });
    setBusy(false);
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? "Failed"); return; }
    onClose();
    await onDone();
  };
  return (
    <AdminModal title="Add chapter" onClose={onClose}>
      <div className="space-y-3">
        <SubjectSelect value={sid} onChange={setSid} />
        <input className="input" placeholder="Chapter name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="brand" onClick={submit} disabled={busy || !name || !sid} className="w-full">
          {busy ? "Creating…" : "Create chapter"}
        </Button>
      </div>
    </AdminModal>
  );
}

function CreateTopicModal({ chapterId, onClose, onDone }: { chapterId: string; onClose: () => void; onDone: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const res = await fetch("/api/admin/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId, name }),
    });
    setBusy(false);
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? "Failed"); return; }
    onClose();
    await onDone();
  };
  return (
    <AdminModal title="Add topic" onClose={onClose}>
      <div className="space-y-3">
        <input className="input" placeholder="Topic name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="brand" onClick={submit} disabled={busy || !name} className="w-full">
          {busy ? "Creating…" : "Create topic"}
        </Button>
      </div>
    </AdminModal>
  );
}

function SubjectSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [subjects, setSubjects] = useState<{ id: string; name: string; code: string }[]>([]);
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/subjects");
      if (res.ok) {
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : []);
      }
    })();
  }, []);
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Subject">
      <option value="">Select subject…</option>
      {subjects.map((s) => (
        <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
      ))}
    </select>
  );
}
