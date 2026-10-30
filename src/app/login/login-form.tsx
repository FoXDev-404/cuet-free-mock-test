"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

// The callback URL is resolved on the server (login/page.tsx) and passed as a
// prop; reading it here with useSearchParams would suspend this client tree
// and have React mount the form more than once, which breaks hydration-based
// interactivity (clicks before the second mount are silently dropped).
export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Log in</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">Continue to your workspace.</p>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm border border-red-100">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
              <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500" />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-xs text-primary-600 hover:underline dark:text-primary-400">Forgot password?</Link>
          </div>
          <Button variant="brand" className="w-full" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Log in"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400 text-center">
          New to CUETFreeMockTest?{" "}
          <Link href="/register" className="text-primary-600 hover:underline dark:text-primary-400 font-medium">Create an account</Link>
        </p>
      </div>
    </section>
  );
}
