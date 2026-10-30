import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import type { Session } from "next-auth";
import { can, normalizeRole, type AdminAction } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

type GuardResult =
  | { session: Session; error: null }
  | { session: null; error: NextResponse };

// Shared guard for /api/admin/* route handlers (full admin access).
export async function requireAdmin(): Promise<GuardResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  const role = (session.user as { role?: string }).role;
  if (!can(role, "QUESTION_READ")) {
    return { session: null, error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  return { session, error: null };
}

// Fine-grained guard: checks the specific permission against the user's role.
export async function requirePermission(action: AdminAction): Promise<GuardResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  const role = (session.user as { role?: string }).role;
  if (!can(role, action)) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Insufficient role", requiredPermission: action },
        { status: 403 },
      ),
    };
  }
  return { session, error: null };
}

export function sessionRole(session: Session | null): string {
  return normalizeRole((session?.user as { role?: string } | undefined)?.role);
}

/**
 * Append-only audit record for every privileged mutation.
 * Never throws: audit failures must not break the user-facing operation,
 * but they are surfaced in server logs.
 */
export async function writeAudit(entry: {
  session: Session | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  reason?: string | null;
}): Promise<void> {
  try {
    const user = entry.session?.user as
      | { id?: string; email?: string; role?: string }
      | undefined;
    await prisma.adminAuditLog.create({
      data: {
        actorEmail: user?.email ?? "anonymous",
        actorRole: user?.role ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        beforeData: entry.beforeData ? JSON.stringify(entry.beforeData) : null,
        afterData: entry.afterData ? JSON.stringify(entry.afterData) : null,
        reason: entry.reason ?? null,
        // Explicit timestamp — never depend on the column default (older dev
        // databases may carry TEXT-affinity datetime columns).
        createdAt: new Date(),
      },
    });
  } catch (e) {
    console.error("audit log write failed", e);
  }
}
