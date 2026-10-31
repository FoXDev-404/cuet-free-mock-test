import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalPaperSummaries } from "@/lib/local-papers";

export const dynamic = "force-dynamic";

/**
 * Blueprint alias: GET /api/mocks
 *
 * Published mocks with pagination and basic filters. The older `/api/tests`
 * endpoint remains for the homepage, while this endpoint is the documented
 * public API for integrations.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(searchParams.get("perPage") || "20", 10) || 20, 1), 100);
    const type = searchParams.get("type") || undefined;
    const subjectId = searchParams.get("subjectId") || undefined;
    const search = searchParams.get("search")?.trim() || undefined;

    const local = getLocalPaperSummaries().filter((paper) => {
      if (type && paper.type !== type) return false;
      if (search && !paper.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    const tests = await prisma.test.findMany({
      where: {
        status: "PUBLISHED",
        isPublic: true,
        ...(type ? { type } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(search ? { title: { contains: search } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    });

    const mocks = [...tests, ...local];
    const total = mocks.length;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;

    return NextResponse.json({
      mocks: mocks.slice(start, start + perPage),
      total,
      page,
      perPage,
      pages,
    });
  } catch (error) {
    console.error("mocks API error", error);
    return NextResponse.json({ error: "Failed to load mocks" }, { status: 500 });
  }
}
