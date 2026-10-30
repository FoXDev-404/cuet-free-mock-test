import aug06 from "../../data/english-mock/papers/2022-08-06_English_Shift_1.json";
import aug10 from "../../data/english-mock/papers/2022-08-10_English_Shift_unspecified.json";
import aug16 from "../../data/english-mock/papers/2022-08-16_English_Shift_1.json";
import aug18 from "../../data/english-mock/papers/2022-08-18_English_Shift_unspecified.json";
import aug22 from "../../data/english-mock/papers/2022-08-22_English_Shift_unspecified.json";
import sep16 from "../../data/english-mock/papers/2022-09-16_English_Shift_1.json";

/**
 * Local, repo-backed CUET English 2022 papers.
 *
 * These papers intentionally do not live in D1 and are never seeded into the
 * question bank. They are read-only JSON files bundled with the app. The take
 * view only ever receives keyless questions; grading happens in the route
 * handler and the answer key is returned only after submission.
 *
 * The supplied source files are OCR drafts. Only rows with a readable stem and
 * at least two options are exposed. Questions without a usable answer key are
 * still shown for practice, but are scored as "pending review" instead of being
 * guessed at.
 */

interface RawOption {
  id?: string | null;
  text?: string | null;
}

interface RawQuestion {
  id?: string | null;
  sourceQuestionNo?: number | null;
  stemEn?: string | null;
  optionsEn?: RawOption[] | null;
  correctAnswer?: string | null;
  explanationEn?: string | null;
  passageId?: string | null;
}

interface RawPassage {
  id?: string | null;
  title?: string | null;
  contentEn?: string | null;
}

interface RawPaper {
  exam?: {
    title?: string | null;
    examDate?: string | null;
    shift?: string | number | null;
    questionCount?: number | null;
    sourceFile?: string | null;
    extractionSummary?: {
      sourceMethod?: string | null;
    } | null;
    passages?: RawPassage[] | null;
    questions?: RawQuestion[] | null;
  } | null;
}

const RAW_PAPERS: RawPaper[] = [
  aug06 as unknown as RawPaper,
  aug10 as unknown as RawPaper,
  aug16 as unknown as RawPaper,
  aug18 as unknown as RawPaper,
  aug22 as unknown as RawPaper,
  sep16 as unknown as RawPaper,
];

export const LOCAL_ENGLISH_SUBJECT = {
  id: "local-english",
  name: "English",
  code: "ENG",
} as const;

const DURATION_MINUTES = 45;
const MARKING_SCHEME = { correct: 5, incorrect: 1, unattempted: 0 } as const;
// All six papers were added to the local library together. Using one stable
// timestamp keeps homepage ordering deterministic while the explicit quality
// sort below puts the most complete papers first.
const LIBRARY_ADDED_AT = "2026-10-31T00:00:00.000Z";
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface LocalQuestionOption {
  id: string;
  text: string;
}

export interface LocalQuestionPassage {
  id: string;
  title: string;
  content: string;
}

export interface LocalNormalizedQuestion {
  id: string;
  number: number;
  stemEn: string;
  options: LocalQuestionOption[];
  correctAnswer: string | null;
  explanation: string | null;
  passage: LocalQuestionPassage | null;
  scorable: boolean;
}

export interface LocalPaper {
  slug: string;
  id: string;
  title: string;
  date: string;
  dateLabel: string;
  shift: string | null;
  sourceFile: string | null;
  sourceMethod: string | null;
  sourceQuestionCount: number;
  omittedQuestionCount: number;
  scorableQuestionCount: number;
  pendingReviewCount: number;
  questions: LocalNormalizedQuestion[];
}

export interface LocalPaperTakeQuestion {
  id: string;
  number: number;
  stemEn: string;
  options: LocalQuestionOption[];
  passage: LocalQuestionPassage | null;
  scorable: boolean;
}

