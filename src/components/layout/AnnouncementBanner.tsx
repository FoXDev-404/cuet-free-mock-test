"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Megaphone, X } from "lucide-react";

type Announcement = { id: string; title: string; body: string };

export function AnnouncementBanner() {
  const pathname = usePathname();
  const [items, setItems] = useState<Announcement[]>([]);
  const hidden = pathname?.startsWith("/admin") || /\/take$/.test(pathname ?? "");

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const dismissed = readDismissed();
        setItems(
          (Array.isArray(data.announcements) ? data.announcements : []).filter(
            (item: Announcement) => !dismissed.includes(item.id),
          ),
        );
      } catch {
        /* announcements are non-critical */
      }
    })();
    return () => { cancelled = true; };
  }, [hidden]);

  if (hidden || items.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...readDismissed(), id].slice(-20);
    try {
      localStorage.setItem("cuet-dismissed-announcements", JSON.stringify(next));
    } catch {}
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="border-b border-primary-100 bg-primary-50 dark:border-primary-900 dark:bg-primary-950/60">
      <div className="container-page flex flex-col gap-1 py-2 text-sm text-primary-900 dark:text-primary-100">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            <p className="min-w-0 flex-1 break-words">
              <span className="font-semibold">{item.title}: </span>
              {item.body}
            </p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="shrink-0 rounded p-1 text-primary-600 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-900"
              aria-label={`Dismiss announcement: ${item.title}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem("cuet-dismissed-announcements");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
