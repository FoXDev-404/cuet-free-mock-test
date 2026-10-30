import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, ShieldCheck, ExternalLink } from "lucide-react";
import { publicPageMetadata } from "@/lib/seo";
import { getExamInfo, getPageSeo, formatVerified, parseFaq, faqStructuredData } from "@/lib/content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const PATH = "/cuet-marking-scheme";

const DEFAULT_FAQ = [
  {
    question: "What is the CUET UG marking scheme?",
    answer:
      "In the standard multiple-choice pattern, a correct answer earns +5 marks, an incorrect answer deducts 1 mark, and an unattempted question scores 0. Always confirm the current-year bulletin because NTA can revise the pattern.",
  },
  {
    question: "Is there negative marking in CUET UG?",
    answer:
      "Yes, the usual MCQ pattern applies a penalty of 1 mark for a wrong answer. Because a blind guess has a negative expected value, eliminate options before attempting.",
  },
  {
    question: "Are CUET marks normalised across shifts?",
    answer:
      "When a subject is held in multiple shifts, NTA may use a normalisation or equating process so scores are comparable. The exact method is described in the official information bulletin for that year.",
  },
  {
    question: "Does an unattempted question reduce my score?",
    answer:
      "No. An unattempted question adds zero. The penalty applies only to a wrong response, which is why a considered skip is often better than a random guess.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const base = publicPageMetadata({
    title: "CUET UG Marking Scheme — +5, -1 and Safe Attempt Strategy",
    description:
      "How CUET UG scoring works: +5 for a correct answer, -1 for a wrong answer, 0 for unattempted, with worked examples and a practical guessing rule.",
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

export default async function MarkingSchemePage() {
  const info = (await getExamInfo(["marking-scheme"]))["marking-scheme"];
  const seo = await getPageSeo(PATH);
  const customFaq = parseFaq(seo?.faqJson);
  const faq = customFaq.length ? customFaq : DEFAULT_FAQ;
  const verified = formatVerified(info?.lastVerified);

  const faqLd = faqStructuredData(faq);
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "CUET UG Marking Scheme",
    description:
      "CUET UG marking scheme with worked examples, negative-marking maths and attempt strategy.",
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    dateModified: (info?.updatedAt ?? new Date()).toISOString(),
    mainEntityOfPage: `${SITE_URL}${PATH}`,
  };

  const examples = [
    { name: "5 correct, 5 wrong, 10 unattempted", score: 5 * 5 - 5 * 1, note: "25 − 5 = 20 out of 100" },
    { name: "12 correct, 3 wrong, 5 unattempted", score: 12 * 5 - 3 * 1, note: "60 − 3 = 57 out of 100" },
    { name: "0 correct, 4 wrong, 16 unattempted", score: 0 - 4 * 1, note: "−4: four blind guesses hurt" },
  ];

  return (
    <article className="container-page max-w-4xl py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      {faqLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} /> : null}

      <p className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">Scoring</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
        CUET UG marking scheme, explained
      </h1>
      <p className="mt-3 text-lg leading-8 text-neutral-600 dark:text-neutral-300">
        The standard CUET UG multiple-choice paper rewards accuracy and punishes careless guessing. Here is the
        arithmetic, a worked example and a simple rule for when to attempt.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-secondary-200 bg-secondary-50 p-4 text-sm dark:border-secondary-900 dark:bg-secondary-900/20">
        <ShieldCheck className="h-5 w-5 shrink-0 text-secondary-700 dark:text-secondary-300" aria-hidden="true" />
        <p className="text-secondary-900 dark:text-secondary-200">
          {verified ? <>Editorially verified on <strong>{verified}</strong>.</> : <>Based on the standard MCQ pattern.</>}{" "}
          Confirm the current-year bulletin before relying on any marking detail.
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
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">The core numbers</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-4 dark:border-secondary-900 dark:bg-secondary-900/20">
            <p className="text-3xl font-bold text-secondary-700 dark:text-secondary-300">+5</p>
            <p className="mt-1 text-sm text-secondary-900 dark:text-secondary-200">Correct answer</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
            <p className="text-3xl font-bold text-red-700 dark:text-red-300">−1</p>
            <p className="mt-1 text-sm text-red-900 dark:text-red-200">Incorrect answer</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-3xl font-bold text-neutral-700 dark:text-neutral-300">0</p>
            <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">Unattempted</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          Each question carries 5 marks in the standard pattern, so a 50-question paper is worth 250 marks. The
          penalty is applied per wrong answer, not per option eliminated.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
          <Calculator className="h-6 w-6 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          Worked examples
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-white">Attempt profile</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-white">Score</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-white">Working</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
              {examples.map((row) => (
                <tr key={row.name}>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-white">{row.name}</th>
                  <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">{row.score}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">When should you guess?</h2>
        <p className="mt-2 text-neutral-700 dark:text-neutral-300">
          If four options are equally likely, a guess has an expected value of
          <strong> (0.25 × 5) + (0.75 × −1) = +0.5 marks</strong>. With no information, guessing is still slightly
          positive in expectation — but this ignores time, confidence and the risk of turning a calm paper into a
          rushed one. A practical rule:
        </p>
        <ul className="mt-3 space-y-2 text-neutral-700 dark:text-neutral-300">
          <li>• Attempt when you can eliminate at least two options and have a reason to prefer one of the rest.</li>
          <li>• Skip when all four options look equally plausible and the question is consuming disproportionate time.</li>
          <li>• Never leave a question blank merely because it looks long; read the last line first.</li>
          <li>• In a timed mock, mark uncertain questions and return after the first pass instead of stalling.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Accuracy beats raw attempts</h2>
        <p className="mt-2 text-neutral-700 dark:text-neutral-300">
          Two learners can attempt the same number of questions and finish far apart. At 70% accuracy on 40 attempts,
          the score is 28 × 5 − 12 = 128. At 55% accuracy, it is 22 × 5 − 18 = 92. The difference is not how many
          questions you saw; it is how many you converted without donating marks.
        </p>
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
        <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-100">Test the scheme on a real timer</h2>
        <p className="mt-1 text-sm text-primary-800 dark:text-primary-200">
          Reading about negative marking is not the same as feeling it. Take a timed paper and review the questions
          where a guess cost you marks.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/mock-tests" className="btn-brand px-4 py-2 text-sm">Start a mock test</Link>
          <Link href="/cuet-important-dates" className="btn-outline px-4 py-2 text-sm">See the exam calendar</Link>
        </div>
      </div>
    </article>
  );
}
