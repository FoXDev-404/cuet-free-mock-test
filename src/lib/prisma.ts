import { PrismaClient } from "@prisma/client";

type D1Database = any;

type CloudflareEnv = { DB?: D1Database };

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let getCloudflareContextFn: ((...args: unknown[]) => { env?: CloudflareEnv }) | null = null;
try {
  // opennext is only available after `@opennextjs/cloudflare` install; missing in plain Node.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getCloudflareContextFn = (require("@opennextjs/cloudflare") as { getCloudflareContext?: (...a: unknown[]) => { env?: CloudflareEnv } }).getCloudflareContext ?? null;
} catch {
  getCloudflareContextFn = null;
}

function createLocalClient() {
  return (
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error"] : [],
    })
  );
}

export function getPrisma(): PrismaClient {
  try {
    if (getCloudflareContextFn) {
      const ctx = getCloudflareContextFn();
      const db = ctx?.env?.DB;
      if (db) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { PrismaD1 } = require("@prisma/adapter-d1");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return new PrismaClient({ adapter: new PrismaD1(db) } as any);
        } catch {
          // Adapter or runtime unavailable; fall back below.
        }
      }
    }
  } catch {
    // Not running on Cloudflare Workers (e.g. dev / static build); fall back below.
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createLocalClient();
  }
  return globalForPrisma.prisma as PrismaClient;
}

// Backwards-compatible `prisma` export used throughout the codebase.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") return value.bind(client);
    return value;
  },
  // Support `instanceof` checks gracefully.
  has(_target, prop) {
    const client = getPrisma();
    return prop in (client as object);
  },
});

if (process.env.NODE_ENV !== "production") {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error"] : [],
    });
  }
}
