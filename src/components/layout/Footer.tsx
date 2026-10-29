import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="container-page py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-brand-600 dark:text-brand-400">
              <span className="rounded bg-brand-600 px-2 py-1 text-xs font-bold text-white">C</span>
              CUET<span className="text-brand-600 dark:text-brand-400">FreeMock</span>Test
            </Link>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              Free CUET (UG) mock tests and practice platform. Not affiliated with NTA.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <li><Link href="/mock-tests" className="hover:text-brand-600 dark:hover:text-brand-400">Mock Tests</Link></li>
              <li><Link href="/practice" className="hover:text-brand-600 dark:hover:text-brand-400">Practice</Link></li>
              <li><Link href="/pyq" className="hover:text-brand-600 dark:hover:text-brand-400">PYQs</Link></li>
              <li><Link href="/dashboard" className="hover:text-brand-600 dark:hover:text-brand-400">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <li><Link href="/cuet-syllabus" className="hover:text-brand-600 dark:hover:text-brand-400">Syllabus</Link></li>
              <li><Link href="/cuet-exam-pattern" className="hover:text-brand-600 dark:hover:text-brand-400">Exam Pattern</Link></li>
              <li><Link href="/blog" className="hover:text-brand-600 dark:hover:text-brand-400">Blog</Link></li>
              <li><Link href="/about" className="hover:text-brand-600 dark:hover:text-brand-400">About</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <li><Link href="/contact" className="hover:text-brand-600 dark:hover:text-brand-400">Contact</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-brand-600 dark:hover:text-brand-400">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-brand-600 dark:hover:text-brand-400">Terms</Link></li>
              <li><Link href="/disclaimer" className="hover:text-brand-600 dark:hover:text-brand-400">Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            © {new Date().getFullYear()} CUETFreeMockTest. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-neutral-600 dark:text-neutral-400">
            <Link href="/privacy-policy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/disclaimer" className="hover:underline">Disclaimer</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
