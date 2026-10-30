"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Bookmark, X, BookOpen, ArrowRight } from "lucide-react";

interface BookmarkItem {
  id: string;
  stemEn: string;
  subject: string;
  topic: string | null;
  testId?: string;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bookmarks");
        if (!res.ok) throw new Error("Failed to load bookmarks");
        const data = await res.json();
        setBookmarks(data);
      } catch {}
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const removeBookmark = async (id: string) => {
    try {
      await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch {}
  };

  if (loading) return <section className="py-12 container-page"><div className="card text-center py-20"><p className="text-neutral-600 dark:text-neutral-400">Loading bookmarks…</p></div></section>;

  return (
    <section className="py-8 container-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Bookmarks</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Your saved questions for quick revision.</p>
        </div>
        <span className="badge badge-primary">{bookmarks.length} saved</span>
      </div>

      {bookmarks.length === 0 ? (
        <div className="card text-center py-16">
          <Bookmark className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No bookmarks yet</h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">Bookmark questions while practicing to save them here.</p>
          <Link href="/practice" className="btn-brand inline-flex">Start Practicing</Link>
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle>Bookmarked Questions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bookmarks.map((b) => (
                <div key={b.id} className="flex items-start justify-between gap-4 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-2">{b.stemEn}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{b.subject}</span>
                      {b.topic && <span>{b.topic}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {b.testId && <Link href={`/mock-tests/${b.testId}/take`} className="btn-soft text-sm">Practice</Link>}
                    <button onClick={() => removeBookmark(b.id)} className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-red-500 transition-colors" aria-label="Remove bookmark"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}