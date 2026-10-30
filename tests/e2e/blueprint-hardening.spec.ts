import { expect, test, type Page } from "@playwright/test";

/**
 * Blueprint hardening: attempt privacy, private-route indexing and canonical
 * URLs. These checks run through the same HTTP surface a browser or crawler
 * uses, so they cover headers and rendered HTML rather than implementation
 * details.
 */

const BASE = "http://localhost:3000";
const PASSWORD = "StudentE2E123!";
const CREDENTIALS_CALLBACK = "/api/auth/callback/credentials";

async function login(page: Page, email: string) {
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
  await form.getByLabel("Password").fill(PASSWORD);
  await Promise.all([
    page.waitForResponse((res) => res.url().includes(CREDENTIALS_CALLBACK), { timeout: 10_000 }),
    form.getByRole("button", { name: /Log in/ }).click(),
  ]);
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
}

async function register(page: Page, email: string, name: string) {
  const response = await page.request.post("/api/auth/register", {
    data: { name, email, password: PASSWORD, confirmPassword: PASSWORD, terms: true },
  });
  expect(response.ok(), `register ${email}`).toBeTruthy();
}

test.describe("blueprint hardening — attempt privacy", () => {
  test("attempt detail requires a session and is keyless for its owner", async ({ page }) => {
    const run = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `e2e-hardening-${run}@test.local`;

    await register(page, email, "E2E Hardening");
    await login(page, email);

    const start = await page.request.post("/api/attempts/start", {
      data: { slug: "english-mock" },
    });
    expect(start.ok()).toBeTruthy();
    const { attemptId } = (await start.json()) as { attemptId: string };
    expect(attemptId).toBeTruthy();

    // The owner can read a summary, but question objects and answer keys must
    // never be embedded while the paper is still open.
    const detail = await page.request.get(`/api/attempts/${attemptId}`);
    expect(detail.ok()).toBeTruthy();
    const raw = await detail.text();
    expect(raw).not.toContain("correctAnswer");
    expect(raw).not.toContain("explanationEn");
    expect(raw).not.toContain('"question"');
    const body = JSON.parse(raw) as { userId?: string; answers?: Array<Record<string, unknown>> };
    expect(body.userId).toBeUndefined();
    expect(Array.isArray(body.answers)).toBeTruthy();
    for (const answer of body.answers ?? []) {
      expect(answer.selectedOption).toBeDefined();
      expect(answer.question).toBeUndefined();
    }

    const submitted = await page.request.post("/api/attempts", {
      data: { attemptId, slug: "english-mock", answers: [], timeSpentSec: 5 },
    });
    expect(submitted.ok()).toBeTruthy();
    const result = (await submitted.json()) as { status?: string; autoSubmitted?: boolean };
    expect(["SUBMITTED", "AUTO_SUBMITTED"]).toContain(result.status);
    expect(result.autoSubmitted).toBe(false);
  });

  test("anonymous clients cannot read attempt details", async ({ request }) => {
    const start = await request.post("/api/attempts/start", {
      data: { slug: "english-mock" },
    });
    expect(start.ok()).toBeTruthy();
    const { attemptId } = (await start.json()) as { attemptId: string };

    const guessed = await request.get(`/api/attempts/${attemptId}`);
    expect(guessed.status()).toBe(401);
    const body = (await guessed.json()) as { error?: string };
    expect(body.error).toMatch(/sign in/i);

    // Leave no open paper behind: a guest may submit its own unguessable id.
    const cleanup = await request.post("/api/attempts", {
      data: { attemptId, slug: "english-mock", answers: [], timeSpentSec: 5 },
    });
    expect(cleanup.ok()).toBeTruthy();
  });

  test("another signed-in learner cannot read or submit someone else's attempt", async ({ page }) => {
    const run = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const emailA = `e2e-owner-${run}@test.local`;
    const emailB = `e2e-other-${run}@test.local`;

    await register(page, emailA, "E2E Owner");
    await login(page, emailA);
    const start = await page.request.post("/api/attempts/start", {
      data: { slug: "english-mock" },
    });
    expect(start.ok()).toBeTruthy();
    const { attemptId } = (await start.json()) as { attemptId: string };

    // Switch accounts in the same browser context.
    await page.context().clearCookies();
    await register(page, emailB, "E2E Other");
    await login(page, emailB);

    const forbiddenRead = await page.request.get(`/api/attempts/${attemptId}`);
    expect(forbiddenRead.status()).toBe(404);

    const forbiddenSubmit = await page.request.post("/api/attempts", {
      data: { attemptId, slug: "english-mock", answers: [], timeSpentSec: 5 },
    });
    expect(forbiddenSubmit.status()).toBe(404);

    // The real owner can still finish the paper.
    await page.context().clearCookies();
    await login(page, emailA);
    const submitted = await page.request.post("/api/attempts", {
      data: { attemptId, slug: "english-mock", answers: [], timeSpentSec: 5 },
    });
    expect(submitted.ok()).toBeTruthy();
  });
});

