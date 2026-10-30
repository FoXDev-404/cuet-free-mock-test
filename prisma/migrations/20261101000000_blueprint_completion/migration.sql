-- Blueprint completion: reports, discussions, editorial metadata, privacy,
-- rate limiting and R2 media references.
--
-- Written as additive ALTER/CREATE statements so it can be applied to the
-- existing local SQLite database and the production D1 database without
-- rebuilding large tables.

ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "isProfilePublic" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "mutedUntil" DATETIME;
ALTER TABLE "User" ADD COLUMN "lastActiveAt" DATETIME;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

ALTER TABLE "Attempt" ADD COLUMN "deadlineAt" DATETIME;
ALTER TABLE "Attempt" ADD COLUMN "lastSavedAt" DATETIME;
ALTER TABLE "Attempt" ADD COLUMN "versionId" TEXT;
CREATE INDEX "Attempt_deadlineAt_idx" ON "Attempt"("deadlineAt");

CREATE TABLE "QuestionReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "userId" TEXT,
    "attemptId" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "resolvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuestionReport_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestionReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuestionReport_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "QuestionReport_status_createdAt_idx" ON "QuestionReport"("status", "createdAt");
CREATE INDEX "QuestionReport_questionId_idx" ON "QuestionReport"("questionId");
CREATE INDEX "QuestionReport_userId_idx" ON "QuestionReport"("userId");

CREATE TABLE "Discussion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT,
    "questionId" TEXT,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VISIBLE',
    "isPinned" BOOLEAN NOT NULL DEFAULT 0,
    "isBestAnswer" BOOLEAN NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Discussion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Discussion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Discussion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Discussion_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Discussion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Discussion_testId_status_createdAt_idx" ON "Discussion"("testId", "status", "createdAt");
CREATE INDEX "Discussion_questionId_status_createdAt_idx" ON "Discussion"("questionId", "status", "createdAt");
CREATE INDEX "Discussion_parentId_idx" ON "Discussion"("parentId");
CREATE INDEX "Discussion_userId_idx" ON "Discussion"("userId");

CREATE TABLE "DiscussionVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscussionVote_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscussionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DiscussionVote_userId_idx" ON "DiscussionVote"("userId");
CREATE UNIQUE INDEX "DiscussionVote_discussionId_userId_key" ON "DiscussionVote"("discussionId", "userId");

CREATE TABLE "DiscussionReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscussionReport_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscussionReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DiscussionReport_status_createdAt_idx" ON "DiscussionReport"("status", "createdAt");
CREATE UNIQUE INDEX "DiscussionReport_discussionId_userId_key" ON "DiscussionReport"("discussionId", "userId");

CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "Announcement_isActive_startsAt_endsAt_idx" ON "Announcement"("isActive", "startsAt", "endsAt");

CREATE TABLE "PageSeo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "introContent" TEXT,
    "faqJson" TEXT,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "PageSeo_path_key" ON "PageSeo"("path");
CREATE INDEX "PageSeo_updatedAt_idx" ON "PageSeo"("updatedAt");

CREATE TABLE "ExamInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "lastVerified" DATETIME,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "ExamInfo_key_key" ON "ExamInfo"("key");
CREATE INDEX "ExamInfo_key_idx" ON "ExamInfo"("key");

CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");
CREATE UNIQUE INDEX "UserBadge_userId_badgeKey_key" ON "UserBadge"("userId", "badgeKey");

CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "windowStart" DATETIME NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");

CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MediaAsset_key_key" ON "MediaAsset"("key");
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");
