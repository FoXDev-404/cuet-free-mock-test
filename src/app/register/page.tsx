"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword, terms }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
      } else {
        setSuccess("Account created. You can now log in.");
        setName(""); setEmail(""); setPassword(""); setConfirmPassword(""); setTerms(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      <div className="card">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-brand-50 mb-1">Create account</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">Your personal workspace starts here.</p>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm border border-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded bg-brand-50 text-brand-700 text-sm border border-brand-100">
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" placeholder="6+ characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Input label="Confirm password" type="password" placeholder="Repeat password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          <label className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            I agree to the <Link href="/terms" className="text-brand-600 hover:underline dark:text-brand-400">Terms</Link> and{" "}
            <Link href="/privacy-policy" className="text-brand-600 hover:underline dark:text-brand-400">Privacy Policy</Link>
          </label>
          <Button variant="brand" className="w-full" disabled={loading || !terms} type="submit">
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-600 hover:underline dark:text-brand-400 font-medium">Log in</Link>
        </p>
      </div>
    </section>
  );
}
