"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : Array.isArray(params?.token) ? params.token[0] : "";
  const [loading, setLoading] = useState(!token);
  const [message, setMessage] = useState(token ? "" : "No verification token provided.");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setMessage(data.message || "Email verified successfully! You can now log in.");
          setSuccess(true);
        } else {
          setMessage(data.error || "Verification failed. The link may be invalid or expired.");
          setSuccess(false);
        }
      })
      .catch(() => {
        setMessage("Verification failed. Please try again.");
        setSuccess(false);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <section className="py-12 container-page max-w-md mx-auto">
        <div className="card text-center py-20">
          <div className="animate-spin mx-auto h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full" />
          <p className="mt-6 text-neutral-600 dark:text-neutral-400">Verifying email…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 container-page max-w-md mx-auto">
      <div className="card text-center p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
          {success ? "Email Verified" : "Verification Failed"}
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">{message}</p>
        <Button variant="brand" onClick={() => router.push("/login")}>
          Go to Login
        </Button>
      </div>
    </section>
  );
}