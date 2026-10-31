import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/prisma";

/**
 * Blueprint 10.3 — media placements.
 *
 * Uploads real PNG bytes through the admin API, attaches them to an option,
 * a shared passage and an explanation, then walks the student surfaces:
 * take paper, practice, result and full solutions. The question is published
 * with a far-future year so it is the first row in the practice feed.
 */

const ADMIN_EMAIL = "admin@test.local";
const ADMIN_PASSWORD = "TestAdmin123!";
const CREDENTIALS_CALLBACK = "/api/auth/callback/credentials";

// 1x1 transparent PNG — enough for the header-based upload validator.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForFunction(
    () => {
      const button = document.querySelector<HTMLButtonElement>("main form button[type='submit']");
      if (!button) return false;
      return Object.keys(button).some((key) => key.startsWith("__reactProps"));
    },
    undefined,
    { timeout: 20_000 },
  );

  const form = page.locator("main form");
  await form.getByLabel("Email address").fill(email);
  await form.getByLabel("Password").fill(password);
  const firstAttempt = page
    .waitForResponse((res) => res.url().includes(CREDENTIALS_CALLBACK), { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  await form.getByRole("button", { name: /Log in/ }).click();
  if (!(await firstAttempt)) {
    // Retry once in case the first click raced hydration.
    await Promise.all([
      page.waitForResponse((res) => res.url().includes(CREDENTIALS_CALLBACK), { timeout: 10_000 }),
      form.getByRole("button", { name: /Log in/ }).click(),
    ]);
  }
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
}

test.describe("blueprint 10.3 — media placements", () => {
  test("option, passage and explanation media render end to end", async ({ page }) => {
    test.setTimeout(240_000);

    const run = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const slug = `e2e-media-${run}`;
    const mediaIds: string[] = [];
    let questionId = "";
    let passageId = "";
    let testId = "";

    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    try {
      const subjectsRes = await page.request.get("/api/subjects");
      expect(subjectsRes.ok()).toBeTruthy();
      const subjects = (await subjectsRes.json()) as Array<{ id: string; code: string }>;
      const english = subjects.find((subject) => subject.code === "ENG");
      expect(english).toBeTruthy();

      const exam = await prisma.exam.findFirst({ where: { code: "CUET-UG" } });
      expect(exam).toBeTruthy();

      const upload = async (alt: string) => {
        const res = await page.request.post("/api/admin/media", {
          multipart: {
            file: { name: `e2e-${run}.png`, mimeType: "image/png", buffer: PNG },
            alt,
          },
        });
        expect(res.status(), await res.text()).toBe(201);
        const asset = (await res.json()) as { id: string; url: string };
        mediaIds.push(asset.id);
        return asset;
      };

      const optionMedia = await upload("Option diagram alt");
      const passageMedia = await upload("Passage diagram alt");
      const explanationMedia = await upload("Explanation diagram alt");

      const passage = await prisma.passage.create({
        data: {
          examId: exam!.id,
          passageKey: `e2e-media-${run}`,
          title: "E2E Media Passage",
          content: "Read this shared passage before answering the linked question.",
        },
      });
      passageId = passage.id;

      const passagePatch = await page.request.patch(`/api/admin/passages/${passage.id}`, {
        data: {
          imageUrl: passageMedia.url,
          imageAlt: "Passage diagram alt",
          sourceNote: "Source: E2E media fixture",
          reason: "media placement E2E",
        },
      });
      expect(passagePatch.ok(), await passagePatch.text()).toBeTruthy();

      const created = await page.request.post("/api/admin/questions", {
        data: {
          subjectId: english!.id,
          passageId: passage.id,
          stemEn: "E2E media option question — safe to delete",
          type: "MCQ",
          correctAnswer: "A",
          optionsEn: [
            {
              id: `opt-e2e-media-${run}-1`,
              text: "Diagram option",
              imageUrl: optionMedia.url,
              imageAlt: "Option diagram alt",
            },
            { id: `opt-e2e-media-${run}-2`, text: "Plain option B" },
            { id: `opt-e2e-media-${run}-3`, text: "Plain option C" },
            { id: `opt-e2e-media-${run}-4`, text: "Plain option D" },
          ],
          explanationEn: "The diagram marks the correct choice.",
          explanationImageUrl: explanationMedia.url,
          explanationImageAlt: "Explanation diagram alt",
          difficulty: "easy",
          marks: 5,
          negativeMarks: 1,
          status: "PUBLISHED",
          isActive: true,
          year: 2099,
        },
      });
      expect(created.status(), await created.text()).toBe(201);
      questionId = ((await created.json()) as { id: string }).id;

      const paper = await prisma.test.create({
        data: {
          title: "E2E Media Paper",
          slug,
          type: "SUBJECT_WISE",
          status: "PUBLISHED",
          subjectId: english!.id,
          examId: exam!.id,
          config: JSON.stringify({
            totalQuestions: 1,
            durationMinutes: 60,
            markingScheme: { correct: 5, incorrect: 1, unattempted: 0 },
          }),
          totalQuestions: 1,
          durationMinutes: 60,
        },
      });
      testId = paper.id;
      await prisma.testQuestionLink.create({
        data: { testId: paper.id, questionId, order: 1 },
      });

      // ---- take paper: passage + option media, no explanation leak ----
      await page.goto(`/mock-tests/${slug}/take`);
      await expect(page.getByText("E2E media option question").first()).toBeVisible();
      await page.getByText(/Reading passage/i).first().click();
      await expect(page.locator('img[alt="Passage diagram alt"]').first()).toBeVisible();
      await expect(page.locator('img[alt="Option diagram alt"]').first()).toBeVisible();
      await expect(page.locator('img[alt="Explanation diagram alt"]')).toHaveCount(0);

      // ---- practice feed: newest paper first ----
      await page.goto("/practice");
      await expect(page.getByText("E2E media option question").first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.locator('img[alt="Passage diagram alt"]').first()).toBeVisible();
      await expect(page.locator('img[alt="Option diagram alt"]').first()).toBeVisible();

      // ---- submit and review ----
      const start = await page.request.post("/api/attempts/start", {
        data: { slug },
      });
      expect(start.ok(), await start.text()).toBeTruthy();
      const { attemptId } = (await start.json()) as { attemptId: string };

      const submitted = await page.request.post("/api/attempts", {
        data: {
          attemptId,
          slug,
          answers: [{ questionId, selectedOption: "A" }],
          timeSpentSec: 45,
        },
      });
      expect(submitted.ok(), await submitted.text()).toBeTruthy();

      await page.goto(`/mock-tests/${slug}/result/${attemptId}`);
      await expect(page.getByRole("heading", { name: "Test Results" })).toBeVisible();
      await page.locator("details summary").first().click();
      await expect(page.locator('img[alt="Passage diagram alt"]').first()).toBeVisible();
      await expect(page.locator('img[alt="Option diagram alt"]').first()).toBeVisible();
      await expect(page.locator('img[alt="Explanation diagram alt"]').first()).toBeVisible();

      await page.goto(`/mock-tests/${slug}/result/${attemptId}/solutions`);
      await expect(page.getByRole("heading", { name: "Full Solutions" })).toBeVisible();
      await expect(page.locator('img[alt="Passage diagram alt"]').first()).toBeVisible();
      await expect(page.locator('img[alt="Option diagram alt"]').first()).toBeVisible();
      await expect(page.locator('img[alt="Explanation diagram alt"]').first()).toBeVisible();
    } finally {
      if (testId) {
        await prisma.attempt.deleteMany({ where: { testId } });
        await prisma.test.delete({ where: { id: testId } }).catch(() => undefined);
      }
      if (questionId) {
        await prisma.question.delete({ where: { id: questionId } }).catch(() => undefined);
      }
      if (passageId) {
        await prisma.passage.delete({ where: { id: passageId } }).catch(() => undefined);
      }
      if (mediaIds.length) {
        await prisma.mediaAsset
          .deleteMany({ where: { id: { in: mediaIds } } })
          .catch(() => undefined);
      }
      await prisma.$disconnect();
    }
  });
});
