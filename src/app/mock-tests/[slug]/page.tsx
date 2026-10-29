"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export default function TestDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tests?slug=${params.slug}`);
        if (!res.ok) throw new Error("Failed to load test");
        const data = await res.json();
        const t = data.find((x: any) => x.slug === params.slug);
        if (!t) throw new Error("Test not found");
        setTest(t);
      } catch (e: any) {
        setError(e.message || "Failed to load test");
      } finally {
        setLoading(false);
      }
      return () => { cancelled = true; };
    })();
  }, [params.slug]);

  if (loading) {
    return (
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
        <div className="card text-center py-20">
          <div className="animate-spin mx-auto h-12 w-12 border-4 border-brand-200 border-t-brand-600 rounded-full" />
          <p className="mt-6 text-neutral-600 dark:text-neutral-400">Loading test…</p>
        </div>
      </section>
    );
  }

  if (error || !test) {
    return (
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
        <div className="card text-center py-20">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">{error || "Test not found"}</h2>
          <Button onClick={() => router.back()} variant="brand">Back to tests</Button>
        </div>
      </section>
    );
  }

  const config = typeof test.config === "string" ? JSON.parse(test.config) : test.config;

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1 block">
              {test.type.replace("_", " ")}
            </span>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-brand-50">{test.title}</h1>
            {test.subject && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Subject: {test.subject.name}
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-100 text-brand-700 text-xs font-medium dark:bg-brand-900/30 dark:text-brand-200">
            Published
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">{config.totalQuestions ?? test.totalQuestions}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Questions</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">{config.durationMinutes ?? test.durationMinutes} min</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Duration</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">+5 / -1 / 0</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Marking</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">{test._count?.questions ?? 0}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">In this test</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">Instructions</h3>
          <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-300 text-sm">
            <li>Each correct answer: +5 marks. Each incorrect: -1 mark. Unattempted: 0.</li>
            <li>A timer runs throughout the test; the test auto-submits when time runs out.</li>
            <li>You can mark questions for review and return to them later.</li>
            <li>You may clear your response on any question before submitting.</li>
            <li>Once submitted, you cannot change your answers.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <Link href={`/mock-tests/${test.slug}/take`} className="btn-brand w-full sm:w-auto flex-1">
            Start Test
          </Link>
          <Link href="/mock-tests" className="btn-outline w-full sm:w-auto flex-1">
            Back to tests
          </Link>
        </div>
      </div>
    </section>
  );
}
