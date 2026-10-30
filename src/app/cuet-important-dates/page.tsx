import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ExternalLink, ShieldCheck } from "lucide-react";
import { publicPageMetadata } from "@/lib/seo";
import { getExamInfo, getPageSeo, formatVerified, parseFaq, faqStructuredData } from "@/lib/content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const PATH = "/cuet-important-dates";

const DEFAULT_FAQ = [
  {
    question: "When will CUET UG 2027 be held?",
    answer:
      "NTA has not published the CUET UG 2027 calendar at the time of this review. The notification, application window and exam dates are announced on the official NTA website; treat coaching-social-media dates as unverified until then.",
  },
  {
    question: "Are CUET UG exam dates the same for every subject?",
    answer:
      "No. CUET UG is usually conducted across multiple days and shifts, and a subject may be scheduled on one specific date. Your admit card carries the exact date, shift and reporting time.",
  },
  {
    question: "Where should I check my CUET exam city and admit card?",
    answer:
      "Use the official NTA CUET portal linked from your application confirmation. This site is an independent practice platform and never issues admit cards or exam-city slips.",
  },
  {
    question: "What happens after the CUET result is declared?",
    answer:
      "Participating universities publish their own counselling and admission schedules. A CUET score makes you eligible to apply; it does not guarantee a seat at any university.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const base = publicPageMetadata({
    title: "CUET UG Important Dates 2027 — Verified Exam Calendar",
    description:
      "A careful CUET UG exam calendar: the typical notification-to-counselling cycle, how to verify official NTA dates, and a preparation checklist. Last reviewed with sources.",
    path: PATH,
  });
  const seo = await getPageSeo(PATH);
  return {
    ...base,
    ...(seo?.title ? { title: seo.title } : {}),
    ...(seo?.description ? { description: seo.description } : {}),
    alternates: { canonical: PATH },
  };
}

export default async function ImportantDatesPage() {
  const info = (await getExamInfo(["important-dates"]))["important-dates"];
  const seo = await getPageSeo(PATH);
  const faq = parseFaq(seo?.faqJson) .length ? parseFaq(seo?.faqJson) : DEFAULT_FAQ;
  const verified = formatVerified(info?.lastVerified);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "CUET UG Important Dates",
    description:
      "Typical CUET UG notification, application, admit-card, exam and counselling cycle with official verification guidance.",
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    dateModified: (info?.updatedAt ?? new Date()).toISOString(),
    mainEntityOfPage: `${SITE_URL}${PATH}`,
  };
  const faqLd = faqStructuredData(faq);

  const typicalCycle = [
    { stage: "Official notification", window: "Usually February–March", what: "NTA publishes eligibility, subjects, pattern and the application window." },
    { stage: "Application form", window: "Usually March–April", what: "Choose your subjects and exam cities carefully; corrections are time-limited." },
    { stage: "Correction window", window: "Usually April", what: "Fix permitted fields only. Subject and city changes may carry a fee." },
    { stage: "Admit card", window: "Usually 3–7 days before the exam", what: "Check date, shift, reporting time and city. Download and print a copy." },
    { stage: "CUET UG exam", window: "Usually May", what: "Computer-based test across multiple days and shifts; carry valid ID." },
    { stage: "Provisional answer key", window: "Usually within days of the exam", what: "Challenge objections within the official window if a key looks wrong." },
    { stage: "Result and scorecard", window: "Usually June–July", what: "Download the scorecard; normalisation may apply across shifts." },
    { stage: "University counselling", window: "Usually June–August", what: "Each university runs its own application and counselling process." },
  ];

  return (
    <article className="container-page max-w-4xl py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      {faqLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} /> : null}

      <p className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">Exam calendar</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
        CUET UG important dates
      </h1>
      <p className="mt-3 text-lg leading-8 text-neutral-600 dark:text-neutral-300">
        CUET UG dates change every year and are controlled by NTA, not by coaching websites. This page explains the
        cycle, shows what to verify and helps you build a preparation plan without relying on rumoured dates.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-secondary-200 bg-secondary-50 p-4 text-sm dark:border-secondary-900 dark:bg-secondary-900/20">
        <ShieldCheck className="h-5 w-5 shrink-0 text-secondary-700 dark:text-secondary-300" aria-hidden="true" />
        <p className="text-secondary-900 dark:text-secondary-200">
          {verified ? (
            <>Editorially verified on <strong>{verified}</strong>.</>
          ) : (
            <>This page is a planning guide, not the official notification.</>
          )}{" "}
          Always confirm dates on the official NTA portal.
        </p>
      </div>

      {info ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{info.label}</h2>
          <div className="mt-3 whitespace-pre-wrap rounded-xl border border-neutral-200 bg-white p-5 text-sm leading-7 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            {info.value}
          </div>
          {info.sourceUrl ? (
            <a href={info.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
              Official source <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
          <CalendarDays className="h-6 w-6 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          The typical CUET UG cycle
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          The windows below describe the usual sequence. They are not official 2027 dates.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-white">Stage</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-white">Usual window</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-white">What to do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
              {typicalCycle.map((row) => (
                <tr key={row.stage}>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-white">{row.stage}</th>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{row.window}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{row.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">How to verify a CUET date</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-neutral-700 dark:text-neutral-300">
          <li>Open the official NTA CUET page and read the current information bulletin.</li>
          <li>Match the date to your own subject and shift on the admit card, not to a friend&apos;s paper.</li>
          <li>For admission deadlines, check each university&apos;s own portal — counselling is not run by NTA.</li>
          <li>Save the official PDF or screenshot with its date so you can confirm changes later.</li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">A date-aware preparation checklist</h2>
        <ul className="mt-3 space-y-2 text-neutral-700 dark:text-neutral-300">
          <li>• Work backwards from the expected exam window and reserve the last four weeks for full-length mocks.</li>
          <li>• Finish the syllabus once before the application window closes; corrections and city choices take time.</li>
          <li>• Take at least three timed papers in the exact subject combination you selected.</li>
          <li>• Keep a margin for admit-card downloads and travel; never plan a trip on an unconfirmed shift.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Frequently asked questions</h2>
        <div className="mt-3 space-y-2">
          {faq.map((item) => (
            <details key={item.question} className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <summary className="cursor-pointer font-medium text-neutral-900 dark:text-white">{item.question}</summary>
              <p className="mt-2 text-sm leading-7 text-neutral-600 dark:text-neutral-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-10 rounded-xl border border-primary-200 bg-primary-50 p-5 dark:border-primary-900 dark:bg-primary-900/20">
        <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-100">Turn the waiting time into practice</h2>
        <p className="mt-1 text-sm text-primary-800 dark:text-primary-200">
          Start with a timed CUET mock, review every wrong answer, then drill the chapter that cost you the most marks.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/mock-tests" className="btn-brand px-4 py-2 text-sm">Browse mock tests</Link>
          <Link href="/cuet-marking-scheme" className="btn-outline px-4 py-2 text-sm">Understand the marking scheme</Link>
        </div>
      </div>
    </article>
  );
}
