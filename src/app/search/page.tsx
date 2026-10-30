import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import { SearchClient } from "./search-client";

export const metadata: Metadata = {
  title: "Search",
  description: "Search CUET mock tests, subjects and previous-year question phrases.",
  alternates: { canonical: "/search" },
  robots: NOINDEX_ROBOTS,
};

export default function SearchPage() {
  return (
    <section className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Search</h1>
      <p className="mt-1 mb-6 text-sm text-neutral-600 dark:text-neutral-400">
        Find a mock test, a subject or a question phrase. Answer keys are never included in search results.
      </p>
      <SearchClient />
    </section>
  );
}
