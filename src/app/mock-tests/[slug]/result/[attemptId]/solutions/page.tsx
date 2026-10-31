import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session-user";
import { canAccessAttempt } from "@/lib/attempt-access";
import { can } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpen, CheckCircle, MinusCircle, XCircle } from "lucide-react";
import { MathText } from "@/components/ui/math-text";
import { QuestionImages } from "@/components/questions/question-images";
import { QuestionPassage } from "@/components/questions/question-passage";
import { OptionText } from "@/components/questions/option-text";
import {
  OPTION_LETTERS,
  parseQuestionOptions,
  resolveCorrectOption,
  resolveSelectedOption,
} from "@/lib/question-display";
import { cn } from "@/lib/utils";
export const dynamic = "force-dynamic";

interface SolutionsPageProps {
  params: Promise<{ slug: string; attemptId: string }>;
  searchParams: Promise<{ filter?: string }>;
}

type SolutionFilter = "all" | "correct" | "incorrect" | "unattempted";

const FILTERS: Array<{ key: SolutionFilter; label: string }> = [
  { key: "all", label: "All questions" },
  { key: "correct", label: "Correct" },
  { key: "incorrect", label: "Incorrect" },
  { key: "unattempted", label: "Unattempted" },
];

/**
 * Full post-submission solutions.
 *
 * The route lives under the result page, so it inherits the noindex layout and
 * the same ownership rule as the result itself. It is a server component: the
 * review payload below is generated after submission only and never shipped
 * with the live paper.
 */
