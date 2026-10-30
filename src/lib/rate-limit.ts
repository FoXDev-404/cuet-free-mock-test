import { prisma } from "@/lib/prisma";

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
  remaining: number;
}

/**
 * Fixed-window rate limiter backed by D1.
 *
 * D1 is the only shared store available to every Worker isolate, so an
 * in-memory Map would let a caller multiply their budget by landing on
 * different isolates. The check is intentionally best-effort: a database
 * failure fails open so abuse protection can never take the site down.
 */
export async function rateLimit(input: {
  key: string;
  limit: number;
  windowSec: number;
}): Promise<RateLimitResult> {
  const { key, limit, windowSec } = input;
  const windowMs = Math.max(1, windowSec) * 1000;
  const now = Date.now();

  try {
    const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
    if (!bucket || now - bucket.windowStart.getTime() >= windowMs) {
      await prisma.rateLimitBucket.upsert({
        where: { key },
        create: { key, windowStart: new Date(now), count: 1 },
        update: { windowStart: new Date(now), count: 1 },
      });
      return { ok: true, retryAfterSec: 0, remaining: Math.max(0, limit - 1) };
    }

    if (bucket.count >= limit) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((bucket.windowStart.getTime() + windowMs - now) / 1000),
      );
      return { ok: false, retryAfterSec, remaining: 0 };
    }

    await prisma.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return { ok: true, retryAfterSec: 0, remaining: Math.max(0, limit - bucket.count - 1) };
  } catch (error) {
    console.error("rate limit unavailable", error);
    return { ok: true, retryAfterSec: 0, remaining: limit };
  }
}

/** Opportunistic cleanup of expired windows (called by admin maintenance). */
export async function pruneRateLimits(olderThanHours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const result = await prisma.rateLimitBucket.deleteMany({
    where: { windowStart: { lt: cutoff } },
  });
  return result.count;
}