test.describe("blueprint hardening — indexing and canonicals", () => {
  test("private routes send X-Robots-Tag noindex", async ({ request, page }) => {
    for (const path of [
      "/dashboard",
      "/settings",
      "/bookmarks",
      "/incorrect",
      "/mock-history",
      "/analytics",
      "/login",
      "/register",
      "/mock-tests/english-2022-08-06/take",
    ]) {
      const response = await request.get(path);
      expect(response.ok(), `${path} should render`).toBeTruthy();
      expect(response.headers()["x-robots-tag"], `${path} header`).toContain("noindex");
    }

    const dashboard = await page.goto("/dashboard");
    expect(dashboard?.ok()).toBeTruthy();
    const html = await page.content();
    expect(html).toMatch(/<meta name="robots" content="[^"]*noindex/i);
  });

  test("public pages declare absolute canonical and social URLs", async ({ request }) => {
    const cases = [
      { path: "/", canonical: `${BASE}` },
      { path: "/mock-tests", canonical: `${BASE}/mock-tests` },
      { path: "/mock-tests/english-2022-08-06", canonical: `${BASE}/mock-tests/english-2022-08-06` },
      { path: "/practice", canonical: `${BASE}/practice` },
    ];

    for (const item of cases) {
      const response = await request.get(item.path);
      expect(response.ok(), `${item.path} should render`).toBeTruthy();
      const html = await response.text();
      expect(html, `${item.path} canonical`).toContain(`<link rel="canonical" href="${item.canonical}"`);
      expect(html, `${item.path} og:url`).toContain(`<meta property="og:url" content="${item.canonical}"`);
      expect(html, `${item.path} og:image`).toMatch(/property="og:image" content="http:\/\/localhost:3000\/opengraph-image/);
    }
  });

  test("sitemap lists public content and omits private routes", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBeTruthy();
    const xml = await response.text();

    expect(xml).toContain(`${BASE}/mock-tests`);
    expect(xml).toContain(`${BASE}/mock-tests/english-2022-08-06`);
    expect(xml).toContain(`${BASE}/english-mock/intro`);
    expect(xml).toContain(`${BASE}/privacy-policy`);

    for (const privatePath of [
      "/admin",
      "/api/",
      "/dashboard",
      "/settings",
      "/bookmarks",
      "/mock-history",
      "/analytics",
      "/login",
      "/register",
      "/take",
      "/results",
    ]) {
      expect(xml, `sitemap must exclude ${privatePath}`).not.toContain(`${BASE}${privatePath}`);
    }
  });

  test("robots.txt disallows private surfaces and advertises the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.ok()).toBeTruthy();
    const text = await response.text();

    expect(text).toContain("Sitemap: http://localhost:3000/sitemap.xml");
    expect(text).toContain("Disallow: /admin/");
    expect(text).toContain("Disallow: /api/");
    expect(text).toContain("Disallow: /dashboard/");
    expect(text).toContain("Disallow: /login/");
    expect(text).toContain("Disallow: /mock-tests/*/take");
    expect(text).toContain("User-Agent: Mediapartners-Google");
  });
});
