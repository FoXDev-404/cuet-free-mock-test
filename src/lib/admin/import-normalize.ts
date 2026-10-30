// Import Studio v2 — payload parsing, row normalization and validation.
// Pure helpers (no DB) so validation is CPU-cheap and resumable; DB-side
// duplicate checks and chapter/topic resolution live in the commit pass.

export type ImportFormat = "JSON" | "CSV" | "PASTE";
export type ImportErrorRow = { rowNumber: number; field?: string; code: string; message: string };
export type ImportWarning = { field?: string; code: string; message: string };

export type NormalizedRow = {
  rowNumber: number; // 1-based logical row (payload order)
  ok: boolean;
  data?: QuestionInput;
  errors: ImportErrorRow[];
  warnings: ImportWarning[];
};

export type QuestionInput = {
  subjectId?: string;
  chapterName?: string;
  topicName?: string;
  externalId?: string;
  type: string;
  stemEn: string;
  stemHi?: string;
  richTextEn?: string;
  options: { id: string; text: string }[];
  correctAnswer: string; // normalized to option id during commit; label fallback at validation
  explanationEn?: string;
  explanationHi?: string;
  questionImages?: { url: string; alt?: string }[];
  language: string;
  status: string; // clamped; never PUBLISHED from imports (spec §6)
  year?: number;
  source?: string;
  paperShift?: string;
  difficulty: string;
  marks: number;
  negativeMarks: number;
  tags: string[];
  answerReviewStatus: string;
};

export const IMPORT_ROW_CAP = 2000;
export const VALID_STATUSES = ["DRAFT", "PENDING_VALIDATION", "UNDER_REVIEW", "APPROVED"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

// ---------------------------------------------------------------- CSV parser

/** RFC-4180-ish CSV: quoted values, escaped "" quotes, embedded newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;
  let i = 0;
  const pushValue = () => { row.push(value); value = ""; };
  const pushRow = () => { pushValue(); rows.push(row); row = []; };
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { value += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      value += ch; i++; continue;
    }
    if (ch === '"' && value === "") { inQuotes = true; i++; continue; }
    if (ch === ",") { pushValue(); i++; continue; }
    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { pushRow(); i++; continue; }
    value += ch; i++;
  }
  if (value !== "" || row.length > 0) pushRow();
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Parse a manifest into logical row objects with flattened keys. */
export function parsePayload(format: ImportFormat, text: string): Record<string, unknown>[] {
  if (format === "CSV") {
    const grid = parseCsv(text);
    if (grid.length < 2) return [];
    const headers = grid[0].map((h) => h.trim().toLowerCase());
    return grid.slice(1).map((cells) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => { obj[h] = cells[idx] ?? ""; });
      return obj;
    });
  }
  // JSON / PASTE (pasted JSON)
  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) return lowerKeys(parsed as Record<string, unknown>[]);
  if (parsed && typeof parsed === "object") {
    const bag = parsed as Record<string, unknown>;
    for (const key of ["questions", "rows", "data", "items"]) {
      if (Array.isArray(bag[key])) return lowerKeys(bag[key] as Record<string, unknown>[]);
    }
    throw new Error("JSON payload must be an array or an object with a questions/rows/data/items array");
  }
  throw new Error("Unrecognized payload shape");
}

// Row alias keys are matched in lower case; flatten once at the boundary.
function lowerKeys(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) =>
    row && typeof row === "object"
      ? Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]))
      : row,
  );
}

// ------------------------------------------------------------ row normalize

function firstString(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

/** Options come as strings[] | [{id,text}] | {A:"…"} | {"1":"…"} — normalize all. */
function normalizeOptions(raw: unknown): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") {
        if (item.trim() !== "") out.push({ id: "", text: item.trim() });
      } else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const text = asString(o.text ?? o.value ?? o.option ?? o.label_text);
        if (text && text.trim() !== "") {
          out.push({ id: asString(o.id) ?? asString(o.optionId) ?? "", text: text.trim() });
        }
      }
    }
    return out;
  }
  if (raw && typeof raw === "object") {
    for (const [, v] of Object.entries(raw as Record<string, unknown>)) {
      const text = asString(v);
      if (text && text.trim() !== "") out.push({ id: "", text: text.trim() });
    }
    return out;
  }
  return out;
}

