import { expect, Page, test } from "@playwright/test";

// Must match tests/e2e/global-setup.ts (E2E_ADMIN).
const ADMIN_EMAIL = "admin@test.local";
const ADMIN_PASSWORD = "TestAdmin123!";

/**
 * Exam-studio E2E security & flow suite.
 *
 * Covers the API surface added with the exam platform work:
 *  - anonymous hardening (key stripping, study gate, admin 401s)
 *  - real RBAC (a freshly registered USER gets 403 "Insufficient role")
 *  - the attempts engine (start → server-side grading → replay 409)
 *  - Import Studio (dry-run guards, staged commit, never-auto-publish, rollback)
 *  - Test Builder (auto-select, publish snapshot, confirm-gated delete)
 *  - leaderboards (snapshot, masked public names, confirm-gated delete)
 *  - the audit trail of privileged mutations
 *
 * Everything is verified through public + admin HTTP APIs (no direct DB access)
 * so the assertions exercise the same path a real client takes. Run-unique
 * tokens keep reruns independent of any leftover rows.
 */
const RUN = `${Date.now()}`;

// Login helpers copied from tests/e2e/admin.spec.ts (kept in sync there).

const CREDENTIALS_CALLBACK = "/api/auth/callback/credentials";

function expectLoginCallback(page: Page) {
  return page.waitForResponse((res) => res.url().includes(CREDENTIALS_CALLBACK), {
    timeout: 10_000,
  });
}

function waitForInteractiveForm(page: Page) {
  return page.waitForFunction(
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

type Row = Record<string, unknown>;

const ADMIN_PATHS = [
  "/api/admin/stats",
  "/api/admin/questions",
  "/api/admin/subjects",
  "/api/admin/imports",
  "/api/admin/tests",
  "/api/admin/leaderboards",
  "/api/admin/audit",
  "/api/admin/students",
  "/api/admin/analytics",
  "/api/admin/database",
];

test.describe("exam studio — anonymous hardening", () => {
  test("public question listing strips answer keys", async ({ request }) => {
    const res = await request.get("/api/questions?limit=5");
    expect(res.ok()).toBeTruthy();
    const rows = (await res.json()) as Row[];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.correctAnswer).toBeUndefined();
      expect(r.sourceCorrectOptionOrder).toBeUndefined();
      expect(r.stemHash).toBeUndefined();
    }
  });

  test("study gate never leaks keys to anonymous callers", async ({ request }) => {
    const res = await request.get("/api/questions?source=pyq&limit=5&study=1");
    expect(res.ok()).toBeTruthy();
    const rows = (await res.json()) as Row[];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.correctAnswer).toBeUndefined();
      expect(r.explanationEn).toBeUndefined();
    }
  });

  test("/admin redirects anonymous users to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /Log in/ })).toBeVisible();
  });

  test("admin APIs all require authentication", async ({ request }) => {
    for (const path of ADMIN_PATHS) {
      const res = await request.get(path);
      expect(res.status(), `${path} must not be public`).toBe(401);
    }
  });
});

