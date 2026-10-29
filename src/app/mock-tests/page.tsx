import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, BarChart3, BookOpen, Target, Zap, FlaskConical } from "lucide-react";

export default async function MockTestsPage() {
  const tests = await prisma.test.findMany({
    where: { status: "PUBLISHED", isPublic: true },
    orderBy: { createdAt: "desc" },
    include: { subject: true, _count: { select: { questions: true } } },
  });

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