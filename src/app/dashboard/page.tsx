export default function DashboardPage() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-brand-50 mb-2">Dashboard</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        Track your attempts, accuracy, weak topics, and progress over time.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Attempts</div>
          <div className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">0</div>
        </div>
        <div className="card">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Accuracy</div>
          <div className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">--%</div>
        </div>
        <div className="card">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Est. Percentile</div>
          <div className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">--</div>
        </div>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Recent activity</h2>
        <p className="text-neutral-500 dark:text-neutral-400">No attempts yet. Start a mock test to see your activity here.</p>
      </div>
    </section>
  );
}
