import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

// The English PYQ paper card is driven by `EnglishMockConfig`, not by a Test row.
const updateSchema = z
  .object({
    durationMinutes: z.number().int().min(1).optional(),
    marksCorrect: z.number().int().min(0).optional(),
    marksIncorrect: z.number().int().min(0).optional(),
    totalQuestions: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .passthrough();

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const config = await prisma.englishMockConfig.findFirst({ where: { isActive: true } });
    const questionCount = await prisma.question.count({
      where: { subject: { code: "ENG" }, isActive: true },
    });
    return NextResponse.json({
      config,
      questionCount,
      showOnMockTestsPage: Boolean(config),
    });
  } catch (e) {
    console.error("english mock config GET error", e);
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const config = await prisma.englishMockConfig.findFirst();
    if (!config) {
      return NextResponse.json(
        { error: "English mock config not found — run the seed first" },
        { status: 404 }
      );
    }

    const updated = await prisma.englishMockConfig.update({
      where: { id: config.id },
      data: {
        ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
        ...(data.marksCorrect !== undefined ? { marksCorrect: data.marksCorrect } : {}),
        ...(data.marksIncorrect !== undefined ? { marksIncorrect: data.marksIncorrect } : {}),
        ...(data.totalQuestions !== undefined ? { totalQuestions: data.totalQuestions } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    }
    console.error("english mock config PATCH error", e);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
