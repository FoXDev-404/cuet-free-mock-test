import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Clock, ArrowRight, BarChart3, BookOpen, Target, Zap, FlaskConical, AlertTriangle } from "lucide-react";
import { getLocalPaperSummaries } from "@/lib/local-papers";

export default async function MockTestsPage() {
  const localPapers = getLocalPaperSummaries();
  const tests = await prisma.test.findMany({
    where: { status: "PUBLISHED", isPublic: true },
    orderBy: { createdAt: "desc" },
    include: { subject: true, _count: { select: { questions: true } } },
  });

  // Previous Year Question (PYQ) papers are separate from Test rows — they run
  // through the dedicated English mock flow with their own config.
  const pyqConfig = await prisma.englishMockConfig.findFirst({ where: { isActive: true } });
  const pyqQuestionCount = pyqConfig
    ? await prisma.question.count({ where: { subject: { code: "ENG" }, isActive: true } })
    : 0;

  const grouped = tests.reduce((acc, t) => {
    const key = t.type.replace("_", " ") || "Full Length";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, typeof tests>);

  const typeIcons: Record<string, typeof FlaskConical> = {
    "FULL LENGTH": FlaskConical,
    "SUBJECT WISE": BookOpen,
    "CHAPTER WISE": Target,
    "PYQ YEAR WISE": BarChart3,
    "GENERAL TEST": Zap,
  };

  return (
    <section className="py-12 container-page">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white">Mock Tests</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400 max-w-2xl">
          Full-length, subject-wise, chapter-wise and PYQ tests with CUET marking scheme (+5 / -1 / 0).
          Choose a test type below or browse all published tests.
        </p>
      </div>

      {/* Test Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
        {Object.entries(grouped).map(([type, items]) => (
          <Link key={type} href={`/mock-tests?type=${type.toLowerCase().replace(" ", "-")}`} className="group card p-5 card-hover">
            <div className="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {(() => { const Icon = typeIcons[type] ?? FlaskConical; return <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />; })()}
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{type}</h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{items.length} test{items.length !== 1 ? "s" : ""} available</p>
          </Link>
        ))}
      </div>

      {/* Previous Year Papers (PYQ) — real exam papers via the dedicated mock flow */}
      {pyqConfig && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">Previous Year Papers (PYQ)</h2>
          <Link href="/english-mock/intro" className="group card p-6 card-hover max-w-xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="badge badge-primary mb-2">PYQ · Real Exam Paper</span>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  CUET UG English — 20 May 2025 Shift 1
                </h3>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Actual CUET UG 2025 question paper, full feel of the real shift.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{pyqQuestionCount || pyqConfig.totalQuestions}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 flex items-center justify-center gap-1"><Clock className="h-4 w-4" />{pyqConfig.durationMinutes}m</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">+1/-0</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Marking</div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Start Paper</span>
              <ArrowRight className="h-4 w-4 text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      )}

      {/* 2022 English PYQs — repo-backed drafts, recovering what OCR could read */}
      {localPapers.length > 0 ? (
        <div className="mb-12">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">CUET UG English 2022 — Previous Year Papers</h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Six 2022 papers recovered from draft OCR. Questions OCR could not recover are omitted, not invented.
              </p>
            </div>
            <span className="badge badge-warning self-start sm:self-auto">Draft OCR · transparent</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {localPapers.map((paper) => (
              <Link
                key={paper.id}
                href={`/mock-tests/${paper.slug}`}
                className="group card p-6 card-hover"
                aria-label={`Open CUET 2022 English paper — ${paper.dateLabel}${paper.shift ? ` (${paper.shift})` : ""}`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="badge badge-primary">PYQ · 2022</span>
                      <span className="badge badge-warning">Draft OCR</span>
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors break-words">{paper.title}</h3>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      {paper.dateLabel}{paper.shift ? ` · ${paper.shift}` : ""} · English
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{paper.recoveredQuestionCount}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">of {paper.sourceQuestionCount} questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 flex items-center justify-center gap-1"><Clock className="h-4 w-4" />{paper.durationMinutes}m</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">+5/-1</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Marking</div>
                  </div>
                </div>

                {paper.omittedQuestionCount > 0 || paper.pendingReviewCount > 0 ? (
                  <p className="mb-4 flex items-start gap-1.5 text-xs text-accent-700 dark:text-accent-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {paper.omittedQuestionCount > 0 ? `${paper.omittedQuestionCount} not recovered` : ""}
                      {paper.omittedQuestionCount > 0 && paper.pendingReviewCount > 0 ? " · " : ""}
                      {paper.pendingReviewCount > 0 ? `${paper.pendingReviewCount} pending answer key` : ""}
                    </span>
                  </p>
                ) : null}

                <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {paper.scorableQuestionCount > 0 ? "Start Test" : "Open practice paper"}
                  </span>
                  <ArrowRight className="h-4 w-4 text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* All Tests */}
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">All Published Tests</h2>
      {tests.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <FlaskConical className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No tests published yet</h3>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">Check back soon or contact admin to publish tests.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => {
            const config = typeof test.config === "string" ? JSON.parse(test.config) : test.config;
            const totalQ = config.totalQuestions ?? test.totalQuestions ?? test._count.questions;
            const duration = config.durationMinutes ?? test.durationMinutes;
            return (
              <Link key={test.id} href={`/mock-tests/${test.slug}`} className="group card p-6 card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="badge badge-primary mb-2">{test.type.replace("_", " ")}</span>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{test.title}</h3>
                    {test.subject && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{test.subject.name}</p>}
                  </div>
                  <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{totalQ}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 flex items-center justify-center gap-1"><Clock className="h-4 w-4" />{duration}m</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">+5/-1</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Marking</div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Start Test</span>
                  <ArrowRight className="h-4 w-4 text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}