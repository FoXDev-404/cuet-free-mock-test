import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CalendarDays, Eye, Lock, Target, TrendingUp, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { getUserBadges } from "@/lib/badges";
import { publicPageMetadata, NOINDEX_ROBOTS } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string }>;
}

function validUsername(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,23}$/.test(value);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  if (!validUsername(username)) {
    return { title: "Profile not found", robots: NOINDEX_ROBOTS };
  }
  const user = await prisma.user.findUnique({
    where: { username },
    select: { username: true, bio: true, isProfilePublic: true },
  });
  if (!user || !user.isProfilePublic || !user.username) {
    return { title: "Profile not found", robots: NOINDEX_ROBOTS };
  }
  return {
    ...publicPageMetadata({
      title: `${user.username} — CUET learner profile`,
      description:
        user.bio?.slice(0, 180) ||
        `Public CUET practice profile for ${user.username}: opted-in badges and aggregate practice totals.`,
      path: `/u/${user.username}`,
    }),
    robots: { index: true, follow: true },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  if (!validUsername(username)) notFound();

  const { userId } = await getSessionUser();
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      bio: true,
      isProfilePublic: true,
      createdAt: true,
    },
  });
  if (!user) notFound();

  const isOwner = Boolean(userId && user.id === userId);
  if (!user.isProfilePublic && !isOwner) notFound();
  if (!user.username) notFound();
  const profileUsername = user.username;

  const [attempts, badges, submitted] = await Promise.all([
    prisma.attempt.findMany({
      where: { userId: user.id, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, practice: false },
      select: {
        score: true,
        maxScore: true,
        correctCount: true,
        attemptedCount: true,
        submittedAt: true,
      },
      take: 300,
      orderBy: { submittedAt: "desc" },
    }),
    getUserBadges(user.id),
    prisma.attempt.count({
      where: { userId: user.id, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, practice: false },
    }),
  ]);

  const totalAttempted = attempts.reduce((sum, attempt) => sum + attempt.attemptedCount, 0);
  const totalCorrect = attempts.reduce((sum, attempt) => sum + attempt.correctCount, 0);
  const accuracy =
    totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 1000) / 10 : 0;
  const bestPct = attempts.reduce((best, attempt) => {
    const pct = attempt.maxScore > 0 ? (attempt.score / attempt.maxScore) * 100 : 0;
    return Math.max(best, pct);
  }, 0);

  const initials = profileUsername.slice(0, 2).toUpperCase();
  const joined = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(user.createdAt);

  return (
    <section className="container-page max-w-4xl py-10 sm:py-14">
      {isOwner ? (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 p-3 text-sm text-primary-900 dark:border-primary-900 dark:bg-primary-900/20 dark:text-primary-100">
          {user.isProfilePublic ? <Eye className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          <span>
            {user.isProfilePublic
              ? "This is your public profile. Only the fields below are visible to visitors."
              : "This profile is private. Only you can see it."}
          </span>
          <Link href="/settings" className="font-semibold underline">
            Change privacy settings
          </Link>
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-primary-100 text-2xl font-bold text-primary-700 shadow-sm dark:border-neutral-900 dark:bg-primary-900/50 dark:text-primary-200">
                {initials}
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">@{profileUsername}</h1>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                  <CalendarDays className="h-3.5 w-3.5" /> Member since {joined}
                </p>
              </div>
            </div>
            <span className="badge badge-primary w-fit">CUET learner</span>
          </div>

          <p className="mt-4 max-w-2xl whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
            {user.bio || (isOwner ? "Add a short bio in settings." : "This learner has not added a bio.")}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Submitted tests" value={String(submitted)} icon={Target} />
        <Metric label="Questions attempted" value={String(totalAttempted)} icon={UserRound} />
        <Metric label="Accuracy" value={`${accuracy}%`} icon={TrendingUp} />
        <Metric label="Best score" value={`${Math.round(bestPct)}%`} icon={Award} />
      </div>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-white">
          <Award className="h-5 w-5 text-primary-600 dark:text-primary-400" /> Public badges
        </h2>
        {badges.length === 0 ? (
          <p className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            No badges earned yet. Badges appear here after submitted mock tests.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((badge) => (
              <div key={badge.key} className="rounded-xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-900 dark:bg-primary-900/20">
                <p className="font-semibold text-primary-900 dark:text-primary-100">{badge.label}</p>
                <p className="mt-1 text-sm text-primary-800 dark:text-primary-200">{badge.description}</p>
                <p className="mt-2 text-xs text-primary-700/70 dark:text-primary-300/70">
                  Earned {new Date(badge.earnedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        <p className="font-semibold text-neutral-900 dark:text-white">What this page never shows</p>
        <p className="mt-1">
          Email addresses, legal names, IP/device information, full attempt history and individual wrong answers stay
          private. Only aggregate, opted-in totals are displayed.
        </p>
      </div>

      {isOwner ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn-brand px-4 py-2 text-sm">Open private dashboard</Link>
          <Link href="/settings" className="btn-outline px-4 py-2 text-sm">Account & privacy settings</Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/mock-tests" className="btn-brand px-4 py-2 text-sm">Browse mock tests</Link>
          <Link href="/leaderboards" className="btn-outline px-4 py-2 text-sm">See leaderboards</Link>
        </div>
      )}

      <p className="mt-6 text-xs text-neutral-400 dark:text-neutral-500">
        Public profile URL: {absoluteUrl(`/u/${profileUsername}`)}
      </p>
    </section>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Target;
}) {
  return (
    <div className="card p-4">
      <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
      <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  );
}
