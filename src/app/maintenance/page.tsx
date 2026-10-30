import type { Metadata } from "next";
import Link from "next/link";
import { Construction, RotateCcw } from "lucide-react";
import { SETTING_KEYS, getSettings } from "@/lib/settings";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scheduled maintenance",
  robots: NOINDEX_ROBOTS,
};

export default async function MaintenancePage() {
  const settings = await getSettings();
  const message =
    settings[SETTING_KEYS.maintenanceMessage] ||
    "We are doing a short maintenance pass. Practice data is safe — please check back soon.";

  return (
    <section className="container-page flex min-h-[70vh] max-w-2xl flex-col items-center justify-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
        <Construction className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
        We will be right back
      </h1>
      <p className="mt-3 max-w-md text-neutral-600 dark:text-neutral-400">{message}</p>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Submitted attempts, bookmarks and account data remain intact.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-brand inline-flex items-center gap-1.5 px-4 py-2 text-sm">
          <RotateCcw className="h-4 w-4" /> Check again
        </Link>
        <Link href="/contact" className="btn-outline px-4 py-2 text-sm">
          Contact support
        </Link>
      </div>
    </section>
  );
}
