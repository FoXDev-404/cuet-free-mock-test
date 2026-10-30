import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/config";
import type { Session } from "next-auth";

// Shared guard for /api/admin/* route handlers.
// Returns the session when the caller is an ADMIN, otherwise a NextResponse
// the caller can return directly (401/403).
export async function requireAdmin(): Promise<
  { session: Session; error: null } | { session: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return { session: null, error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  return { session, error: null };
}
