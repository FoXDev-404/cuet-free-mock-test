"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isExamTake = /\/take$/.test(pathname ?? "");

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <div className="flex min-h-dvh flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          {!isExamTake && <Navbar />}
          <main id="main" className="flex-1">
            {children}
          </main>
          {!isExamTake && <Footer />}
          <Toaster />
        </div>
      </SessionProvider>
    </ThemeProvider>
  );
}