export default function DisclaimerPage() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-brand-50 mb-2">Disclaimer</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6">Last updated: October 2026</p>
      <div className="card text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed">
        <p>
          CUETFreeMockTest is not affiliated with, endorsed by, or connected to the National Testing
          Agency (NTA) or any participating university. "CUET" is a trademark of NTA.
        </p>
        <p className="mt-4">
          All questions, answers, explanations, scores, and percentiles on this site are for practice
          and informational purposes only. They do not guarantee any particular score, rank, or admission
          outcome. Marking scheme and durations are configurable defaults and should be verified against
          the latest NTA information bulletin.
        </p>
        <p className="mt-4">
          Contact: support@cuetfreemocktest.com
        </p>
      </div>
    </section>
  );
}
