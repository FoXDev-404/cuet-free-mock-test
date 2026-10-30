-- Remove all demo/sample content from the remote D1 database.
-- Keeps only user data (users/attempts/etc. are untouched) and leaves
-- the real CUET UG English PYQ tables ready for a fresh import of d1-seed.sql.
--
-- Delete children before parents (FK-safe once foreign_keys enforcement resumes).

-- Test question links (children of Test/Question)
DELETE FROM "TestQuestionLink";

-- User-facing attempt data that references the removed questions/tests
DELETE FROM "QuestionAttempt";
DELETE FROM "Attempt";

-- User data referencing removed questions
DELETE FROM "Bookmark";
DELETE FROM "QuestionReview";

-- Demo tests
DELETE FROM "Test";

-- Demo questions & chapters (implies English questions are removed too; they
-- are re-imported from d1-seed.sql with the REAL prior-year dataset)
DELETE FROM "Question";
DELETE FROM "Chapter";

-- Demo subjects (Computer Science / Physics / General Test); the English
-- subject row is also re-imported from d1-seed.sql
DELETE FROM "Subject";

-- English mock data (re-imported with correct ids after local reseed)
DELETE FROM "Passage";
DELETE FROM "EnglishMockConfig";
