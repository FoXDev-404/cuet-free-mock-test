"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";

type Asset = {
  id: string;
  url: string;
  alt: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
};

const MAX_BYTES = 500 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round((bytes / 1024) * 10) / 10} KB`;
}

export default function AdminMediaPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media");
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  useEffect(() => {
    if (!file) {
      const id = setTimeout(() => setPreview(null), 0);
      return () => clearTimeout(id);
    }
    const url = URL.createObjectURL(file);
    const id = setTimeout(() => setPreview(url), 0);
    return () => {
      clearTimeout(id);
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const choose = (selected: File | null) => {
    setError("");
    setMessage("");
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError("Images must be 500 KB or smaller.");
      setFile(null);
      return;
    }
    setFile(selected);
    if (!alt && selected.name) {
      setAlt(selected.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 120));
    }
  };

  const upload = async () => {
    if (!file || alt.trim().length < 3) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("alt", alt.trim());
      const res = await fetch("/api/admin/media", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Upload failed");
      }
      setMessage(
        data.storage === "kv"
          ? "Uploaded to Workers KV. Copy the URL into a question image field."
          : data.storage === "r2"
            ? "Uploaded to R2. Copy the URL into a question image field."
            : "Uploaded with the local inline fallback. Production uses Workers KV.",
      );
      setFile(null);
      setAlt("");
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (asset: Asset) => {
    if (!window.confirm(`Delete “${asset.alt}”? Content that already references it will show a broken image.`)) {
      return;
    }
    const res = await fetch(`/api/admin/media/${asset.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data?.error === "string" ? data.error : "Delete failed");
      return;
    }
    setAssets((prev) => prev.filter((item) => item.id !== asset.id));
    setMessage("Image deleted.");
  };

  const copy = async (asset: Asset) => {
    try {
      await navigator.clipboard.writeText(asset.url);
      setMessage("URL copied to the clipboard.");
    } catch {
      setError("Could not access the clipboard. Open the image and copy its address.");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
          <ImagePlus className="h-6 w-6 text-primary-600" /> Media library
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Question diagrams and explanation figures. PNG, JPEG or WebP, up to 500 KB, with mandatory alt text.
          Production stores bytes in Workers KV and only metadata in D1.
        </p>
      </div>

      {message ? (
        <p className="mb-3 rounded-lg bg-secondary-50 p-2.5 text-sm text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-200" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 p-2.5 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Image file
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => choose(event.target.files?.[0] ?? null)}
                  className="mt-1 block w-full cursor-pointer rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
                />
              </label>
              <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Alt text (required)
                <input
                  value={alt}
                  onChange={(event) => setAlt(event.target.value)}
                  maxLength={300}
                  placeholder="Describe the diagram for screen-reader users"
                  className="input mt-1"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="brand"
                  onClick={upload}
                  disabled={uploading || !file || alt.trim().length < 3}
                >
                  {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-1.5 h-4 w-4" />}
                  Upload image
                </Button>
                {file ? <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatBytes(file.size)} selected</span> : null}
              </div>
            </div>
            <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900">
              {preview ? (
                // Local blob preview; next/image cannot optimise object URLs.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Selected image preview" className="max-h-40 w-auto max-w-full object-contain" />
              ) : (
                <p className="px-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  Select an image to preview it here.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="card p-10 text-center text-neutral-500">Loading media…</div>
      ) : assets.length === 0 ? (
        <div className="card p-10 text-center text-neutral-500">
          No images yet. Upload the first diagram above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden">
              <div className="flex h-40 items-center justify-center border-b border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                <Image
                  src={asset.url}
                  alt={asset.alt}
                  width={asset.width ?? 320}
                  height={asset.height ?? 180}
                  unoptimized
                  className="max-h-36 w-auto max-w-full object-contain"
                />
              </div>
              <CardContent className="pt-3">
                <p className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-white">{asset.alt}</p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {asset.mimeType.replace("image/", "").toUpperCase()}
                  {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
                  {" · "}
                  {formatBytes(asset.sizeBytes)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                  {new Date(asset.createdAt).toLocaleDateString()} · {asset.uploadedBy}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => copy(asset)}
                    className="btn-outline inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
                  >
                    <Copy className="h-3 w-3" /> Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(asset)}
                    className="btn-outline inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