/** Correct-key forms: label ("A"), index ("3"), option id ("opt-…-3"). */
function normalizeCorrect(raw: unknown): string | undefined {
  const s = asString(raw)?.trim();
  if (!s) return undefined;
  const optLetter = s.match(/^option\s+([a-fA-F])$/);
  if (optLetter) return optLetter[1].toUpperCase();
  if (/^[a-fA-F]$/.test(s)) return s.toUpperCase();
  return s; // numeric index or option id — keep case-sensitive
}

function clampStatus(raw: unknown, fallback: string): { status: string; warning?: ImportWarning } {
  const s = asString(raw)?.toUpperCase();
  if (!s) return { status: fallback };
  if ((VALID_STATUSES as readonly string[]).includes(s)) return { status: s };
  // Unverified imports may never auto-publish (spec §6) — clamp downward.
  if (["PUBLISHED", "ARCHIVED", "REJECTED"].includes(s)) {
    return { status: fallback, warning: { field: "status", code: "STATUS_CLAMPED", message: `"${s}" is not allowed on import; used ${fallback} instead` } };
  }
  return { status: fallback };
}

export type ImportRowOptions = {
  defaultSubjectId?: string;
  defaultYear?: number;
  defaultSource?: string;
  defaultStatus?: string;
  defaultMarks?: number;
  defaultNegativeMarks?: number;
  defaultDifficulty?: string;
  defaultLanguage?: string;
};

