import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        test: { include: { subject: true } },
        answers: { include: { question: true }, orderBy: { id: "asc" } },
      },
    });
    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    return NextResponse.json(attempt);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch attempt" }, { status: 500 });
  }
}
