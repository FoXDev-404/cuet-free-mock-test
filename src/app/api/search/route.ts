import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, logApiError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Public discovery search. Never returns options, keys or explanations. */
export async function GET(req: Request) {
  try {
    const limited = await enforceRateLimit(req, {
      bucket: "search",
      limit: 60,
      windowSec: 5 * 60,
    });
    if (limited) return limited;

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
    if (q.length < 2) {
      return NextResponse.json({ query: q, tests: [], questions: [], subjects: [] });
    }

    const [tests, questions, subjects] = await Promise.all([
      prisma.test.findMany({
        where: {
          status: "PUBLISHED",
          isPublic: true,
          OR: [{ title: { contains: q } }, { slug: { contains: q } }],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          year: true,
          durationMinutes: true,
          _count: { select: { questions: true } },
        },
      }),
      prisma.question.findMany({
        where: { isActive: true, stemEn: { contains: q } },
        orderBy: { year: "desc" },
        take: 10,
        select: {
          id: true,
          stemEn: true,
          year: true,
          source: true,
          subject: { select: { name: true } },
        },
      }),
      prisma.subject.findMany({
        where: {
          isActive: true,
          OR: [{ name: { contains: q } }, { code: { contains: q } }],
        },
        take: 6,
        select: { id: true, name: true, code: true, _count: { select: { questions: true } } },
      }),
    ]);

    return NextResponse.json({
      query: q,
      tests: tests.map((test) => ({
        id: test.id,
        title: test.title,
        slug: test.slug,
        type: test.type,
        year: test.year,
        durationMinutes: test.durationMinutes,
        questionCount: test._count.questions,
      })),
      questions: questions.map((question) => ({
        id: question.id,
        stem: question.stemEn.slice(0, 220),
        year: question.year,
        source: question.source,
        subject: question.subject?.name ?? null,
      })),
      subjects: subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        code: subject.code,
        questionCount: subject._count.questions,
      })),
    });
  } catch (error) {
    logApiError("search", error, req);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
