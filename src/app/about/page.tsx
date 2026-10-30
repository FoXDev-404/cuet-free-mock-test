import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "About CUETFreeMockTest",
  description:
    "CUETFreeMockTest is a free, independent CUET (UG) mock-test and practice platform with instant scoring. Not affiliated with NTA.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-primary-50 mb-2">About CUETFreeMockTest</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6">
        CUETFreeMockTest is a free, independent CUET (UG) mock test and practice platform.
      </p>
      <div className="card p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Our mission</h2>
        <p className="text-neutral-600 dark:text-neutral-300 mb-4">
          To provide accessible, exam-aligned mock tests and practice questions for CUET UG aspirants,
          with instant scoring and performance analytics — at no cost.
        </p>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Independence</h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          This platform is not affiliated with, endorsed by, or connected to the National Testing Agency (NTA)
          or any university. All sample questions are original and for practice only.
        </p>
      </div>
    </section>
  );
}
