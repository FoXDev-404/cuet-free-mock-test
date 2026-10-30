-- Exam Studio foundation migration (spec: exams/years/subjects/chapters/topics,
-- normalized question bank, versions, audit, imports, leaderboards).
-- Idempotent where SQLite allows: new tables use IF NOT EXISTS and seed data
-- uses guards, so accidental re-application is safe; ALTER TABLE ADD COLUMN
-- statements are tracked by d1_migrations and must not be manually re-run.

PRAGMA foreign_keys = OFF;

-- ============ 1. Academic hierarchy ============

CREATE TABLE IF NOT EXISTS "Exam" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'CUET_UG',
  "description" TEXT,
  "logoUrl" TEXT,
  "coverImageUrl" TEXT,
  "syllabusVersion" TEXT,
  "instructions" TEXT,
  "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 60,
  "defaultMarksCorrect" INTEGER NOT NULL DEFAULT 5,
  "defaultMarksNegative" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Exam_code_key" ON "Exam"("code");

CREATE TABLE IF NOT EXISTS "ExamYear" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "examId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "syllabusVersion" TEXT,
  "description" TEXT,
  "isActive" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamYear_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExamYear_examId_year_key" ON "ExamYear"("examId", "year");
CREATE INDEX IF NOT EXISTS "ExamYear_examId_idx" ON "ExamYear"("examId");

CREATE TABLE IF NOT EXISTS "Topic" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "chapterId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Topic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Topic_chapterId_idx" ON "Topic"("chapterId");

-- ============ 2. Question bank ============

CREATE TABLE IF NOT EXISTS "QuestionOption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "questionId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "isCorrect" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "QuestionOption_questionId_optionId_key" ON "QuestionOption"("questionId", "optionId");
CREATE INDEX IF NOT EXISTS "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

CREATE TABLE IF NOT EXISTS "QuestionTag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "questionId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  CONSTRAINT "QuestionTag_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "QuestionTag_questionId_label_key" ON "QuestionTag"("questionId", "label");
CREATE INDEX IF NOT EXISTS "QuestionTag_label_idx" ON "QuestionTag"("label");

CREATE TABLE IF NOT EXISTS "QuestionVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "questionId" TEXT NOT NULL,
  "versionNo" INTEGER NOT NULL,
  "snapshot" TEXT NOT NULL,
  "reason" TEXT,
  "actorEmail" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionVersion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "QuestionVersion_questionId_versionNo_key" ON "QuestionVersion"("questionId", "versionNo");
CREATE INDEX IF NOT EXISTS "QuestionVersion_questionId_idx" ON "QuestionVersion"("questionId");

CREATE TABLE IF NOT EXISTS "TestVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "testId" TEXT NOT NULL,
  "versionNo" INTEGER NOT NULL,
  "snapshot" TEXT NOT NULL,
  "note" TEXT,
  "actorEmail" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestVersion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TestVersion_testId_versionNo_key" ON "TestVersion"("testId", "versionNo");
CREATE INDEX IF NOT EXISTS "TestVersion_testId_idx" ON "TestVersion"("testId");

-- ============ 3. Attempt hardening ============

CREATE TABLE IF NOT EXISTS "AttemptEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "attemptId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttemptEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AttemptEvent_attemptId_idx" ON "AttemptEvent"("attemptId");

-- ============ 4. Import jobs ============

CREATE TABLE IF NOT EXISTS "ImportJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "filename" TEXT NOT NULL,
  "checksum" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "format" TEXT NOT NULL DEFAULT 'JSON',
  "mode" TEXT NOT NULL DEFAULT 'COMMIT',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "totalRecords" INTEGER NOT NULL DEFAULT 0,
  "insertedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "errorDetails" TEXT,
  "stagedData" TEXT,
  "processedUpTo" INTEGER NOT NULL DEFAULT 0,
  "actorEmail" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" DATETIME,
  "finishedAt" DATETIME,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ImportJob_status_idx" ON "ImportJob"("status");
