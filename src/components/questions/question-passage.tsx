import { MathText } from "@/components/ui/math-text";
import { QuestionImageFigure } from "@/components/questions/question-images";
import { parseQuestionImages } from "@/lib/question-display";
import { cn } from "@/lib/utils";

/**
 * Shared reading passage shown above its linked questions.
 *
 * Passages are stored once and linked to many questions, so every student
 * surface (take, practice, PYQ, incorrect bank, result, solutions) must render
 * the same title, body, image and source note. The image lives on the Passage
 * row (blueprint 10.3) instead of being duplicated against every question.
 */
export function QuestionPassage({
  passage,
  className,
}: {
  passage?: {
    title?: string | null;
    content?: string | null;
    imageUrl?: string | null;
    imageAlt?: string | null;
    sourceNote?: string | null;
  } | null;
  className?: string;
}) {
  if (!passage || (!passage.title && !passage.content && !passage.imageUrl && !passage.sourceNote)) {
    return null;
  }
  const image = passage.imageUrl
    ? parseQuestionImages([
        {
          url: passage.imageUrl,
          alt: passage.imageAlt?.trim() || "Passage diagram",
        },
      ])[0]
    : undefined;

  return (
    <div
      className={cn(
        "mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50",
        className,
      )}
    >
      {passage.title ? (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {passage.title}
        </p>
      ) : null}
      {passage.content ? (
        <MathText
          text={passage.content}
          className="block text-sm text-neutral-700 dark:text-neutral-300"
        />
      ) : null}
      {image ? (
        <QuestionImageFigure
          image={image}
          className="mt-3"
        />
      ) : null}
      {passage.sourceNote ? (
        <MathText
          text={passage.sourceNote}
          className="mt-2 block text-xs italic text-neutral-500 dark:text-neutral-400"
        />
      ) : null}
    </div>
  );
}
