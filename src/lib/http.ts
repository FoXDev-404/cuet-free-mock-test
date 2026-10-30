import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/** Client IP for coarse abuse controls. Cloudflare sets cf-connecting-ip. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * CSRF defence for cookie-authenticated mutations.
 *
 * NextAuth protects its own endpoints; this guards the custom API routes.
 * Requests without an Origin header (curl, server-to-server) pass because the
 * session cookie is SameSite=Lax; a cross-site browser POST always sends Origin.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function forbiddenOrigin(): NextResponse {
  return NextResponse.json({ error: "Cross-site request rejected" }, { status: 403 });
}

type LimitOptions = {
  bucket: string;
  limit: number;
  windowSec: number;
  /** Include the caller IP automatically. Defaults to true. */
  byIp?: boolean;
};

/** Returns a 429 response when the bucket is exhausted, otherwise null. */
export async function enforceRateLimit(
  req: Request,
  options: LimitOptions,
): Promise<NextResponse | null> {
  const identity = options.byIp === false ? "" : `:${clientIp(req)}`;
  const result = await rateLimit({
    key: `${options.bucket}${identity}`,
    limit: options.limit,
    windowSec: options.windowSec,
  });
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Too many requests. Please wait and try again." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSec) },
    },
  );
}

/** Stable request id for logs and error responses. */
export function requestId(req: Request): string {
  return req.headers.get("cf-ray") || crypto.randomUUID();
}

export function logApiError(scope: string, error: unknown, req?: Request) {
  console.error(
    JSON.stringify({
      scope,
      requestId: req ? requestId(req) : undefined,
      message: error instanceof Error ? error.message : String(error),
    }),
  );
}