CREATE INDEX IF NOT EXISTS "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");

CREATE TABLE IF NOT EXISTS "ImportError" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "jobId" TEXT NOT NULL,
  "rowNumber" INTEGER,
  "field" TEXT,
  "code" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "raw" TEXT,
  CONSTRAINT "ImportError_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ImportError_jobId_idx" ON "ImportError"("jobId");

-- ============ 5.Administration: audit log ============

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorEmail" TEXT NOT NULL,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "beforeData" TEXT,
  "afterData" TEXT,
  "reason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_actorEmail_idx" ON "AdminAuditLog"("actorEmail");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- ============ 6. Leaderboards ============

CREATE TABLE IF NOT EXISTS "LeaderboardConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "periodType" TEXT NOT NULL DEFAULT 'ALL_TIME',
  "examId" TEXT,
  "subjectId" TEXT,
  "testId" TEXT,
  "rules" TEXT NOT NULL DEFAULT '{}',
  "isActive" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LeaderboardConfig_scope_idx" ON "LeaderboardConfig"("scope");

CREATE TABLE IF NOT EXISTS "LeaderboardEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "configId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "testId" TEXT,
  "bestScore" REAL NOT NULL DEFAULT 0,
  "maxScore" REAL NOT NULL DEFAULT 1,
  "percentage" REAL NOT NULL DEFAULT 0,
  "accuracy" REAL NOT NULL DEFAULT 0,
  "attemptsCount" INTEGER NOT NULL DEFAULT 0,
  "bestTimeSec" INTEGER NOT NULL DEFAULT 0,
  "lastSubmittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rank" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "LeaderboardEntry_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LeaderboardConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeaderboardEntry_configId_userId_key" ON "LeaderboardEntry"("configId", "userId");
CREATE INDEX IF NOT EXISTS "LeaderboardEntry_configId_rank_idx" ON "LeaderboardEntry"("configId", "rank");

CREATE TABLE IF NOT EXISTS "LeaderboardSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "configId" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "data" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaderboardSnapshot_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LeaderboardConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeaderboardSnapshot_configId_periodKey_key" ON "LeaderboardSnapshot"("configId", "periodKey");
CREATE INDEX IF NOT EXISTS "LeaderboardSnapshot_configId_periodKey_idx" ON "LeaderboardSnapshot"("configId", "periodKey");

CREATE TABLE IF NOT EXISTS "LeaderboardCompetition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "examId" TEXT,
  "testId" TEXT,
  "startsAt" DATETIME NOT NULL,
  "endsAt" DATETIME NOT NULL,
  "rules" TEXT,
  "isActive" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LeaderboardCompetition_isActive_idx" ON "LeaderboardCompetition"("isActive");

CREATE TABLE IF NOT EXISTS "LeaderboardExclusion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "attemptId" TEXT,
  "reason" TEXT NOT NULL,
  "excludedBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LeaderboardExclusion_userId_idx" ON "LeaderboardExclusion"("userId");

-- ============ 7. Column additions ============

ALTER TABLE "Subject" ADD COLUMN "examId" TEXT;
ALTER TABLE "Question" ADD COLUMN "topicId" TEXT;
ALTER TABLE "Question" ADD COLUMN "examId" TEXT;
ALTER TABLE "Question" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Question" ADD COLUMN "richTextEn" TEXT;
ALTER TABLE "Question" ADD COLUMN "questionImages" TEXT;
ALTER TABLE "Question" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'EN';
ALTER TABLE "Question" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "Question" ADD COLUMN "paperShift" TEXT;
ALTER TABLE "Question" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Question" ADD COLUMN "stemHash" TEXT;
ALTER TABLE "Test" ADD COLUMN "examId" TEXT;
ALTER TABLE "Attempt" ADD COLUMN "flagged" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Attempt" ADD COLUMN "flaggedReason" TEXT;
ALTER TABLE "Attempt" ADD COLUMN "practice" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Question_status_idx" ON "Question"("status");
CREATE INDEX IF NOT EXISTS "Question_stemHash_idx" ON "Question"("stemHash");
CREATE INDEX IF NOT EXISTS "Question_topicId_idx" ON "Question"("topicId");
CREATE INDEX IF NOT EXISTS "Question_examId_idx" ON "Question"("examId");
CREATE UNIQUE INDEX IF NOT EXISTS "Question_subject_external_uq" ON "Question"("subjectId", "externalId") WHERE "externalId" IS NOT NULL;

