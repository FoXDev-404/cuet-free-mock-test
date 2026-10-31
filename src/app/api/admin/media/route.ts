import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { enforceRateLimit, forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
import { inspectImage, isSafeImageSize } from "@/lib/image";
import {
  MAX_MEDIA_ALT,
  MAX_MEDIA_BYTES,
  mediaPublicUrl,
  storeMedia,
} from "@/lib/media";

export const dynamic = "force-dynamic";

function serialize(asset: {
  id: string;
  alt: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: Date;
}) {
  return {
    id: asset.id,
    url: mediaPublicUrl(asset),
    alt: asset.alt,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    sizeBytes: asset.sizeBytes,
    uploadedBy: asset.uploadedBy,
    createdAt: asset.createdAt,
  };
}

export async function GET() {
  const g = await requirePermission("CONTENT_WRITE");
  if (g.error) return g.error;

  try {
    const assets = await prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        alt: true,
        mimeType: true,
        width: true,
        height: true,
        sizeBytes: true,
        uploadedBy: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ assets: assets.map(serialize) });
  } catch (error) {
    logApiError("admin/media:list", error);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }
}

/**
 * Authenticated upload. Validates actual bytes, not the browser-supplied MIME
 * or filename; enforces the 500 KB starter ceiling and mandatory alt text.
 */
export async function POST(req: Request) {
  const g = await requirePermission("CONTENT_WRITE");
  if (g.error) return g.error;

  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();
    const email = (g.session.user as { email?: string }).email ?? "admin";
    const limited = await enforceRateLimit(req, {
      bucket: `media:upload:${email}`,
      limit: 30,
      windowSec: 60 * 60,
      byIp: false,
    });
    if (limited) return limited;

    const form = await req.formData();
    const file = form.get("file");
    const alt = String(form.get("alt") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    }
    if (alt.length < 3 || alt.length > MAX_MEDIA_ALT) {
      return NextResponse.json(
        { error: `Alt text must be between 3 and ${MAX_MEDIA_ALT} characters.` },
        { status: 400 },
      );
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "The file is empty." }, { status: 400 });
    }
    if (file.size > MAX_MEDIA_BYTES) {
      return NextResponse.json(
        { error: "Images must be 500 KB or smaller. Compress the diagram before uploading." },
        { status: 413 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = inspectImage(bytes);
    if (!image) {
      return NextResponse.json(
        { error: "Only real PNG, JPEG or WebP images are accepted." },
        { status: 415 },
      );
    }
    if (!isSafeImageSize(image)) {
      return NextResponse.json(
        { error: "Image dimensions are too large. Resize the diagram before uploading." },
        { status: 413 },
      );
    }

    const stored = await storeMedia({
      bytes,
      mimeType: image.mime,
      extension: image.extension,
      alt,
      width: image.width,
      height: image.height,
      uploadedBy: email,
    });

    await writeAudit({
      session: g.session,
      action: "MEDIA_UPLOAD",
      entityType: "MEDIA_ASSET",
      entityId: stored.id,
      afterData: {
        alt,
        mimeType: image.mime,
        sizeBytes: bytes.byteLength,
        storage: stored.storage,
      },
    });

    const asset = await prisma.mediaAsset.findUniqueOrThrow({
      where: { id: stored.id },
      select: {
        id: true,
        alt: true,
        mimeType: true,
        width: true,
        height: true,
        sizeBytes: true,
        uploadedBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { ...serialize(asset), storage: stored.storage },
      { status: 201 },
    );
  } catch (error) {
    logApiError("admin/media:upload", error, req);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
