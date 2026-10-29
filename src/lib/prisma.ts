import type { PrismaClient } from "@prisma/client";
import { PrismaClient as WorkerPrismaClient } from "@prisma/client/wasm";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1Database = ConstructorParameters<typeof PrismaD1>[0];

type CloudflareEnv = { DB?: D1Database };

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createLocalClient() {
  if (!globalForPrisma.prisma) {
    // Keep the Node engine lazy-loaded; Workers must use the generated WASM client.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient: LocalPrismaClient } = require("@prisma/client") as typeof import("@prisma/client");
    globalForPrisma.prisma = new LocalPrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error"] : [],
    });
  }

  return globalForPrisma.prisma;
}

export function getPrisma(): PrismaClient {
  let context: ReturnType<typeof getCloudflareContext> | undefined;
  try {
    context = getCloudflareContext();
  } catch (error) {
    // Next evaluates database-backed pages during the production build too.
    const isBuild = process.env.NEXT_PHASE === "phase-production-build";
    if (process.env.NODE_ENV === "production" && !isBuild) throw error;
  }

  const db = (context?.env as unknown as CloudflareEnv | undefined)?.DB;
  if (db) {
    // Prisma v5's adapter typing does not yet include the D1 adapter option.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new WorkerPrismaClient({ adapter: new PrismaD1(db) } as any) as unknown as PrismaClient;
  }

  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (process.env.NODE_ENV === "production" && !isBuild) {
    throw new Error("Cloudflare D1 binding 'DB' is unavailable; refusing to use the local Prisma engine in production.");
  }

  return createLocalClient();
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
    createLocalClient();
  }
}
