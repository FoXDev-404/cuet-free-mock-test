import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

/** Consistent metadata for an indexable public page. */
export function publicPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  const image = {
    url: absoluteUrl("/opengraph-image"),
    width: 1200,
    height: 630,
    alt: "CUETFreeMockTest.Com — free CUET UG mock tests and previous year papers",
  };

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: input.title,
      description: input.description,
      url: absoluteUrl(input.path),
      type: input.type ?? "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image.url],
    },
  };
}

/** Shared robots directive for authenticated or transient surfaces. */
export const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false },
};
