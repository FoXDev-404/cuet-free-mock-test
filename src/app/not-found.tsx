import type { Metadata } from "next";
import Link from "next/link";
import { Compass, FlaskConical, Home, Search } from "lucide-react";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Page not found",
  robots: NOINDEX_ROBOTS,
};

export default function NotFound() {
  return (
    <section className="container-page flex min-h-[70vh] max-w-2xl flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
        404 — not found
      </p>
      <h1 className="mt-3 text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
        We could not find that page
      </h1>
      <p className="mt-3 max-w-md text-neutral-600 dark:text-neutral-400">
        The link may be outdated, or the test or question may have been unpublished. Try one of these instead.
      </p>

      <form action="/search" method="get" className="mt-7 flex w-full max-w-md gap-2" role="search">
        <label htmlFor="not-found-search" className="sr-only">
          Search tests and questions
        </label>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            id="not-found-search"
            name="q"
            type="search"
            placeholder="Search mock tests, topics or PYQs"
            className="input w-full pl-9"
          />
        </div>
        <button type="submit" className="btn-brand shrink-0 px-4 py-2 text-sm">
          Search
        </button>
      </form>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-outline inline-flex items-center gap-1.5 px-4 py-2 text-sm">
          <Home className="h-4 w-4" /> Home
        </Link>
        <Link href="/mock-tests" className="btn-outline inline-flex items-center gap-1.5 px-4 py-2 text-sm">
          <FlaskConical className="h-4 w-4" /> Mock tests
        </Link>
        <Link href="/practice" className="btn-outline inline-flex items-center gap-1.5 px-4 py-2 text-sm">
          <Compass className="h-4 w-4" /> Practice
        </Link>
      </div>
    </section>
  );
}
