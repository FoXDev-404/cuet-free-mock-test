import { prisma } from "@/lib/prisma";
import EnglishMockTake from "./_client";
import type { QuestionData } from "./_client";

interface PreloadedQuestion {
  id: string;
  questionNumber: number;
  stemEn: string;
  optionsEn: Array<{ id: string; text: string }>;
  passage?: {
    id: string;
    passageKey: string;
    title: string;
    content: string;
    sourcePageStart: number | null;
    sourcePageEnd: number | null;
  } | null;
}

export default async function EnglishMockTakePage() {
  const firstQuestionRaw = await prisma.question.findFirst({
    where: { subject: { code: "ENG" }, questionNumber: 1, isActive: true },
    select: {
      id: true,
      questionNumber: true,
      stemEn: true,
      optionsEn: true,
      passage: {
        select: {
          id: true,
          passageKey: true,
          title: true,
          content: true,
          sourcePageStart: true,
          sourcePageEnd: true,
        },
      },
    },
  });

  if (!firstQuestionRaw) {
    return (
      <section className="py-12 container-page text-center">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Test data not available
        </h1>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">
          Please seed the database first.
        </p>
      </section>
    );
  }

  const firstQuestion: PreloadedQuestion = {
    id: firstQuestionRaw.id,
    questionNumber: firstQuestionRaw.questionNumber!,
    stemEn: firstQuestionRaw.stemEn,
    optionsEn:
      typeof firstQuestionRaw.optionsEn === "string"
        ? JSON.parse(firstQuestionRaw.optionsEn)
        : firstQuestionRaw.optionsEn,
    passage: firstQuestionRaw.passage
      ? {
          id: firstQuestionRaw.passage.id,
          passageKey: firstQuestionRaw.passage.passageKey,
          title: firstQuestionRaw.passage.title,
          content: firstQuestionRaw.passage.content,
          sourcePageStart: firstQuestionRaw.passage.sourcePageStart,
          sourcePageEnd: firstQuestionRaw.passage.sourcePageEnd,
        }
      : undefined,
  };

  return <EnglishMockTake initialQuestion={firstQuestion as QuestionData} />;
}
