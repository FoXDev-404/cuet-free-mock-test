"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, Users, TrendingUp, ArrowRight, Search } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string;
  sectionType: string;
  description: string | null;
  _count: { questions: number };
}

export default function CategoriesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/subjects");
        if (!res.ok) throw new Error("Failed to load subjects");
        const data = await res.json();
        setSubjects(data);
      } catch {}
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const sectionLabels: Record<string, string> = {
    LANGUAGE: "Section IA & IB - Languages",
    DOMAIN: "Section II - Domain Subjects",
    GENERAL_TEST: "Section III - General Test",
  };

  const grouped = subjects.reduce((acc, s) => {
    const key = sectionLabels[s.sectionType] || s.sectionType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, Subject[]>);

  if (loading) return <section className="py-12 container-page"><div className="card text-center py-20"><p className="text-neutral-600 dark:text-neutral-400">Loading categories…</p></div></section>;

  return (
    <section className="py-8 container-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Categories</h1>
        <p className="text-neutral-600 dark:text-neutral-400">Browse subjects and chapters to find practice questions and mock tests.</p>
      </div>

      {Object.entries(grouped).map(([section, items]) => (
        <div key={section} className="mb-12">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500" />
            {section}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((s) => (
              <Link key={s.id} href={`/practice?subject=${s.code}`} className="group card p-5 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{s.code}</span>
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{s._count.questions} questions</span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-2">{s.name}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4">{s.description || `Practice ${s.name} questions and take mock tests.`}</p>
                <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Explore</span>
                  <ArrowRight className="h-4 w-4 text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {subjects.length === 0 && (
        <div className="card text-center py-16">
          <BookOpen className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No subjects yet</h3>
          <p className="text-neutral-500 dark:text-neutral-400">Subjects will appear here once added by admin.</p>
        </div>
      )}
    </section>
  );
}