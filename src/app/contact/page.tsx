"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      <div className="card">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-brand-50 mb-1">Contact us</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">Have a question or feedback? Reach us at support@cuetfreemocktest.com.</p>
        <form onSubmit={(e) => { e.preventDefault(); setSubmitting(true); setTimeout(() => setSubmitting(false), 800); }} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Textarea label="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button variant="brand" className="w-full" disabled={submitting} type="submit">
            {submitting ? "Sending…" : "Send message"}
          </Button>
        </form>
      </div>
    </section>
  );
}
