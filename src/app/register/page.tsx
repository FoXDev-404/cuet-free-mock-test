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

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      <div className="card">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-brand-50 mb-1">Create account</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">Your personal workspace starts here.</p>
        <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
          <Input label="Full name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" placeholder="6+ characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input label="Confirm password" type="password" placeholder="Repeat password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
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
          <Button variant="brand" className="w-full" disabled={!terms} type="submit">Create account</Button>
        </form>
        <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-600 hover:underline dark:text-brand-400 font-medium">Log in</Link>
        </p>
      </div>
    </section>
  );
}
