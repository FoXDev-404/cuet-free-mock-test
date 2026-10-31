import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { isSafeImageUrl } from "@/lib/question-display";
import { z } from "zod";

export const dynamic = "force-dynamic";

const passageMediaSchema = z
  .object({
    imageUrl: z.string().nullable().optional(),
    imageAlt: z.string().max(500).nullable().optional(),
    sourceNote: z.string().max(1000).nullable().optional(),
    reason: z.string().max(200).optional(),
  })
  .strict();

/**
 * Shared-passage media (blueprint 10.3).
 *
 * A passage belongs to many questions, so its diagram is stored once here
 * instead of being duplicated in every linked Question.questionImages row.
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requirePermission("QUESTION_WRITE");
  if (guard.error) return guard.error;

  try {
    const { id } = await context.params;
    const data = passageMediaSchema.parse(await req.json());

    const before = await prisma.passage.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Passage not found" }, { status: 404 });

    const imageUrl = data.imageUrl?.trim() || null;
    if (imageUrl && !isSafeImageUrl(imageUrl)) {
      return NextResponse.json({ error: "Image URL must be an https URL or a site path" }, { status: 400 });
    }
    if (imageUrl && !(data.imageAlt ?? before.imageAlt ?? "").trim()) {
      return NextResponse.json({ error: "Alt text is required for a passage image" }, { status: 400 });
    }

    const passage = await prisma.passage.update({
      where: { id },
      data: {
        ...(data.imageUrl !== undefined ? { imageUrl } : {}),
        ...(data.imageAlt !== undefined ? { imageAlt: data.imageAlt?.trim() || null } : {}),
        ...(data.sourceNote !== undefined ? { sourceNote: data.sourceNote?.trim() || null } : {}),
      },
    });

    await writeAudit({
      session: guard.session,
      action: "PASSAGE_MEDIA_UPDATE",
      entityType: "PASSAGE",
      entityId: id,
      reason: data.reason ?? "passage media edit",
      beforeData: {
        imageUrl: before.imageUrl,
        imageAlt: before.imageAlt,
        sourceNote: before.sourceNote,
      },
      afterData: {
        imageUrl: passage.imageUrl,
        imageAlt: passage.imageAlt,
        sourceNote: passage.sourceNote,
      },
    });

    return NextResponse.json({ passage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("admin passage PATCH error", error);
    return NextResponse.json({ error: "Failed to update passage media" }, { status: 500 });
  }
}