export function normalizeRow(
  rawRow: Record<string, unknown>,
  rowNumber: number,
  opts: ImportRowOptions,
): NormalizedRow {
  const errors: ImportErrorRow[] = [];
  const warnings: ImportWarning[] = [];
  const err = (field: string, code: string, message: string) => errors.push({ rowNumber, field, code, message });
  const warn = (field: string, code: string, message: string) => warnings.push({ field, code, message });

  const stem = asString(firstString(rawRow, ["stemen", "stem", "question", "questiontext", "text", "statement"]))?.trim();
  if (!stem) err("stemEn", "MISSING_TEXT", "Question text is empty");

  const options = normalizeOptions(rawRow["optionsen"] ?? first_stringish_options(rawRow));
  if (options.length < 2) err("optionsEn", "INSUFFICIENT_OPTIONS", `Need at least 2 options, found ${options.length}`);
  else if (options.length > 6) err("optionsEn", "TOO_MANY_OPTIONS", `Max 6 options, found ${options.length}`);

  const correct = normalizeCorrect(rawRow["correctanswer"] ?? rawRow["answer"] ?? rawRow["answerkey"] ?? rawRow["correctoption"] ?? rawRow["correct"]);
  let answerReviewStatus = "source_key_recorded";
  if (!correct) {
    answerReviewStatus = "needs_manual_review";
    warn("correctAnswer", "MISSING_ANSWER", "No answer key in the row — imported flagged for manual review");
  }

  const typeRaw = (asString(rawRow["type"]) ?? "MCQ").toUpperCase().replace("MULTIPLE_CHOICE", "MCQ").replace("ASSERTION-REASON", "ASSERTION_REASON").replace("MATCH-FOLLOWING", "MATCH_FOLLOWING");
  const type = VALID_TYPES.includes(typeRaw) ? typeRaw : "MCQ";

  let difficulty = (asString(rawRow["difficulty"]) ?? opts.defaultDifficulty ?? "medium").toLowerCase();
  if (!DIFFICULTIES.includes(difficulty as (typeof DIFFICULTIES)[number])) {
    warn("difficulty", "INVALID_DIFFICULTY", `"${difficulty}" clamped to medium`);
    difficulty = "medium";
  }

  let year: number | undefined;
  const yearRaw = rawRow["year"];
  if (yearRaw !== undefined && yearRaw !== null && yearRaw !== "") {
    const y = typeof yearRaw === "number" ? yearRaw : parseInt(String(yearRaw), 10);
    if (Number.isNaN(y) || y < 1990 || y > 2100) warn("year", "INVALID_YEAR", `"${String(yearRaw)}" ignored`);
    else year = y;
  }
  if (year === undefined && opts.defaultYear) year = opts.defaultYear;

  const marksRaw = rawRow["marks"];
  const marks = clampInt(marksRaw, 1, 100, opts.defaultMarks ?? 5, warn, "marks", "INVALID_MARKS");
  const negativeRaw = rawRow["negativemarks"] ?? rawRow["negative_marks"];
  const negativeMarks = clampInt(negativeRaw, 0, 100, opts.defaultNegativeMarks ?? 1, warn, "negativeMarks", "INVALID_NEGATIVE_MARKS");

  const { status, warning } = clampStatus(rawRow["status"], opts.defaultStatus ?? "DRAFT");
  if (warning) warnings.push(warning);

  const tagsRaw = rawRow["tags"] ?? rawRow["keywords"];
  let tags: string[] = [];
  if (Array.isArray(tagsRaw)) tags = tagsRaw.map((t) => asString(t)).filter((t): t is string => !!t).slice(0, 20);
  else if (typeof tagsRaw === "string" && tagsRaw.trim()) tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20);

  const imagesRaw = rawRow["questionimages"] ?? rawRow["images"];
  let questionImages: { url: string; alt?: string }[] | undefined;
  if (Array.isArray(imagesRaw)) {
    const imgs = imagesRaw.map((im) => {
      if (typeof im === "string") return { url: im };
      if (im && typeof im === "object") {
        const o = im as Record<string, unknown>;
        const url = asString(o.url);
        return url ? { url, alt: asString(o.alt) } : null;
      }
      return null;
    }).filter((im): im is { url: string; alt?: string } => im !== null);
    if (imgs.length) questionImages = imgs;
  }

  const externalId = asString(firstString(rawRow, ["externalid", "sourceid", "uid", "refid"]))?.trim() || undefined;
  const chapterName = asString(firstString(rawRow, ["chaptername", "chapter", "chaptertitle"]))?.trim() || undefined;
  const topicName = asString(firstString(rawRow, ["topicname", "topic"]))?.trim() || undefined;
  const language = (asString(rawRow["language"]) ?? opts.defaultLanguage ?? "EN").toUpperCase() === "HI" ? "HI" : "EN";
  const paperShift = asString(rawRow["papershift"] ?? rawRow["shift"])?.trim() || undefined;

  const data: QuestionInput = {
    ...(opts.defaultSubjectId ? { subjectId: opts.defaultSubjectId } : {}),
    ...(chapterName ? { chapterName } : {}),
    ...(topicName ? { topicName } : {}),
    ...(externalId ? { externalId } : {}),
    type,
    stemEn: stem ?? "",
    ...(asString(rawRow["stemhi"]) ? { stemHi: asString(rawRow["stemhi"]) } : {}),
    ...(asString(rawRow["richtexten"]) ? { richTextEn: asString(rawRow["richtexten"]) } : {}),
    options,
    correctAnswer: correct ?? "",
    ...(asString(firstString(rawRow, ["explanationen", "explanation", "solution"]))?.trim()
      ? { explanationEn: asString(firstString(rawRow, ["explanationen", "explanation", "solution"]))!.trim() }
      : {}),
    ...(asString(rawRow["explanationhi"]) ? { explanationHi: asString(rawRow["explanationhi"]) } : {}),
    ...(questionImages ? { questionImages } : {}),
    language,
    status,
    ...(year !== undefined ? { year } : {}),
    ...(opts.defaultSource ? { source: opts.defaultSource } : {}),
    ...(paperShift ? { paperShift } : {}),
    difficulty,
    marks,
    negativeMarks,
    tags,
    answerReviewStatus,
  };

  return { rowNumber, ok: errors.length === 0, data: errors.length === 0 ? data : undefined, errors, warnings };
}

const VALID_TYPES = ["MCQ", "MCQ_MULTI", "NUMERIC", "ASSERTION_REASON", "MATCH_FOLLOWING", "PASSAGE", "FILL_BLANK"];

// Legacy SPA-style keys can't carry nested arrays, so fall back to explicit key names.
function first_stringish_options(row: Record<string, unknown>): unknown {
  return row["options"] ?? row["choices"] ?? row["options_en"];
}

function clampInt(
  raw: unknown, min: number, max: number, fallback: number,
  warn: (field: string, code: string, message: string) => void,
  field: string, code: string,
): number {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = typeof raw === "number" ? Math.round(raw) : parseInt(String(raw), 10);
  if (Number.isNaN(n) || n < min || n > max) {
    warn(field, code, `"${String(raw)}" is invalid; used ${fallback}`);
    return fallback;
  }
  return n;
}

// -------------------------------------------------------------- content hash

/** Content fingerprint: normalized stem + option texts, sha-256 hex. */
export async function hashStem(stem: string, optionTexts: string[]): Promise<string> {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const material = `${norm(stem)}\u0000${optionTexts.map(norm).join("\u0001")}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
