"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { FileText, BarChart3 } from "lucide-react";

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!session) router.push("/login");
  }, [session, router]);

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-primary-50">Admin Panel</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Manage subjects, questions, tests, and users.</p>
        </div>
        <Link href="/mock-tests" className="btn-brand">View Site</Link>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === "overview" ? "brand" : "outline"} size="sm" onClick={() => setTab("overview")}>Overview</Button>
        <Button variant={tab === "questions" ? "brand" : "outline"} size="sm" onClick={() => setTab("questions")}>Questions</Button>
        <Button variant={tab === "tests" ? "brand" : "outline"} size="sm" onClick={() => setTab("tests")}>Tests</Button>
        <Button variant={tab === "import" ? "brand" : "outline"} size="sm" onClick={() => setTab("import")}>Bulk Import</Button>
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader><CardTitle>Subjects</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-900 dark:text-white">3</div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">CS, PHY, GT</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Questions</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-900 dark:text-white">26</div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">Sample questions seeded</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Tests</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-900 dark:text-white">2</div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">Published mock tests</p>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "questions" && (
        <div className="card">
          <CardHeader>
            <CardTitle>Manage Questions</CardTitle>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Add, edit, or delete questions in the bank.</p>
          </CardHeader>
          <CardContent>
            <div className="text-neutral-500 dark:text-neutral-400 text-center py-10">
              <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Question management interface. Use Bulk Import to add questions via CSV/JSON.</p>
            </div>
          </CardContent>
        </div>
      )}

      {tab === "tests" && (
        <div className="card">
          <CardHeader>
            <CardTitle>Manage Tests</CardTitle>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Create, publish, or unpublish tests.</p>
          </CardHeader>
          <CardContent>
            <div className="text-neutral-500 dark:text-neutral-400 text-center py-10">
              <BarChart3 className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Test management interface. Create new tests from the question bank.</p>
            </div>
          </CardContent>
        </div>
      )}

      {tab === "import" && (
        <BulkImport />
      )}
    </section>
  );
}

function BulkImport() {
  const [json, setJson] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(json);
      const res = await fetch("/api/admin/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const out = await res.json();
      setResult({ ok: res.ok, message: out.message || out.error || "Done" });
    } catch (err: any) {
      setResult({ ok: false, message: err.message || "Invalid JSON" });
    }
  };

  return (
    <div className="card">
      <CardHeader>
        <CardTitle>Bulk Import Questions</CardTitle>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Import questions via JSON array. Each object includes subjectId, chapterId (optional), type, stemEn, stemHi (optional), optionsEn, optionsHi (optional), correctAnswer, explanationEn (optional), year (optional), source, difficulty, marks, negativeMarks.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleImport} className="space-y-4">
          <Input label="JSON questions" value={json} onChange={(e) => setJson(e.target.value)} className="h-64 font-mono text-sm" />
          <Button variant="brand" type="submit" disabled={!json.trim()}>
            Import Questions
          </Button>
          {result && (
            <div className={`p-3 rounded ${result.ok ? "bg-primary-50 text-primary-700 border border-primary-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
              {result.message}
            </div>
          )}
        </form>
      </CardContent>
    </div>
  );
}
