export default function SyllabusPage() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-primary-50 mb-2">CUET (UG) Syllabus</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        Subject-wise syllabus overview and chapter breakdown to guide your preparation.
      </p>
      <div className="card p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Sections</h2>
        <ul className="space-y-3 text-neutral-600 dark:text-neutral-300 text-sm">
          <li className="flex gap-2">
            <span className="text-primary-600 dark:text-primary-400">Section IA/IB</span> — Languages
          </li>
          <li className="flex gap-2">
            <span className="text-primary-600 dark:text-primary-400">Section II</span> — Domain subjects
          </li>
          <li className="flex gap-2">
            <span className="text-primary-600 dark:text-primary-400">Section III</span> — General Test
          </li>
        </ul>
        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
          Refer to the latest NTA information bulletin for the authoritative syllabus.
        </p>
      </div>
    </section>
  );
}
