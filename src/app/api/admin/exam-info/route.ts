import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { logApiError } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  key: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  label: z.string().trim().min(1).max(160),
  value: z.string().trim().min(1).max(10000),
  sourceUrl: z.string().url().nullable().optional(),
  lastVerified: z.string().datetime().nullable().optional(),
});

export async function GET() {
  const g = await requirePermission("CONTENT_WRITE");
  if (g.error) return g.error;
  const entries = await prisma.examInfo.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ entries });
}

/** Upsert by stable key so pages never depend on a generated row id. */
export async function POST(req: Request) {
  const g = await requirePermission("CONTENT_WRITE");
  if (g.error) return g.error;
  try {
    const input = schema.parse(await req.json());
    const actor = (g.session.user as { email?: string }).email ?? null;
    const entry = await prisma.examInfo.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        label: input.label,
        value: input.value,
        sourceUrl: input.sourceUrl ?? null,
        lastVerified: input.lastVerified ? new Date(input.lastVerified) : new Date(),
        updatedBy: actor,
      },
      update: {
        label: input.label,
        value: input.value,
        sourceUrl: input.sourceUrl ?? null,
        ...(input.lastVerified !== undefined
          ? { lastVerified: input.lastVerified ? new Date(input.lastVerified) : null }
          : {}),
        updatedBy: actor,
      },
    });
    await writeAudit({
      session: g.session,
      action: "EXAM_INFO_UPSERT",
      entityType: "EXAM_INFO",
      entityId: entry.id,
      afterData: { key: entry.key, label: entry.label },
    });
    return NextResponse.json(entry);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("admin/exam-info", error, req);
    return NextResponse.json({ error: "Failed to save exam information" }, { status: 500 });
  }
}
