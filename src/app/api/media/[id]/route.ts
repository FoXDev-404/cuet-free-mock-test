import { NextResponse } from "next/server";
import { readMedia } from "@/lib/media";
import { logApiError } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Public, immutable media delivery. Keys are random and content is never
 * mutated in place, so a one-year immutable cache is safe. Deleted rows return
 * 404; browsers may retain the previously cached copy, which is expected.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{6,64}$/.test(id)) {
      return new NextResponse("Not found", { status: 404 });
    }

    const etag = `"media-${id}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    const media = await readMedia(id);
    if (!media) return new NextResponse("Not found", { status: 404 });

    return new NextResponse(media.object.bytes.slice().buffer, {
      status: 200,
      headers: {
        "Content-Type": media.object.mimeType,
        "Content-Length": String(media.object.bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        ETag: etag,
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    logApiError("media:serve", error, req);
    return new NextResponse("Media unavailable", { status: 503 });
  }
}
