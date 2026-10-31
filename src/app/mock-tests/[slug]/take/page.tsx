import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TakeTestClient } from "./_client";
import { getLocalPaperTakeData, LOCAL_ENGLISH_SUBJECT } from "@/lib/local-papers";

/**
 * Serves ONLY keyless question data. Answer keys and explanations must never
 * reach the browser before submission — grading is server-side.
 */
export default async function TakeTestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Repo-backed 2022 papers never touch D1 and are graded by their own route.
  const localPaper = getLocalPaperTakeData(slug);
  if (localPaper) {
    return (
      <TakeTestClient
        slug={slug}
        localPaper={{
          draft: localPaper.draft,
          sourceQuestionCount: localPaper.sourceQuestionCount,
          recoveredQuestionCount: localPaper.recoveredQuestionCount,
          omittedQuestionCount: localPaper.omittedQuestionCount,
          scorableQuestionCount: localPaper.scorableQuestionCount,
          pendingReviewCount: localPaper.pendingReviewCount,
        }}
        test={{
          title: localPaper.title,
          config: localPaper.config,
          durationMinutes: localPaper.durationMinutes,
          questions: localPaper.questions.map((question) => ({
            question: {
              id: question.id,
              stemEn: question.stemEn,
              optionsEn: question.options,
              type: "MCQ",
              marks: 5,
              subject: { name: LOCAL_ENGLISH_SUBJECT.name },
              chapter: null,
              number: question.number,
              passage: question.passage,
              scorable: question.scorable,
            },
          })),
        }}
      />
    );
  }

  const test = await prisma.test.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      questions: {
        include: {
          question: {
            select: {
              id: true,
              stemEn: true,
              stemHi: true,
              richTextEn: true,
              optionsEn: true,
              optionsHi: true,
              questionImages: true,
              type: true,
              marks: true,
              subject: { select: { name: true } },
              chapter: { select: { name: true } },
              passage: {
                select: {
                  passageKey: true,
                  title: true,
                  content: true,
                  imageUrl: true,
                  imageAlt: true,
                  sourceNote: true,
                },
              },
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!test) notFound();

  const { questions, ...testMeta } = test;

  return <TakeTestClient test={{ ...testMeta, questions }} slug={slug} />;
}
