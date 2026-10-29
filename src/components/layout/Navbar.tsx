"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, User, Zap, BookOpen, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/mock-tests", label: "Mock Tests" },
  { href: "/practice", label: "Practice" },
  { href: "/pyq", label: "PYQs" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="container-page flex items-center justify-between h-16">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-brand-600 dark:text-brand-400"
        >
          <span className="rounded bg-brand-600 px-2 py-1 text-xs font-bold text-white">C</span>
          <span className="tracking-tight">CUET<span className="text-brand-600 dark:text-brand-400">FreeMock</span>Test</span>
        </Link>

        <div className="flex items-center gap-6 md:gap-8">
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition",
                  pathname === item.href
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-neutral-600 hover:text-brand-600 dark:text-neutral-300 dark:hover:text-brand-400"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="btn-ghost">
              Log in
            </Link>
            <Link href="/register" className="btn-brand btn-sm">
              Register
            </Link>
          </div>

          <button className="md:hidden p-2 rounded-md text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
