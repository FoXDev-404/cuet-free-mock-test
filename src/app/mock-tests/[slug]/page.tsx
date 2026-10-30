import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, CheckCircle, Users, Award, Target, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLocalPaperSummary, type LocalPaperSummary } from "@/lib/local-papers";
import { publicPageMetadata } from "@/lib/seo";
import { DiscussionThread } from "@/components/discussions/discussion-thread";

interface TestPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TestPageProps): Promise<Metadata> {
  const { slug } = await params;

  const localPaper = getLocalPaperSummary(slug);
  if (localPaper) {
    return publicPageMetadata({
      title: `${localPaper.title} — CUET 2022 English PYQ`,
      description: `Attempt the CUET UG English ${localPaper.dateLabel} 2022 paper: ${localPaper.recoveredQuestionCount} recovered questions, ${localPaper.durationMinutes} minutes, +5/-1 marking and answer review.`,
      path: `/mock-tests/${localPaper.slug}`,
    });
  }

  const test = await prisma.test.findUnique({
    where: { slug, status: "PUBLISHED" },
    select: {
      title: true,
      type: true,
      durationMinutes: true,
      totalQuestions: true,
      subject: { select: { name: true } },
      _count: { select: { questions: true } },
    },
  });
  if (!test) return {};

  const questionCount = test._count.questions || test.totalQuestions;
  const label = test.type.replace(/_/g, " ").toLowerCase();
  return publicPageMetadata({
    title: `${test.title} — Free CUET Mock Test`,
    description: `Take the ${test.title}${test.subject ? ` (${test.subject.name})` : ""}: a free ${test.durationMinutes}-minute ${label} mock test with ${questionCount} questions, instant scoring and answer review.`,
    path: `/mock-tests/${slug}`,
  });
}

function LocalPaperDetail({ paper }: { paper: LocalPaperSummary }) {
  return (
    <section className="py-12 container-page max-w-3xl mx-auto">
      <div className="card p-6 lg:p-8">
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="primary">PYQ · 2022</Badge>
              <Badge variant="warning">Draft OCR</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-2">{paper.title}</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
              <Target className="h-3 w-3" />
              {paper.subject.name} · Previous year paper
            </p>
          </div>
          <Badge variant="warning">Recovered questions only</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-900">
            <div className="flex items-center justify-center gap-2 mb-1"><Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" /><span className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase">Duration</span></div>
            <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 text-center">{paper.durationMinutes} min</div>
          </div>
          <div className="p-4 rounded-xl bg-secondary-50 dark:bg-secondary-900/30 border border-secondary-100 dark:border-secondary-900">
            <div className="flex items-center justify-center gap-2 mb-1"><CheckCircle className="h-5 w-5 text-secondary-600 dark:text-secondary-400" /><span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300 uppercase">Recovered</span></div>
            <div className="text-3xl font-bold text-secondary-600 dark:text-secondary-400 text-center">{paper.recoveredQuestionCount}</div>
            <div className="text-center text-[11px] text-secondary-700 dark:text-secondary-300">of {paper.sourceQuestionCount} source questions</div>
          </div>
          <div className="p-4 rounded-xl bg-accent-50 dark:bg-accent-900/30 border border-accent-100 dark:border-accent-900">
            <div className="flex items-center justify-center gap-2 mb-1"><Award className="h-5 w-5 text-accent-600 dark:text-accent-400" /><span className="text-xs font-semibold text-accent-700 dark:text-accent-300 uppercase">Marking</span></div>
            <div className="text-2xl font-bold text-accent-600 dark:text-accent-400 text-center">+5 / -1</div>
          </div>
          <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-center gap-2 mb-1"><Users className="h-5 w-5 text-neutral-600 dark:text-neutral-400" /><span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase">Scored</span></div>
            <div className="text-3xl font-bold text-neutral-600 dark:text-neutral-400 text-center">{paper.scorableQuestionCount}</div>
            <div className="text-center text-[11px] text-neutral-500 dark:text-neutral-400">questions with a key</div>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-900 dark:border-accent-900 dark:bg-accent-900/20 dark:text-accent-200">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 shrink-0" />Draft paper, published transparently</p>
          <p className="mt-2">
            This paper comes from an OCR extraction of the 2022 source. Only questions with recovered text and at least two options are shown
            {paper.omittedQuestionCount > 0
              ? `, so ${paper.omittedQuestionCount} question records that could not be recovered are omitted rather than guessed.`
              : "."}
          </p>
          {paper.pendingReviewCount > 0 ? (
            <p className="mt-1">
              {paper.pendingReviewCount} {paper.pendingReviewCount === 1 ? "question has" : "questions have"} no answer key in the source.
              {paper.scorableQuestionCount === 0
                ? " This paper is practice-only and cannot be scored yet."
                : ` Only the ${paper.scorableQuestionCount} questions with a key are scored.`}
            </p>
          ) : null}
          {paper.sourceFile ? <p className="mt-1 text-accent-800/80 dark:text-accent-300/80">Source: {paper.sourceFile}</p> : null}
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2"><Target className="h-5 w-5" />Instructions</h3>
          <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-300 text-sm">
            <li>Each correct answer: +5 marks. Each incorrect: -1 mark. Unattempted: 0.</li>
            <li>The test runs for {paper.durationMinutes} minutes and auto-submits when time runs out.</li>
            <li>Questions without an answer key are marked pending review and excluded from the score.</li>
            <li>Reading passages are available above each linked question.</li>
            <li>Answer review, including correct options where available, appears after submission.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <Link href={`/mock-tests/${paper.slug}/take`} className="btn-brand w-full sm:w-auto flex-1 justify-center">
            {paper.scorableQuestionCount > 0 ? "Start Test" : "Open Practice Paper"}
          </Link>
          <Link href="/mock-tests" className="btn-outline w-full sm:w-auto flex-1 justify-center">Back to Tests</Link>
        </div>
      </div>
    </section>
  );
}

export default async function TestDetailPage({ params }: TestPageProps) {
  const { slug } = await params;

  const localPaper = getLocalPaperSummary(slug);
  if (localPaper) return <LocalPaperDetail paper={localPaper} />;

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

      <div className="mt-6">
        <DiscussionThread
          target={{ testId: test.id }}
          title={`${test.title} discussion`}
        />
      </div>
    </section>
  );
}