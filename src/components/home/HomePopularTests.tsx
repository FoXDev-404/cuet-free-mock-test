"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Flame, FlaskConical, TrendingUp } from "lucide-react";
import {
  getTestMeta,
  getTestTypeLabel,
  useHomeTests,
  type HomeTest,
} from "./home-data";

function PopularRow({ test }: { test: HomeTest }) {
  const { questions, duration, attempts } = getTestMeta(test);
  const recovered = test.recoveredQuestionCount ?? questions;
  const sourceTotal = test.sourceQuestionCount;
  const isPracticeOnly = test.localPaper === true && test.scorableQuestionCount === 0;

  return (
    <Link
      href={`/mock-tests/${test.slug}`}
      className="home-popular-row group"
      aria-label={`Open ${test.title} mock test`}
    >
      <span className="home-popular-main">
        <span className="home-popular-name">{test.title}</span>
        <span className="home-popular-meta">
          {test.subject ? <span className="badge badge-primary">{test.subject.name}</span> : null}
          <span className="badge badge-neutral">{getTestTypeLabel(test.type)}</span>
          {test.draft ? <span className="badge badge-warning">Draft OCR</span> : null}
          {isPracticeOnly ? <span className="badge badge-warning">Practice only</span> : null}
          {attempts > 0 ? (
            <span className="badge badge-warning home-popular-attempts">
              <Flame className="h-3 w-3" aria-hidden="true" />
              {attempts} {attempts === 1 ? "attempt" : "attempts"}
            </span>
          ) : null}
        </span>
      </span>
      <span className="home-popular-side">
        <span className="home-popular-side-primary">
          {questions > 0
            ? test.localPaper && sourceTotal
              ? `${recovered} of ${sourceTotal} questions`
              : `${questions} questions`
            : "Question set"}
        </span>
        <span className="home-popular-side-secondary">{duration > 0 ? `${duration} min` : "Timed"}</span>
      </span>
      <ChevronRight className="home-popular-chevron" aria-hidden="true" />
    </Link>
  );
}

function PopularSkeleton() {
  return (
    <div className="home-popular-skeleton" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="home-popular-skeleton-row">
          <span className="home-skeleton-bar h-3.5 w-2/3" />
          <span className="home-skeleton-bar mt-2 h-2.5 w-1/3" />
          <span className="home-skeleton-bar ml-auto mt-2 h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function HomePopularTests() {
  const { rows, state } = useHomeTests();
  const popular = rows.slice(0, 4);
  const isEmpty = state !== "loading" && popular.length === 0;
  const variant = state === "loading"
    ? " home-popular-card-loading"
    : isEmpty
      ? " home-popular-card-empty"
      : "";

  return (
    <aside
      className={`home-popular-card card${variant}`}
      aria-labelledby="home-popular-title"
      aria-busy={state === "loading"}
    >
      <div className="home-popular-head">
        <div className="min-w-0">
          <p className="home-popular-kicker">From the live test library</p>
          <h2 id="home-popular-title" className="home-popular-title">
            Most Popular Mock Tests
          </h2>
        </div>
        <span className="home-popular-icon" aria-hidden="true">
          <TrendingUp className="h-5 w-5" />
        </span>
      </div>

      <div className="home-popular-list">
        {state === "loading" ? <PopularSkeleton /> : null}

        {state === "ready" && popular.length === 0 ? (
          <div className="home-popular-empty">
            <span className="home-popular-empty-icon" aria-hidden="true">
              <FlaskConical className="h-5 w-5" />
            </span>
            <p className="home-popular-empty-title">No published mock tests yet</p>
            <p className="home-popular-empty-copy">
              New NTA-pattern tests will appear here as soon as they are published.
            </p>
          </div>
        ) : null}

        {state === "error" ? (
          <div className="home-popular-empty">
            <span className="home-popular-empty-icon" aria-hidden="true">
              <FlaskConical className="h-5 w-5" />
            </span>
            <p className="home-popular-empty-title">Mock tests could not load</p>
            <p className="home-popular-empty-copy">
              The test library is temporarily unavailable. You can still browse all published tests.
            </p>
          </div>
        ) : null}

        {state === "ready" ? popular.map((test) => <PopularRow key={test.id} test={test} />) : null}
      </div>

      <div className="home-popular-foot">
        <Link href="/mock-tests" className="home-popular-viewall group">
          View All Mock Tests
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