test.describe("exam studio — student role (real RBAC)", () => {
  test("registered student is 403-blocked and owns the attempt engine", async ({ page }) => {
    const email = `e2e-student-${RUN}@test.local`;
    const registered = await page.request.post("/api/auth/register", {
      data: {
        name: "E2E Student",
        email,
        password: "StudentE2E123!",
        confirmPassword: "StudentE2E123!",
        terms: true,
      },
    });
    expect(registered.ok()).toBeTruthy();

    // Sign the student in through the real UI so cookies live in the browser
    // context (page.request shares them with API calls below).
    await submitLogin(page, "StudentE2E123!", email);
    await page.waitForURL("**/dashboard**", { timeout: 15000 });

    // USER role must never reach admin APIs for read OR write. The legacy
    // requireAdmin guard says "Admin only"; the fine-grained matrix guard
    // (requirePermission) says "Insufficient role".
    const checks = [
      { method: "GET", path: "/api/admin/questions", error: "Admin only" },
      { method: "GET", path: "/api/admin/leaderboards", error: "Insufficient role" },
      { method: "POST", path: "/api/admin/leaderboards", error: "Insufficient role" },
      { method: "GET", path: "/api/admin/audit", error: "Insufficient role" },
      { method: "POST", path: "/api/admin/tests", error: "Insufficient role" },
    ] as const;
    for (const c of checks) {
      const res = await page.request.fetch(c.path, {
        method: c.method,
        ...(c.method === "POST"
          ? { data: { name: "x", scope: "GLOBAL", periodType: "ALL_TIME" } }
          : {}),
      });
      expect(res.status(), `${c.method} ${c.path} blocked for USER`).toBe(403);
      const body = (await res.json()) as { error?: string };
      expect(body.error).toBe(c.error);
    }

    // --- attempts engine: open, answer from the keyless payload, submit ---
    const start = await page.request.post("/api/attempts/start", {
      data: { slug: "english-mock" },
    });
    expect(start.ok()).toBeTruthy();
    const { attemptId } = (await start.json()) as { attemptId: string };
    expect(attemptId).toBeTruthy();

    const keyless = await page.request.get("/api/questions?slug=english-mock");
    expect(keyless.ok()).toBeTruthy();
    const questions = (await keyless.json()) as Row[];
    expect(questions.length).toBe(50);
    expect(questions[0].correctAnswer).toBeUndefined();

    const firstOption = (questions[0].optionsEn as { id: string }[])[0];
    const submitted = await page.request.post("/api/attempts", {
      data: {
        attemptId,
        slug: "english-mock",
        answers: [{ questionId: questions[0].id, selectedOption: firstOption.id }],
        timeSpentSec: 60,
      },
    });
    expect(submitted.ok()).toBeTruthy();
    const result = (await submitted.json()) as {
      score: number;
      maxScore: number;
      review: { questionId: string; isCorrect: boolean; selectedOption: string | null }[];
    };
    expect(typeof result.score).toBe("number");
    expect(result.maxScore).toBe(250); // 50 × 5
    expect(result.review.length).toBe(50);
    expect(result.review[0].questionId).toBe(questions[0].id);

    // Replay with the same attempt id must be rejected (409), not re-graded.
    const replay = await page.request.post("/api/attempts", {
      data: {
        attemptId,
        slug: "english-mock",
        answers: [{ questionId: questions[0].id, selectedOption: firstOption.id }],
        timeSpentSec: 90,
      },
    });
    expect(replay.status()).toBe(409);

    // History is summary-only: no embedded questions, no leaked keys.
    const hist = await page.request.get("/api/attempts");
    expect(hist.ok()).toBeTruthy();
    const rows = (await hist.json()) as Row[];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect("questions" in r).toBe(false);
      expect("correctAnswer" in r).toBe(false);
    }
  });
});

