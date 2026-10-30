import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My discussions",
  robots: NOINDEX_ROBOTS,
};

const STATUS_STYLE: Record<string, string> = {
  VISIBLE: "badge-success",
  PENDING: "badge-warning",
  HIDDEN: "badge-danger",
};

export default async function MyDiscussionsPage() {
  const { userId } = await getSessionUser();
  if (!userId) redirect("/login?callbackUrl=/dashboard/discussions");

  const discussions = await prisma.discussion.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      body: true,
      status: true,
      upvotes: true,
      isPinned: true,
      createdAt: true,
      parentId: true,
      testId: true,
      questionId: true,
      test: { select: { title: true } },
    },
  });

  return (
    <section className="container-page max-w-3xl py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
          <MessageSquare className="h-6 w-6 text-primary-600 dark:text-primary-400" /> My discussions
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Posts and replies you have written. Removed posts remain listed here so you can see moderation status.
        </p>
      </div>

      {discussions.length === 0 ? (
        <div className="card py-14 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          <p className="text-neutral-600 dark:text-neutral-400">You have not posted in a discussion yet.</p>
          <Link href="/discussions" className="btn-brand mt-5 inline-flex px-4 py-2 text-sm">
            Browse discussions
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {discussions.map((post) => (
            <li key={post.id} className="card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={`badge ${STATUS_STYLE[post.status] ?? "badge-neutral"}`}>{post.status.toLowerCase()}</span>
                {post.parentId ? <span className="badge badge-neutral">reply</span> : null}
                {post.isPinned ? <span className="badge badge-primary">pinned</span> : null}
                <span className="text-neutral-500 dark:text-neutral-400">
                  {post.createdAt.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-neutral-800 dark:text-neutral-200">
                {post.body}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                {post.testId && post.test ? (
                  <Link
                    href={`/discussions?testId=${post.testId}`}
                    className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    {post.test.title}
                  </Link>
                ) : post.questionId ? (
                  <Link
                    href={`/discussions?questionId=${post.questionId}`}
                    className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    Question discussion
                  </Link>
                ) : null}
                <span>{post.upvotes} upvotes</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
