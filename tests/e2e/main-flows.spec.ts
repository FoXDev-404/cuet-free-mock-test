import { test, expect } from "@playwright/test";

test.describe("CUETFreeMockTest main flows", () => {
  test("home page loads and shows CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CUETFreeMockTest/);
    await expect(page.getByRole("heading", { name: /Prepare smarter/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start a Mock Test/ })).toBeVisible();
  });

  test("mock tests list page shows subjects", async ({ page }) => {
    await page.goto("/mock-tests");
    await expect(page.getByRole("heading", { name: /Mock Tests/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /CS 0 questions Computer/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /PHY 0 questions Physics/ })).toBeVisible();
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
    await expect(page.getByText(/Score out of/)).toBeVisible({ timeout: 15000 });
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
});
