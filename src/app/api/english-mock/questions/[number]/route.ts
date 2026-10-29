import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const questionNumber = parseInt(number, 10);

    if (!questionNumber || questionNumber < 1 || questionNumber > 50) {
      return NextResponse.json({ error: "Invalid question number" }, { status: 400 });
    }

    const question = await prisma.question.findFirst({
      where: {
        subject: { code: "ENG" },
        questionNumber,
        isActive: true,
      },
      select: {
        id: true,
        questionNumber: true,
        stemEn: true,
        optionsEn: true,
        passage: {
          select: {
            id: true,
            passageKey: true,
            title: true,
            content: true,
            sourcePageStart: true,
            sourcePageEnd: true,
          },
        },
        sourcePageStart: true,
        sourcePageEnd: true,
        sourcePdfFilename: true,
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const optionsEn =
      typeof question.optionsEn === "string"
        ? JSON.parse(question.optionsEn)
        : question.optionsEn;

    return NextResponse.json({
      ...question,
      optionsEn,
    });
  } catch (e) {
    console.error("english-mock question API error", e);
    return NextResponse.json({ error: "Failed to load question" }, { status: 500 });
  }
}
