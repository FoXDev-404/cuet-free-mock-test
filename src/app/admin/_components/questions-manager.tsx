"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminModal, ResultBanner } from "./shared";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface AdminQuestion {
  id: string;
  questionNumber: number | null;
  stemEn: string;
  optionsEn: Array<{ id: string; text: string }>;
  correctAnswer: string;
  sourceAnswerLabel: string | null;
  sourceCorrectOptionOrder: number | null;
  answerReviewStatus: string;
  dataQualityNote: string | null;
  difficulty: string;
  year: number | null;
  source: string;
  marks: number;
  negativeMarks: number;
  isActive: boolean;
  explanationEn: string | null;
  passage: { passageKey: string; title: string } | null;
  subject: { id: string; name: string; code: string } | null;
  chapter: { id: string; name: string } | null;
}

interface QuestionForm {
  id?: string;
  subjectId: string;
  chapterId: string;
  stemEn: string;
  explanationEn: string;
  correctAnswer: string;
  options: string[];
  difficulty: string;
  year: string;
  marks: string;
  negativeMarks: string;
  isActive: boolean;
  answerReviewStatus: string;
  dataQualityNote: string;
  questionNumber: string;
  sourceCorrectOptionOrder: string;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function emptyForm(subjectId = ""): QuestionForm {
  return {
    subjectId,
    chapterId: "",
    stemEn: "",
    explanationEn: "",
    correctAnswer: "A",
    options: ["", "", "", ""],
    difficulty: "easy",
    year: new Date().getFullYear().toString(),
    marks: "1",
    negativeMarks: "0",
    isActive: true,
    answerReviewStatus: "source_key_recorded",
    dataQualityNote: "",
    questionNumber: "",
    sourceCorrectOptionOrder: "",
  };
}

export function QuestionsManager({ subjects }: { subjects?: Subject[] }) {
  const [rows, setRows] = useState<AdminQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ ok: boolean; message: string } | null>(null);
  const [editing, setEditing] = useState<QuestionForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadedSubjects, setLoadedSubjects] = useState<Subject[]>([]);

  // Standalone usage (e.g. /admin/question-bank) loads its own subject list.
  useEffect(() => {
    if (subjects?.length) return;
    (async () => {
      const res = await fetch("/api/admin/subjects");
      if (res.ok) {
        const data = await res.json();
        setLoadedSubjects(Array.isArray(data) ? data : []);
      }
    })();
  }, [subjects?.length]);
  const subjectList = subjects?.length ? subjects : loadedSubjects;

  // List is fetched from the effect; mutations bump `reloadKey` to refetch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), perPage: "20" });
        if (subjectFilter) params.set("subjectId", subjectFilter);
        if (reviewFilter) params.set("reviewStatus", reviewFilter);
        if (search) params.set("search", search);
        const res = await fetch(`/api/admin/questions?${params.toString()}`);
        const out = (await res.json()) as {
          total?: number;
          page?: number;
          pages?: number;
          questions?: AdminQuestion[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) throw new Error(out.error ?? "Failed to fetch questions");
        setRows(out.questions ?? []);
        setTotal(out.total ?? 0);
        setPages(out.pages ?? 1);
      } catch (e) {
        if (!cancelled) {
          setBanner({
            ok: false,
            message: e instanceof Error ? e.message : "Failed to fetch questions",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, subjectFilter, reviewFilter, search, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const openCreate = () => setEditing(emptyForm(subjectFilter));

  const openEdit = (q: AdminQuestion) => {
    setEditing({
      id: q.id,
      subjectId: q.subject?.id ?? "",
      chapterId: q.chapter?.id ?? "",
      stemEn: q.stemEn,
      explanationEn: q.explanationEn ?? "",
      correctAnswer: q.correctAnswer,
      options: LETTERS.map(() => "").map((_, i) => {
        const opt = q.optionsEn.find((o) => o.id.endsWith(`-${i + 1}`));
        return opt?.text ?? "";
      }),
      difficulty: q.difficulty,
      year: q.year?.toString() ?? "",
      marks: String(q.marks),
      negativeMarks: String(q.negativeMarks),
      isActive: q.isActive,
      answerReviewStatus: q.answerReviewStatus,
      dataQualityNote: q.dataQualityNote ?? "",
      questionNumber: q.questionNumber?.toString() ?? "",
      sourceCorrectOptionOrder: q.sourceCorrectOptionOrder?.toString() ?? "",
    });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setBanner(null);
    try {
      const payload: Record<string, unknown> = {
        subjectId: editing.subjectId,
        stemEn: editing.stemEn,
        type: "MCQ",
        correctAnswer: editing.correctAnswer,
        difficulty: editing.difficulty,
        isActive: editing.isActive,
        marks: parseInt(editing.marks, 10) || 1,
        negativeMarks: parseInt(editing.negativeMarks, 10) || 0,
        answerReviewStatus: editing.answerReviewStatus,
        explanationEn: editing.explanationEn || null,
        chapterId: editing.chapterId || null,
        dataQualityNote: editing.dataQualityNote || null,
        year: editing.year ? parseInt(editing.year, 10) : null,
        questionNumber: editing.questionNumber ? parseInt(editing.questionNumber, 10) : null,
        sourceCorrectOptionOrder: editing.sourceCorrectOptionOrder
          ? parseInt(editing.sourceCorrectOptionOrder, 10)
          : null,
      };

      // options: rebuild ids as opt-<questionId-or-new>-<order>
      const idBase = editing.id ?? "new";
      payload.optionsEn = editing.options
        .map((text, i) => ({ text: text.trim(), order: i + 1 }))
        .filter((o) => o.text)
        .map((o) => ({ id: `opt-${idBase}-${o.order}`, text: o.text }));

      if (editing.id) {
        const res = await fetch(`/api/admin/questions/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Update failed");
        setBanner({ ok: true, message: "Question updated." });
      } else {
        const res = await fetch("/api/admin/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Create failed");
        setBanner({ ok: true, message: "Question created." });
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

  const remove = async (id: string) => {
    if (!confirm("Delete this question permanently? This also clears attempts referencing it.")) return;
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      setBanner({ ok: true, message: "Question deleted." });
      refresh();
    } catch (e) {
      setBanner({
        ok: false,
        message: e instanceof Error ? e.message : "Delete failed",
      });
    }
  };

  return (
    <div className="card" data-testid="questions-manager">
      <div className="flex flex-wrap items-end gap-3 p-5 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex-1 min-w-[220px]">
          <Input
            label="Search stem"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search question text…"
          />
        </div>
        <div className="w-44">
          <label className="label">Subject</label>
          <select
            className="input"
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All subjects</option>
            {subjectList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
        <div className="w-56">
          <label className="label">Review status</label>
          <select
            className="input"
            value={reviewFilter}
            onChange={(e) => {
              setReviewFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Any</option>
            <option value="source_key_recorded">Key recorded</option>
            <option value="needs_manual_review">Needs manual review</option>
          </select>
        </div>
        <Button onClick={openCreate} size="md">
          <Plus className="h-4 w-4" /> Add question
        </Button>
      </div>

      <div className="p-5 space-y-4">
        <ResultBanner ok={banner?.ok ?? null} message={banner?.message ?? ""} />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {loading ? "Loading…" : `${total} question${total === 1 ? "" : "s"} · page ${page} of ${pages}`}
        </p>

        <div className="overflow-x-auto" data-testid="questions-table">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
                <th className="py-2 pr-3 font-medium">Q#</th>
                <th className="py-2 pr-3 font-medium">Stem</th>
                <th className="py-2 pr-3 font-medium">Subject</th>
                <th className="py-2 pr-3 font-medium">Key</th>
                <th className="py-2 pr-3 font-medium">Flags</th>
                <th className="py-2 pr-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id} className="border-b border-neutral-100 dark:border-neutral-800/60">
                  <td className="py-3 pr-3 text-neutral-500 dark:text-neutral-400 align-top">
                    {q.questionNumber ?? "—"}
                  </td>
                  <td className="py-3 pr-3 max-w-md align-top">
                    <p className="line-clamp-2 text-neutral-900 dark:text-neutral-100">{q.stemEn}</p>
                    <p className="mt-1 text-xs text-neutral-400 flex items-center gap-2">
                      <span>ans: {q.correctAnswer}</span>
                      <span>·</span>
                      <span>{q.marks}/{q.negativeMarks} marks</span>
                      {!q.isActive && <span>· inactive</span>}
                    </p>
                  </td>
                  <td className="py-3 pr-3 align-top text-neutral-600 dark:text-neutral-300">
                    {q.subject?.code ?? "—"}
                  </td>
                  <td className="py-3 pr-3 align-top text-neutral-600 dark:text-neutral-300">
                    {q.answerReviewStatus === "needs_manual_review" ? (
                      <Badge variant="warning">Manually review</Badge>
                    ) : (
                      <Badge variant="success">Recorded</Badge>
                    )}
                  </td>
                  <td className="py-3 pr-3 align-top">
                    {q.difficulty}
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(q)} aria-label={`Edit question ${q.questionNumber ?? ""}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(q.id)} aria-label={`Delete question ${q.questionNumber ?? ""}`}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-400">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    No questions match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-xs text-neutral-500">
            Page {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      {editing && (
        <AdminModal
          title={editing.id ? "Edit question" : "Add question"}
          onClose={() => setEditing(null)}
          wide
        >
          <QuestionFormModal
            editing={editing}
            setEditing={setEditing}
            subjects={subjectList}
            saving={saving}
            onSave={save}
          />
        </AdminModal>
      )}
    </div>
  );
}

function QuestionFormModal({
  editing,
  setEditing,
  subjects,
  saving,
  onSave,
}: {
  editing: QuestionForm;
  setEditing: React.Dispatch<React.SetStateAction<QuestionForm | null>>;
  subjects: Subject[];
  saving: boolean;
  onSave: () => void;
}) {
  const set = <K extends keyof QuestionForm>(key: K, value: QuestionForm[K]) =>
    setEditing({ ...editing, [key]: value });

  // Selecting a correct letter keeps the English-source fields in sync, since
  // verified scoring reads sourceCorrectOptionOrder.
  const setCorrect = (letter: string) => {
    const order = LETTERS.indexOf(letter) + 1;
    set("correctAnswer", letter);
    if (order >= 1) set("sourceCorrectOptionOrder", String(order));
  };

  useEffect(() => {
    // Default the source order to the current correct answer for new questions.
    if (!editing.id && !editing.sourceCorrectOptionOrder) {
      const order = LETTERS.indexOf(editing.correctAnswer) + 1;
      set("sourceCorrectOptionOrder", String(order));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSave = editing.subjectId && editing.stemEn.trim() && editing.options.some((o) => o.trim());

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
          <label className="label">Subject</label>
          <select className="input" value={editing.subjectId} onChange={(e) => set("subjectId", e.target.value)} required>
            <option value="">Select subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Question number (optional)</label>
          <Input type="number" min={1} value={editing.questionNumber} onChange={(e) => set("questionNumber", e.target.value)} placeholder="e.g. 5" />
        </div>
      </div>

      <div>
        <label className="label">Question text (English)</label>
        <Textarea value={editing.stemEn} onChange={(e) => set("stemEn", e.target.value)} required className="min-h-[80px]" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Options</p>
        {editing.options.map((text, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 font-semibold text-neutral-500">{LETTERS[i]}</span>
            <input
              className="input"
              value={text}
              placeholder={`Option ${LETTERS[i]}`}
              onChange={(e) => {
                const next = [...editing.options];
                next[i] = e.target.value;
                set("options", next);
              }}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Correct answer</label>
          <select className="input" value={editing.correctAnswer} onChange={(e) => setCorrect(e.target.value)}>
            {LETTERS.slice(0, editing.options.filter((o) => o.trim()).length || 4).map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Source option order</label>
          <Input type="number" min={1} max={6} value={editing.sourceCorrectOptionOrder} onChange={(e) => set("sourceCorrectOptionOrder", e.target.value)} />
        </div>
        <div>
          <label className="label">Review status</label>
          <select className="input" value={editing.answerReviewStatus} onChange={(e) => set("answerReviewStatus", e.target.value)}>
            <option value="source_key_recorded">Key recorded</option>
            <option value="needs_manual_review">Needs manual review</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Explanation (shown after submit)</label>
        <Textarea value={editing.explanationEn} onChange={(e) => set("explanationEn", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="label">Difficulty</label>
          <select className="input" value={editing.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <Input type="number" value={editing.year} onChange={(e) => set("year", e.target.value)} />
        </div>
        <div>
          <label className="label">Marks (correct)</label>
          <Input type="number" value={editing.marks} onChange={(e) => set("marks", e.target.value)} />
        </div>
        <div>
          <label className="label">Negative marks</label>
          <Input type="number" value={editing.negativeMarks} onChange={(e) => set("negativeMarks", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Data quality note (flagged questions)</label>
        <Textarea value={editing.dataQualityNote} onChange={(e) => set("dataQualityNote", e.target.value)} placeholder="Why should the answer key be re-checked?" />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
        <input type="checkbox" checked={editing.isActive} onChange={(e) => set("isActive", e.target.checked)} className="rounded" />
        Active (visible to students)
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" type="button" onClick={() => setEditing(null)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSave || saving} isLoading={saving}>
          {editing.id ? "Save changes" : "Create question"}
        </Button>
      </div>
    </form>
  );
}
