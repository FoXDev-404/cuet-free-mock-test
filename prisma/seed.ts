import { prisma } from "../src/lib/prisma";
import { main as seedEnglishMock } from "../scripts/seed-english-mock";

// Reset + seed with REAL data only.
// The old demo/sample bank (CS/Physics/General Test questions, sample chapters
// and sample tests) has been removed. The only question bank in this repo is the
// real CUET UG English PYQ dataset (20 May 2025 Shift 1) seeded from
// data/english-mock/exam.json.
async function main() {
  console.log("🌱 Resetting database (real PYQ data only)…");

  // Wipe all existing rows so re-seeding is deterministic.
  // Children first, then parents (FK cascades handle the rest).
  await prisma.testQuestionLink.deleteMany();
  await prisma.questionAttempt.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.questionReview.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.question.deleteMany();
  await prisma.test.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.passage.deleteMany();
  await prisma.englishMockConfig.deleteMany();

  // Seed the real English PYQ dataset (subject, passages, 50 questions, config).
  await seedEnglishMock();

  const subjects = await prisma.subject.count();
  const questions = await prisma.question.count();
  const tests = await prisma.test.count();
  const passages = await prisma.passage.count();

  console.log("✅ Seed complete");
  console.log(`   Subjects: ${subjects} (English only)`);
  console.log(`   Questions: ${questions} (real CUET UG English PYQ)`);
  console.log(`   Passages: ${passages}`);
  console.log(`   Sample/demo tests: ${tests} (all demo data removed)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
