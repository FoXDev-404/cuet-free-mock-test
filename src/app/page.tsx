import Link from "next/link";

export default function HomePage() {
  return (
    <section className="relative overflow-hidden bg-brand-50 dark:bg-neutral-900/50">
      <div className="container-page relative">
        <div className="grid lg:grid-cols-2 gap-10 items-center py-16 lg:py-24">
          <div>
            <h1 className="text-4xl lg:text-6xl font-bold text-neutral-900 dark:text-brand-50 tracking-tight leading-[1.1] mb-6">
              Prepare smarter.{" "}
              <span className="text-brand-600 dark:text-brand-400">Practice better.</span>{" "}
              Crack CUET (UG).
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-8 max-w-xl">
              Free CUET (UG) mock tests, subject-wise practice, previous year questions and performance tracking.
              Build your own subject combination and get instant analysis.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/mock-tests" className="btn-brand">
                Start a Mock Test
              </Link>
              <Link href="/practice" className="btn-outline">
                Browse Practice
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-400" aria-hidden="true" />
                Free to practice
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-400" aria-hidden="true" />
                Exam-focused config
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-400" aria-hidden="true" />
                Track your progress
              </span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Your preparation workspace</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-100 text-brand-700 text-xs font-medium dark:bg-brand-900/30 dark:text-brand-200">
                On track
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">32%</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Accuracy</div>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">0</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Attempts</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Practice questions</span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">0 / 60</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                <div className="h-full bg-brand-600" style={{ width: "0%" }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Mock tests</span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">0 / 3</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                <div className="h-full bg-brand-600" style={{ width: "0%" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-neutral-200 pt-8 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6 text-center">
            Cover the major subjects
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Computer Science", code: "CS" },
              { name: "Physics", code: "PHY" },
              { name: "Chemistry", code: "CHE" },
              { name: "Mathematics", code: "MATH" },
              { name: "Biology", code: "BIO" },
              { name: "English", code: "EN" },
              { name: "General Test", code: "GT" },
              { name: "Economics", code: "ECO" },
            ].map((s) => (
              <Link
                key={s.code}
                href={`/mock-tests?subject=${s.code}`}
                className="group block p-3 rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition text-center"
              >
                <span className="text-xs font-bold text-neutral-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 uppercase tracking-wider">
                  {s.code}
                </span>
                <span className="mt-1 block text-sm font-semibold text-neutral-900 dark:text-white">{s.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
