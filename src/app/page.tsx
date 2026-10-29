"use client";

import Link from "next/link";
import {
  CheckCircle, ArrowRight, BarChart3, BookOpen, FlaskConical,
  Target, Zap, Shield, Star,
} from "lucide-react";

const features = [
  { icon: FlaskConical, title: "Realistic Mock Tests", description: "Full-length CUET mock tests with authentic exam interface, timer, and negative marking simulation.", href: "/mock-tests" },
  { icon: BookOpen, title: "Topic-wise Practice", description: "Practice chapter-wise with 4,800+ questions across all CUET subjects with instant feedback.", href: "/practice" },
  { icon: BarChart3, title: "Performance Analytics", description: "Detailed analytics with weak topic identification, accuracy tracking, and progress charts.", href: "/analytics" },
  { icon: Target, title: "PYQ Practice", description: "Previous year questions with detailed solutions and year-wise analysis for better preparation.", href: "/pyq" },
  { icon: Zap, title: "Daily Goals & Streaks", description: "Build consistency with daily practice goals, streak tracking, and achievement badges.", href: "/dashboard" },
  { icon: Shield, title: "Exam-like Environment", description: "Real exam interface with timer, mark-for-review, clear response, and question palette.", href: "/mock-tests" },
];

const stats = [
  { value: "4,800+", label: "Questions" },
  { value: "50+", label: "Subjects" },
  { value: "100+", label: "Mock Tests" },
  { value: "50K+", label: "Students" },
];

const subjects = [
  { name: "Computer Science", code: "CS", questions: 800 },
  { name: "Physics", code: "PHY", questions: 750 },
  { name: "Chemistry", code: "CHE", questions: 700 },
  { name: "Mathematics", code: "MATH", questions: 750 },
  { name: "Biology", code: "BIO", questions: 700 },
  { name: "English", code: "EN", questions: 600 },
  { name: "General Test", code: "GT", questions: 800 },
  { name: "Economics", code: "ECO", questions: 400 },
];

const testimonials = [
  { title: "Priya Sharma", role: "CUET 2024 Topper", content: "The mock tests were exactly like the real exam. The analytics helped me identify my weak areas and improve my score by 40%.", score: "98.5 percentile", date: "2024" },
  { title: "Rahul Verma", role: "CUET 2024 Aspirant", content: "The daily practice questions and detailed explanations helped me understand concepts deeply. Highly recommended!", score: "95.2 percentile", date: "2024" },
  { title: "Anjali Singh", role: "CUET 2024 Aspirant", content: "The mock test interface is exactly like the real CUET exam. The analytics helped me track my progress perfectly.", score: "96.8 percentile", date: "2024" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-primary-50 via-white to-white dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900">
        <div className="container-page pt-16 pb-0 lg:pt-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-8 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" aria-hidden="true" />
              <span>New: Full CUET 2025 Syllabus Coverage</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 dark:text-white mb-6 animate-slide-up">
              Prepare Smarter.{" "}
              <span className="text-primary-600 dark:text-primary-400">Practice Better.</span>{" "}
              Crack CUET (UG).
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-300 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "100ms" }}>
              Free CUET (UG) mock tests, chapter-wise practice, PYQs and performance analytics.
              Build your own subject combination and track progress with detailed analytics.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
              <Link href="/mock-tests" className="group btn-brand px-8 py-3.5 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                Start a Mock Test
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link href="/practice" className="btn-outline px-8 py-3.5 text-lg font-semibold rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                Browse Practice Questions
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 animate-fade-in" style={{ animationDelay: "300ms" }}>
              <div className="flex flex-wrap items-center justify-center gap-8 text-neutral-500 dark:text-neutral-400 text-sm">
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" aria-hidden="true" />Free forever - No credit card required</span>
                <span className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-secondary-500" />4,800+ questions with solutions</span>
                <span className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-secondary-500" />Real exam interface simulation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="container-page pb-16 lg:pb-20">
          <div className="mx-auto mt-14 max-w-5xl animate-slide-up" style={{ animationDelay: "400ms" }}>
            <div className="card p-6 shadow-xl lg:p-8">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-8">
                {stats.map((stat, i) => (
                  <div key={stat.label} className="text-center animate-slide-up" style={{ animationDelay: `${500 + i * 100}ms` }}>
                    <div className="mb-1 text-3xl font-extrabold text-primary-600 dark:text-primary-400 sm:text-4xl lg:text-5xl">{stat.value}</div>
                    <div className="font-medium text-neutral-600 dark:text-neutral-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">Everything you need to crack CUET (UG)</h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-300">Comprehensive preparation platform with everything you need to succeed in CUET (UG) 2025.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, i) => (
              <article key={feature.title} className="group relative card p-6 lg:p-8 card-hover animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed">{feature.description}</p>
                  <Link href={feature.href} className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                    Learn more <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="py-20 lg:py-28 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">Cover All CUET Subjects</h2>
            <p className="text-neutral-600 dark:text-neutral-400">50+ subjects across Section IA, IB, II, and III with chapter-wise coverage.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjects.map((subject, i) => (
              <Link key={subject.code} href={`/practice?subject=${subject.code}`} className="group relative card p-5 lg:p-6 card-hover animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{subject.code}</span>
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{subject.questions} Qs</span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{subject.name}</h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded">
                    {subject.code === "CS" || subject.code === "PHY" || subject.code === "CHE" || subject.code === "MATH" || subject.code === "BIO" ? "Section II" : subject.code === "EN" || subject.code === "GT" ? "Section IA/IB/III" : "Section II"}
                  </span>
                  <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28 bg-white dark:bg-neutral-950">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">Trusted by CUET aspirants</h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-300">See how students used free mock tests and analytics to improve their scores.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.title} className="card flex flex-col p-6">
                <div className="flex items-center gap-0.5 text-amber-400" aria-label="5 out of 5 stars">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-current" aria-hidden="true" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                  “{t.content}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-neutral-100 pt-5 dark:border-neutral-800">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                    {t.title.split(" ").map((n) => n[0]).join("")}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{t.title}</div>
                    <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">{t.role}</div>
                  </div>
                  <span className="badge badge-success ml-auto shrink-0">{t.score}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2F200%2F200%22%3E%3Ccircle%20cx%3D20%20cy%3D20%20r%3D20%20fill%3D%22white%22%20opacity%3D%22.03%22%2F%3E%3C%2Fsvg%3E')] opacity-20" />
        <div className="relative container-page text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">Ready to Crack CUET (UG) 2025?</h2>
            <p className="text-lg text-primary-100 mb-10 max-w-2xl mx-auto">Join 50,000+ students who trust CUETFreeMockTest for their preparation. Start your free mock test today.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/mock-tests" className="group w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-xl bg-white text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-50 shadow-xl hover:shadow-2xl transition-all duration-300">Start Free Mock Test <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /></Link>
              <Link href="/practice" className="group w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-xl border-2 border-white/30 text-white hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-300">Browse Practice Questions</Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-primary-100/80 text-sm">
              <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" />No credit card required</span>
              <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" />Cancel anytime</span>
              <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" />Free forever</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}