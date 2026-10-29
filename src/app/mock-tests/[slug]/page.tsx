import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, CheckCircle, XCircle, MinusCircle, Users, Award, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TestPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TestDetailPage({ params }: TestPageProps) {
  const { slug } = await params;
  const test = await prisma.test.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: { subject: true, _count: { select: { questions: true, attempts: true } } },
  });

  if (!test) notFound();

  const config = typeof test.config === "string" ? JSON.parse(test.config) : test.config;
  const totalQ = config.totalQuestions ?? test.totalQuestions ?? test._count.questions;
  const duration = config.durationMinutes ?? test.durationMinutes;
  const marking = config.markingScheme ?? { correct: 5, incorrect: 1, unattempted: 0 };

  return (
    <section className="py-12 container-page max-w-3xl mx-auto">
      <div className="card p-6 lg:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <Badge variant="primary" className="mb-2">{test.type.replace("_", " ")}</Badge>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-2">{test.title}</h1>
            {test.subject && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-1"><Target className="h-3 w-3" />{test.subject.name}</p>
            )}
          </div>
          <Badge variant="success">Published</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-900">
            <div className="flex items-center justify-center gap-2 mb-1"><Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" /><span className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase">Duration</span></div>
            <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 text-center">{duration} min</div>
          </div>
          <div className="p-4 rounded-xl bg-secondary-50 dark:bg-secondary-900/30 border border-secondary-100 dark:border-secondary-900">
            <div className="flex items-center justify-center gap-2 mb-1"><CheckCircle className="h-5 w-5 text-secondary-600 dark:text-secondary-400" /><span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300 uppercase">Questions</span></div>
            <div className="text-3xl font-bold text-secondary-600 dark:text-secondary-400 text-center">{totalQ}</div>
          </div>
          <div className="p-4 rounded-xl bg-accent-50 dark:bg-accent-900/30 border border-accent-100 dark:border-accent-900">
            <div className="flex items-center justify-center gap-2 mb-1"><Award className="h-5 w-5 text-accent-600 dark:text-accent-400" /><span className="text-xs font-semibold text-accent-700 dark:text-accent-300 uppercase">Marking</span></div>
            <div className="text-2xl font-bold text-accent-600 dark:text-accent-400 text-center">+{marking.correct} / -{marking.incorrect}</div>
          </div>
          <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-center gap-2 mb-1"><Users className="h-5 w-5 text-neutral-600 dark:text-neutral-400" /><span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase">Attempts</span></div>
            <div className="text-3xl font-bold text-neutral-600 dark:text-neutral-400 text-center">{test._count.attempts}</div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2"><Target className="h-5 w-5" />Instructions</h3>
          <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-300 text-sm">
            <li>Each correct answer: +{marking.correct} marks. Each incorrect: -{marking.incorrect} mark. Unattempted: 0.</li>
            <li>A timer runs throughout the test; the test auto-submits when time runs out.</li>
            <li>You can mark questions for review and return to them later using the question palette.</li>
            <li>You may clear your response on any question before submitting.</li>
            <li>Once submitted, you cannot change your answers.</li>
            <li>Results include detailed answer review with explanations.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <Link href={`/mock-tests/${test.slug}/take`} className="btn-brand w-full sm:w-auto flex-1 justify-center">Start Test</Link>
          <Link href="/mock-tests" className="btn-outline w-full sm:w-auto flex-1 justify-center">Back to Tests</Link>
        </div>
      </div>
    </section>
  );
}