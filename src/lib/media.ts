import { getCloudflareContext } from "@opennextjs/cloudflare";
import { prisma } from "@/lib/prisma";

/**
 * Binary media storage.
 *
 * Production stores bytes in the R2 binding `MEDIA` and keeps only metadata in
 * D1, as the blueprint requires. Local `next dev` has no R2 binding, so small
 * uploads fall back to an inline data URL on the same row; that keeps the admin
 * upload flow testable without pretending D1 is R2 in production.
 */
export const MAX_MEDIA_BYTES = 500 * 1024;
export const MAX_MEDIA_ALT = 300;

export interface MediaBucket {
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string };
    arrayBuffer(): Promise<ArrayBuffer>;
  } | null>;
  delete(key: string): Promise<void>;
}

export interface MediaEnv {
  MEDIA?: MediaBucket;
  MEDIA_PUBLIC_BASE_URL?: string;
}

export function getMediaBucket(): MediaBucket | null {
  try {
    const context = getCloudflareContext();
    return (context.env as unknown as MediaEnv).MEDIA ?? null;
  } catch {
    return null;
  }
}

export function getMediaPublicBaseUrl(): string | null {
  try {
    const context = getCloudflareContext();
    const value = (context.env as unknown as MediaEnv).MEDIA_PUBLIC_BASE_URL;
    return value ? value.replace(/\/+$/, "") : null;
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export type StoredMedia = {
  id: string;
  key: string;
  url: string;
  usedR2: boolean;
};

export async function storeMedia(input: {
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
  alt: string;
  width: number | null;
  height: number | null;
  uploadedBy: string;
}): Promise<StoredMedia> {
  const month = new Date().toISOString().slice(0, 7);
  const key = `q/${month}/${crypto.randomUUID()}.${input.extension}`;
  const id = crypto.randomUUID();
  const bucket = getMediaBucket();

  let dbUrl: string;
  if (bucket) {
    await bucket.put(key, input.bytes.slice().buffer, {
      httpMetadata: {
        contentType: input.mimeType,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    const base = getMediaPublicBaseUrl();
    dbUrl = base ? `${base}/${key}` : `/api/media/${id}`;
  } else {
    dbUrl = `data:${input.mimeType};base64,${bytesToBase64(input.bytes)}`;
  }

  await prisma.mediaAsset.create({
    data: {
      id,
      key: bucket ? key : `inline:${id}`,
      url: dbUrl,
      alt: input.alt,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      sizeBytes: input.bytes.byteLength,
      uploadedBy: input.uploadedBy,
    },
  });

  return {
    id,
    key: bucket ? key : `inline:${id}`,
    url: `/api/media/${id}`,
    usedR2: Boolean(bucket),
  };
}

export type MediaObject = {
  bytes: Uint8Array;
  mimeType: string;
  etag: string | null;
};

/** Resolve a media row to bytes. Returns null for missing/deleted assets. */
export async function readMedia(id: string): Promise<{
  asset: { alt: string; mimeType: string; key: string; url: string };
  object: MediaObject;
} | null> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    select: { key: true, url: true, alt: true, mimeType: true },
  });
  if (!asset) return null;

  if (asset.key.startsWith("inline:") || asset.url.startsWith("data:")) {
    const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(asset.url);
    if (!match) return null;
    return {
      asset,
      object: {
        bytes: base64ToBytes(match[2]),
        mimeType: match[1],
        etag: null,
      },
    };
  }

  const bucket = getMediaBucket();
  if (!bucket) return null;
  const object = await bucket.get(asset.key);
  if (!object) return null;
  const buffer = await object.arrayBuffer();
  return {
    asset,
    object: {
      bytes: new Uint8Array(buffer),
      mimeType: object.httpMetadata?.contentType ?? asset.mimeType,
      etag: null,
    },
  };
}

export async function deleteMedia(id: string): Promise<boolean> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    select: { key: true },
  });
  if (!asset) return false;

  if (!asset.key.startsWith("inline:")) {
    const bucket = getMediaBucket();
    if (bucket) {
      try {
        await bucket.delete(asset.key);
      } catch (error) {
        console.error("media: R2 delete failed", error);
      }
    }
  }

  await prisma.mediaAsset.delete({ where: { id } });
  return true;
}

/**
 * Public URL for a row. Inline fallbacks expose their data URL only through
 * the serving route, never in list responses.
 */
export function mediaPublicUrl(asset: { id: string }): string {
  return `/api/media/${asset.id}`;
}
