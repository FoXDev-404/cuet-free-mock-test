import type { NextConfig } from "next";

// Private surfaces must stay out of search results even if a crawler reaches
// them. X-Robots-Tag works for client-rendered pages that cannot export
// per-route metadata.
const PRIVATE_ROUTES = [
  "/admin",
  "/admin/:path*",
  "/dashboard",
  "/dashboard/:path*",
  "/settings",
  "/settings/:path*",
  "/bookmarks",
  "/bookmarks/:path*",
  "/incorrect",
  "/incorrect/:path*",
  "/mock-history",
  "/mock-history/:path*",
  "/analytics",
  "/analytics/:path*",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/reset-password/:path*",
  "/verify-email",
  "/verify-email/:path*",
  "/mock-tests/:slug/take",
  "/mock-tests/:slug/result/:path*",
  "/english-mock/take",
  "/english-mock/results",
];

const nextConfig: NextConfig = {
  /* config options here */
  partialPrefetching: false,
  serverExternalPackages: ["@prisma/adapter-d1", "@prisma/client", ".prisma/client"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      ...PRIVATE_ROUTES.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
};

export default nextConfig;
