import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { actionsFor, normalizeRole, type AdminAction } from "@/lib/auth/permissions";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import { AdminNav } from "./_components/admin-nav";

export const metadata: Metadata = {
  title: "Admin Studio",
  robots: NOINDEX_ROBOTS,
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = normalizeRole((session?.user as { role?: string } | undefined)?.role);
  const granted: readonly AdminAction[] = actionsFor(role);
  const email = (session?.user as { email?: string } | undefined)?.email ?? null;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0 lg:border-r lg:border-neutral-200 lg:dark:border-neutral-800">
          {/* Sticky nav keeps spec navigation available on all studio pages. */}
          <div className="lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto lg:py-8 lg:pr-4">
            <AdminNav
              role={role === "USER" ? "USER" : role}
              email={email}
              actions={granted as unknown as string[]}
            />
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
