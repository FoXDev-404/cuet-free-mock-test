"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ResultBanner } from "./shared";
import { Download } from "lucide-react";

const TEMPLATE = [
  {
    subjectId: "REPLACE-WITH-SUBJECT-ID",
    type: "MCQ",
    stemEn: "Question text",
    optionsEn: [{ id: "opt-1", text: "Option A" }],
    correctAnswer: "A",
    explanationEn: "Why A",
    year: 2025,
    source: "CUET UG sample",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0,
  },
];

export function ImportManager() {
  const [json, setJson] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const data = JSON.parse(json);
      const res = await fetch("/api/admin/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const out = await res.json();
      setResult({ ok: res.ok, message: out.message || out.error || "Done" });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Invalid JSON",
      });
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(TEMPLATE, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cuet-questions-import-template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="font-semibold text-neutral-900 dark:text-white">Bulk import questions</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Paste a JSON array of questions. Get the subject id from the Questions tab filter or the
          template below. Question settings here: subjectId, chapterId (optional), type, stemEn,
          optionsEn array ({"{"}id, text{"}"}), correctAnswer, explanationEn, year, source,
          difficulty, marks, negativeMarks.
        </p>
      </div>
      <div className="p-5 space-y-4">
        <ResultBanner ok={result?.ok ?? null} message={result?.message ?? ""} />
        <Textarea
          label="Questions JSON"
          value={json}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJson(e.target.value)}
          className="font-mono text-xs min-h-[260px]"
          placeholder="[{ …questions… }]"
        />
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" type="button" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download template
          </Button>
          <Button onClick={handleImport} disabled={!json.trim()} isLoading={busy}>
            Import questions
          </Button>
        </div>
      </div>
    </div>
  );
}
