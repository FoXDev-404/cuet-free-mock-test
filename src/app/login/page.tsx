"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      <div className="card">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-brand-50 mb-1">Log in</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">Continue to your workspace.</p>
        <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
          <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
              <input type="checkbox" className="rounded text-brand-600 focus:ring-brand-500" />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline dark:text-brand-400">Forgot password?</Link>
          </div>
          <Button variant="brand" className="w-full" type="submit">Log in</Button>
        </form>
        <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400 text-center">
          New to CUETFreeMockTest?{" "}
          <Link href="/register" className="text-brand-600 hover:underline dark:text-brand-400 font-medium">Create an account</Link>
        </p>
      </div>
    </section>
  );
}
