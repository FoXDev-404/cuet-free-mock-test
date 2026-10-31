-- Prisma stores DateTime on SQLite/D1 as Unix epoch milliseconds.
--
-- The original exam-studio seed inserted CURRENT_TIMESTAMP, which is a text
-- datetime. The query engine refuses to decode those rows ("Inconsistent
-- column data: Could not convert value ... to type DateTime"), so any page or
-- API that reads the root exam fails. Convert every surviving text timestamp
-- in place; rows already written by Prisma are integers and stay untouched.
UPDATE "Exam"
SET "createdAt" = CAST(strftime('%s', "createdAt") AS INTEGER) * 1000
WHERE typeof("createdAt") = 'text';

UPDATE "Exam"
SET "updatedAt" = CAST(strftime('%s', "updatedAt") AS INTEGER) * 1000
WHERE typeof("updatedAt") = 'text';

UPDATE "ExamYear"
SET "createdAt" = CAST(strftime('%s', "createdAt") AS INTEGER) * 1000
WHERE typeof("createdAt") = 'text';
