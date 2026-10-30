import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
import { deleteMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const g = await requirePermission("CONTENT_WRITE");
  if (g.error) return g.error;

  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();
    const { id } = await context.params;
    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      select: { id: true, alt: true, key: true },
    });
    if (!asset) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await deleteMedia(id);
    await writeAudit({
      session: g.session,
      action: "MEDIA_DELETE",
      entityType: "MEDIA_ASSET",
      entityId: id,
      beforeData: { alt: asset.alt, key: asset.key },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError("admin/media:delete", error, req);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
