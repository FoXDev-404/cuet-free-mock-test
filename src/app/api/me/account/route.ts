import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { verifyPassword } from "@/lib/auth/password";
import { enforceRateLimit, forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  confirm: z.literal("DELETE"),
  password: z.string().max(200).optional(),
});

/**
 * Account deletion.
 *
 * Personal identity data is erased. Attempts are anonymised instead of being
 * deleted because historical test statistics must remain immutable; they keep
 * only aggregate scores with `userId = null`. Posts and sessions cascade.
 */
export async function DELETE(req: Request) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();
    const { userId } = await getSessionUser();
    if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const limited = await enforceRateLimit(req, {
      bucket: `account:delete:${userId}`,
      limit: 3,
      windowSec: 60 * 60,
      byIp: false,
    });
    if (limited) return limited;

    const input = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    if (user.passwordHash) {
      if (!input.password) {
        return NextResponse.json(
          { error: "Enter your password to confirm account deletion." },
          { status: 400 },
        );
      }
      if (!(await verifyPassword(input.password, user.passwordHash))) {
        return NextResponse.json({ error: "Password is incorrect." }, { status: 403 });
      }
    }

    await prisma.$transaction([
      prisma.attempt.updateMany({ where: { userId }, data: { userId: null } }),
      prisma.questionReport.updateMany({ where: { userId }, data: { userId: null } }),
      prisma.discussion.updateMany({
        where: { userId },
        data: { status: "DELETED", body: "[deleted]" },
      }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("me/account", error, req);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
