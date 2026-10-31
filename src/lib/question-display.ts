/**
 * Shared presentation helpers for question options and media.
 *
 * Stored option ids are internal (`opt-<questionId>-<order>`). Users must only
 * ever see A/B/C/D labels, and answer keys may be stored either as a label, an
 * option id, or a one-based source order. These helpers normalize all three so
 * every student-facing surface renders the same option.
 */

export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

export interface QuestionOption {
  id: string;
  text: string;
  /** Optional diagram rendered with the option (blueprint 10.3). */
  imageUrl?: string | null;
  imageAlt?: string | null;
}

export type QuestionImagePlacement = "stem" | "passage" | "explanation";

export interface QuestionImage {
  url: string;
  alt: string;
  /** Defaults to the stem for payloads created before placements existed. */
  placement?: QuestionImagePlacement;
}

export function parseQuestionOptions(
  value: string | QuestionOption[] | null | undefined,
): QuestionOption[] {
  if (!value) return [];
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((option): option is Record<string, unknown> => {
      return Boolean(
        option &&
          typeof option === "object" &&
          typeof (option as { id?: unknown }).id === "string" &&
          typeof (option as { text?: unknown }).text === "string",
      );
    })
    .map((option) => {
      const item: QuestionOption = {
        id: option.id as string,
        text: option.text as string,
      };
      const rawUrl = typeof option.imageUrl === "string" ? option.imageUrl.trim() : "";
      if (rawUrl && isSafeImageUrl(rawUrl)) {
        item.imageUrl = rawUrl;
        const rawAlt = typeof option.imageAlt === "string" ? option.imageAlt.trim() : "";
        item.imageAlt = rawAlt || "Option diagram";
      }
      return item;
    });
}

/** A/B/... for a zero-based option index. Never expose the raw option id. */
export function optionLabel(index: number): string {
  return OPTION_LETTERS[index] ?? `Option ${index + 1}`;
}

/** One-based order parsed from the canonical option id, when present. */
export function optionOrderFromId(optionId: string | null | undefined): number | null {
  if (!optionId) return null;
  const match = /-(\d+)$/.exec(optionId.trim());
  if (!match) return null;
  const order = Number.parseInt(match[1], 10);
  return Number.isFinite(order) && order > 0 ? order : null;
}

export function optionLabelFromId(optionId: string | null | undefined): string | null {
  const order = optionOrderFromId(optionId);
  return order === null ? null : optionLabel(order - 1);
}

export interface CorrectOption {
  id: string | null;
  label: string;
  text: string | null;
  index: number;
}

/**
 * Resolve the correct option for any persisted answer-key representation.
 * Preference order: exact option id, visible index order, A..F label, then a
 * one-based `sourceCorrectOptionOrder` from the PDF import.
 */
export function resolveCorrectOption(
  question: {
    correctAnswer?: string | null;
    sourceCorrectOptionOrder?: number | null;
  },
  options: QuestionOption[],
): CorrectOption | null {
  const answer = question.correctAnswer?.trim() ?? "";
  let index = answer ? options.findIndex((option) => option.id === answer) : -1;

  if (index < 0 && /^[A-F]$/i.test(answer)) {
    const candidate = OPTION_LETTERS.indexOf(answer.toUpperCase() as (typeof OPTION_LETTERS)[number]);
    if (candidate >= 0 && candidate < options.length) index = candidate;
  }

  if (index < 0) {
    const order = Number(question.sourceCorrectOptionOrder);
    if (Number.isFinite(order) && order > 0 && order <= options.length) {
      index = order - 1;
    }
  }

  if (index < 0) {
    const order = optionOrderFromId(answer);
    if (order !== null && order <= options.length) index = order - 1;
  }

  if (index < 0) return null;
  const option = options[index];
  return {
    id: option?.id ?? null,
    label: optionLabel(index),
    text: option?.text ?? null,
    index,
  };
}

/** Resolve the student's selected option even if the sheet stored a label. */
export function resolveSelectedOption(
  selectedOption: string | null | undefined,
  options: QuestionOption[],
): { id: string | null; label: string | null; text: string | null; index: number } {
  const selected = selectedOption?.trim() ?? "";
  let index = selected ? options.findIndex((option) => option.id === selected) : -1;

  if (index < 0 && /^[A-F]$/i.test(selected)) {
    const candidate = OPTION_LETTERS.indexOf(selected.toUpperCase() as (typeof OPTION_LETTERS)[number]);
    if (candidate >= 0 && candidate < options.length) index = candidate;
  }

  if (index < 0) {
    const order = optionOrderFromId(selected);
    if (order !== null && order <= options.length) index = order - 1;
  }

  if (index < 0) {
    return {
      id: selected || null,
      label: optionLabelFromId(selected),
      text: null,
      index: -1,
    };
  }

  return {
    id: options[index]?.id ?? null,
    label: optionLabel(index),
    text: options[index]?.text ?? null,
    index,
  };
}

export function isSafeImageUrl(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")) return true;
  if (/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(url)) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * `Question.questionImages` is persisted as JSON text, but imports and older
 * payloads may hand us an array. Drop malformed/unsafe entries instead of
 * passing arbitrary strings to an img `src`.
 */
export function parseQuestionImages(value: unknown): QuestionImage[] {
  if (!value) return [];
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item): QuestionImage | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as { url?: unknown; alt?: unknown; placement?: unknown };
      if (typeof record.url !== "string") return null;
      const url = record.url.trim();
      if (!url || !isSafeImageUrl(url)) return null;
      const alt = typeof record.alt === "string" ? record.alt.trim() : "";
      const placement =
        record.placement === "passage" || record.placement === "explanation"
          ? record.placement
          : record.placement === "stem"
            ? "stem"
            : undefined;
      return { url, alt: alt || "Question diagram", placement };
    })
    .filter((item): item is QuestionImage => item !== null);
}

/** Images belonging to one placement; untagged legacy images are stem media. */
export function imagesForPlacement(
  value: unknown,
  placement: QuestionImagePlacement,
): QuestionImage[] {
  return parseQuestionImages(value).filter((image) =>
    placement === "stem" ? !image.placement || image.placement === "stem" : image.placement === placement,
  );
}
