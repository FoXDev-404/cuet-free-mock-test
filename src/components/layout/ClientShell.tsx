"use client";

import { SessionProvider } from "@/components/SessionProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toast";

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-dark flex flex-col">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
        <Toaster />
      </div>
    </SessionProvider>
  );
}