test.describe("exam studio — admin studio flows", () => {
  test("Import Studio: dry-run guard, staged commit, no auto-publish, rollback", async ({ page }) => {
    await submitLogin(page, ADMIN_PASSWORD);
    await page.waitForURL("**/dashboard**", { timeout: 15000 });

    const subject = ((await (await page.request.get("/api/admin/subjects")).json()) as {
      id: string;
    }[])[0];
    expect(subject.id).toBeTruthy();

    const token = `E2EIMP${RUN}`;
    const rows = [
      { stemEn: `${token} Q1: 2+2 equals?`, options: ["3", "4", "5", "22"], correctAnswer: "B", chapterName: `E2E Import Chapter ${RUN}`, difficulty: "easy" },
      { stemEn: `${token} Q2: unit of force?`, options: ["J", "N", "W", "Pa"], correctAnswer: "B", chapterName: `E2E Import Chapter ${RUN}`, difficulty: "medium" },
      // Exact copy of Q1 → genuine CONTENT_DUPLICATE; must be skipped.
      { stemEn: `${token} Q1: 2+2 equals?`, options: ["3", "4", "5", "22"], correctAnswer: "B", chapterName: `E2E Import Chapter ${RUN}`, difficulty: "easy" },
      { stemEn: `${token} Q4: no answer key row`, options: ["a", "b"], difficulty: "hard" },
      { stemEn: `${token} Q5: wants PUBLISHED status`, options: ["x", "y"], correctAnswer: "A", status: "PUBLISHED" },
    ];

    // --- dry run validates and writes nothing ---
    const dry = await page.request.post("/api/admin/imports", {
      data: { filename: "e2e-dry.json", format: "JSON", mode: "DRY_RUN", payload: JSON.stringify(rows), options: { subjectId: subject.id, defaultYear: 2025 } },
    });
    expect(dry.ok()).toBeTruthy();
    const dryData = (await dry.json()) as { job?: { id: string; status: string }; summary?: { validRows: number; duplicateRows: number } };
    expect(dryData.job?.status).toBe("COMPLETED");
    expect(dryData.summary?.duplicateRows).toBe(1);

    // Committing a dry-run job is a 400, not a silent write.
    if (dryData.job?.id) {
      const block = await page.request.post(`/api/admin/imports/${dryData.job.id}`, {
        data: { action: "commit" },
      });
      expect(block.status()).toBe(400);
    }

    // --- staged commit with resume until done ---
    const created = (await (await page.request.post("/api/admin/imports", {
      data: { filename: "e2e-commit.json", format: "JSON", mode: "COMMIT", payload: JSON.stringify(rows), options: { subjectId: subject.id, defaultYear: 2025, defaultStatus: "DRAFT" } },
    })).json()) as { job?: { id: string } };
    const jobId = created.job?.id ?? "";
    expect(jobId).toBeTruthy();

    let done = false;
    let lastStatus = 0;
    for (let attempt = 0; attempt < 6 && !done; attempt++) {
      const res = await page.request.post(`/api/admin/imports/${jobId}`, {
        data: { action: attempt === 0 ? "commit" : "resume" },
      });
      lastStatus = res.status();
      const body = (await res.json()) as { done?: boolean };
      done = body.done === true;
    }
    expect(done, `commit must reach done (last HTTP ${lastStatus})`).toBe(true);

    // --- public verification: rows exist, keyless, DRAFT, never auto-published ---
    const searchRes = await page.request.get(`/api/questions?search=${token}&limit=100`);
    expect(searchRes.ok()).toBeTruthy();
    const imported = (await searchRes.json()) as Row[];
    expect(imported.length).toBe(4);
    for (const q of imported) {
      expect(q.correctAnswer).toBeUndefined();
      expect(q.explanationEn).toBeUndefined();
      expect(q.status).toBe("DRAFT");
    }
    const q1 = imported.find((q) => String(q.stemEn).includes("Q1"));
    expect(q1?.topic).toBe(`E2E Import Chapter ${RUN}`);

    // --- rollback deletes every zero-attempt imported row ---
    const rolled = (await (await page.request.post(`/api/admin/imports/${jobId}`, {
      data: { action: "rollback" },
    })).json()) as { deleted?: number };
    expect(rolled.deleted).toBe(4);

    const after = (await (await page.request.get(`/api/questions?search=${token}&limit=100`)).json()) as Row[];
    expect(after.length).toBe(0);
  });

  test("Test Builder auto-select publishes a versioned snapshot and deletes only on confirm", async ({ page }) => {
    await submitLogin(page, ADMIN_PASSWORD);
    await page.waitForURL("**/dashboard**", { timeout: 15000 });

    const subject = ((await (await page.request.get("/api/admin/subjects")).json()) as {
      id: string;
    }[])[0];
    const slug = `e2e-builder-${RUN}`;

    const createRes = await page.request.post("/api/admin/tests", {
      data: {
        title: `E2E Builder Test ${RUN}`,
        slug,
        type: "SUBJECT_WISE",
        subjectId: subject.id,
        durationMinutes: 30,
        status: "PUBLISHED",
        config: JSON.stringify({ markingScheme: { correct: 5, incorrect: 1, unattempted: 0 } }),
        autoSelect: { subjectId: subject.id, total: 5, distribution: { easy: 40, medium: 40, hard: 20 }, seed: 42 },
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as { id?: string; snapshotVersion?: number | null; shortfall?: string | null };
    expect(created.id).toBeTruthy();
    expect(created.snapshotVersion ?? 0).toBeGreaterThanOrEqual(1);

    // A published test is visible on the public listing and must not error.
    const publicRes = await page.request.get(`/api/tests?slug=${slug}`);
    expect(publicRes.ok()).toBeTruthy();
    expect(Array.isArray(await publicRes.json())).toBe(true);

    // Destructive delete requires ?confirm=yes.
    const blocked = await page.request.delete(`/api/admin/tests/${created.id}`);
    expect(blocked.status()).toBe(400);

    const deleted = await page.request.delete(`/api/admin/tests/${created.id}?confirm=yes`);
    expect(deleted.ok()).toBeTruthy();

    const goneRes = await page.request.get(`/api/tests?slug=${slug}`);
    expect(goneRes.status()).toBe(404);
  });

  test("Leaderboards: snapshot, masked public names, confirm-gated delete", async ({ page }) => {
    await submitLogin(page, ADMIN_PASSWORD);
    await page.waitForURL("**/dashboard**", { timeout: 15000 });

    const createRes = await page.request.post("/api/admin/leaderboards", {
      data: {
        name: `E2E Studio Board ${RUN}`,
        scope: "GLOBAL",
        periodType: "ALL_TIME",
        rules: JSON.stringify({ bestAttempt: true, excludePractice: true, minAttempts: 1 }),
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const board = (await createRes.json()) as { id?: string };
    expect(board.id).toBeTruthy();

    // Snapshot recalculates entries from real submitted attempts. The student
    // test above submitted an english-mock attempt, so there is at least one.
    const snapRes = await page.request.post(`/api/admin/leaderboards/${board.id}`, {
      data: { action: "snapshot" },
    });
    expect(snapRes.ok()).toBeTruthy();
    const snap = (await snapRes.json()) as { entries?: number };
    expect(snap.entries ?? 0).toBeGreaterThanOrEqual(1);

    // Public detail view: masked display names, sane ranks.
    const publicRes = await page.request.get(`/api/leaderboards?configId=${board.id}`);
    expect(publicRes.ok()).toBeTruthy();
    const detail = (await publicRes.json()) as { entries: { rank: number; name: string }[] };
    expect(detail.entries.length).toBeGreaterThanOrEqual(1);
    detail.entries.forEach((e, i) => {
      expect(e.name).not.toContain("@");
      expect(e.rank).toBe(i + 1);
    });

    const blocked = await page.request.delete(`/api/admin/leaderboards/${board.id}`);
    expect(blocked.status()).toBe(400);

    const deleted = await page.request.delete(`/api/admin/leaderboards/${board.id}?confirm=yes`);
    expect(deleted.ok()).toBeTruthy();
    const after = await page.request.get(`/api/leaderboards?configId=${board.id}`);
    expect(after.status()).toBe(404);
  });

  test("audit trail records privileged mutations", async ({ page }) => {
    await submitLogin(page, ADMIN_PASSWORD);
    await page.waitForURL("**/dashboard**", { timeout: 15000 });

    const res = await page.request.get("/api/admin/audit?perPage=20");
    expect(res.ok()).toBeTruthy();
    const { entries } = (await res.json()) as { entries?: Row[] };
    expect(Array.isArray(entries)).toBe(true);
    expect(entries!.length).toBeGreaterThan(0);
    for (const e of entries!) {
      expect(typeof e.action).toBe("string");
    }
    // The flows above just wrote: some recent event must mention them.
    const blob = entries!.map((e) => JSON.stringify(e)).join("\n");
    expect(blob).toMatch(/leaderboard|test|import/i);
  });
});
