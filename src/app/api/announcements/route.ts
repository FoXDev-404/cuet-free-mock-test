import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public announcement feed, already filtered by its schedule window. */
export async function GET() {
  try {
    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, body: true, startsAt: true, endsAt: true },
    });
    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("announcements GET", error);
    return NextResponse.json({ announcements: [] });
  }
}