export interface LocalPaperTakeData {
  slug: string;
  title: string;
  config: string;
  durationMinutes: number;
  draft: true;
  sourceQuestionCount: number;
  recoveredQuestionCount: number;
  omittedQuestionCount: number;
  scorableQuestionCount: number;
  pendingReviewCount: number;
  questions: LocalPaperTakeQuestion[];
}

export interface LocalPaperSummary {
  id: string;
  title: string;
  slug: string;
  type: "PYQ_YEAR_WISE";
  status: "PUBLISHED";
  isPublic: true;
  totalQuestions: number;
  durationMinutes: number;
  createdAt: string;
  config: string;
  subject: { id: string; name: string; code: string };
  _count: { questions: number; attempts: number };
  localPaper: true;
  draft: true;
  date: string;
  dateLabel: string;
  shift: string | null;
  sourceQuestionCount: number;
  recoveredQuestionCount: number;
  omittedQuestionCount: number;
  scorableQuestionCount: number;
  pendingReviewCount: number;
  sourceFile: string | null;
  sourceMethod: string | null;
}

export interface LocalAttemptAnswer {
  questionId: string;
  selectedOption: string | null;
}

export interface LocalReviewItem {
  questionId: string;
  selectedOption: string | null;
  isCorrect: boolean | null;
  status: "correct" | "incorrect" | "unattempted" | "pending";
  correctOption: string | null;
  correctOptionText: string | null;
  explanation: string | null;
}

export interface LocalSubmitResult {
  attemptId: string;
  score: number;
  maxScore: number;
  accuracy: number;
  percentage: number;
  correct: number;
  incorrect: number;
  attempted: number;
  unattempted: number;
  pending: number;
  review: LocalReviewItem[];
}

function cleanText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionText(value: string | null | undefined): string {
  return cleanText(value).replace(/\s+/g, " ");
}

function optionLabel(rawId: string | null | undefined, index: number, used: Set<string>): string {
  const match = cleanText(rawId).match(/([A-F])$/i);
  let label = (match?.[1] ?? String.fromCharCode(65 + index)).toUpperCase();

  if (used.has(label)) {
    for (let i = 0; i < 26; i += 1) {
      const candidate = String.fromCharCode(65 + i);
      if (!used.has(candidate)) {
        label = candidate;
        break;
      }
    }
  }

  used.add(label);
  return label;
}

function displayDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function buildPaper(raw: RawPaper): LocalPaper | null {
  const exam = raw.exam;
  const date = cleanText(exam?.examDate);
  if (!exam || !date) return null;

  const sourceQuestionCount =
    typeof exam.questionCount === "number" && exam.questionCount > 0
      ? exam.questionCount
      : exam.questions?.length ?? 0;

  const passages = new Map<string, LocalQuestionPassage>();
  for (const passage of exam.passages ?? []) {
    const id = cleanText(passage.id);
    const content = cleanText(passage.contentEn);
    if (!id || !content) continue;
    passages.set(id, {
      id,
      title: cleanText(passage.title) || "Reading passage",
      content,
    });
  }

  const questions: LocalNormalizedQuestion[] = [];
  for (const [index, rawQuestion] of (exam.questions ?? []).entries()) {
    const stem = cleanText(rawQuestion.stemEn);
    if (!stem) continue;

    const usedLabels = new Set<string>();
    const options: LocalQuestionOption[] = [];
    for (const [optionIndex, option] of (rawQuestion.optionsEn ?? []).entries()) {
      const text = normalizeOptionText(option.text);
      if (!text) continue;
      options.push({
        id: optionLabel(option.id, optionIndex, usedLabels),
        text,
      });
    }

    // A one-option multiple-choice question cannot be answered meaningfully.
    if (options.length < 2) continue;

    const answer = cleanText(rawQuestion.correctAnswer).toUpperCase();
    const hasKey = answer.length > 0 && options.some((option) => option.id === answer);
    const passageId = cleanText(rawQuestion.passageId);
    const questionNumber =
      typeof rawQuestion.sourceQuestionNo === "number" && rawQuestion.sourceQuestionNo > 0
        ? rawQuestion.sourceQuestionNo
        : index + 1;

    questions.push({
      id: cleanText(rawQuestion.id) || `${date}-q${String(questionNumber).padStart(2, "0")}`,
      number: questionNumber,
      stemEn: stem,
      options,
      correctAnswer: hasKey ? answer : null,
      explanation: cleanText(rawQuestion.explanationEn) || null,
      passage: passages.get(passageId) ?? null,
      scorable: hasKey,
    });
  }

  questions.sort((a, b) => a.number - b.number);
  if (questions.length === 0) return null;

  const shiftValue = cleanText(
    exam.shift === null || exam.shift === undefined ? "" : String(exam.shift),
  );
  const shift = shiftValue && shiftValue.toLowerCase() !== "unspecified" ? `Shift ${shiftValue}` : null;
  const dateLabel = displayDate(date);
  const baseTitle = `CUET UG English 2022 — ${dateLabel.replace(/ \d{4}$/, "")}`;
  const scorableQuestionCount = questions.filter((question) => question.scorable).length;
  const slug = `english-${date}`;

  return {
    slug,
    id: `local-${slug}`,
    title: shift ? `${baseTitle} (${shift})` : baseTitle,
    date,
    dateLabel,
    shift,
    sourceFile: cleanText(exam.sourceFile) || null,
    sourceMethod: cleanText(exam.extractionSummary?.sourceMethod) || null,
    sourceQuestionCount,
    omittedQuestionCount: Math.max(0, sourceQuestionCount - questions.length),
    scorableQuestionCount,
    pendingReviewCount: questions.length - scorableQuestionCount,
    questions,
  };
}

const PAPERS: LocalPaper[] = RAW_PAPERS.map(buildPaper)
  .filter((paper): paper is LocalPaper => paper !== null)
  .sort(
    (a, b) =>
      b.scorableQuestionCount - a.scorableQuestionCount ||
      b.questions.length - a.questions.length ||
      b.date.localeCompare(a.date),
  );

const PAPERS_BY_SLUG = new Map(PAPERS.map((paper) => [paper.slug, paper]));

function summaryConfig(paper: LocalPaper): string {
  return JSON.stringify({
    totalQuestions: paper.questions.length,
    durationMinutes: DURATION_MINUTES,
    markingScheme: MARKING_SCHEME,
    localPaper: true,
    draft: true,
    sourceQuestionCount: paper.sourceQuestionCount,
    recoveredQuestionCount: paper.questions.length,
    omittedQuestionCount: paper.omittedQuestionCount,
    scorableQuestionCount: paper.scorableQuestionCount,
    pendingReviewCount: paper.pendingReviewCount,
  });
}

export function getLocalPaperSummaries(): LocalPaperSummary[] {
  return PAPERS.map((paper) => ({
    id: paper.id,
    title: paper.title,
    slug: paper.slug,
    type: "PYQ_YEAR_WISE",
    status: "PUBLISHED",
    isPublic: true,
    totalQuestions: paper.questions.length,
    durationMinutes: DURATION_MINUTES,
    createdAt: LIBRARY_ADDED_AT,
    config: summaryConfig(paper),
    subject: { ...LOCAL_ENGLISH_SUBJECT },
    _count: { questions: paper.questions.length, attempts: 0 },
    localPaper: true,
    draft: true,
    date: paper.date,
    dateLabel: paper.dateLabel,
    shift: paper.shift,
    sourceQuestionCount: paper.sourceQuestionCount,
    recoveredQuestionCount: paper.questions.length,
    omittedQuestionCount: paper.omittedQuestionCount,
    scorableQuestionCount: paper.scorableQuestionCount,
    pendingReviewCount: paper.pendingReviewCount,
    sourceFile: paper.sourceFile,
    sourceMethod: paper.sourceMethod,
  }));
}

