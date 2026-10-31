-- @prisma/adapter-d1 infers a column's type from its values. ISO-8601 text is
-- reported as DateTime, while integer epoch milliseconds are reported as
-- Double and rejected by the WASM query engine with:
--   Inconsistent column data: Could not convert value ... to type DateTime
--
-- The exam-studio seed originally wrote SQLite's "YYYY-MM-DD HH:MM:SS" text,
-- and migration 20261101000003 converted that to epoch milliseconds for the
-- native local engine. Neither form is readable through the D1 adapter, so
-- normalise every non-ISO DateTime value (integer ms or SQLite text) to the
-- ISO-8601 form Prisma writes itself. SQLite's strftime accepts both inputs,
-- and existing ISO values are left untouched, making the migration idempotent.

UPDATE "Exam"
SET "createdAt" =
      CASE
        WHEN typeof("createdAt") = 'integer'
          THEN strftime('%Y-%m-%dT%H:%M:%fZ', "createdAt" / 1000.0, 'unixepoch')
        ELSE strftime('%Y-%m-%dT%H:%M:%fZ', "createdAt")
      END,
    "updatedAt" =
      CASE
        WHEN typeof("updatedAt") = 'integer'
          THEN strftime('%Y-%m-%dT%H:%M:%fZ', "updatedAt" / 1000.0, 'unixepoch')
        ELSE strftime('%Y-%m-%dT%H:%M:%fZ', "updatedAt")
      END
WHERE typeof("createdAt") = 'integer'
   OR typeof("updatedAt") = 'integer'
   OR (typeof("createdAt") = 'text' AND "createdAt" NOT LIKE '____-__-__T%')
   OR (typeof("updatedAt") = 'text' AND "updatedAt" NOT LIKE '____-__-__T%');

UPDATE "ExamYear"
SET "createdAt" =
      CASE
        WHEN typeof("createdAt") = 'integer'
          THEN strftime('%Y-%m-%dT%H:%M:%fZ', "createdAt" / 1000.0, 'unixepoch')
        ELSE strftime('%Y-%m-%dT%H:%M:%fZ', "createdAt")
      END
WHERE typeof("createdAt") = 'integer'
   OR (typeof("createdAt") = 'text' AND "createdAt" NOT LIKE '____-__-__T%');
