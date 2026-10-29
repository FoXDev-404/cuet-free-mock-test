import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TakeTestClient } from "./_client";

export default async function TakeTestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const test = await prisma.test.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: { questions: { include: { question: true }, orderBy: { order: "asc" } } },
  });

  if (!test) notFound();

  return <TakeTestClient test={test} slug={slug} />;
}