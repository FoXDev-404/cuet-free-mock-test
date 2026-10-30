"use client";

import { useEffect, useState } from "react";

export interface HomeTest {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  isPublic: boolean;
  totalQuestions: number;
  durationMinutes: number;
  createdAt: string;
  config: string;
  subject: { id: string; name: string; code: string } | null;
  _count: { questions: number; attempts: number };
  /** Present on repo-backed 2022 draft papers. */
  localPaper?: boolean;
  draft?: boolean;
  sourceQuestionCount?: number;
  recoveredQuestionCount?: number;
  omittedQuestionCount?: number;
  scorableQuestionCount?: number;
  pendingReviewCount?: number;
}

export interface HomeSubject {
  id: string;
  name: string;
  code: string;
  sectionType: string;
  description: string | null;
  order: number;
  isActive?: boolean;
  _count: { questions: number };
}

type LoadState = "loading" | "ready" | "error";

const TEST_TYPE_LABELS: Record<string, string> = {
  FULL_LENGTH: "Full length",
  SUBJECT_WISE: "Subject wise",
  CHAPTER_WISE: "Chapter wise",
  PYQ_YEAR_WISE: "PYQ year wise",
  GENERAL_TEST: "General test",
};

const SECTION_LABELS: Record<string, string> = {
  LANGUAGE: "Language",
  DOMAIN: "Domain subject",
  GENERAL_TEST: "General test",
};

export function getTestTypeLabel(type: string): string {
  return TEST_TYPE_LABELS[type] ?? type.replaceAll("_", " ").toLowerCase();
}

export function getSubjectSectionLabel(sectionType: string): string {
  return SECTION_LABELS[sectionType] ?? sectionType.replaceAll("_", " ").toLowerCase();
}

function readTestConfig(test: HomeTest): { totalQuestions?: number; durationMinutes?: number } {
  if (typeof test.config !== "string") return {};

  try {
    const parsed: unknown = JSON.parse(test.config);
    if (!parsed || typeof parsed !== "object") return {};

    const config = parsed as Record<string, unknown>;
    return {
      totalQuestions: typeof config.totalQuestions === "number" ? config.totalQuestions : undefined,
      durationMinutes: typeof config.durationMinutes === "number" ? config.durationMinutes : undefined,
    };
  } catch {
    return {};
  }
}

export function getTestMeta(test: HomeTest) {
  const config = readTestConfig(test);
  const questions = config.totalQuestions ?? test.totalQuestions ?? test._count?.questions ?? 0;
  const duration = config.durationMinutes ?? test.durationMinutes ?? 0;
  const attempts = test._count?.attempts ?? 0;

  return { questions, duration, attempts };
}

export function sortTestsByPopularity(tests: HomeTest[]): HomeTest[] {
  return [...tests].sort((a, b) => {
    const attemptsDelta = (b._count?.attempts ?? 0) - (a._count?.attempts ?? 0);
    if (attemptsDelta !== 0) return attemptsDelta;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function fetchList<T>(url: string): Promise<T[]> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);

  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as T[]) : [];
}

let testsInFlight: Promise<HomeTest[]> | null = null;
let subjectsInFlight: Promise<HomeSubject[]> | null = null;

function loadTests(): Promise<HomeTest[]> {
  if (!testsInFlight) {
    const request = fetchList<HomeTest>("/api/tests");
    testsInFlight = request;
    request.then(
      () => {
        if (testsInFlight === request) testsInFlight = null;
      },
      () => {
        if (testsInFlight === request) testsInFlight = null;
      },
    );
  }

  return testsInFlight;
}

function loadSubjects(): Promise<HomeSubject[]> {
  if (!subjectsInFlight) {
    const request = fetchList<HomeSubject>("/api/subjects");
    subjectsInFlight = request;
    request.then(
      () => {
        if (subjectsInFlight === request) subjectsInFlight = null;
      },
      () => {
        if (subjectsInFlight === request) subjectsInFlight = null;
      },
    );
  }

  return subjectsInFlight;
}

function normalizeTests(tests: HomeTest[]): HomeTest[] {
  return sortTestsByPopularity(
    tests.filter(
      (test) =>
        test &&
        test.status === "PUBLISHED" &&
        test.isPublic !== false &&
        typeof test.slug === "string" &&
        typeof test.title === "string",
    ),
  );
}

function normalizeSubjects(subjects: HomeSubject[]): HomeSubject[] {
  return [...subjects]
    .filter((subject) => subject && subject.isActive !== false && typeof subject.code === "string")
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

function useHomeResource<T>(
  load: () => Promise<T[]>,
  normalize: (rows: T[]) => T[],
): { rows: T[]; state: LoadState } {
  const [rows, setRows] = useState<T[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    load()
      .then((data) => {
        if (cancelled) return;
        setRows(normalize(data));
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [load, normalize]);

  return { rows, state };
}

export function useHomeTests() {
  return useHomeResource(loadTests, normalizeTests);
}

export function useHomeSubjects() {
  return useHomeResource(loadSubjects, normalizeSubjects);
}
