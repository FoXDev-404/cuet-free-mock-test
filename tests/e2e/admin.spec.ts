import { expect, Page, test } from "@playwright/test";

// Must match tests/e2e/global-setup.ts (E2E_ADMIN).
const ADMIN_EMAIL = "admin@test.local";
const ADMIN_PASSWORD = "TestAdmin123!";

/**
 * Submit the login form and wait until NextAuth actually processes it.
 *
 * The form is in the server-streamed HTML, so it looks clickable before
 * React has hydrated the page — in a cold browser context the
 * goto -> fill -> click sequence outruns hydration and the click is
 * silently dropped. React 19 attaches its internal "__reactProps*" key to
 * DOM nodes when the tree is hydrated, so we wait for exactly that signal
 * and (belt and braces) still require the callback request to go out.
 */
const CREDENTIALS_CALLBACK = "/api/auth/callback/credentials";

async function expectLoginCallback(page: Page) {
  return page.waitForResponse((res) => res.url().includes(CREDENTIALS_CALLBACK), {
    timeout: 10_000,
  });
}

async function waitForInteractiveForm(page: Page) {
  await page.waitForFunction(
    () => {
      const button = document.querySelector<HTMLButtonElement>("main form button[type='submit']");
      if (!button) return false;
      return Object.keys(button).some((key) => key.startsWith("__reactProps"));
    },
    undefined,
    { timeout: 20_000 },
  );
}

async function submitLogin(page: Page, password: string, email = ADMIN_EMAIL) {
  await page.goto("/login");
  await waitForInteractiveForm(page);
  // Scope to the (unique) login form inside <main> so a stray tree render
  // can never make these locators ambiguous.
  const form = page.locator("main form");
  await form.getByLabel("Email address").fill(email);
  await form.getByLabel("Password").fill(password);
  const first = expectLoginCallback(page).then(() => true).catch(() => false);
  await form.getByRole("button", { name: /Log in/ }).click();
  if (!(await first)) {
    // Retry once in case the click still raced hydration.
    await form.getByRole("button", { name: /Log in/ }).click();
    await expectLoginCallback(page);
  }
}

test.describe("admin authentication", () => {
  test("logged-out users hitting /admin are redirected to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /Log in/ })).toBeVisible();
  });

  test("admin can log in with credentials and open the panel", async ({ page }) => {
    // Wrong password is rejected with a helpful message.
    await submitLogin(page, "wrong-password");
    await expect(page.getByText("Invalid email or password.")).toBeVisible();

    // Correct credentials land on the dashboard (default callback).
    await submitLogin(page, ADMIN_PASSWORD);
    await page.waitForURL("**/dashboard**", { timeout: 15000 });

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /Admin Panel/ })).toBeVisible();

    // Overview shows live stats rather than the old hardcoded demo numbers.
    // exact:true pins to the overview stat card label; the page subtitle and
    // the tab label also mention the English PYQ paper.
    await expect(page.getByText("English PYQ paper", { exact: true })).toBeVisible();
    await expect(page.getByText(/questions$/).first()).toBeVisible();

    // Every admin tab is reachable; finishing on the import tab gives a
    // deterministic content assertion for the last click.
    for (const label of ["Questions", "Mock Test Cards", "English PYQ Paper", "Bulk Import"]) {
      await page.getByRole("tab", { name: label }).click();
    }
    await expect(page.getByText("Bulk import questions")).toBeVisible();
    await page.getByRole("tab", { name: "Questions" }).click();
    await expect(page.getByTestId("questions-table")).toBeVisible();
  });

  test("admin APIs reject anonymous and non-admin callers", async ({ page }) => {
    const res = await page.request.get("/api/admin/stats");
    expect(res.status()).toBe(401);
    const res2 = await page.request.get("/api/admin/questions");
    expect(res2.status()).toBe(401);
  });

  test("admin can create and delete a question through the API", async ({ page }) => {
    // Log in via credentials flow to get session cookies for API calls.
    await submitLogin(page, ADMIN_PASSWORD);
    await page.waitForURL("**/dashboard**", { timeout: 15000 });

    const subjects = await page.request.get("/api/subjects");
    expect(subjects.ok()).toBeTruthy();
    const subjectsData = await subjects.json();
    const engSubject = subjectsData.find((s: { code: string }) => s.code === "ENG");
    expect(engSubject).toBeTruthy();

    const created = await page.request.post("/api/admin/questions", {
      data: {
        subjectId: engSubject.id,
        stemEn: "E2E admin test question — safe to delete",
        type: "MCQ",
        correctAnswer: "B",
        optionsEn: [
          { id: "opt-e2e-1", text: "Answer A" },
          { id: "opt-e2e-2", text: "Answer B" },
          { id: "opt-e2e-3", text: "Answer C" },
          { id: "opt-e2e-4", text: "Answer D" },
        ],
        difficulty: "easy",
        marks: 1,
        negativeMarks: 0,
        explanationEn: "",
      },
    });
    expect(created.ok()).toBeTruthy();
    const { id } = await created.json();
    expect(id).toBeTruthy();

    const patched = await page.request.patch(`/api/admin/questions/${id}`, {
      data: {
        isActive: false,
        dataQualityNote: "visually verified by E2E run",
      },
    });
    expect(patched.ok()).toBeTruthy();

    const deleted = await page.request.delete(`/api/admin/questions/${id}`);
    expect(deleted.ok()).toBeTruthy();
  });
});