export default async function SolutionsPage({ params, searchParams }: SolutionsPageProps) {
  const { slug, attemptId } = await params;
  const { filter: rawFilter } = await searchParams;
  const filter: SolutionFilter = FILTERS.some((item) => item.key === rawFilter)
    ? (rawFilter as SolutionFilter)
    : "all";

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      test: { include: { subject: true } },
      answers: {
        include: {
          question: {
            include: { subject: true, topic: true, passage: true },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!attempt) notFound();
  if (attempt.test.slug !== slug) notFound();

  const { userId, role } = await getSessionUser();
  const isOwner = attempt.userId ? attempt.userId === userId : await canAccessAttempt(attempt);
  if (!isOwner && !can(role, "STUDENT_READ")) notFound();
  if (attempt.status === "IN_PROGRESS") {
    redirect(`/mock-tests/${encodeURIComponent(slug)}/take`);
  }

  const items = (attempt.answers || []).map((answer, index) => {
    const question = answer.question;
    const options = parseQuestionOptions(question?.optionsEn);
    const correct = resolveCorrectOption(question ?? {}, options);
    const selected = resolveSelectedOption(answer.selectedOption, options);
    const answered = selected.index >= 0 || Boolean(answer.selectedOption);
    const status = !correct
      ? "pending"
      : answer.isCorrect
        ? "correct"
        : answered
          ? "incorrect"
          : "unattempted";
    return {
      id: answer.id,
      question,
      options,
      correct,
      selected,
      status,
      number: question?.questionNumber ?? index + 1,
    };
  });

  const counts = {
    all: items.length,
    correct: items.filter((item) => item.status === "correct").length,
    incorrect: items.filter((item) => item.status === "incorrect").length,
    unattempted: items.filter((item) => item.status === "unattempted").length,
  };
  const visible = filter === "all" ? items : items.filter((item) => item.status === filter);

  return (
    <section className="container-page mx-auto max-w-4xl py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Full Solutions</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {attempt.test.title} &middot; every answer, correct option and explanation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/mock-tests/${encodeURIComponent(slug)}/result/${encodeURIComponent(attemptId)}`}
            className="btn-outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Result summary
          </Link>
        </div>
      </div>

      <nav aria-label="Filter solutions" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={
              item.key === "all"
                ? "?"
                : `?filter=${item.key}`
            }
            aria-current={filter === item.key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition",
              filter === item.key
                ? "border-primary-600 bg-primary-600 text-white dark:border-primary-400 dark:bg-primary-500"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700",
            )}
          >
            {item.label} ({counts[item.key]})
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-neutral-600 dark:text-neutral-400">
            No questions match this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {visible.map(({ id, question, options, correct, selected, status, number }) => {
            const Icon =
              status === "correct" ? CheckCircle : status === "incorrect" ? XCircle : MinusCircle;
            const statusLabel =
              status === "pending"
                ? "Pending review"
                : status === "correct"
                  ? "Correct"
                  : status === "incorrect"
                    ? "Incorrect"
                    : "Unattempted";
            return (
              <Card key={id} id={`q-${number}`}>
                <CardContent className="pt-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        status === "correct"
                          ? "text-secondary-600 dark:text-secondary-400"
                          : status === "incorrect"
                            ? "text-danger-600 dark:text-danger-400"
                            : "text-neutral-400",
                      )}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Question {number}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        status === "correct"
                          ? "bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-200"
                          : status === "incorrect"
                            ? "bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-200"
                            : status === "pending"
                              ? "bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-200"
                              : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
                      )}
                    >
                      {statusLabel}
                    </span>
                    {question?.subject && (
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <BookOpen className="h-3 w-3" aria-hidden="true" />
                        {question.subject.name}
                      </span>
                    )}
                    {question?.topic?.name && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {question.topic.name}
                      </span>
                    )}
                  </div>

                  <QuestionPassage passage={question?.passage} className="mb-4" />

                  <MathText
                    text={question?.stemEn}
                    className="mb-1 block font-medium text-neutral-900 dark:text-white"
                  />
                  <QuestionImages images={question?.questionImages} />

                  <div className="mt-4 space-y-2">
                    {options.map((option, index) => {
                      const isCorrectOption = correct?.index === index;
                      const isSelectedOption = selected.index === index;
                      return (
                        <div
                          key={option.id}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm",
                            isCorrectOption
                              ? "border-secondary-300 bg-secondary-50 text-secondary-900 dark:border-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-100"
                              : isSelectedOption
                                ? "border-danger-300 bg-danger-50 text-danger-900 dark:border-danger-700 dark:bg-danger-900/30 dark:text-danger-100"
                                : "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300",
                          )}
                        >
                          <span className="mr-2 font-bold text-primary-600 dark:text-primary-400">
                            {OPTION_LETTERS[index] ?? index + 1}.
                          </span>
                          <OptionText option={option} />
                          {isCorrectOption && (
                            <span className="ml-2 text-xs font-semibold text-secondary-700 dark:text-secondary-300">
                              Correct
                            </span>
                          )}
                          {isSelectedOption && !isCorrectOption && (
                            <span className="ml-2 text-xs font-semibold text-danger-700 dark:text-danger-300">
                              Your answer
                            </span>
                          )}
                          {isSelectedOption && isCorrectOption && (
                            <span className="ml-2 text-xs font-semibold text-secondary-700 dark:text-secondary-300">
                              Your answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {options.length === 0 && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        No options were stored for this question.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <span className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
                        Your answer
                      </span>
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {selected.index >= 0 ? (
                          <>
                            <span className="font-bold">{selected.label}.</span>{" "}
                            <MathText text={selected.text} />
                          </>
                        ) : (
                          "Not attempted"
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
                        Correct answer
                      </span>
                      <span className="font-medium text-secondary-700 dark:text-secondary-300">
                        {correct ? (
                          <>
                            <span className="font-bold">{correct.label}.</span>{" "}
                            <MathText text={correct.text} />
                          </>
                        ) : (
                          "Pending review"
                        )}
                      </span>
                    </div>
                  </div>

                  {question?.explanationEn || question?.explanationImageUrl ? (
                    <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50 p-3 dark:border-primary-900 dark:bg-primary-900/30">
                      <p className="mb-1 text-xs font-semibold text-primary-700 dark:text-primary-300">
                        Explanation
                      </p>
                      <MathText
                        text={question.explanationEn}
                        className="text-sm text-neutral-700 dark:text-neutral-300"
                      />
                      {question.explanationImageUrl ? (
                        <QuestionImages
                          images={[
                            {
                              url: question.explanationImageUrl,
                              alt: question.explanationImageAlt || "Explanation diagram",
                            },
                          ]}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                      No explanation has been published for this question yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
