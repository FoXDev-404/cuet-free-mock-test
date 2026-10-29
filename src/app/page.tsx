import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  Check,
  ChevronRight,
  Clock3,
  GraduationCap,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";

const studySteps = [
  {
    number: "01",
    icon: BookOpen,
    label: "Build your base",
    title: "Practice one topic at a time.",
    description:
      "Work through focused questions, get comfortable with the concepts, and keep your study sessions manageable.",
    href: "/practice",
    action: "Start practicing",
    tone: "violet",
  },
  {
    number: "02",
    icon: Timer,
    label: "Get exam-ready",
    title: "Try a timed mock test.",
    description:
      "Settle into an exam-style flow with a timer, question review, and a clear finish to each attempt.",
    href: "/mock-tests",
    action: "Browse mock tests",
    tone: "mint",
  },
  {
    number: "03",
    icon: BarChart3,
    label: "Learn from each try",
    title: "Turn results into a plan.",
    description:
      "Review your performance, spot topics to revisit, and make your next practice session count.",
    href: "/analytics",
    action: "View analytics",
    tone: "amber",
  },
];

const quickLinks = [
  { icon: Clock3, label: "Timed mock tests", detail: "Practice the exam flow", href: "/mock-tests" },
  { icon: BookOpenCheck, label: "Topic practice", detail: "Build confidence by doing", href: "/practice" },
  { icon: Target, label: "Previous year questions", detail: "Revise with PYQs", href: "/pyq" },
  { icon: BarChart3, label: "Progress insights", detail: "Know what to work on", href: "/analytics" },
];