export function getLocalPaperSummary(slug: string): LocalPaperSummary | null {
  return getLocalPaperSummaries().find((paper) => paper.slug === slug) ?? null;
}

/**
 * Keyless payload for the take page. This deliberately maps only the fields
 * the browser needs: the correct answer never crosses this boundary.
 */
export function getLocalPaperTakeData(slug: string): LocalPaperTakeData | null {
  const paper = PAPERS_BY_SLUG.get(slug);
  if (!paper) return null;

  return {
    slug: paper.slug,
    title: paper.title,
    config: summaryConfig(paper),
    durationMinutes: DURATION_MINUTES,
    draft: true,
    sourceQuestionCount: paper.sourceQuestionCount,
    recoveredQuestionCount: paper.questions.length,
    omittedQuestionCount: paper.omittedQuestionCount,
    scorableQuestionCount: paper.scorableQuestionCount,
    pendingReviewCount: paper.pendingReviewCount,
    questions: paper.questions.map((question) => ({
      id: question.id,
      number: question.number,
      stemEn: question.stemEn,
      options: question.options.map((option) => ({ id: option.id, text: option.text })),
      passage: question.passage ? { ...question.passage } : null,
      scorable: question.scorable,
    })),
  };
}

/**
 * Scores a local paper in memory. Nothing is written to D1: the questions stay
 * in the repo JSON, and the submission itself is deliberately transient.
 */
export function gradeLocalPaper(
  slug: string,
  submittedAnswers: LocalAttemptAnswer[],
): LocalSubmitResult | null {
  const paper = PAPERS_BY_SLUG.get(slug);
  if (!paper) return null;

  const submitted = new Map<string, string | null>();
  for (const answer of submittedAnswers) {
    if (typeof answer.questionId === "string") {
      submitted.set(answer.questionId, answer.selectedOption);
    }
  }

  let correct = 0;
  let incorrect = 0;
  let attempted = 0;
  let pending = 0;
  let score = 0;

  const review: LocalReviewItem[] = paper.questions.map((question) => {
    const rawSelected = submitted.get(question.id) ?? null;
    const selected =
      rawSelected && question.options.some((option) => option.id === rawSelected) ? rawSelected : null;

    if (selected !== null) attempted += 1;

    if (!question.scorable || !question.correctAnswer) {
      pending += 1;
      return {
        questionId: question.id,
        selectedOption: selected,
        isCorrect: null,
        status: "pending",
        correctOption: null,
        correctOptionText: null,
        explanation: question.explanation,
      };
    }

    if (selected === null) {
      return {
        questionId: question.id,
        selectedOption: null,
        isCorrect: false,
        status: "unattempted",
        correctOption: question.correctAnswer,
        correctOptionText:
          question.options.find((option) => option.id === question.correctAnswer)?.text ?? null,
        explanation: question.explanation,
      };
    }

    const isCorrect = selected === question.correctAnswer;
    if (isCorrect) {
      correct += 1;
      score += MARKING_SCHEME.correct;
    } else {
      incorrect += 1;
      score -= MARKING_SCHEME.incorrect;
    }

    return {
      questionId: question.id,
      selectedOption: selected,
      isCorrect,
      status: isCorrect ? "correct" : "incorrect",
      correctOption: question.correctAnswer,
      correctOptionText:
        question.options.find((option) => option.id === question.correctAnswer)?.text ?? null,
      explanation: question.explanation,
    };
  });

  const maxScore = paper.scorableQuestionCount * MARKING_SCHEME.correct;
  const scoredAttempts = correct + incorrect;

  return {
    attemptId: `local-${paper.slug}`,
    score,
    maxScore,
    accuracy: scoredAttempts === 0 ? 0 : Number(((correct / scoredAttempts) * 100).toFixed(1)),
    percentage: maxScore === 0 ? 0 : Number(((score / maxScore) * 100).toFixed(1)),
    correct,
    incorrect,
    attempted,
    unattempted: paper.questions.length - attempted,
    pending,
    review,
  };
}
