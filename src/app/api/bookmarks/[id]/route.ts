import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.bookmark.deleteMany({ where: { id, userId: session.user.id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete bookmark" }, { status: 500 });
  }
}