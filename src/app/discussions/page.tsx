import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowBigUp, MessageSquare, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { displayUsername } from "@/lib/username";
import { publicPageMetadata } from "@/lib/seo";
import { DiscussionThread } from "@/components/discussions/discussion-thread";

export const dynamic = "force-dynamic";

export const metadata: Metadata = publicPageMetadata({
  title: "CUET Mock Test Discussions — Doubts, Tips & Answer Explanations",
  description:
    "Ask CUET doubts, compare answer approaches and read study tips from other aspirants. Discussions are attached to free mock tests and practice questions.",
  path: "/discussions",
});

interface PageProps {
  searchParams: Promise<{ testId?: string; questionId?: string }>;
}

export default async function DiscussionsPage({ searchParams }: PageProps) {
  const { testId, questionId } = await searchParams;

  if (testId) {
    const test = await prisma.test.findFirst({
      where: { id: testId, status: "PUBLISHED", isPublic: true },
      select: { id: true, title: true, slug: true },
    });
    if (!test) notFound();
    return (
      <section className="container-page max-w-3xl py-10">
        <nav className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          <Link href="/discussions" className="hover:underline">Discussions</Link>
          <span className="mx-1.5">/</span>
          <span className="text-neutral-700 dark:text-neutral-300">{test.title}</span>
        </nav>
        <h1 className="mb-1 text-2xl font-bold text-neutral-900 dark:text-white">{test.title}</h1>
        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          <Link href={`/mock-tests/${test.slug}`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            Open the test
          </Link>{" "}
          to attempt it before reading answer discussions.
        </p>
        <DiscussionThread target={{ testId: test.id }} title="Test discussion" />
      </section>
    );
  }

  if (questionId) {
    const question = await prisma.question.findFirst({
      where: { id: questionId, isActive: true },
      select: {
        id: true,
        stemEn: true,
        subject: { select: { name: true } },
      },
    });
    if (!question) notFound();
    return (
      <section className="container-page max-w-3xl py-10">
        <nav className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          <Link href="/discussions" className="hover:underline">Discussions</Link>
          <span className="mx-1.5">/</span>
          <span className="text-neutral-700 dark:text-neutral-300">Question doubt</span>
        </nav>
        <h1 className="mb-1 text-2xl font-bold text-neutral-900 dark:text-white">Question discussion</h1>
        <p className="mb-6 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
          {question.subject?.name ? `${question.subject.name} · ` : ""}
          {question.stemEn}
        </p>
        <DiscussionThread target={{ questionId: question.id }} title="Question discussion" />
        <p className="mt-5 text-xs text-neutral-500 dark:text-neutral-400">
          Practice the question in{" "}
          <Link href="/practice" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            the practice section
          </Link>
          .
        </p>
      </section>
    );
  }

  const [tests, recent] = await Promise.all([
    prisma.test.findMany({
      where: { status: "PUBLISHED", isPublic: true },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        title: true,
        slug: true,
        _count: { select: { discussions: true } },
      },
    }),
    prisma.discussion.findMany({
      where: { parentId: null, status: "VISIBLE", testId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        body: true,
        upvotes: true,
        createdAt: true,
        testId: true,
        user: { select: { id: true, username: true, name: true } },
        test: { select: { title: true, slug: true } },
      },
    }),
  ]);

  return (
    <section className="container-page max-w-4xl py-10">
      <div className="mb-8">
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
          <MessageSquare className="h-3.5 w-3.5" /> Community
        </p>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">CUET discussions</h1>
        <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Ask doubts on a mock test, compare reasoning and share what worked. Posts are public, moderated and
          attached to a specific test so answers stay relevant. Sign in to post.
        </p>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">Browse by test</h2>
      {tests.length === 0 ? (
        <p className="card p-6 text-sm text-neutral-500 dark:text-neutral-400">
          No published tests yet. Check back soon.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tests.map((test) => (
            <Link
              key={test.id}
              href={`/discussions?testId=${test.id}`}
              className="card flex items-center justify-between gap-3 p-4 transition-colors hover:border-primary-300 dark:hover:border-primary-800"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-neutral-900 dark:text-white">{test.title}</span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                  {test._count.discussions} {test._count.discussions === 1 ? "post" : "posts"}
                </span>
              </span>
              <MessageSquare className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
            </Link>
          ))}
        </div>
      )}

      <h2 className="mt-10 mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
        <Search className="h-4 w-4 text-primary-600 dark:text-primary-400" /> Recent posts
      </h2>
      {recent.length === 0 ? (
        <p className="card p-6 text-sm text-neutral-500 dark:text-neutral-400">
          No discussions yet. Pick a test above and start the first conversation.
        </p>
      ) : (
        <ul className="space-y-3">
          {recent.map((post) => (
            <li key={post.id} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex shrink-0 flex-col items-center rounded-lg border border-neutral-200 px-1.5 py-1 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                  <ArrowBigUp className="h-4 w-4" />
                  {post.upvotes}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {displayUsername(post.user)}
                    </span>{" "}
                    on{" "}
                    {post.test ? (
                      <Link href={`/discussions?testId=${post.testId}`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                        {post.test.title}
                      </Link>
                    ) : (
                      "a test"
                    )}
                  </p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm text-neutral-700 dark:text-neutral-300">
                    {post.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
