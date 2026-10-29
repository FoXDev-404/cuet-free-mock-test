export default function TermsPage() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-brand-50 mb-2">Terms & Conditions</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6">Last updated: October 2026</p>
      <div className="card text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed space-y-4">
        <p>By using CUETFreeMockTest, you agree to these terms. If you do not agree, discontinue use.</p>
        <p>
          The platform is for personal, non-commercial exam preparation. You may not scrape, reproduce,
          or redistribute content without permission. Sample questions are original and not official
          NTA material.
        </p>
        <p>
          We may suspend accounts for abuse, automated access, or violations. The service is provided
          &quot;as is&quot; without warranty of accuracy or exam outcomes.
        </p>
        <p className="mt-4">Contact: support@cuetfreemocktest.com</p>
      </div>
    </section>
  );
}
