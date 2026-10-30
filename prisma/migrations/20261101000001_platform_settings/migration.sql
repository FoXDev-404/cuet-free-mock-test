-- Operational key/value settings for feature switches and editorial config.
-- Kept in a separate migration so the earlier blueprint migration stays
-- replayable against databases that already received it.

CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL
);