-- ============ 8. Seed + backfill ============

-- Root exam for the existing dataset.
INSERT INTO "Exam" ("id", "code", "name", "category", "description", "syllabusVersion",
  "instructions", "defaultDurationMinutes", "defaultMarksCorrect", "defaultMarksNegative",
  "status", "visibility", "createdAt", "updatedAt")
SELECT 'exam-cuet-ug-0001', 'CUET-UG', 'CUET UG', 'CUET_UG',
  'Common University Entrance Test â€” Undergraduate (English domain only so far).',
  'NTA CUET UG 2026 syllabus', 'General exam instructions managed in the Admin Studio.',
  60, 5, 1, 'PUBLISHED', 'PUBLIC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Exam" WHERE "code" = 'CUET-UG');

INSERT INTO "ExamYear" ("id", "examId", "year", "syllabusVersion", "description", "isActive", "createdAt")
SELECT 'examyear-cuet-ug-2025', (SELECT "id" FROM "Exam" WHERE "code" = 'CUET-UG'), 2025,
  'NTA CUET UG 2025 syllabus', '2025 question paper year', 1, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ExamYear"
  WHERE "examId" = (SELECT "id" FROM "Exam" WHERE "code" = 'CUET-UG') AND "year" = 2025);

INSERT INTO "ExamYear" ("id", "examId", "year", "syllabusVersion", "description", "isActive", "createdAt")
SELECT 'examyear-cuet-ug-2026', (SELECT "id" FROM "Exam" WHERE "code" = 'CUET-UG'), 2026,
  'NTA CUET UG 2026 syllabus', '2026 question paper year', 1, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ExamYear"
  WHERE "examId" = (SELECT "id" FROM "Exam" WHERE "code" = 'CUET-UG') AND "year" = 2026);

-- Attach the existing subjects/questions to the seeded exam.
UPDATE "Subject" SET "examId" = (SELECT "id" FROM "Exam" WHERE "code" = 'CUET-UG') WHERE "examId" IS NULL;
UPDATE "Question" SET "examId" = (SELECT "id" FROM "Exam" WHERE "code" = 'CUET-UG') WHERE "examId" IS NULL;

-- Existing questions are a verified published PYQ dataset.
UPDATE "Question" SET "status" = 'PUBLISHED' WHERE "status" = 'PUBLISHED' OR "status" IS NULL;

-- Normalized options: backfill from the JSON cache. Matches both option-id
-- ("opt-...-3") and label ("B") answer-key formats.
INSERT INTO "QuestionOption" ("id", "questionId", "optionId", "label", "text", "sortOrder", "isCorrect")
SELECT 'qopt-' || q."id" || '-' || (je."key" + 1),
       q."id",
       COALESCE(json_extract(je."value", '$.id'), 'opt-' || q."id" || '-' || (je."key" + 1)),
       char(65 + je."key"),
       COALESCE(json_extract(je."value", '$.text'), ''),
       (je."key" + 1),
       CASE WHEN json_extract(je."value", '$.id') = q."correctAnswer"
                  OR char(65 + je."key") = q."correctAnswer"
            THEN 1 ELSE 0 END
FROM "Question" q
JOIN json_each(q."optionsEn") je
WHERE q."optionsEn" IS NOT NULL
  AND q."optionsEn" NOT IN ('', '[]', 'null');

PRAGMA foreign_keys = ON;
