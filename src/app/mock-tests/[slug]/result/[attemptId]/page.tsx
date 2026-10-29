import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, Clock, Award, TrendingUp, ChevronDown, ChevronUp, Download, BookOpen } from "lucide-react";

interface ResultPageProps {
  params: Promise<{ slug: string; attemptId: string }>;
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { slug, attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      test: { include: { subject: true } },
      answers: { include: { question: { include: { subject: true } } }, orderBy: { id: "asc" } },
    },
  });

  if (!attempt) notFound();

  const config = typeof attempt.test.config === "string" ? JSON.parse(attempt.test.config) : attempt.test.config;
  const marksCorrect = config.markingScheme?.correct ?? 5;
  const marksIncorrect = config.markingScheme?.incorrect ?? 1;

  let correct = 0, incorrect = 0, attempted = 0;
  for (const ans of attempt.answers || []) {
    if (ans.selectedOption != null && ans.selectedOption !== "") {
      attempted++;
      if (ans.isCorrect) correct++;
      else incorrect++;
    }
  }
  const rawScore = correct * marksCorrect - incorrect * marksIncorrect;
  const maxScore = (correct + incorrect + (attempt.test.totalQuestions - attempted)) * marksCorrect;
  const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
  const percentage = maxScore > 0 ? (rawScore / maxScore) * 100 : 0;

  const subjectBreakdown: Record<string, { correct: number; total: number }> = {};
  for (const ans of attempt.answers || []) {
    if (ans.selectedOption != null && ans.selectedOption !== "" && ans.question) {
      const subj = ans.question.subject?.name || ans.question.subjectId || "Unknown";
      if (!subjectBreakdown[subj]) subjectBreakdown[subj] = { correct: 0, total: 0 };
      subjectBreakdown[subj].total++;
      if (ans.isCorrect) subjectBreakdown[subj].correct++;
    }
  }

  return (
    <section className="py-12 container-page max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Test Results</h1>
        <Link href="/mock-tests" className="btn-outline"><ArrowLeft className="h-4 w-4 mr-2" />Back to Tests</Link>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-primary-600 dark:text-primary-400 mb-2">{rawScore}</div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Score out of {maxScore}</div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-secondary-50 dark:bg-secondary-900/30 border border-secondary-100 dark:border-secondary-900"><div className="text-3xl font-bold text-secondary-600 dark:text-secondary-400">{correct}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">Correct</div></div>
              <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/30 border border-danger-100 dark:border-danger-900"><div className="text-3xl font-bold text-danger-600 dark:text-danger-400">{incorrect}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">Incorrect</div></div>
              <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"><div className="text-3xl font-bold text-neutral-600 dark:text-neutral-400">{attempt.test.totalQuestions - attempted}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">Unattempted</div></div>
            </div>

            <div className="mb-6"><div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3 mb-2"><div className="h-3 rounded-full bg-primary-600 dark:bg-primary-400 transition-all duration-700" style={{ width: `${percentage}%` }} /></div><div className="text-sm text-neutral-600 dark:text-neutral-400">Accuracy: {accuracy.toFixed(1)}%</div></div>

            <p className="text-neutral-600 dark:text-neutral-300 mb-6"><Clock className="h-4 w-4 inline mr-1" />Time taken: {Math.floor((attempt.timeSpentSec || 0) / 60)}:{String((attempt.timeSpentSec || 0) % 60).padStart(2, "0")}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/mock-tests/${slug}/take`} className="btn-brand"><ArrowLeft className="h-4 w-4 mr-2" />Retry Test</Link>
              <Link href="/mock-history" className="btn-outline w-full sm:w-auto flex items-center justify-center gap-2"><TrendingUp className="h-4 w-4 mr-2" />View History</Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Breakdown */}
      {Object.keys(subjectBreakdown).length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Performance by Subject</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(subjectBreakdown).map(([subject, data]) => (
                <div key={subject} className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                  <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">{subject}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">{data.correct}/{data.total} correct</span>
                    <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0}%</span>
                  </div>
                  <div className="mt-2 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-primary-600 dark:bg-primary-400" style={{ width: `${data.total > 0 ? (data.correct / data.total) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answer Review */}
      <Card>
        <CardHeader><CardTitle>Answer Review</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(attempt.answers || []).map((ans) => {
              const q: any = ans.question;
              const isCorrect = ans.isCorrect;
              return (
                <details key={ans.id} className="group">
                  <summary className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 cursor-pointer list-none">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">{q?.stemEn || "Question"}</span>
                        <span className={`text-xs font-medium rounded px-2 py-0.5 ${isCorrect ? "bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-200" : "bg-danger-100 text-danger-800 dark:bg-danger-900/20 dark:text-danger-300"}`}>
                          {isCorrect ? "Correct" : ans.selectedOption ? "Incorrect" : "Not Attempted"}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 flex flex-wrap gap-3">
                        {q?.subject && <span><BookOpen className="h-3 w-3 inline mr-1" />{q.subject.name}</span>}
                        {q?.topic && <span>{q.topic}</span>}
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-neutral-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-4 border border-neutral-200 dark:border-neutral-800 border-t-0 rounded-b-lg bg-neutral-50/50 dark:bg-neutral-900/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div><span className="text-xs text-neutral-500 dark:text-neutral-400 block mb-1">Your Answer</span><span className="font-medium text-neutral-900 dark:text-white">{ans.selectedOption || "Not attempted"}</span></div>
                      <div><span className="text-xs text-neutral-500 dark:text-neutral-400 block mb-1">Correct Answer</span><span className="font-medium text-secondary-600 dark:text-secondary-400">{q?.correctAnswer}</span></div>
                      <div><span className="text-xs text-neutral-500 dark:text-neutral-400 block mb-1">Status</span><span className={`font-medium ${isCorrect ? "text-secondary-600 dark:text-secondary-400" : ans.selectedOption ? "text-danger-600 dark:text-danger-400" : "text-neutral-600 dark:text-neutral-400"}`}>{isCorrect ? "Correct" : ans.selectedOption ? "Incorrect" : "Skipped"}</span></div>
                    </div>
                    {q?.explanationEn && (
                      <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-900">
                        <span className="text-xs font-medium text-primary-700 dark:text-primary-300">Explanation: </span>
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">{q.explanationEn}</span>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}