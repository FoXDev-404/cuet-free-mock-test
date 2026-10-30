/**
 * Canonical site URL used by metadata, robots.txt and the sitemap.
 *
 * Cloudflare deployments expose NEXT_PUBLIC_APP_URL; local development falls
 * back to localhost. Resolve once so every surface stays consistent.
 */
export const SITE_NAME = "CUETFreeMockTest.Com";

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

export const SITE_URL = rawSiteUrl.replace(/\/+$/, "");

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Routes that must never appear in the sitemap or search results. */
export const PRIVATE_ROUTE_PREFIXES = [
  "/admin",
  "/api",
  "/dashboard",
  "/settings",
  "/bookmarks",
  "/incorrect",
  "/mock-history",
  "/analytics",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/english-mock/take",
  "/english-mock/results",
] as const;
