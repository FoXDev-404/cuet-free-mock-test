import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

interface RawPaper {
  exam: {
    questions: Array<{
      id: string;
      optionsEn: Array<{ id: string; text: string }>;
      correctAnswer: string | null;
    }>;
  };
}

const PAPER_DIR = path.resolve(process.cwd(), "data/english-mock/papers");

function loadPaper(file: string): RawPaper {
  return JSON.parse(fs.readFileSync(path.join(PAPER_DIR, file), "utf8")) as RawPaper;
}

test.describe("Repo-backed English 2022 papers", () => {
  test("lists all six local papers on the mock-test page", async ({ page }) => {
    await page.goto("/mock-tests");

    await expect(
      page.getByRole("heading", { name: /CUET UG English 2022 — Previous Year Papers/ }),
    ).toBeVisible();

    for (const date of ["6 August", "10 August", "16 August", "18 August", "22 August", "16 September"]) {
      await expect(page.getByRole("link", { name: new RegExp(`Open CUET 2022 English paper — ${date}`) })).toBeVisible();
    }
  });

  test("take page is keyless and submission is graded server-side", async ({ request }) => {
    const take = await request.get("/mock-tests/english-2022-08-06/take");
    expect(take.ok()).toBeTruthy();
    const html = await take.text();
    expect(html).not.toContain("correctAnswer");
    expect(html).not.toContain("correctOption");

    const paper = loadPaper("2022-08-06_English_Shift_1.json");
    const answers = paper.exam.questions.map((question) => ({
      questionId: question.id,
      selectedOption: question.correctAnswer,
    }));

    const response = await request.post("/api/local-mocks/english-2022-08-06/submit", {
      data: { answers, timeSpentSec: 600 },
    });
    expect(response.ok()).toBeTruthy();

    const result = (await response.json()) as {
      maxScore: number;
      score: number;
      correct: number;
      incorrect: number;
      pending: number;
      review: Array<{ correctOption: string | null; status: string }>;
    };
    expect(result.maxScore).toBe(250);
    expect(result.score).toBe(250);
    expect(result.correct).toBe(50);
    expect(result.incorrect).toBe(0);
    expect(result.pending).toBe(0);
    expect(result.review[0]).toMatchObject({ status: "correct", correctOption: "B" });
  });

  test("allows a blank submission and records every question as unattempted", async ({ request }) => {
    const response = await request.post("/api/local-mocks/english-2022-08-06/submit", {
      data: { answers: [], timeSpentSec: 0 },
    });
    expect(response.ok()).toBeTruthy();

    const result = (await response.json()) as {
      score: number;
      unattempted: number;
      correct: number;
      incorrect: number;
    };
    expect(result.score).toBe(0);
    expect(result.correct).toBe(0);
    expect(result.incorrect).toBe(0);
    expect(result.unattempted).toBe(50);
  });

  test("does not invent a score when the source has no answer key", async ({ request }) => {
    const paper = loadPaper("2022-09-16_English_Shift_1.json");
    const answers = paper.exam.questions
      .filter((question) => question.correctAnswer === null)
      .map((question) => ({ questionId: question.id, selectedOption: "A" }));

    const response = await request.post("/api/local-mocks/english-2022-09-16/submit", {
      data: { answers, timeSpentSec: 60 },
    });
    expect(response.ok()).toBeTruthy();

    const result = (await response.json()) as {
      maxScore: number;
      pending: number;
      review: Array<{ status: string; correctOption: string | null }>;
    };
    expect(result.maxScore).toBe(0);
    expect(result.pending).toBe(10);
    expect(result.review.every((item) => item.status === "pending" && item.correctOption === null)).toBe(true);
  });
});
