import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const questionSchema = z.object({
  subjectId: z.string(),
  chapterId: z.string().optional().nullable(),
  type: z.string().default("MCQ"),
  stemEn: z.string().min(1),
  stemHi: z.string().optional().nullable(),
  optionsEn: z.array(z.object({ id: z.string(), text: z.string() })),
  optionsHi: z.array(z.object({ id: z.string(), text: z.string() })).optional().nullable(),
  correctAnswer: z.string(),
  explanationEn: z.string().optional().nullable(),
  explanationHi: z.string().optional().nullable(),
  year: z.number().optional().nullable(),
  source: z.string().default("sample"),
  difficulty: z.string().default("medium"),
  marks: z.number().default(5),
  negativeMarks: z.number().default(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const questions = z.array(questionSchema).parse(body);

    let imported = 0;
    for (const q of questions) {
      await prisma.question.create({
        data: {
          subjectId: q.subjectId,
          chapterId: q.chapterId ?? undefined,
          type: q.type,
          stemEn: q.stemEn,
          stemHi: q.stemHi,
          optionsEn: JSON.stringify(q.optionsEn),
          optionsHi: q.optionsHi ? JSON.stringify(q.optionsHi) : null,
          correctAnswer: q.correctAnswer,
          explanationEn: q.explanationEn,
          explanationHi: q.explanationHi,
          year: q.year,
          source: q.source,
          difficulty: q.difficulty,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
        },
      });
      imported += 1;
    }

    return NextResponse.json({ message: `Imported ${imported} questions`, imported });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "Import failed" }, { status: 500 });
  }
}
