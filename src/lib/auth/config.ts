import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    role: string;
  }
}

type D1Database = ConstructorParameters<typeof PrismaD1>[0];
type CloudflareEnv = { DB?: D1Database };

type AuthUserRow = {
  id: string;
  name: string | null;
  email: string;
  passwordHash: string | null;
  role: string;
};

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
};

/**
 * Minimal credentials lookup for sign-in. On Workers this reads the D1
 * binding directly — using Prisma's WASM engine here costs well over the
 * free plan's ~10ms request CPU budget on cold isolates. Prisma is imported
 * lazily and only where Node (local dev, tests) runs the app.
 */
async function getUserForAuth(email: string): Promise<AuthUserRow | null> {
  try {
    // Throws outside a Cloudflare/Workers context (plain `next dev`); the
    // catch below falls back to Prisma instead of breaking sign-in.
    const db = (getCloudflareContext()?.env as unknown as CloudflareEnv | undefined)?.DB;
    if (db) {
      const row = await (db.prepare(
        'SELECT "id","name","email","passwordHash","role" FROM "User" WHERE "email" = ?1 LIMIT 1',
      ) as D1Statement)
        .bind(email)
        .first<AuthUserRow>();
      return row ?? null;
    }
  } catch {
    // Running under Node/local dev — use the lazy Prisma fallback below.
  }

  // Node fallback (local dev / tests). Lazy import keeps the WASM engine out
  // of the production bundle's module graph for this path.
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordHash: true, role: true },
  });
  return user as unknown as AuthUserRow | null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await getUserForAuth(credentials.email);
        if (!user || !user.passwordHash) return null;
        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export const GET = handler;
export const POST = handler;

// Seed admin user if env credentials provided (Node/dev only; production
// admins are provisioned with scripts/create-admin.ts + wrangler d1 execute).
export async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const { prisma } = await import("@/lib/prisma");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { email, name: "Admin", role: "ADMIN", passwordHash },
  });
}
