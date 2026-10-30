import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TakeTestClient } from "./_client";

/**
 * Serves ONLY keyless question data. Answer keys and explanations must never
 * reach the browser before submission — grading is server-side in /api/attempts.
 */
export default async function TakeTestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
              passage: { select: { passageKey: true, title: true } },
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
