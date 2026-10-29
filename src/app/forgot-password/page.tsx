"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "If an account exists, a reset link has been sent to your email.");
        setMessageType("success");
      } else {
        setMessage(data.error || "Failed to send reset email. Please try again.");
        setMessageType("error");
      }
    } catch {
      setMessage("Failed to send reset email. Please try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-12 container-page max-w-md mx-auto">
      <div className="card p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Forgot Password</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">Enter your email and we'll send you a link to reset your password.</p>
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm border ${messageType === "success" ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900" : "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900"}`}>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button variant="brand" className="w-full" type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send Reset Link"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400 text-center">
          Remember your password?{" "}
          <Link href="/login" className="text-primary-600 hover:underline dark:text-primary-400 font-medium">Log in</Link>
        </p>
      </div>
    </section>
  );
}