import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Original sample questions — NOT copied from any source. Marked as sample data.
async function main() {
  console.log("🌱 Seeding database...");

  // ---- Subjects ----
  const cs = await prisma.subject.upsert({
    where: { code: "CS" },
    update: {},
    create: {
      name: "Computer Science",
      code: "CS",
      sectionType: "DOMAIN",
      description: "Computer Science domain subject for CUET UG Section II",
      order: 1,
    },
  });

  const phy = await prisma.subject.upsert({
    where: { code: "PHY" },
    update: {},
    create: {
      name: "Physics",
      code: "PHY",
      sectionType: "DOMAIN",
      description: "Physics domain subject for CUET UG Section II",
      order: 2,
    },
  });

  const gt = await prisma.subject.upsert({
    where: { code: "GT" },
    update: {},
    create: {
      name: "General Test",
      code: "GT",
      sectionType: "GENERAL_TEST",
      description: "General Test for CUET UG Section III",
      order: 3,
    },
  });

  // ---- Chapters ----
  const csChapters = await Promise.all([
    prisma.chapter.upsert({
      where: { id: "cs-os" },
      update: {},
      create: { name: "Operating System", subjectId: cs.id, order: 1 },
    }),
    prisma.chapter.upsert({
      where: { id: "cs-dbms" },
      update: {},
      create: { name: "DBMS", subjectId: cs.id, order: 2 },
    }),
    prisma.chapter.upsert({
      where: { id: "cs-dsa" },
      update: {},
      create: { name: "Data Structures & Algorithms", subjectId: cs.id, order: 3 },
    }),
  ]);

  const phyChapters = await Promise.all([
    prisma.chapter.upsert({
      where: { id: "phy-mech" },
      update: {},
      create: { name: "Mechanics", subjectId: phy.id, order: 1 },
    }),
    prisma.chapter.upsert({
      where: { id: "phy-em" },
      update: {},
      create: { name: "Electricity & Magnetism", subjectId: phy.id, order: 2 },
    }),
  ]);

  const gtChapters = await Promise.all([
    prisma.chapter.upsert({
      where: { id: "gt-reasoning" },
      update: {},
      create: { name: "Logical Reasoning", subjectId: gt.id, order: 1 },
    }),
    prisma.chapter.upsert({
      where: { id: "gt-quant" },
      update: {},
      create: { name: "Quantitative Aptitude", subjectId: gt.id, order: 2 },
    }),
  ]);

  const optionsJson = (arr: { id: string; text: string }[]) => JSON.stringify(arr);

  // ---- Computer Science Questions (10) ----
  const csQuestions = [
    {
      chapterId: csChapters[0].id,
      type: "MCQ",
      stemEn: "Which of the following is NOT an operating system function?",
      optionsEn: optionsJson([{ id: "A", text: "Memory management" }, { id: "B", text: "Process scheduling" }, { id: "C", text: "Compiler design" }, { id: "D", text: "File management" }]),
      correctAnswer: "C",
      explanationEn: "Compiler design is not a core OS function; memory management, process scheduling, and file management are.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: csChapters[0].id,
      type: "MCQ",
      stemEn: "In Round Robin scheduling, the time allocated to each process is called:",
      optionsEn: optionsJson([{ id: "A", text: "Burst time" }, { id: "B", text: "Time quantum" }, { id: "C", text: "Waiting time" }, { id: "D", text: "Turnaround time" }]),
      correctAnswer: "B",
      explanationEn: "Time quantum is the fixed time slice assigned to each process in Round Robin.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: csChapters[1].id,
      type: "MCQ",
      stemEn: "Which normal form eliminates transitive dependencies?",
      optionsEn: optionsJson([{ id: "A", text: "1NF" }, { id: "B", text: "2NF" }, { id: "C", text: "3NF" }, { id: "D", text: "BCNF" }]),
      correctAnswer: "C",
      explanationEn: "3NF eliminates transitive dependencies where a non-prime attribute depends on another non-prime attribute.",
      source: "sample",
      difficulty: "medium",
    },
    {
      chapterId: csChapters[1].id,
      type: "MCQ",
      stemEn: "ACID stands for:",
      optionsEn: optionsJson([{ id: "A", text: "Atomicity, Consistency, Isolation, Durability" }, { id: "B", text: "Atomicity, Concurrency, Isolation, Durability" }, { id: "C", text: "Availability, Consistency, Isolation, Durability" }, { id: "D", text: "Atomicity, Consistency, Integrity, Durability" }]),
      correctAnswer: "A",
      explanationEn: "ACID = Atomicity, Consistency, Isolation, Durability — the four properties of database transactions.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: csChapters[2].id,
      type: "MCQ",
      stemEn: "The time complexity of binary search on a sorted array of n elements is:",
      optionsEn: optionsJson([{ id: "A", text: "O(n)" }, { id: "B", text: "O(n log n)" }, { id: "C", text: "O(log n)" }, { id: "D", text: "O(n²)" }]),
      correctAnswer: "C",
      explanationEn: "Binary search halves the search space each step, giving O(log n) time complexity.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: csChapters[2].id,
      type: "MCQ",
      stemEn: "Which data structure uses LIFO order?",
      optionsEn: optionsJson([{ id: "A", text: "Queue" }, { id: "B", text: "Stack" }, { id: "C", text: "Array" }, { id: "D", text: "Hash table" }]),
      correctAnswer: "B",
      explanationEn: "Stack follows Last-In-First-Out (LIFO) order.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: csChapters[0].id,
      type: "MCQ",
      stemEn: "A deadlock occurs when:",
      optionsEn: optionsJson([{ id: "A", text: "A process waits for a resource held by another waiting process" }, { id: "B", text: "Two processes run simultaneously" }, { id: "C", text: "Memory is full" }, { id: "D", text: "CPU is idle" }]),
      correctAnswer: "A",
      explanationEn: "Deadlock is a circular wait condition where processes wait for resources held by each other.",
      source: "sample",
      difficulty: "medium",
    },
    {
      chapterId: csChapters[1].id,
      type: "MCQ",
      stemEn: "SQL command to remove a table and its data:",
      optionsEn: optionsJson([{ id: "A", text: "DELETE" }, { id: "B", text: "DROP" }, { id: "C", text: "TRUNCATE" }, { id: "D", text: "REMOVE" }]),
      correctAnswer: "B",
      explanationEn: "DROP TABLE removes the table definition and all data. DELETE removes rows; TRUNCATE removes rows but keeps table.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: csChapters[2].id,
      type: "MCQ",
      stemEn: "In a min-heap, the smallest element is always at:",
      optionsEn: optionsJson([{ id: "A", text: "A leaf node" }, { id: "B", text: "The root" }, { id: "C", text: "Any internal node" }, { id: "D", text: "The last level" }]),
      correctAnswer: "B",
      explanationEn: "In a min-heap, the root is always the minimum element.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: csChapters[0].id,
      type: "MCQ",
      stemEn: "Virtual memory allows:",
      optionsEn: optionsJson([{ id: "A", text: "Running programs larger than physical RAM" }, { id: "B", text: "Disabling the CPU" }, { id: "C", text: "Removing the need for a hard disk" }, { id: "D", text: "Running only one program" }]),
      correctAnswer: "A",
      explanationEn: "Virtual memory uses disk space to extend RAM, allowing programs larger than physical memory to run.",
      source: "sample",
      difficulty: "medium",
    },
  ];

  // ---- Physics Questions (8) ----
  const phyQuestions = [
    {
      chapterId: phyChapters[0].id,
      type: "MCQ",
      stemEn: "A body of mass 2 kg moves with velocity 5 m/s. Its kinetic energy is:",
      optionsEn: optionsJson([{ id: "A", text: "10 J" }, { id: "B", text: "25 J" }, { id: "C", text: "50 J" }, { id: "D", text: "5 J" }]),
      correctAnswer: "B",
      explanationEn: "KE = ½mv² = ½ × 2 × 5² = 25 J.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: phyChapters[0].id,
      type: "MCQ",
      stemEn: "Newton's first law is also called the law of:",
      optionsEn: optionsJson([{ id: "A", text: "Inertia" }, { id: "B", text: "Acceleration" }, { id: "C", text: "Action-reaction" }, { id: "D", text: "Gravitation" }]),
      correctAnswer: "A",
      explanationEn: "Newton's first law is the law of inertia.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: phyChapters[1].id,
      type: "MCQ",
      stemEn: "Ohm's law states:",
      optionsEn: optionsJson([{ id: "A", text: "V = IR" }, { id: "B", text: "V = I/R" }, { id: "C", text: "I = VR" }, { id: "D", text: "R = VI" }]),
      correctAnswer: "A",
      explanationEn: "Ohm's law: Voltage = Current × Resistance (V = IR).",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: phyChapters[1].id,
      type: "MCQ",
      stemEn: "The unit of electric charge is:",
      optionsEn: optionsJson([{ id: "A", text: "Volt" }, { id: "B", text: "Ampere" }, { id: "C", text: "Coulomb" }, { id: "D", text: "Watt" }]),
      correctAnswer: "C",
      explanationEn: "Coulomb is the SI unit of electric charge.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: phyChapters[0].id,
      type: "MCQ",
      stemEn: "Work done by a force of 10 N moving an object 3 m in force direction:",
      optionsEn: optionsJson([{ id: "A", text: "3 J" }, { id: "B", text: "30 J" }, { id: "C", text: "13 J" }, { id: "D", text: "3.33 J" }]),
      correctAnswer: "B",
      explanationEn: "Work = Force × Distance = 10 × 3 = 30 J.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: phyChapters[0].id,
      type: "MCQ",
      stemEn: "Momentum = mass × ?",
      optionsEn: optionsJson([{ id: "A", text: "Velocity" }, { id: "B", text: "Acceleration" }, { id: "C", text: "Force" }, { id: "D", text: "Time" }]),
      correctAnswer: "A",
      explanationEn: "Momentum p = mv, where v is velocity.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: phyChapters[1].id,
      type: "MCQ",
      stemEn: "In a series circuit, current:",
      optionsEn: optionsJson([{ id: "A", text: "Is same through all components" }, { id: "B", text: "Divides among components" }, { id: "C", text: "Is zero" }, { id: "D", text: "Doubles" }]),
      correctAnswer: "A",
      explanationEn: "In series, the same current flows through every component.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: phyChapters[1].id,
      type: "MCQ",
      stemEn: "Power = Voltage × ?",
      optionsEn: optionsJson([{ id: "A", text: "Current" }, { id: "B", text: "Resistance" }, { id: "C", text: "Charge" }, { id: "D", text: "Energy" }]),
      correctAnswer: "A",
      explanationEn: "Electrical power P = V × I.",
      source: "sample",
      difficulty: "easy",
    },
  ];

  // ---- General Test Questions (8) ----
  const gtQuestions = [
    {
      chapterId: gtChapters[0].id,
      type: "MCQ",
      stemEn: "Find the missing number: 2, 6, 12, 20, ?, 42",
      optionsEn: optionsJson([{ id: "A", text: "28" }, { id: "B", text: "30" }, { id: "C", text: "32" }, { id: "D", text: "34" }]),
      correctAnswer: "B",
      explanationEn: "Pattern: n×(n+1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30, 6×7=42.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: gtChapters[0].id,
      type: "MCQ",
      stemEn: "If A is brother of B, and B is sister of C, then A is C's:",
      optionsEn: optionsJson([{ id: "A", text: "Brother" }, { id: "B", text: "Sister" }, { id: "C", text: "Father" }, { id: "D", text: "Uncle" }]),
      correctAnswer: "A",
      explanationEn: "A (male) is B's brother; B is C's sister; so A is C's brother.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: gtChapters[1].id,
      type: "MCQ",
      stemEn: "15% of 200 = ?",
      optionsEn: optionsJson([{ id: "A", text: "20" }, { id: "B", text: "30" }, { id: "C", text: "25" }, { id: "D", text: "35" }]),
      correctAnswer: "B",
      explanationEn: "15% of 200 = 0.15 × 200 = 30.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: gtChapters[1].id,
      type: "MCQ",
      stemEn: "A train travels 240 km in 4 hours. Its speed is:",
      optionsEn: optionsJson([{ id: "A", text: "50 km/h" }, { id: "B", text: "60 km/h" }, { id: "C", text: "70 km/h" }, { id: "D", text: "80 km/h" }]),
      correctAnswer: "B",
      explanationEn: "Speed = Distance / Time = 240 / 4 = 60 km/h.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: gtChapters[0].id,
      type: "MCQ",
      stemEn: "Complete the series: AZ, BY, CX, ?",
      optionsEn: optionsJson([{ id: "A", text: "DW" }, { id: "B", text: "DX" }, { id: "C", text: "EW" }, { id: "D", text: "DV" }]),
      correctAnswer: "A",
      explanationEn: "First letter advances A→B→C→D; second letter recedes Z→Y→X→W.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: gtChapters[1].id,
      type: "MCQ",
      stemEn: "Simple interest on ₹1000 at 10% per annum for 2 years:",
      optionsEn: optionsJson([{ id: "A", text: "₹100" }, { id: "B", text: "₹200" }, { id: "C", text: "₹150" }, { id: "D", text: "₹250" }]),
      correctAnswer: "B",
      explanationEn: "SI = P×R×T/100 = 1000×10×2/100 = ₹200.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: gtChapters[0].id,
      type: "MCQ",
      stemEn: "Odd one out: 3, 5, 7, 9, 11",
      optionsEn: optionsJson([{ id: "A", text: "3" }, { id: "B", text: "7" }, { id: "C", text: "9" }, { id: "D", text: "11" }]),
      correctAnswer: "C",
      explanationEn: "9 is not a prime number; all others are prime.",
      source: "sample",
      difficulty: "easy",
    },
    {
      chapterId: gtChapters[1].id,
      type: "MCQ",
      stemEn: "If 5 workers build a wall in 12 days, how many days for 3 workers?",
      optionsEn: optionsJson([{ id: "A", text: "15" }, { id: "B", text: "20" }, { id: "C", text: "25" }, { id: "D", text: "30" }]),
      correctAnswer: "B",
      explanationEn: "Total work = 5×12 = 60 worker-days. 3 workers take 60/3 = 20 days.",
      source: "sample",
      difficulty: "medium",
    },
  ];

  for (const q of csQuestions) {
    await prisma.question.create({
      data: { subjectId: cs.id, ...q },
    });
  }
  for (const q of phyQuestions) {
    await prisma.question.create({
      data: { subjectId: phy.id, ...q },
    });
  }
  for (const q of gtQuestions) {
    await prisma.question.create({
      data: { subjectId: gt.id, ...q },
    });
  }

  // ---- Sample tests ----
  const fullTest = await prisma.test.create({
    data: {
      title: "Computer Science Full-Length Mock",
      slug: "cs-full-mock",
      type: "FULL_LENGTH",
      status: "PUBLISHED",
      subjectId: cs.id,
      config: JSON.stringify({
        totalQuestions: 10,
        durationMinutes: 60,
        markingScheme: { correct: 5, incorrect: 1, unattempted: 0 },
        bilingual: true,
      }),
      totalQuestions: 10,
      durationMinutes: 60,
      isPublic: true,
    },
  });

  const csQuestionsCreated = await prisma.question.findMany({ where: { subjectId: cs.id } });
  let order = 0;
  for (const q of csQuestionsCreated.slice(0, 10)) {
    await prisma.testQuestionLink.create({
      data: { testId: fullTest.id, questionId: q.id, order: order++ },
    });
  }

  const gtTest = await prisma.test.create({
    data: {
      title: "General Test Full-Length Mock",
      slug: "gt-full-mock",
      type: "GENERAL_TEST",
      status: "PUBLISHED",
      subjectId: gt.id,
      config: JSON.stringify({
        totalQuestions: 10,
        durationMinutes: 60,
        markingScheme: { correct: 5, incorrect: 1, unattempted: 0 },
        bilingual: true,
      }),
      totalQuestions: 10,
      durationMinutes: 60,
      isPublic: true,
    },
  });

  const gtQuestionsCreated = await prisma.question.findMany({ where: { subjectId: gt.id } });
  order = 0;
  for (const q of gtQuestionsCreated.slice(0, 10)) {
    await prisma.testQuestionLink.create({
      data: { testId: gtTest.id, questionId: q.id, order: order++ },
    });
  }

  console.log("✅ Seed complete");
  console.log(`   Subjects: CS, PHY, GT`);
  console.log(`   Questions: ${csQuestions.length + phyQuestions.length + gtQuestions.length}`);
  console.log(`   Tests: 2 (CS Full Mock, GT Full Mock)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
