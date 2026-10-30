import Link from "next/link";
import { ArrowUpRight, GraduationCap } from "lucide-react";

const footerGroups = [
  {
    title: "Study",
    links: [
      { label: "Mock tests", href: "/mock-tests" },
      { label: "Practice questions", href: "/practice" },
      { label: "Previous year questions", href: "/pyq" },
      { label: "Performance analytics", href: "/analytics" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Subjects & categories", href: "/categories" },
      { label: "CUET syllabus", href: "/cuet-syllabus" },
      { label: "Exam pattern", href: "/cuet-exam-pattern" },
      { label: "Preparation guides", href: "/blog" },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Log in", href: "/login" },
      { label: "Create an account", href: "/register" },
      { label: "Contact us", href: "/contact" },
    ],
  },
];

const legalLinks = [
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms" },
  { label: "Disclaimer", href: "/disclaimer" },
];

export function Footer() {
  return (
    <footer className="border-t border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="container-page py-12 sm:py-14 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)] lg:gap-12">
          <div className="max-w-sm sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="CUETFreeMockTest.Com home">
              <span className="home-brand-mark"><GraduationCap className="h-5 w-5" aria-hidden="true" /></span>
              <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                CUET<span className="font-extrabold text-secondary-600 dark:text-secondary-400">FreeMockTest.Com</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              A focused space for CUET (UG) practice, mock tests, and revision—built to help you keep moving forward.
            </p>
            <Link href="/about" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-600 dark:text-primary-300 dark:hover:text-primary-200">
              About the platform <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-neutral-600 transition-colors hover:text-primary-700 dark:text-neutral-400 dark:hover:text-primary-300">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-neutral-200 pt-6 dark:border-neutral-800 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">© {new Date().getFullYear()} CUETFreeMockTest.Com. All rights reserved.</p>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Independent learning resource · Not affiliated with NTA</p>
          </div>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-xs font-medium text-neutral-500 transition-colors hover:text-primary-700 dark:text-neutral-400 dark:hover:text-primary-300">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
