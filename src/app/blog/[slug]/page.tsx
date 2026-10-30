import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";
import { publicPageMetadata } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Article not found", robots: { index: false, follow: false } };
  return publicPageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    type: "article",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const published = new Date(`${post.date}T00:00:00Z`);
  const updated = new Date(`${post.updated}T00:00:00Z`);
  const related = BLOG_POSTS.filter((item) => item.slug !== post.slug).slice(0, 2);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: published.toISOString(),
    dateModified: updated.toISOString(),
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };

  return (
    <article className="container-page max-w-3xl py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
        <ArrowLeft className="h-4 w-4" /> All guides
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
        {post.title}
      </h1>
      <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
        <time dateTime={post.date}>
          {published.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
        </time>
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {post.readingMinutes} min read</span>
        {post.updated !== post.date ? (
          <span>Updated {updated.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</span>
        ) : null}
      </p>

      <p className="mt-6 text-lg leading-8 text-neutral-700 dark:text-neutral-300">{post.intro}</p>

      <div className="mt-8 space-y-8">
        {post.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-2 leading-7 text-neutral-700 dark:text-neutral-300">{paragraph}</p>
            ))}
            {section.bullets?.length ? (
              <ul className="mt-2 list-disc space-y-2 pl-5 text-neutral-700 dark:text-neutral-300">
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <aside className="mt-10 rounded-xl border border-primary-200 bg-primary-50 p-5 dark:border-primary-900 dark:bg-primary-900/20">
        <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-100">Put the guide to work</h2>
        <p className="mt-1 text-sm text-primary-800 dark:text-primary-200">
          Reading is preparation; a timed paper is evidence. Start with a free mock and review the questions you got wrong.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/mock-tests" className="btn-brand px-4 py-2 text-sm">Take a mock test</Link>
          <Link href="/cuet-marking-scheme" className="btn-outline px-4 py-2 text-sm">Marking scheme</Link>
        </div>
      </aside>

      {related.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Keep reading</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((item) => (
              <Link key={item.slug} href={`/blog/${item.slug}`} className="card p-4 hover:border-primary-300">
                <p className="font-medium text-neutral-900 dark:text-white">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{item.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
