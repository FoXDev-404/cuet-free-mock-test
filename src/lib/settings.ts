import { prisma } from "@/lib/prisma";

/**
 * Operational settings.
 *
 * Reads are cached briefly per Worker isolate because they sit on hot paths
 * (registration, discussions, reports) and a switch does not need to propagate
 * in milliseconds. Writes clear the cache immediately in the handling isolate.
 */
export const SETTING_KEYS = {
  registrationEnabled: "registration.enabled",
  discussionsEnabled: "community.discussions",
  reportsEnabled: "community.reports",
  examDate: "exam.date",
  maintenanceMessage: "maintenance.message",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.registrationEnabled]: "true",
  [SETTING_KEYS.discussionsEnabled]: "true",
  [SETTING_KEYS.reportsEnabled]: "true",
  [SETTING_KEYS.examDate]: "",
  [SETTING_KEYS.maintenanceMessage]:
    "We are doing a short maintenance pass. Practice data is safe — please check back soon.",
};

const CACHE_TTL_MS = 30_000;

const globalCache = globalThis as unknown as {
  __cuetSettingsCache?: { values: Record<string, string>; expiresAt: number };
};

function cache() {
  if (!globalCache.__cuetSettingsCache) {
    globalCache.__cuetSettingsCache = { values: {}, expiresAt: 0 };
  }
  return globalCache.__cuetSettingsCache;
}

export function clearSettingsCache(): void {
  globalCache.__cuetSettingsCache = { values: {}, expiresAt: 0 };
}

/** Returns all known settings merged over their safe defaults. */
export async function getSettings(): Promise<Record<string, string>> {
  const entry = cache();
  if (entry.expiresAt > Date.now()) {
    return { ...DEFAULTS, ...entry.values };
  }

  try {
    const rows = await prisma.platformSetting.findMany();
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    globalCache.__cuetSettingsCache = {
      values,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return { ...DEFAULTS, ...values };
  } catch (error) {
    // Settings must never take a public route down. Fall back to defaults and
    // retry after the normal TTL instead of caching the failure forever.
    console.error("settings: failed to read, using defaults", error);
    return { ...DEFAULTS, ...entry.values };
  }
}

export async function isSettingEnabled(key: SettingKey): Promise<boolean> {
  const settings = await getSettings();
  return settings[key] !== "false";
}

export async function getSetting(key: SettingKey): Promise<string> {
  const settings = await getSettings();
  return settings[key] ?? DEFAULTS[key] ?? "";
}

/** Upserts one setting. Callers are responsible for authorization + audit. */
export async function setSetting(
  key: SettingKey,
  value: string,
  updatedBy: string | null,
): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value, updatedBy },
    update: { value, updatedBy },
  });
  clearSettingsCache();
}

/** A valid `YYYY-MM-DD` exam date, or null when unset/malformed. */
export function parseExamDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  // Reject impossible dates such as 2026-02-31.
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
}
