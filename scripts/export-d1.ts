import { prisma } from "../src/lib/prisma";
import fs from "node:fs";

function sqlLiteral(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return `'${v.toISOString()}'`;
  const str = String(v).replace(/'/g, "''");
  return `'${str}'`;
}

async function dump(table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const inserts = rows.map((r) => `INSERT OR REPLACE INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map((c) => sqlLiteral(r[c])).join(", ")});`);
  return inserts.join("\n") + "\n";
}

async function main() {
  const lines: string[] = [];
  lines.push("PRAGMA foreign_keys=OFF;");
  // Children are deleted first on the target DB (see d1-cleanup-demo.sql);
  // dump order is FK-safe for import: parents before children.
  const subjects = await prisma.subject.findMany();
  lines.push(await dump("Subject", subjects.map((s) => ({ ...s }))));
  const passages = await prisma.passage.findMany();
  lines.push(await dump("Passage", passages.map((p) => ({ ...p }))));
  const chapters = await prisma.chapter.findMany();
  lines.push(await dump("Chapter", chapters.map((c) => ({ ...c }))));
  const questions = await prisma.question.findMany();
  lines.push(await dump("Question", questions.map((q) => ({ ...q }))));
  const englishMockConfigs = await prisma.englishMockConfig.findMany();
  lines.push(await dump("EnglishMockConfig", englishMockConfigs.map((c) => ({ ...c }))));
  const tests = await prisma.test.findMany();
  lines.push(await dump("Test", tests.map((t) => ({ ...t }))));
  const links = await prisma.testQuestionLink.findMany();
  lines.push(await dump("TestQuestionLink", links.map((l) => ({ ...l }))));
  fs.writeFileSync("scripts/d1-seed.sql", lines.filter(Boolean).join("\n"));
  console.log("done");
}
main().finally(() => prisma.$disconnect());
