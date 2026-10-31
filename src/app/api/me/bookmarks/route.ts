import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

/** Blueprint alias: GET /api/me/bookmarks */
export { GET } from "../../bookmarks/route";

/** Blueprint alias: POST /api/me/bookmarks */
export { POST } from "../../bookmarks/route";

/**
 * Remove a bookmark by question id. The older DELETE /api/bookmarks/{id}
 * remains for the UI; this shape matches the documented bookmark resource.
 */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    let questionId = searchParams.get("questionId") ?? undefined;
    if (!questionId) {
      const body = await req.json().catch(() => ({}));
      questionId = typeof body?.questionId === "string" ? body.questionId : undefined;
    }
    if (!questionId) {
      return NextResponse.json({ error: "questionId required" }, { status: 400 });
    }
    await prisma.bookmark.deleteMany({
      where: { userId: session.user.id, questionId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("bookmark delete error", error);
    return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 });
  }
}
