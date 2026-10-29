export default function ReportsPage() {
  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-primary-50 mb-2">Reports</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6">
        View and export reports on platform usage, test attempts, and user performance.
      </p>
      <div className="card">
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No reports available</h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Reports will be generated as users take mock tests and complete practice sessions.
          </p>
        </div>
      </div>
    </section>
  );
}
