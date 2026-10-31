import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requirePermission, writeAudit } from "@/lib/auth/guard";
import { forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
import { getMediaBucket, getMediaKv } from "@/lib/media";
import {
  SETTING_KEYS,
  clearSettingsCache,
  getSettings,
  parseExamDate,
  setSetting,
} from "@/lib/settings";
import { z } from "zod";

export const dynamic = "force-dynamic";

const KNOWN_KEYS = new Set<string>(Object.values(SETTING_KEYS));

const patchSchema = z.object({
  values: z.record(z.string(), z.string().max(500)),
});

function validateValue(key: string, value: string): string | null {
  if (!KNOWN_KEYS.has(key)) return `Unknown setting: ${key}`;
  if (key === SETTING_KEYS.examDate) {
    if (value && !parseExamDate(value)) return "Exam date must be a real date in YYYY-MM-DD form.";
    return null;
  }
  if (key === SETTING_KEYS.maintenanceMessage) {
    if (value.trim().length < 10 || value.length > 500) {
      return "Maintenance message must be between 10 and 500 characters.";
    }
    return null;
  }
  if (value !== "true" && value !== "false") {
    return `${key} must be "true" or "false".`;
  }
  return null;
}

function runtimeStatus() {
  let hasD1 = false;
  let hasAuthSecret = Boolean(process.env.NEXTAUTH_SECRET);
  try {
    const env = getCloudflareContext().env as unknown as {
      DB?: unknown;
      NEXTAUTH_SECRET?: string;
    };
    hasD1 = Boolean(env.DB);
    hasAuthSecret = hasAuthSecret || Boolean(env.NEXTAUTH_SECRET);
  } catch {
    // Local development has no Cloudflare context.
  }

  return {
    runtime: process.env.NODE_ENV,
    hasD1,
    hasR2: Boolean(getMediaBucket()),
    hasKv: Boolean(getMediaKv()),
    hasAuthSecret,
  };
}

export async function GET() {
  const g = await requirePermission("SETTINGS_WRITE");
  if (g.error) return g.error;

  try {
    const settings = await getSettings();
    return NextResponse.json({ settings, runtime: runtimeStatus() });
  } catch (error) {
    logApiError("admin/settings:get", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const g = await requirePermission("SETTINGS_WRITE");
  if (g.error) return g.error;

  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();
    const input = patchSchema.parse(await req.json());
    const entries = Object.entries(input.values);
    if (entries.length === 0) {
      return NextResponse.json({ error: "No settings supplied." }, { status: 400 });
    }

    for (const [key, value] of entries) {
      const message = validateValue(key, value);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }

    const email = (g.session.user as { email?: string }).email ?? null;
    for (const [key, value] of entries) {
      await setSetting(key as (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS], value, email);
    }
    clearSettingsCache();

    await writeAudit({
      session: g.session,
      action: "SETTINGS_UPDATE",
      entityType: "PLATFORM_SETTING",
      afterData: Object.fromEntries(entries),
    });

    return NextResponse.json({
      settings: await getSettings(),
      runtime: runtimeStatus(),
      updated: entries.map(([key]) => key),
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("admin/settings:patch", error, req);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
