import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { normalizeUsername, ensureUserUsername } from "@/lib/username";
import { enforceRateLimit, forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().max(80).nullable().optional(),
  username: z.string().trim().min(3).max(24).optional(),
  bio: z.string().trim().max(300).nullable().optional(),
  isProfilePublic: z.boolean().optional(),
});

export async function GET() {
  const { userId } = await getSessionUser();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const username = await ensureUserUsername(userId);
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      username: true,
      bio: true,
      isProfilePublic: true,
      email: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ ...profile, username: profile?.username ?? username });
}

export async function PATCH(req: Request) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();
    const { userId } = await getSessionUser();
    if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const limited = await enforceRateLimit(req, {
      bucket: `profile:update:${userId}`,
      limit: 20,
      windowSec: 10 * 60,
      byIp: false,
    });
    if (limited) return limited;

    const input = schema.parse(await req.json());
    let username: string | undefined;
    if (input.username !== undefined) {
      username = normalizeUsername(input.username);
      if (username.length < 3) {
        return NextResponse.json(
          { error: "Username must contain at least 3 letters or numbers." },
          { status: 400 },
        );
      }
      const existing = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name || null } : {}),
        ...(username ? { username } : {}),
        ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
        ...(input.isProfilePublic !== undefined
          ? { isProfilePublic: input.isProfilePublic }
          : {}),
      },
      select: {
        name: true,
        username: true,
        bio: true,
        isProfilePublic: true,
        email: true,
      },
    });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    logApiError("me/profile", error, req);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
