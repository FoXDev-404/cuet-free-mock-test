import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getLocalPaperSummaries } from "@/lib/local-papers";
import { BLOG_POSTS } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

// Tests change as editors publish; generate the sitemap on request rather than
// baking a build-time snapshot of the database into the deployment.
export const dynamic = "force-dynamic";

const PUBLIC_ROUTES: Array<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/mock-tests", changeFrequency: "daily", priority: 0.9 },
  { path: "/practice", changeFrequency: "daily", priority: 0.8 },
  { path: "/pyq", changeFrequency: "monthly", priority: 0.8 },
  { path: "/cuet-syllabus", changeFrequency: "monthly", priority: 0.7 },
  { path: "/cuet-exam-pattern", changeFrequency: "monthly", priority: 0.7 },
  { path: "/cuet-important-dates", changeFrequency: "weekly", priority: 0.7 },
  { path: "/cuet-marking-scheme", changeFrequency: "monthly", priority: 0.7 },
  { path: "/discussions", changeFrequency: "daily", priority: 0.6 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/categories", changeFrequency: "weekly", priority: 0.6 },
  { path: "/leaderboards", changeFrequency: "daily", priority: 0.5 },
  { path: "/about", changeFrequency: "yearly", priority: 0.4 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/disclaimer", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const localEntries: MetadataRoute.Sitemap = getLocalPaperSummaries().map((paper) => ({
    url: `${SITE_URL}/mock-tests/${paper.slug}`,
    lastModified: new Date(paper.createdAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const blogEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updated),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  let testEntries: MetadataRoute.Sitemap = [];
  try {
    const tests = await prisma.test.findMany({
      where: { status: "PUBLISHED", isPublic: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    testEntries = tests.map((test) => ({
      url: `${SITE_URL}/mock-tests/${test.slug}`,
      lastModified: test.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    const englishMock = await prisma.englishMockConfig.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (englishMock) {
      staticEntries.push({
        url: `${SITE_URL}/english-mock/intro`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch (error) {
    // A sitemap should still be useful if D1 is briefly unavailable; local
    // papers and the static public routes do not depend on the database.
    console.error("sitemap: failed to load published tests", error);
  }

  return [...staticEntries, ...testEntries, ...localEntries, ...blogEntries];
}
