import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
      <div className="container-page py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5 lg:gap-12">
          <div className="col-span-2 md:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-neutral-900 dark:text-white mb-4" aria-label="CUETFreeMockTest.com home">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">CF</span>
              <span className="tracking-tight">
                CUET<span className="font-extrabold text-secondary-500 dark:text-secondary-400">FreeMockTest</span>
                <span className="font-medium text-neutral-400 dark:text-neutral-500">.com</span>
              </span>
            </Link>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm max-w-xs mb-6 leading-relaxed">
              Free CUET (UG) mock tests, practice questions, PYQs and performance tracking.
              Build your own subject combination and get instant analysis.
            </p>
            <div className="flex gap-4">
              <a href="https://t.me/" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" aria-label="Telegram Channel">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M21.8 4.2a1.5 1.5 0 0 0-1.6-.3L2.9 10.5c-1.2.5-1.2 1.2-.2 1.5l4.4 1.4 1.7 5.3c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.1-2 4.4 3.2c.8.5 1.4.2 1.6-.7l2.9-13.8c.2-.9-.1-1.3-.7-1.5ZM8 13.1l9.7-6.1c.5-.3.9-.1.5.2l-8 7.2-.3 3.3L8 13.1Z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" aria-label="Twitter">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 13-14.5"/></svg>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" aria-label="GitHub">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.804 2.807 1.28 3.431.977.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.305-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.142 3.296-1.23 3.296-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 11.337 24 6.702 24 12c0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Platform</h3>
            <ul className="space-y-3">
              <li><Link href="/mock-tests" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Mock Tests</Link></li>
              <li><Link href="/practice" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Practice</Link></li>
              <li><Link href="/pyq" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">PYQs</Link></li>
              <li><Link href="/dashboard" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Dashboard</Link></li>
              <li><Link href="/categories" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Categories</Link></li>
              <li><Link href="/bookmarks" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Bookmarks</Link></li>
              <li><Link href="/incorrect" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Incorrect Bank</Link></li>
              <li><Link href="/analytics" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Analytics</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Resources</h3>
            <ul className="space-y-3">
              <li><Link href="/cuet-syllabus" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">CUET Syllabus</Link></li>
              <li><Link href="/cuet-exam-pattern" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Exam Pattern</Link></li>
              <li><Link href="/blog" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Blog</Link></li>
              <li><Link href="/about" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">About</Link></li>
              <li><Link href="/contact" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Contact</Link></li>
              <li><Link href="/free-resources" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Free Resources</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link href="/privacy-policy" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/disclaimer" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-200 dark:border-neutral-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">© {new Date().getFullYear()} CUETFreeMockTest. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy-policy" className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Terms & Conditions</Link>
              <Link href="/disclaimer" className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Disclaimer</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}