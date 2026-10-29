import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { questions: true } },
      },
    });
    return NextResponse.json(subjects);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}
