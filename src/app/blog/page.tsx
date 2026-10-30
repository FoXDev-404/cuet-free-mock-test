import type { Metadata } from "next";
import Link from "next/link";
import { AdSlot } from "@/components/ads/AdSlot";
import { publicPageMetadata } from "@/lib/seo";
import { BLOG_POSTS } from "@/lib/blog";

export const metadata: Metadata = publicPageMetadata({
  title: "CUET Preparation Blog — Strategy & Exam Guides",
  description:
    "Original CUET (UG) preparation guides: mock-test strategy, the marking scheme, subject selection and revision plans.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <section className="container-page max-w-4xl py-12">
      <h1 className="mb-2 text-3xl font-bold text-neutral-900 dark:text-white">CUET preparation blog</h1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400">
        Original, practical guides for planning CUET preparation. Every article is written for this site and links
        back to a timed paper you can actually take.
      </p>
      <div className="grid gap-4">
        {BLOG_POSTS.map((post) => (
          <article key={post.slug} className="card p-6">
            <div className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <time dateTime={post.date}>
                {new Date(`${post.date}T00:00:00Z`).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </time>
              {" · "}
              {post.readingMinutes} min read
            </div>
            <h2 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-white">
              <Link href={`/blog/${post.slug}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                {post.title}
              </Link>
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{post.excerpt}</p>
            <Link
              href={`/blog/${post.slug}`}
              className="mt-3 inline-block text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
            >
              Read the guide →
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-12">
        <AdSlot adSlot="blog-banner" adFormat="leaderboard" style={{ margin: "0 auto", maxWidth: "728px" }} />
      </div>
    </section>
  );
}