export default function HomePage() {
  return (
    <>
      <section className="home-hero relative overflow-hidden">
        <div className="home-hero-grid" aria-hidden="true" />
        <div className="container-page relative z-10 grid items-center gap-12 py-14 sm:py-20 lg:min-h-[650px] lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:py-24">
          <div className="max-w-2xl">
            <p className="home-eyebrow mb-6">
              <span className="home-eyebrow-dot" aria-hidden="true" />
              CUET UG preparation, made clearer
            </p>
            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] text-neutral-950 dark:text-white sm:text-5xl lg:text-[3.75rem]">
              Prepare Smarter.
              <span className="mt-2 block text-gradient">Practice with purpose.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-300 sm:text-lg sm:leading-8">
              Make your next study session count with CUET mock tests, focused practice, previous year questions, and useful progress reviews—all in one place.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/mock-tests" className="btn-brand home-hero-button group">
                Start a Mock Test
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link href="/practice" className="btn-outline home-hero-button">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Explore Practice
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-neutral-600 dark:text-neutral-300">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-secondary-600 dark:text-secondary-400" aria-hidden="true" />
                Learn at your own pace
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-secondary-600 dark:text-secondary-400" aria-hidden="true" />
                Pick up where you left off
              </span>
            </div>
          </div>

          <div className="home-preview-wrap mx-auto w-full max-w-[560px] lg:ml-auto">
            <div className="home-preview-glow" aria-hidden="true" />
            <div className="home-preview-card card">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="home-preview-mark">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Practice preview</p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-neutral-900 dark:text-white">Computer Science</p>
                  </div>
                </div>
                <span className="badge badge-primary shrink-0">Sample</span>
              </div>

              <div className="home-preview-rule my-5" />

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">SAMPLE QUESTION</span>
                <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">Concept check</span>
              </div>
              <h2 className="mt-3 text-lg font-bold leading-7 text-neutral-900 dark:text-white sm:text-xl">
                In a stack, which item is removed first?
              </h2>

              <div className="mt-5 space-y-2.5" aria-label="Sample answer choices">
                <div className="home-preview-option"><span className="home-option-letter">A</span><span>The oldest item</span></div>
                <div className="home-preview-option"><span className="home-option-letter">B</span><span>A randomly chosen item</span></div>
                <div className="home-preview-option home-preview-option-correct">
                  <span className="home-option-letter">C</span>
                  <span className="flex-1">The most recently added item</span>
                  <span className="home-option-check"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>
                </div>
                <div className="home-preview-option"><span className="home-option-letter">D</span><span>The highest-priority item</span></div>
              </div>

              <div className="home-preview-feedback mt-5 flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-300" aria-hidden="true" />
                <p className="text-xs leading-5 text-neutral-600 dark:text-neutral-300">
                  A quick example of the focused, question-by-question practice experience.
                </p>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">Illustrative preview · not a live test</p>
          </div>
        </div>
      </section>

      <section className="container-page -mt-1 pb-16 pt-8 sm:pb-20 lg:pt-12" aria-label="Study tools">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => (
            <Link key={item.label} href={item.href} className="home-quick-link group">
              <span className="home-quick-icon"><item.icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-neutral-900 dark:text-white">{item.label}</span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">{item.detail}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-600" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-20 lg:py-28">
        <div className="container-page">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:mb-12 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="home-section-kicker">A simple study rhythm</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950 dark:text-white sm:text-4xl">
                Small steps add up to stronger preparation.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-300 sm:text-base">
              Move from learning to exam practice, then use what you learned to plan the next session.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
            {studySteps.map((step) => (
              <Link key={step.number} href={step.href} className={`home-step-card home-step-${step.tone} card card-hover group`}>
                <div className="flex items-start justify-between gap-4">
                  <span className="home-step-icon"><step.icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="home-step-number">{step.number}</span>
                </div>
                <p className="mt-7 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">{step.label}</p>
                <h3 className="mt-2 text-xl font-bold leading-snug text-neutral-900 dark:text-white">{step.title}</h3>
                <p className="mt-3 min-h-[72px] text-sm leading-6 text-neutral-600 dark:text-neutral-300">{step.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 transition-colors group-hover:text-primary-600 dark:text-primary-300">
                  {step.action}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-tools-section py-16 sm:py-20 lg:py-24">
        <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div className="max-w-xl">
            <p className="home-section-kicker">Made for your next session</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950 dark:text-white sm:text-4xl">
              Less guesswork. More focused practice.
            </h2>
            <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300">
              Find the right place to begin, take a mock when you are ready, and revisit the areas that need another look.
            </p>
            <Link href="/categories" className="btn-outline mt-7 inline-flex">
              Browse subjects and categories
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Timer, title: "Exam-style sessions", body: "Use a timer and question navigation to practise staying on pace.", href: "/mock-tests" },
              { icon: BookOpen, title: "Focused question sets", body: "Spend a session working through practice questions at your own pace.", href: "/practice" },
              { icon: Target, title: "Past-year revision", body: "Bring previous year questions into your regular revision routine.", href: "/pyq" },
              { icon: BarChart3, title: "A clearer review", body: "Use your results to decide what to strengthen next.", href: "/analytics" },
            ].map((item) => (
              <Link key={item.title} href={item.href} className="home-tool-card group">
                <span className="home-tool-icon"><item.icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className="mt-4 block text-base font-semibold text-neutral-900 dark:text-white">{item.title}</span>
                <span className="mt-1.5 block text-sm leading-5 text-neutral-600 dark:text-neutral-300">{item.body}</span>
                <ArrowRight className="mt-4 h-4 w-4 text-primary-600 transition-transform group-hover:translate-x-1 dark:text-primary-300" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20 lg:py-24">
        <div className="home-final-cta relative overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-10 sm:py-16 lg:px-16">
          <div className="home-final-cta-orb" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl">
            <span className="home-cta-icon"><GraduationCap className="h-5 w-5" aria-hidden="true" /></span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Start with one good session.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base sm:leading-7">
              Choose a mock test or jump into practice. Your CUET preparation can move forward one question at a time.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/mock-tests" className="home-cta-primary group">
                Choose a mock test
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link href="/practice" className="home-cta-secondary">Explore Practice</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
