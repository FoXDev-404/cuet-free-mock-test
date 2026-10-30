"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  const digest =
    error && typeof error === "object" && "digest" in error
      ? String((error as { digest?: unknown }).digest ?? "")
      : "";

  return (
    <section className="container-page flex min-h-[70vh] max-w-2xl flex-col items-center justify-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-neutral-600 dark:text-neutral-400">
        This page could not finish loading. Your saved attempts and answers are safe. Retry the page, or head back
        home and try again.
      </p>
      {process.env.NODE_ENV === "development" && error instanceof Error ? (
        <pre className="mt-4 max-w-full overflow-x-auto rounded-lg bg-neutral-100 p-3 text-left text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {error.message}
        </pre>
      ) : null}
      {digest ? (
        <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">Reference: {digest}</p>
      ) : null}

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={retry} className="btn-brand inline-flex items-center gap-1.5 px-4 py-2 text-sm">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
        <Link href="/" className="btn-outline inline-flex items-center gap-1.5 px-4 py-2 text-sm">
          <Home className="h-4 w-4" /> Go home
        </Link>
      </div>
      <p className="mt-6 text-xs text-neutral-400 dark:text-neutral-500">
        If this keeps happening, please{" "}
        <Link href="/contact" className="font-medium underline">
          contact us
        </Link>
        .
      </p>
    </section>
  );
}
