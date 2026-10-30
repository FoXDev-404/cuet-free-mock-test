"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Menu, X, Sun, Moon, BookOpen, LayoutDashboard,
  FlaskConical, History, FolderOpen, Bookmark, XCircle,
  TrendingUp, Settings, LogOut, User, ChevronDown, GraduationCap,
  Target, Shield,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";

const primaryNav = [
  { href: "/mock-tests", label: "Mock Tests", icon: FlaskConical },
  { href: "/practice", label: "Practice", icon: BookOpen },
  { href: "/pyq", label: "PYQs", icon: History },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: TrendingUp },
] as const;

const drawerNav = [
  { href: "/", label: "Home", icon: Target },
  { href: "/mock-tests", label: "Mock Tests", icon: FlaskConical },
  { href: "/practice", label: "Practice", icon: BookOpen },
  { href: "/pyq", label: "Previous Year Questions", icon: History },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mock-history", label: "Mock History", icon: History },
  { href: "/categories", label: "Categories", icon: FolderOpen },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/incorrect", label: "Incorrect Bank", icon: XCircle },
  { href: "/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const userMenuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mock-history", label: "Mock History", icon: History },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/incorrect", label: "Incorrect Bank", icon: XCircle },
  { href: "/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      <Sun className="h-5 w-5 dark:hidden" aria-hidden="true" />
      <Moon className="hidden h-5 w-5 dark:block" aria-hidden="true" />
    </button>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;

    const menuButton = mobileMenuButtonRef.current;
    drawerRef.current?.querySelector<HTMLButtonElement>("[data-drawer-close]")?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      menuButton?.focus();
    };
  }, [drawerOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const handleSignOut = () => signOut({ callbackUrl: "/" });

  return (
    <>
      {/* Mobile drawer */}
      <aside
        ref={drawerRef}
        id="mobile-navigation-drawer"
        role="dialog"
        aria-modal={drawerOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 max-w-[88vw] border-r border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900",
          "transform transition-transform duration-300 ease-in-out lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Navigation menu"
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[4.5rem] items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
            <Link href="/" onClick={() => setDrawerOpen(false)} className="flex min-w-0 items-center gap-2.5" aria-label="CUETFreeMockTest.Com home">
              <span className="home-brand-mark"><GraduationCap className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-sm font-bold tracking-tight text-neutral-900 dark:text-white">CUET<span className="font-extrabold text-secondary-600 dark:text-secondary-400">FreeMockTest.Com</span></span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">Practice with purpose</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Close menu"
              data-drawer-close
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation">
            {drawerNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                )}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-neutral-200 p-5 dark:border-neutral-800">
            {session?.user ? (
              <>
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40">
                    <User className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{session.user?.email}</p>
                    <p className="text-xs capitalize text-neutral-500 dark:text-neutral-400">
                      {session.user?.role?.toLowerCase() || "user"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" className="btn-outline w-full justify-center">Log in</Link>
                <Link href="/register" className="btn-brand w-full justify-center">Create account</Link>
              </div>
            )}
          </div>
        </div>
      </aside>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-950/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <header className="sticky top-0 z-30 w-full border-b border-neutral-200/75 bg-white/90 shadow-[0_1px_12px_rgba(15,23,42,0.035)] backdrop-blur-xl dark:border-neutral-800/75 dark:bg-neutral-950/90">
        <div className="container-page">
          <div className="flex h-[4.5rem] items-center justify-between gap-4">
            <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="CUETFreeMockTest.Com home">
              <span className="home-brand-mark"><GraduationCap className="h-5 w-5" aria-hidden="true" /></span>
              <span className="hidden min-[390px]:block">
                <span className="block whitespace-nowrap text-sm font-bold tracking-tight text-neutral-900 dark:text-white sm:text-base">CUET<span className="font-extrabold text-secondary-600 dark:text-secondary-400">FreeMockTest.Com</span></span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">Practice with purpose</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1.5">
              <ThemeToggle />

              {!session?.user && (
                <Link href="/mock-tests" className="hidden rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 lg:inline-flex">
                  Start a mock
                </Link>
              )}

              <button
                type="button"
                ref={mobileMenuButtonRef}
                onClick={() => setDrawerOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 lg:hidden"
                aria-label="Open menu"
                aria-expanded={drawerOpen}
                aria-controls="mobile-navigation-drawer"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden items-center gap-1.5 lg:flex">
                {session?.user ? (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen((o) => !o)}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      aria-expanded={userMenuOpen}
                      aria-haspopup="menu"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40">
                        <User className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                      </span>
                      <span className="max-w-[140px] truncate">{session.user.email}</span>
                      <ChevronDown className="h-4 w-4 text-neutral-400" />
                    </button>

                    {userMenuOpen && (
                      <div
                        className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
                        role="menu"
                      >
                        {userMenuItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setUserMenuOpen(false)}
                            role="menuitem"
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                          >
                            <item.icon className="h-4 w-4 text-neutral-400" />
                            {item.label}
                          </Link>
                        ))}
                        {(session?.user as { role?: string } | undefined)?.role === "ADMIN" && (
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            role="menuitem"
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/30"
                          >
                            <Shield className="h-4 w-4" />
                            Admin Panel
                          </Link>
                        )}
                        <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
                        <button
                          type="button"
                          onClick={handleSignOut}
                          role="menuitem"
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                    >
                      Log in
                    </Link>
                    <Link href="/register" className="btn-brand whitespace-nowrap px-4 py-2 text-sm">
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
