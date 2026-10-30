import { prisma } from "../src/lib/prisma";
import * as fs from "node:fs";
import * as path from "node:path";

const DATA_DIR = path.resolve(__dirname, "../data/english-mock");

interface ExamQuestion {
  id: string;
  questionNumber: number;
  type: string;
  category: string;
  questionText: string;
  passageId?: string;
  passageKey?: string;
  options: Array<{
    order: number;
    sourceOptionLabel: string;
    text: string;
    sourceText: string;
  }>;
  sourceCorrectOptionOrder: number;
  sourceAnswerLabel: string;
  solution: string;
  answerReviewStatus: string;
  dataQualityNote?: string | null;
  sourcePageStart?: number | null;
  sourcePageEnd?: number | null;
  sourcePdfFilename: string;
}

async function loadExamJson() {
  const raw = fs.readFileSync(path.join(DATA_DIR, "exam.json"), "utf8");
  return JSON.parse(raw);
}

export async function main() {
  const examData = await loadExamJson();
  const { exam, passages, questions } = examData;

  console.log(`🌱 Seeding CUET English mock: ${exam.name}`);

  // Ensure English subject exists
  const englishSubject = await prisma.subject.upsert({
    where: { code: "ENG" },
    update: {},
    create: {
      name: "English",
      code: "ENG",
      sectionType: "LANGUAGE",
      description: "CUET UG English language section",
      order: 4,
    },
  });

  // Upsert passages
  for (const p of passages) {
    await prisma.passage.upsert({
      where: { id: p.id },
      update: {
        examId: exam.id,
        passageKey: p.key,
        title: p.title,
        content: p.content,
        sourcePageStart: p.sourcePageStart ?? null,
        sourcePageEnd: p.sourcePageEnd ?? null,
      },
      create: {
        id: p.id,
        examId: exam.id,
        passageKey: p.key,
        title: p.title,
        content: p.content,
        sourcePageStart: p.sourcePageStart ?? null,
        sourcePageEnd: p.sourcePageEnd ?? null,
      },
    });
  }

  // Upsert questions with options
  for (const q of questions as ExamQuestion[]) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {
        subjectId: englishSubject.id,
        passageId: q.passageId ?? null,
        passageKey: q.passageKey ?? null,
        questionNumber: q.questionNumber,
        type: q.type,
        stemEn: q.questionText,
        optionsEn: JSON.stringify(
          q.options.map((o) => ({ id: `opt-${q.id}-${o.order}`, text: o.text }))
        ),
        correctAnswer: q.sourceAnswerLabel,
        explanationEn: q.solution,
        answerReviewStatus: q.answerReviewStatus,
        dataQualityNote: q.dataQualityNote ?? null,
        sourceCorrectOptionOrder: q.sourceCorrectOptionOrder ?? null,
        sourceAnswerLabel: q.sourceAnswerLabel,
        sourcePageStart: q.sourcePageStart ?? null,
        sourcePageEnd: q.sourcePageEnd ?? null,
        sourcePdfFilename: q.sourcePdfFilename,
        source: "CUET UG English 2025 Shift 1",
        year: 2025,
        marks: 1,
        negativeMarks: 0,
        isActive: true,
      },
      create: {
        id: q.id,
        subjectId: englishSubject.id,
        passageId: q.passageId ?? null,
        passageKey: q.passageKey ?? null,
        questionNumber: q.questionNumber,
        type: q.type,
        stemEn: q.questionText,
        optionsEn: JSON.stringify(
          q.options.map((o) => ({ id: `opt-${q.id}-${o.order}`, text: o.text }))
        ),
        correctAnswer: q.sourceAnswerLabel,
        explanationEn: q.solution,
        answerReviewStatus: q.answerReviewStatus,
        dataQualityNote: q.dataQualityNote ?? null,
        sourceCorrectOptionOrder: q.sourceCorrectOptionOrder ?? null,
        sourceAnswerLabel: q.sourceAnswerLabel,
        sourcePageStart: q.sourcePageStart ?? null,
        sourcePageEnd: q.sourcePageEnd ?? null,
        sourcePdfFilename: q.sourcePdfFilename,
        source: "CUET UG English 2025 Shift 1",
        year: 2025,
        marks: 1,
        negativeMarks: 0,
        isActive: true,
      },
    });
  }

  // Upsert English mock config
  await prisma.englishMockConfig.upsert({
    where: { id: `config-${exam.id}` },
    update: {
      examId: exam.id,
      durationMinutes: 60,
      marksCorrect: 1,
      marksIncorrect: 0,
      totalQuestions: 50,
      isActive: true,
    },
    create: {
      id: `config-${exam.id}`,
      examId: exam.id,
      durationMinutes: 60,
      marksCorrect: 1,
      marksIncorrect: 0,
      totalQuestions: 50,
      isActive: true,
    },
  });

  const reviewFlags = questions.filter((q: { questionNumber: number; answerReviewStatus: string }) => q.answerReviewStatus === "needs_manual_review");
  console.log("✅ English mock test seeded successfully");
  console.log(`   Exam: ${exam.name}`);
  console.log(`   Passages: ${passages.length}`);
  console.log(`   Questions: ${questions.length}`);
  console.log(`   Review flags: ${reviewFlags.map((q: { questionNumber: number }) => q.questionNumber).join(", ")}`);
}

// Seed the real CUET UG English PYQ dataset (the only question bank in this repo).
// Auto-runs when invoked directly (tsx scripts/seed-english-mock.ts);
// also importable so prisma/seed.ts can reset the database with real data only.
if (process.argv[1] && process.argv[1].endsWith("seed-english-mock.ts")) {
  main().catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
}
