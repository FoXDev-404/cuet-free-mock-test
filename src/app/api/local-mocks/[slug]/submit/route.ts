import { NextResponse } from "next/server";
import { z } from "zod";
import { gradeLocalPaper } from "@/lib/local-papers";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOption: z.string().nullable(),
    }),
  ),
  timeSpentSec: z.number().nonnegative().default(0),
});

/**
 * Server-side grading for repo-backed 2022 papers.
 *
 * The browser only ever posts question ids and selected option ids. Correct
 * answers, explanations and per-question correctness are returned here, after
 * submission, and nowhere else.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const parsed = submitSchema.parse(await req.json());

    const result = gradeLocalPaper(slug, parsed.answers);
    if (!result) {
      return NextResponse.json({ error: "Local paper not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("local-mock submit error", error);
    return NextResponse.json({ error: "Failed to submit local paper" }, { status: 500 });
  }
}
