import { prisma } from "../src/lib/prisma";
import fs from "node:fs";

function sqlLiteral(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v);
  const str = String(v).replace(/'/g, "''");
  return `'${str}'`;
}

async function dump(table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const inserts = rows.map((r) => `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map((c) => sqlLiteral(r[c])).join(", ")});`);
  return inserts.join("\n") + "\n";
}

async function main() {
  const lines: string[] = [];
  lines.push("PRAGMA foreign_keys=OFF;");
  const subjects = await prisma.subject.findMany();
  lines.push(await dump("Subject", subjects.map((s) => ({ ...s }))));
  const chapters = await prisma.chapter.findMany();
  lines.push(await dump("Chapter", chapters.map((c) => ({ ...c }))));
  const questions = await prisma.question.findMany();
  lines.push(await dump("Question", questions.map((q) => ({ ...q }))));
  const tests = await prisma.test.findMany();
  lines.push(await dump("Test", tests.map((t) => ({ ...t }))));
  const links = await prisma.testQuestionLink.findMany();
  lines.push(await dump("TestQuestionLink", links.map((l) => ({ ...l }))));
  fs.writeFileSync("scripts/d1-seed.sql", lines.filter(Boolean).join("\n"));
  console.log("done");
}
main().finally(() => prisma.$disconnect());
