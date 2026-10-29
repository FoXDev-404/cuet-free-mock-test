export type QuestionType = "MCQ" | "CODE" | "IMAGE" | "LIST" | "TABLE";

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  subjectId: string;
  chapterId?: string | null;
  type: QuestionType;
  stemEn: string;
  stemHi?: string | null;
  optionsEn: Option[];
  optionsHi?: Option[] | null;
  correctAnswer: string;
  explanationEn?: string | null;
  explanationHi?: string | null;
  year?: number | null;
  source: string;
  difficulty: string;
  marks: number;
  negativeMarks: number;
  isActive: boolean;
}

export interface TestConfig {
  totalQuestions: number;
  durationMinutes: number;
  markingScheme: {
    correct: number;
    incorrect: number;
    unattempted: number;
  };
  perSection?: Array<{
    name: string;
    questionCount: number;
    durationMinutes?: number;
  }>;
  bilingual: boolean;
}

export interface Test {
  id: string;
  title: string;
  slug: string;
  type: string;
  subjectId?: string | null;
  chapterId?: string | null;
  year?: number | null;
  config: TestConfig;
  totalQuestions: number;
  durationMinutes: number;
  isPublic: boolean;
}

export interface Attempt {
  id: string;
  userId?: string | null;
  testId: string;
  sessionId: string;
  status: string;
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  attemptedCount: number;
  timeSpentSec: number;
  percentile?: number | null;
}

export interface QuestionAttempt {
  questionId: string;
  selectedOption: string | null;
  isCorrect: boolean | null;
  timeSpentSec: number;
  markedForReview: boolean;
}

export type Language = "en" | "hi";
