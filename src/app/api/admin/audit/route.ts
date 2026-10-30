import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

// Audit trail viewer: EMAIL/actions search, actor filter, time window.
export async function GET(req: Request) {
  const g = await requirePermission("AUDIT_READ");
  if (g.error) return g.error;
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(searchParams.get("perPage") || "50", 10) || 50, 1), 200);
    const action = searchParams.get("action") || undefined;
    const actor = searchParams.get("actor") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const since = searchParams.get("since");

    const where: Record<string, unknown> = {
      ...(action ? { action: { contains: action } } : {}),
      ...(actor ? { actorEmail: { contains: actor } } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(since ? { createdAt: { gte: new Date(since) } } : {}),
    };

    const [total, entries] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return NextResponse.json({ total, page, perPage, entries });
  } catch (e) {
    console.error("admin audit GET", e);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
