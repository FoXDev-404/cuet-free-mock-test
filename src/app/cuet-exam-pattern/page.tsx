export default function ExamPatternPage() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-primary-50 mb-2">CUET (UG) Exam Pattern</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        Marking scheme, durations, and question counts used across our practice tests.
      </p>
      <div className="card overflow-x-auto p-6 sm:p-8">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              <th className="pb-2 text-neutral-600 dark:text-neutral-400 font-semibold">Section</th>
              <th className="pb-2 text-neutral-600 dark:text-neutral-400 font-semibold">Questions</th>
              <th className="pb-2 text-neutral-600 dark:text-neutral-400 font-semibold">Duration</th>
              <th className="pb-2 text-neutral-600 dark:text-neutral-400 font-semibold">Marking</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            <tr>
              <td className="py-3 text-neutral-600 dark:text-neutral-300">Section IA/IB — Languages</td>
              <td className="py-3 text-neutral-600 dark:text-neutral-300">Up to 50</td>
              <td className="py-3 text-neutral-600 dark:text-neutral-300">60 min</td>
              <td className="py-3 text-neutral-600 dark:text-neutral-300">+5 / -1 / 0</td>
            </tr>
            <tr>
              <td className="py-3 text-neutral-600 dark:text-neutral-300">Section II — Domain</td>
              <td className="py-3 text-neutral-600 dark:text-neutral-300">Up to 50</td>
              <td className="py-3 text-neutral-600 dark:text-neutral-300">60 min</td>
              <td className="py-3 text-neutral-600 dark:text-neutral-300">+5 / -1 / 0</td>
            </tr>
            <tr>
              <td className="py-3 text-neutral-600 dark:text-neutral-300">Section III — General Test</td>
              <td className="py-3 text-neutral-600 dark:text-neutral-300">Up to 60</td>
              <td className="py-3 text-neutral-600 dark:text-neutral-300">60 min</td>
              <td className="py-3 text-neutral-600 dark:text-neutral-300">+5 / -1 / 0</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
          Configurable per test in the admin panel. Verify against the latest NTA bulletin before relying on these values.
        </p>
      </div>
    </section>
  );
}
