import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { logApiError } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  path: z.string().trim().min(1).max(200).startsWith("/"),
  title: z.string().trim().max(160).nullable().optional(),
  description: z.string().trim().max(320).nullable().optional(),
  introContent: z.string().trim().max(20000).nullable().optional(),
  faqJson: z.string().max(20000).nullable().optional(),
});

export async function GET() {
  const g = await requirePermission("CONTENT_WRITE");
  if (g.error) return g.error;
  const pages = await prisma.pageSeo.findMany({ orderBy: { path: "asc" } });
  return NextResponse.json({ pages });
}

/** Upsert by canonical path. Empty strings clear an override. */
export async function POST(req: Request) {
  const g = await requirePermission("CONTENT_WRITE");
  if (g.error) return g.error;
  try {
    const input = schema.parse(await req.json());
    if (input.faqJson) {
      try {
        const parsed = JSON.parse(input.faqJson);
        if (!Array.isArray(parsed)) throw new Error("FAQ must be a JSON array");
      } catch {
        return NextResponse.json(
          { error: "FAQ must be a valid JSON array of {question, answer} objects" },
          { status: 400 },
        );
      }
    }
    const actor = (g.session.user as { email?: string }).email ?? null;
    const page = await prisma.pageSeo.upsert({
      where: { path: input.path },
      create: {
        path: input.path,
        title: input.title ?? null,
        description: input.description ?? null,
        introContent: input.introContent ?? null,
        faqJson: input.faqJson ?? null,
        updatedBy: actor,
      },
      update: {
        title: input.title ?? null,
        description: input.description ?? null,
        introContent: input.introContent ?? null,
        faqJson: input.faqJson ?? null,
        updatedBy: actor,
      },
    });
    await writeAudit({
      session: g.session,
      action: "PAGE_SEO_UPSERT",
      entityType: "PAGE_SEO",
      entityId: page.id,
      afterData: { path: page.path, title: page.title },
    });
    return NextResponse.json(page);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("admin/seo", error, req);
    return NextResponse.json({ error: "Failed to save SEO override" }, { status: 500 });
  }
}
