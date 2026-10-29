import Link from "next/link";

export default function MockTestsPage() {
  const subjects = [
    { name: "Computer Science", code: "CS", questions: 0 },
    { name: "Physics", code: "PHY", questions: 0 },
    { name: "Chemistry", code: "CHE", questions: 0 },
    { name: "Mathematics", code: "MATH", questions: 0 },
    { name: "Biology", code: "BIO", questions: 0 },
    { name: "English", code: "EN", questions: 0 },
    { name: "General Test", code: "GT", questions: 0 },
    { name: "Economics", code: "ECO", questions: 0 },
  ];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-brand-50">Mock Tests</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Full-length, subject-wise, chapter-wise and PYQ tests with CUET marking scheme (+5 / -1 / 0).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s) => (
          <Link
            key={s.code}
            href={`/mock-tests/${s.code}`}
            className="group block p-5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider group-hover:text-brand-600 dark:group-hover:text-brand-400">
                {s.code}
              </span>
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                {s.questions} questions
              </span>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">
              {s.name}
            </h3>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
              Full-length CUET mock covering {s.name} syllabus.
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-10 border-t border-neutral-200 pt-8 dark:border-neutral-800">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
          Test types
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Full-Length Mock", desc: "All sections, timed" },
            { label: "Subject-Wise", desc: "Single subject focus" },
            { label: "Chapter-Wise", desc: "Single chapter focus" },
            { label: "PYQ Year-Wise", desc: "Previous year questions" },
            { label: "General Test", desc: "GA + reasoning + quant" },
          ].map((t) => (
            <div key={t.label} className="p-4 rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/30">
              <div className="text-sm font-semibold text-neutral-900 dark:text-white">{t.label}</div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
