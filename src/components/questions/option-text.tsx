/* eslint-disable @next/next/no-img-element */
import { MathText } from "@/components/ui/math-text";

/**
 * Visible option text plus an optional option diagram.
 *
 * Rendered inline so it can sit inside the existing button/row markup used by
 * the take, practice, PYQ, incorrect-bank and result screens without changing
 * their layout. URLs are validated upstream by `parseQuestionOptions`.
 * Option text still goes through `MathText` so LaTeX continues to render.
 */
export function OptionText({
  option,
  imageClassName,
}: {
  option: { text: string; imageUrl?: string | null; imageAlt?: string | null };
  imageClassName?: string;
}) {
  return (
    <>
      <MathText text={option.text} />
      {option.imageUrl ? (
        <span className="mt-2 block">
          <img
            src={option.imageUrl}
            alt={option.imageAlt?.trim() || "Option diagram"}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={
              imageClassName ??
              "mx-auto h-auto max-h-48 w-auto max-w-full rounded-lg border border-neutral-200 bg-white object-contain p-1 dark:border-neutral-700 dark:bg-neutral-900"
            }
          />
        </span>
      ) : null}
    </>
  );
}
