import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: session.user.id },
      include: { question: { include: { subject: true, topic: true, testLinks: true } } },
      orderBy: { id: "desc" },
    });

    const formatted = bookmarks.map((b) => ({
      id: b.id,
      stemEn: b.question.stemEn,
      subject: b.question.subject?.name || b.question.subjectId,
      topic: b.question.topic?.name || null,
      testId: b.question.testLinks?.[0]?.testId,
    }));

    return NextResponse.json(formatted);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { questionId } = await req.json();
    if (!questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });

    const bookmark = await prisma.bookmark.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      update: {},
      create: { userId: session.user.id, questionId },
    });

    return NextResponse.json(bookmark);
  } catch (e) {
    return NextResponse.json({ error: "Failed to create bookmark" }, { status: 500 });
  }
}