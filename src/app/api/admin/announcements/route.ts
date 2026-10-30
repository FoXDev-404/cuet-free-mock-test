import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { logApiError } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2000),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const g = await requirePermission("CONTENT_WRITE");
  if (g.error) return g.error;
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ announcements });
}

export async function POST(req: Request) {
  const g = await requirePermission("CONTENT_WRITE");
  if (g.error) return g.error;
  try {
    const input = schema.parse(await req.json());
    const announcement = await prisma.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        isActive: input.isActive ?? true,
      },
    });
    await writeAudit({
      session: g.session,
      action: "ANNOUNCEMENT_CREATE",
      entityType: "ANNOUNCEMENT",
      entityId: announcement.id,
      afterData: { title: announcement.title },
    });
    return NextResponse.json(announcement, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("admin/announcements", error, req);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}
