-- Blueprint 10.3: media may appear in the question stem, options, shared
-- passage and explanation. Stem diagrams already live in Question.questionImages;
-- this migration adds the remaining first-class placements.
--
-- Option diagrams are stored inside the existing optionsEn JSON cache as
-- { id, text, imageUrl, imageAlt } so no table rebuild is required.

ALTER TABLE "Question" ADD COLUMN "explanationImageUrl" TEXT;
ALTER TABLE "Question" ADD COLUMN "explanationImageAlt" TEXT;

ALTER TABLE "Passage" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Passage" ADD COLUMN "imageAlt" TEXT;
ALTER TABLE "Passage" ADD COLUMN "sourceNote" TEXT;
