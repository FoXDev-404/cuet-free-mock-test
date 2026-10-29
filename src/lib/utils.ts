import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function computeScore(
  correct: number,
  incorrect: number,
  unattempted: number,
  marksCorrect: number = 5,
  marksIncorrect: number = 1
) {
  const rawScore = correct * marksCorrect - incorrect * marksIncorrect;
  const maxScore = (correct + incorrect + unattempted) * marksCorrect;
  const accuracy = correct + incorrect === 0 ? 0 : (correct / (correct + incorrect)) * 100;
  const percentage = maxScore === 0 ? 0 : (rawScore / maxScore) * 100;
  return { rawScore, maxScore, accuracy, percentage };
}
