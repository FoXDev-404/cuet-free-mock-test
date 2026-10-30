"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Info, Search, Trash2, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  body: string;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
};

type ExamInfo = {
  id: string;
  key: string;
  label: string;
  value: string;
  sourceUrl: string | null;
  lastVerified: string | null;
  updatedAt: string;
};

type PageSeo = {
  id: string;
  path: string;
  title: string | null;
  description: string | null;
  introContent: string | null;
  faqJson: string | null;
  updatedAt: string;
};

type Tab = "announcements" | "exam-info" | "seo";

export default function AdminContentPage() {
  const [tab, setTab] = useState<Tab>("announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [examInfo, setExamInfo] = useState<ExamInfo[]>([]);
  const [seo, setSeo] = useState<PageSeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [annForm, setAnnForm] = useState({ title: "", body: "", startsAt: "", endsAt: "" });
  const [infoForm, setInfoForm] = useState({ key: "", label: "", value: "", sourceUrl: "", lastVerified: "" });
  const [seoForm, setSeoForm] = useState({ path: "/", title: "", description: "", introContent: "", faqJson: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, e, s] = await Promise.all([
        fetch("/api/admin/announcements"),
        fetch("/api/admin/exam-info"),
        fetch("/api/admin/seo"),
      ]);
      if (a.ok) setAnnouncements((await a.json()).announcements ?? []);
      if (e.ok) setExamInfo((await e.json()).entries ?? []);
      if (s.ok) setSeo((await s.json()).pages ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const request = async (url: string, method: string, body?: unknown) => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Request failed");
      setMessage("Saved.");
      await load();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editAnnouncement = (item: Announcement) => {
    setAnnForm({
      title: item.title,
      body: item.body,
      startsAt: item.startsAt ? item.startsAt.slice(0, 16) : "",
      endsAt: item.endsAt ? item.endsAt.slice(0, 16) : "",
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Site content</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Announcements, verified exam facts and per-page SEO overrides. Every change is audited.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-neutral-200 p-1 dark:border-neutral-700">
        {([
          { id: "announcements", label: "Announcements", icon: Megaphone },
          { id: "exam-info", label: "Exam info", icon: Info },
          { id: "seo", label: "SEO pages", icon: Search },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium",
              tab === item.id ? "bg-primary-600 text-white" : "text-neutral-600 dark:text-neutral-300",
            )}
          >
            <item.icon className="h-4 w-4" /> {item.label}
          </button>
        ))}
      </div>

      {message ? <p className="mb-3 rounded-lg bg-neutral-100 p-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{message}</p> : null}
      {loading ? <div className="card p-10 text-center text-neutral-500">Loading content…</div> : null}

      {!loading && tab === "announcements" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">New announcement</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input className="input" placeholder="Title" maxLength={160} value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} />
              <textarea className="input min-h-24" placeholder="Body" maxLength={2000} value={annForm.body} onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-neutral-500">Starts (optional)
                  <input type="datetime-local" className="input mt-1" value={annForm.startsAt} onChange={(e) => setAnnForm({ ...annForm, startsAt: e.target.value })} />
                </label>
                <label className="text-xs text-neutral-500">Ends (optional)
                  <input type="datetime-local" className="input mt-1" value={annForm.endsAt} onChange={(e) => setAnnForm({ ...annForm, endsAt: e.target.value })} />
                </label>
              </div>
              <Button
                variant="brand"
                disabled={saving || !annForm.title.trim() || !annForm.body.trim()}
                onClick={async () => {
                  const ok = await request("/api/admin/announcements", "POST", {
                    title: annForm.title,
                    body: annForm.body,
                    startsAt: annForm.startsAt ? new Date(annForm.startsAt).toISOString() : null,
                    endsAt: annForm.endsAt ? new Date(annForm.endsAt).toISOString() : null,
                  });
                  if (ok) setAnnForm({ title: "", body: "", startsAt: "", endsAt: "" });
                }}
              >
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Publish
              </Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {announcements.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900 dark:text-white">{item.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">{item.body}</p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {item.isActive ? "Active" : "Inactive"}
                        {item.startsAt ? ` · from ${new Date(item.startsAt).toLocaleDateString()}` : ""}
                        {item.endsAt ? ` · to ${new Date(item.endsAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button className="btn-outline px-2 py-1 text-xs" onClick={() => editAnnouncement(item)}>Load</button>
                      <button className="btn-outline px-2 py-1 text-xs" onClick={() => request(`/api/admin/announcements/${item.id}`, "PATCH", { isActive: !item.isActive })}>{item.isActive ? "Pause" : "Activate"}</button>
                      <button className="btn-outline px-2 py-1 text-xs text-red-600" aria-label="Delete announcement" onClick={() => { if (window.confirm("Delete this announcement?")) void request(`/api/admin/announcements/${item.id}`, "DELETE"); }}><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {announcements.length === 0 ? <div className="card p-8 text-center text-sm text-neutral-500">No announcements yet.</div> : null}
          </div>
        </div>
      ) : null}

      {!loading && tab === "exam-info" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Verified exam fact</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input className="input" placeholder="key (e.g. important-dates)" value={infoForm.key} onChange={(e) => setInfoForm({ ...infoForm, key: e.target.value })} />
              <input className="input" placeholder="Label" value={infoForm.label} onChange={(e) => setInfoForm({ ...infoForm, label: e.target.value })} />
              <textarea className="input min-h-40 font-mono text-xs" placeholder="Value (plain text; one fact per line)" value={infoForm.value} onChange={(e) => setInfoForm({ ...infoForm, value: e.target.value })} />
              <input className="input" placeholder="Official source URL" value={infoForm.sourceUrl} onChange={(e) => setInfoForm({ ...infoForm, sourceUrl: e.target.value })} />
              <label className="block text-xs text-neutral-500">Last verified
                <input type="date" className="input mt-1" value={infoForm.lastVerified} onChange={(e) => setInfoForm({ ...infoForm, lastVerified: e.target.value })} />
              </label>
              <Button variant="brand" disabled={saving || !infoForm.key || !infoForm.label || !infoForm.value} onClick={async () => {
                const ok = await request("/api/admin/exam-info", "POST", {
                  key: infoForm.key,
                  label: infoForm.label,
                  value: infoForm.value,
                  sourceUrl: infoForm.sourceUrl || null,
                  lastVerified: infoForm.lastVerified ? new Date(`${infoForm.lastVerified}T00:00:00Z`).toISOString() : undefined,
                });
                if (ok) setInfoForm({ key: "", label: "", value: "", sourceUrl: "", lastVerified: "" });
              }}>{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save fact</Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {examInfo.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900 dark:text-white">{item.label} <span className="font-mono text-xs text-neutral-400">{item.key}</span></p>
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">{item.value}</p>
                      <p className="mt-1 text-xs text-neutral-400">{item.lastVerified ? `verified ${new Date(item.lastVerified).toLocaleDateString()}` : "unverified"}{item.sourceUrl ? " · source linked" : ""}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button className="btn-outline px-2 py-1 text-xs" onClick={() => setInfoForm({ key: item.key, label: item.label, value: item.value, sourceUrl: item.sourceUrl ?? "", lastVerified: item.lastVerified ? item.lastVerified.slice(0, 10) : "" })}>Load</button>
                      <button className="btn-outline px-2 py-1 text-xs text-red-600" aria-label="Delete exam info" onClick={() => { if (window.confirm("Delete this entry?")) void request(`/api/admin/exam-info/${item.id}`, "DELETE"); }}><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && tab === "seo" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Page SEO override</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input className="input" placeholder="/cuet-important-dates" value={seoForm.path} onChange={(e) => setSeoForm({ ...seoForm, path: e.target.value })} />
              <input className="input" placeholder="Title override" maxLength={160} value={seoForm.title} onChange={(e) => setSeoForm({ ...seoForm, title: e.target.value })} />
              <textarea className="input min-h-20" placeholder="Meta description override" maxLength={320} value={seoForm.description} onChange={(e) => setSeoForm({ ...seoForm, description: e.target.value })} />
              <textarea className="input min-h-28" placeholder="Intro content (optional, HTML-free text)" value={seoForm.introContent} onChange={(e) => setSeoForm({ ...seoForm, introContent: e.target.value })} />
              <textarea className="input min-h-28 font-mono text-xs" placeholder='FAQ JSON: [{"question":"…","answer":"…"}]' value={seoForm.faqJson} onChange={(e) => setSeoForm({ ...seoForm, faqJson: e.target.value })} />
              <Button variant="brand" disabled={saving || !seoForm.path} onClick={async () => {
                const ok = await request("/api/admin/seo", "POST", {
                  path: seoForm.path,
                  title: seoForm.title || null,
                  description: seoForm.description || null,
                  introContent: seoForm.introContent || null,
                  faqJson: seoForm.faqJson || null,
                });
                if (ok) setSeoForm({ path: "/", title: "", description: "", introContent: "", faqJson: "" });
              }}>{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save override</Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {seo.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-neutral-900 dark:text-white">{item.path}</p>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{item.title ?? "No title override"}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-400">{item.description ?? "No description override"}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button className="btn-outline px-2 py-1 text-xs" onClick={() => setSeoForm({ path: item.path, title: item.title ?? "", description: item.description ?? "", introContent: item.introContent ?? "", faqJson: item.faqJson ?? "" })}>Load</button>
                      <button className="btn-outline px-2 py-1 text-xs text-red-600" aria-label="Delete SEO override" onClick={() => { if (window.confirm("Delete this SEO override?")) void request(`/api/admin/seo/${item.id}`, "DELETE"); }}><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {seo.length === 0 ? <div className="card p-8 text-center text-sm text-neutral-500">No SEO overrides yet. Pages use their built-in metadata.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
