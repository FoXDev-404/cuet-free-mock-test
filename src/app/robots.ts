import type { MetadataRoute } from "next";
import { PRIVATE_ROUTE_PREFIXES, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          ...PRIVATE_ROUTE_PREFIXES.flatMap((prefix) => [prefix, `${prefix}/`]),
          "/mock-tests/*/take",
          "/mock-tests/*/result/*",
        ],
      },
      {
        // AdSense crawler must be able to review the site.
        userAgent: "Mediapartners-Google",
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
