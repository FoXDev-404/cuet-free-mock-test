import type { Metadata } from "next";
import Link from "next/link";
import { Home, ServerCrash } from "lucide-react";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Server error",
  robots: NOINDEX_ROBOTS,
};

export default function ServerErrorPage() {
  return (
    <section className="container-page flex min-h-[70vh] max-w-2xl flex-col items-center justify-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
        <ServerCrash className="h-7 w-7" />
      </span>
      <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
        500 — server error
      </p>
      <h1 className="mt-2 text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
        Something went wrong on our side
      </h1>
      <p className="mt-3 max-w-md text-neutral-600 dark:text-neutral-400">
        The request could not be completed. Your saved attempts and answers are safe. Retry the page in a moment,
        or head back home.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-brand inline-flex items-center gap-1.5 px-4 py-2 text-sm">
          <Home className="h-4 w-4" /> Go home
        </Link>
        <Link href="/contact" className="btn-outline px-4 py-2 text-sm">
          Contact support
        </Link>
      </div>
    </section>
  );
}
