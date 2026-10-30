import { prisma } from "@/lib/prisma";

export type ExamInfoRow = {
  key: string;
  label: string;
  value: string;
  sourceUrl: string | null;
  lastVerified: Date | null;
  updatedAt: Date;
};

/** Editorial exam facts. Missing rows fall back to page copy. */
export async function getExamInfo(keys: string[]): Promise<Record<string, ExamInfoRow>> {
  try {
    const rows = await prisma.examInfo.findMany({ where: { key: { in: keys } } });
    return Object.fromEntries(rows.map((row) => [row.key, row]));
  } catch {
    return {};
  }
}

export async function getActiveAnnouncements(limit = 3) {
  try {
    const now = new Date();
    return await prisma.announcement.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, title: true, body: true },
    });
  } catch {
    return [];
  }
}

export async function getPageSeo(path: string) {
  try {
    return await prisma.pageSeo.findUnique({ where: { path } });
  } catch {
    return null;
  }
}

export type FaqItem = { question: string; answer: string };

export function parseFaq(raw: string | null | undefined): FaqItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is FaqItem =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof item.question === "string" &&
          typeof item.answer === "string",
      )
      .slice(0, 20);
  } catch {
    return [];
  }
}

export function faqStructuredData(faq: FaqItem[]) {
  if (!faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function formatVerified(date: Date | null | undefined): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
