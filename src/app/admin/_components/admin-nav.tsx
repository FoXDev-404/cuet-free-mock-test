"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Database,
  FileStack,
  GraduationCap,
  LayoutDashboard,
  ListTree,
  LogOut,
  ShieldCheck,
  Sigma,
  Trophy,
  Upload,
  Users,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: string | null; // any studio session when null
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { href: "/admin/academic", label: "Academic Tree", icon: ListTree, permission: "ACADEMIC_READ" },
  { href: "/admin/question-bank", label: "Question Bank", icon: FileStack, permission: "QUESTION_READ" },
  { href: "/admin/imports", label: "Import Studio", icon: Upload, permission: "IMPORT_RUN" },
  { href: "/admin/builder", label: "Test Builder", icon: GraduationCap, permission: "TEST_WRITE" },
  { href: "/admin/leaderboards", label: "Leaderboards", icon: Trophy, permission: "LEADERBOARD_READ" },
  { href: "/admin/students", label: "Students", icon: Users, permission: "STUDENT_READ" },
  { href: "/admin/analytics", label: "Analytics", icon: Sigma, permission: "ANALYTICS_READ" },
  { href: "/admin/audit", label: "Audit Log", icon: ShieldCheck, permission: "AUDIT_READ" },
  { href: "/admin/database", label: "Database Tools", icon: Database, permission: "DATABASE_TOOLS" },
];

export function AdminNav({
  role,
  email,
  actions,
}: {
  role: string;
  email: string | null;
  actions: readonly string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = (item: NavItem) =>
    item.permission === null || actions.includes(item.permission);

  const visible = NAV.filter(allowed);

  if (role === "USER") {
    return (
      <div className="card p-5 text-sm">
        <ShieldCheck className="mb-2 h-5 w-5 text-danger-600" />
        <p className="font-semibold text-neutral-900 dark:text-white">Studio restricted</p>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">Your role has no admin grants. Sign in with an admin account.</p>
        <button
          className="btn-brand mt-3 w-full text-sm"
          onClick={() => router.push("/login")}
        >
          Go to sign-in
        </button>
      </div>
    );
  }

  return (
    <nav aria-label="Admin navigation" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
      <div className="mb-4 hidden px-2 lg:block">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Exam Studio</p>
        <p className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-300">{email ?? "Signed in"}</p>
        <p className="text-xs text-neutral-400">{role}</p>
      </div>
      {visible.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition lg:shrink ${
              active
                ? "bg-primary-600 text-white dark:bg-primary-500"
                : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      <button
        className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 lg:mt-4 dark:text-neutral-400 dark:hover:bg-neutral-800"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </nav>
  );
}
