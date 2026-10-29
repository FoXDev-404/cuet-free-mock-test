"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : Array.isArray(params?.token) ? params.token[0] : "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setMessageType("error");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Password reset successful. You can now log in.");
        setMessageType("success");
      } else {
        setMessage(data.error || "Failed to reset password. The link may be invalid or expired.");
        setMessageType("error");
      }
    } catch {
      setMessage("Failed to reset password. The link may be invalid or expired.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <section className="py-12 container-page max-w-md mx-auto">
        <div className="card p-6 lg:p-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Reset Password</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">Invalid or missing reset token.</p>
          <Link href="/forgot-password" className="btn-brand inline-flex">Request New Link</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 container-page max-w-md mx-auto">
      <div className="card p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Reset Password</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">Enter your new password below.</p>
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm border ${messageType === "success" ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900" : "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900"}`}>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="New Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <Input label="Confirm Password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
          <Button variant="brand" className="w-full" type="submit" disabled={loading}>
            {loading ? "Resetting…" : "Reset Password"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400 text-center">
          Already have a password?{" "}
          <Link href="/login" className="text-primary-600 hover:underline dark:text-primary-400 font-medium">Log in</Link>
        </p>
      </div>
    </section>
  );
}