"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function AddQuestionPage() {
  const [subject, setSubject] = useState("");
  const [stem, setStem] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correct, setCorrect] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await fetch("/api/admin/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            subjectId: subject,
            type: "MCQ",
            stemEn: stem,
            optionsEn: [
              { id: "A", text: optionA },
              { id: "B", text: optionB },
              { id: "C", text: optionC },
              { id: "D", text: optionD },
            ],
            correctAnswer: correct,
            explanationEn: explanation,
            source: "sample",
            difficulty: "medium",
            marks: 5,
            negativeMarks: 1,
          },
        ]),
      });
      setMessage("Question added successfully.");
    } catch {
      setMessage("Failed to add question.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-primary-50">Add Question</h1>
        <Link href="/admin" className="btn-outline">Back to Admin</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Question</CardTitle>
        </CardHeader>
        <CardContent>
          {message && (
            <div className="mb-4 p-3 rounded bg-blue-50 text-blue-700 text-sm border border-blue-100">
              {message}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Subject ID" placeholder="e.g. CS" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            <Input label="Question Stem" placeholder="Enter the question text" value={stem} onChange={(e) => setStem(e.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Option A" value={optionA} onChange={(e) => setOptionA(e.target.value)} required />
              <Input label="Option B" value={optionB} onChange={(e) => setOptionB(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Option C" value={optionC} onChange={(e) => setOptionC(e.target.value)} required />
              <Input label="Option D" value={optionD} onChange={(e) => setOptionD(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Correct Answer</label>
              <select
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
                className="form-input block w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>
            <Input label="Explanation" placeholder="Explain the correct answer" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
            <Button variant="brand" className="w-full" type="submit" disabled={loading}>
              {loading ? "Adding…" : "Add Question"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
