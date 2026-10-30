import { prisma } from "@/lib/prisma";

const RESERVED = new Set([
  "admin",
  "administrator",
  "api",
  "root",
  "support",
  "system",
  "cuet",
  "cuetfreemocktest",
  "login",
  "signup",
  "register",
  "dashboard",
  "settings",
  "help",
]);

/** Lowercase, hyphenated, 3-24 chars, safe for /u/{username}. */
export function normalizeUsername(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 4);
}

export async function allocateUsername(
  preferred: string | null | undefined,
  email?: string | null,
): Promise<string> {
  const base =
    normalizeUsername(preferred || "") ||
    normalizeUsername(email?.split("@")[0] || "") ||
    "learner";
  const safeBase = RESERVED.has(base) ? `${base}-learner` : base;

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate =
      attempt === 0 ? safeBase : `${safeBase.slice(0, 19)}-${randomSuffix()}`;
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `learner-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

/** Backfills a username for accounts created before usernames existed. */
export async function ensureUserUsername(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, email: true },
  });
  if (!user) return null;
  if (user.username) return user.username;
  const username = await allocateUsername(user.name, user.email);
  try {
    await prisma.user.update({ where: { id: user.id }, data: { username } });
    return username;
  } catch {
    return user.username ?? null;
  }
}

/** Username-only display name; never exposes the account email. */
export function displayUsername(user: {
  username?: string | null;
  name?: string | null;
  id?: string;
}): string {
  return (
    user.username ||
    user.name ||
    (user.id ? `learner-${user.id.slice(-6)}` : "Learner")
  );
}
