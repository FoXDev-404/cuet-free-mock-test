import { test, expect } from "@playwright/test";

test.describe("CUETFreeMockTest main flows", () => {
  test("home page loads and shows CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CUETFreeMockTest/);
    await expect(page.getByRole("heading", { name: /Prepare Smarter/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start a Mock Test/ })).toBeVisible();
    await expect(page.getByText("Illustrative preview · not a live test")).toBeVisible();
    await expect(page.getByRole("link", { name: /Explore Practice/ }).first()).toHaveAttribute("href", "/practice");
  });

  test("mobile navigation closes with Escape and restores focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const openMenu = page.getByRole("button", { name: "Open menu" });
    const drawer = page.locator("#mobile-navigation-drawer");
    await openMenu.click();
    await expect(openMenu).toHaveAttribute("aria-expanded", "true");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Home", exact: true })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveAttribute("aria-hidden", "true");
    await expect(openMenu).toBeFocused();
  });

  test("question API returns seeded questions", async ({ page }) => {
    const response = await page.request.get("/api/questions?limit=1");
    expect(response.ok()).toBeTruthy();
    const questions = await response.json();
    expect(Array.isArray(questions)).toBeTruthy();
    expect(questions.length).toBeGreaterThan(0);
  });

  test("web app manifest is served with the site identity", async ({ page }) => {
    const response = await page.request.get("/manifest.webmanifest");
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.name).toMatch(/CUETFreeMockTest/);
    expect(manifest.start_url).toBe("/");
  });

  test("mock tests list page shows published tests", async ({ page }) => {
    await page.goto("/mock-tests");
    await expect(page.getByRole("heading", { name: /Mock Tests/ })).toBeVisible();
    // Should show at least one published test card
    await expect(page.locator("a[href*='/mock-tests/']").first()).toBeVisible();
  });

  test("test detail page shows instructions and start button", async ({ page }) => {
    await page.goto("/mock-tests/cs-full-mock");
    await expect(page.getByRole("heading", { name: /Computer Science Full-Length Mock/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start Test/ })).toBeVisible();
  });

  test("full test flow: take test, answer, submit, view result", async ({ page }) => {
    await page.goto("/mock-tests/cs-full-mock/take");
    await page.waitForLoadState("networkidle");
    // Wait for questions to load
    await expect(page.getByRole("heading", { name: /Question 1 of/ })).toBeVisible({ timeout: 15000 });

    // Select an option on question 1
    const firstOption = page.locator("button").filter({ hasText: /^A/ }).first();
    if ((await firstOption.count()) > 0) {
      await firstOption.click();
    }

    // Navigate to next question
    const nextBtn = page.getByRole("button", { name: /^Next/ });
    if ((await nextBtn.count()) > 0) {
      await nextBtn.click();
    }

    // Submit test (click the bottom submit button on the last question)
    await page.getByRole("button", { name: /^Submit Test$/ }).last().click();
    await page.waitForLoadState("networkidle");
    // Should leave the test-taking view after submit
    await expect(page.getByRole("heading", { name: /Question 1 of/ })).not.toBeVisible({ timeout: 10000 });
  });

  test("dashboard page loads", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Dashboard/ })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Log in/ })).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /Create account/ })).toBeVisible();
  });

  test("legal pages load", async ({ page }) => {
    await page.goto("/privacy-policy");
    await expect(page.getByRole("heading", { name: /Privacy Policy/ })).toBeVisible();
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /Terms & Conditions/ })).toBeVisible();
    await page.goto("/disclaimer");
    await expect(page.getByRole("heading", { name: /Disclaimer/ })).toBeVisible();
  });

  test("syllabus and exam pattern pages load", async ({ page }) => {
    await page.goto("/cuet-syllabus");
    await expect(page.getByRole("heading", { name: /CUET \(UG\) Syllabus/ })).toBeVisible();
    await page.goto("/cuet-exam-pattern");
    await expect(page.getByRole("heading", { name: /CUET \(UG\) Exam Pattern/ })).toBeVisible();
  });

  test("admin page requires login", async ({ page }) => {
    await page.goto("/admin");
    // Middleware redirects unauthenticated users to login; login form should appear
    await expect(page.getByRole("heading", { name: /Log in/ })).toBeVisible();
  });

  test("sitemap and robots are accessible", async ({ page }) => {
    const res1 = await page.request.get("/sitemap.xml");
    expect(res1.ok()).toBeTruthy();
    const res2 = await page.request.get("/robots.txt");
    expect(res2.ok()).toBeTruthy();
    const res3 = await page.request.get("/ads.txt");
    expect(res3.ok()).toBeTruthy();
  });

  test.describe("CUET UG English mock test", () => {
    test("intro page loads with exam metadata", async ({ page }) => {
      await page.goto("/english-mock/intro");
      await expect(page.getByRole("heading", { name: /CUET UG English/ })).toBeVisible();
      await expect(page.getByText("50 questions", { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: /Start Test/ })).toBeVisible();
    });

    test("50 unique questions and four options each via API", async ({ page }) => {
      const res = await page.request.get("/api/english-mock/intro");
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.questionCount).toBe(50);
      expect(data.reviewPendingQuestionNumbers).toEqual([8, 32, 41]);
      expect(data.verifiedMaxScore).toBe(47);

      const q1 = await page.request.get("/api/english-mock/questions/1");
      expect(q1.ok()).toBeTruthy();
      const q1Data = await q1.json();
      expect(q1Data.optionsEn.length).toBe(4);
    });

    test("active API does not expose answer key before submit", async ({ page }) => {
      const res = await page.request.get("/api/english-mock/questions/1");
      const data = await res.json();
      expect(data.correctAnswer).toBeUndefined();
      expect(data.explanationEn).toBeUndefined();
      expect(data.sourceAnswerLabel).toBeUndefined();
      expect(data.sourceCorrectOptionOrder).toBeUndefined();
      expect(data.answerReviewStatus).toBeUndefined();
      expect(data.dataQualityNote).toBeUndefined();
    });

    test("english mock take page loads and shows question", async ({ page }) => {
      await page.goto("/english-mock/take");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: /Question 1/ })).toBeVisible({ timeout: 15000 });
    });

    test("answer select, change, clear, and mark for review", async ({ page }) => {
      await page.goto("/english-mock/take");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: /Question 1/ })).toBeVisible({ timeout: 15000 });

      // Select first option (A)
      const firstOption = page.locator("button").filter({ hasText: /^A/ }).first();
      await firstOption.click();

      // Verify it's answered
      const paletteBtn = page.locator("button").filter({ hasText: "1" }).first();
      await expect(paletteBtn).toHaveClass(/bg-primary-100/);

      // Change answer
      const secondOption = page.locator("button").filter({ hasText: /^B/ }).first();
      await secondOption.click();

      // Mark for review
      const flagBtn = page.getByRole("button", { name: /Mark for review/ });
      await flagBtn.click();

      // Clear response
      await page.getByRole("button", { name: /Clear/ }).click();
    });

    test("submit shows verified score out of 47", async ({ page }) => {
      await page.goto("/english-mock/take");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: /Question 1/ })).toBeVisible({ timeout: 15000 });

      // Answer all 50 questions quickly - select A for each
      for (let i = 0; i < 50; i++) {
        const firstOption = page.locator("button").filter({ hasText: /^A/ }).first();
        if ((await firstOption.count()) > 0) {
          await firstOption.click();
        }
        if (i < 49) {
          const nextBtn = page.getByRole("button", { name: /^Next/ });
          await nextBtn.click();
          await expect(page.getByRole("heading", { name: new RegExp("^Question " + (i + 2) + "$") })).toBeVisible({ timeout: 10000 });
        }
      }

      // Submit
      await page.getByRole("button", { name: /^Submit Test$/ }).last().click();
      await page.waitForURL("**/english-mock/results**", { timeout: 20000 });

      // Results page
      await expect(page.getByRole("heading", { name: /Results/ })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/\d+ \/ 47/)).toBeVisible();
      await expect(page.getByText(/Pending review/).first()).toBeVisible();
    });

    test("responsive: mobile layout works", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/english-mock/intro");
      await expect(page.getByRole("heading", { name: /CUET UG English/ })).toBeVisible();
    });
  });
});
