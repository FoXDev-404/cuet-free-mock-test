"use client";

import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "toast flex items-center gap-3",
            t.type === "success" ? "toast-success" : "toast-error"
          )}
        >
          {t.type === "success" ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="font-medium">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="ml-auto opacity-50 hover:opacity-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
