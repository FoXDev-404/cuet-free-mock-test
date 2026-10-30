"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  ChevronRight,
  FlaskConical,
} from "lucide-react";
import {
  getSubjectSectionLabel,
  getTestMeta,
  getTestTypeLabel,
  useHomeSubjects,
  useHomeTests,
  type HomeSubject,
  type HomeTest,
} from "./home-data";

function TestRow({ test, alt }: { test: HomeTest; alt: boolean }) {
  const { questions, duration } = getTestMeta(test);
  const recovered = test.recoveredQuestionCount ?? questions;
  const sourceTotal = test.sourceQuestionCount;
  const pending = test.pendingReviewCount ?? 0;
  const isPracticeOnly = test.localPaper === true && test.scorableQuestionCount === 0;

  return (
    <Link
      href={`/mock-tests/${test.slug}`}
      className={`home-table-row group${alt ? " home-table-row-alt" : ""}`}
      aria-label={`Open ${test.title} mock test`}
    >
      <span className="home-table-main">
        <span className="home-table-name">{test.title}</span>
        <span className="home-table-badges">
          {test.subject ? <span className="badge badge-primary">{test.subject.name}</span> : null}
          <span className="badge badge-neutral">{getTestTypeLabel(test.type)}</span>
          {test.draft ? <span className="badge badge-warning">Draft OCR</span> : null}
          {isPracticeOnly ? <span className="badge badge-warning">Practice only</span> : null}
        </span>
      </span>
      <span className="home-table-side">
        <span className="home-table-primary">
          {questions > 0
            ? test.localPaper && sourceTotal
              ? `${recovered} of ${sourceTotal} questions`
              : `${questions} questions`
            : "Question set"}
        </span>
        <span className="home-table-secondary">
          {duration > 0 ? `${duration} min` : "Timed"}
          {pending > 0 ? ` · ${pending} pending key` : ""}
        </span>
      </span>
      <ChevronRight className="home-table-chevron" aria-hidden="true" />
    </Link>
  );
}

function SubjectRow({ subject, alt }: { subject: HomeSubject; alt: boolean }) {
  const questions = subject._count?.questions ?? 0;
  const isReady = questions > 0;

  return (
    <Link
      href={`/practice?subject=${encodeURIComponent(subject.code)}`}
      className={`home-table-row group${alt ? " home-table-row-alt" : ""}`}
      aria-label={`Practise ${subject.name}`}
    >
      <span className="home-table-main">
        <span className="home-table-name">{subject.name}</span>
        <span className="home-table-badges">
          <span className="badge badge-primary">{subject.code}</span>
          <span className="badge badge-neutral">{getSubjectSectionLabel(subject.sectionType)}</span>
        </span>
      </span>
      <span className="home-table-side">
        <span className="home-table-primary">
          {questions} {questions === 1 ? "question" : "questions"}
        </span>
        <span className={`badge home-table-status ${isReady ? "badge-success" : "badge-warning"}`}>
          {isReady ? "Practice available" : "Coming soon"}
        </span>
      </span>
      <ChevronRight className="home-table-chevron" aria-hidden="true" />
    </Link>
  );
}

function TableSkeleton() {
  return (
    <div className="home-table-skeleton" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="home-table-skeleton-row">
          <span className="home-skeleton-bar h-3.5 w-3/5" />
          <span className="home-skeleton-bar mt-2 h-2.5 w-1/4" />
          <span className="home-skeleton-bar mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  kind,
  state,
}: {
  kind: "tests" | "subjects";
  state: "ready" | "error";
}) {
  const isError = state === "error";
  const title = isError
    ? kind === "tests"
      ? "Mock tests could not load"
      : "Subjects could not load"
    : kind === "tests"
      ? "No published mock tests yet"
      : "No active subjects yet";

  return (
    <div className="home-table-empty">
      <span className="home-table-empty-icon" aria-hidden="true">
        {kind === "tests" ? <FlaskConical className="h-5 w-5" /> : <BookOpenCheck className="h-5 w-5" />}
      </span>
      <p className="home-table-empty-title">{title}</p>
      <p className="home-table-empty-copy">
        {isError
          ? "This section is temporarily unavailable. Use the link below to browse the full library."
          : kind === "tests"
            ? "New NTA-pattern tests will appear here as soon as they are published."
            : "Subjects will appear here once they are added and made active."}
      </p>
    </div>
  );
}

export function HomeTestTables() {
  const { rows: tests, state: testState } = useHomeTests();
  const { rows: subjects, state: subjectState } = useHomeSubjects();

  const visibleTests = tests.slice(0, 6);
  const visibleSubjects = subjects.slice(0, 6);

  return (
    <div className="home-table-grid">
      <section className="home-table-card card" aria-labelledby="home-popular-table-title">
        <div className="home-table-card-head">
          <div className="home-table-card-heading">
            <span className="home-table-card-icon" aria-hidden="true">
              <FlaskConical className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="home-table-kicker">Mock test library</p>
              <h3 id="home-popular-table-title" className="home-table-card-title">
                Popular CUET Mock Tests 2027
              </h3>
            </div>
          </div>
          {testState === "ready" && tests.length > 0 ? (
            <span className="home-table-count">{tests.length} published</span>
          ) : null}
        </div>

        <div className="home-table" aria-busy={testState === "loading"}>
          <div className="home-table-head" aria-hidden="true">
            <span>Mock Test</span>
            <span className="text-right">Questions / Duration</span>
          </div>

          {testState === "loading" ? <TableSkeleton /> : null}
          {testState !== "loading" && visibleTests.length === 0 ? (
            <EmptyState kind="tests" state={testState} />
          ) : null}
          {testState === "ready"
            ? visibleTests.map((test, index) => <TestRow key={test.id} test={test} alt={index % 2 === 1} />)
            : null}
        </div>

        <div className="home-table-foot">
          <Link href="/mock-tests" className="home-table-viewall">
            View All Mock Tests
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="home-table-card card" aria-labelledby="home-subjects-table-title">
        <div className="home-table-card-head">
          <div className="home-table-card-heading">
            <span className="home-table-card-icon" aria-hidden="true">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="home-table-kicker">Practice library</p>
              <h3 id="home-subjects-table-title" className="home-table-card-title">
                Subject-wise Practice &amp; PYQs
              </h3>
            </div>
          </div>
          {subjectState === "ready" && subjects.length > 0 ? (
            <span className="home-table-count">{subjects.length} active</span>
          ) : null}
        </div>

        <div className="home-table" aria-busy={subjectState === "loading"}>
          <div className="home-table-head" aria-hidden="true">
            <span>Subject</span>
            <span className="text-right">Available Questions / Practice</span>
          </div>

          {subjectState === "loading" ? <TableSkeleton /> : null}
          {subjectState !== "loading" && visibleSubjects.length === 0 ? (
            <EmptyState kind="subjects" state={subjectState} />
          ) : null}
          {subjectState === "ready"
            ? visibleSubjects.map((subject, index) => (
                <SubjectRow key={subject.id} subject={subject} alt={index % 2 === 1} />
              ))
            : null}
        </div>

        <div className="home-table-foot">
          <Link href="/categories" className="home-table-viewall">
            View All Subjects
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
