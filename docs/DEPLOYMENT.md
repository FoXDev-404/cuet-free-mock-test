# Publishing to GitHub & deploying to Cloudflare

## 1. Local git setup (already committed)

The repository has been initialized locally (branch `main`) with the latest
redesign committed.

Create an empty repository on GitHub named `cuet-free-mock-test` and then run:

```powershell
cd "path/to/cuet-platform"
git remote add origin https://github.com/FoXDev-404/cuet-free-mock-test.git
git branch -M main
git push -u origin main
```

(Requires a GitHub PAT with `repo` scope configured in Git Credential Manager
or via `git remote set-url origin https://<token>@github.com/FoXDev-404/cuet-free-mock-test.git`.)

## 2. Cloudflare D1 database

```powershell
# once logged in (wrangler login)
npm run cf:d1:create
# copy the database_id into wrangler.toml -> d1_databases[0].database_id
npx wrangler d1 migrations apply cuet-mock-db --remote
```

Generate an initial migration from the Prisma schema:

```powershell
npx prisma migrate dev --name init
wrangler d1 migrations apply cuet-mock-db --remote
```

Seed the D1 database:

```powershell
npx wrangler d1 execute cuet-mock-db --remote --file=./prisma/seed.sql
```

(You can generate seed.sql from the seed script, or run the seed through a Node binding.)

## 3. Cloudflare deploy

Install the adapter (already present as devDep) and deploy:

```powershell
npm run cf:deploy   # opennextjs-cloudflare build + deploy
```

Set secrets:

```powershell
npx wrangler secret put NEXTAUTH_SECRET
npx wrangler secret put DATABASE_URL   # optional placeholder when using D1
```

## 4. Auth architecture (Next.js 16)

- **`middleware.ts` is gone.** Next 16 renamed the convention to
  **`src/proxy.ts`** (function must be exported as `proxy`; Node runtime — the
  `edge` runtime is not supported by proxy). The old root-level
  `middleware.ts` never executed in this app (it was silently ignored), which
  is why `/admin` was initially open. The proxy matches `["/admin", "/admin/:path*"]`
  only: it redirects anonymous visitors to `/login?callbackUrl=…` and
  non-admin sessions to `/dashboard`. All other pages render publicly; every
  `/api/admin/*` route is guarded inside the handler via `requireAdmin()`
  (`src/lib/auth/guard.ts`).
- **Login form must not depend on client-side `useSearchParams`.** The login
  page resolves `callbackUrl` in an **async server component** (`src/app/login/page.tsx`,
  Next 16 pages receive `searchParams: Promise<…>`, sanitize it, then render
  `src/app/login/login-form.tsx` with the value as a prop). Putting the form
  behind `<Suspense>` + `useSearchParams` caused React 19 to mount the form
  more than once during resume: pre-hydration fills were wiped, clicks were
  silently dropped, and Playwright saw two `Email address` inputs at once.
- **E2E stability:** `tests/e2e/admin.spec.ts` waits for the form's React 19
  hydration marker (`__reactProps*` key on the submit button) before filling,
  and waits for the `/api/auth/callback/credentials` response, so tests don't
  race hydration in cold browser contexts.
- **Cookie names differ by scheme:** local http uses `next-auth.*`; production
  https uses `__Host-next-auth.csrf-token` and `__Secure-next-auth.session-token`.
- **PowerShell note:** to extract the CSRF token from the curl jar, split the
  percent-encoded value on the literal `%7C` only: `($val -split "%7C")[0]`.
  Never use `.Split("%7C")` — that splits on *any* of the characters `%`, `7`, `C`
  and silently truncates hex tokens.

## 5. Creating the production admin

Local admin (SQLite, uses `.env` `ADMIN_EMAIL`/`ADMIN_PASSWORD` or args):

```powershell
npx tsx scripts/create-admin.ts admin@example.com SomePassword1!
```

Production (remote D1) — the script can print a PBKDF2 hash without touching
any database, then you insert it with wrangler:

```powershell
npx tsx scripts/create-admin.ts --hash-only "YourPassword1!"
# -> pbkdf2$2048$<salt-b64url>$<hash-b64url>

# id can be any unique string; store it so future rotations can target the row
INSERT INTO "User" ("id","name","email","emailVerified","image","passwordHash","role","createdAt","updatedAt")
VALUES ('admin-prod-0001-20261030','Admin','admin@example.com',NULL,NULL,'pbkdf2$2048$…','ADMIN','2026-10-30T07:10:00.000Z','2026-10-30T07:10:00.000Z');
npx wrangler d1 execute cuet-mock-db --remote --file admin-insert.sql

# verify
npx wrangler d1 execute cuet-mock-db --remote --command 'SELECT id, email, role FROM "User"'
```

Password hashes use the WebCrypto PBKDF2-SHA256 scheme
(`src/lib/auth/password.ts`, format `pbkdf2$<iterations>$<salt>$<hash>`).
bcrypt was removed from the runtime entirely: a pure-JS bcrypt comparison
costs ~300ms of CPU, which the free Workers plan (~10ms/request) kills with a
trust `1102`. The worker factor is stored per hash, so bump
`AUTH_PBKDF2_ITERATIONS` (e.g. to ≥310000) when moving to a paid plan and
re-run the hash step for every user.

Verify the live login round-trip (200 + session cookie = success; a 401 with
`…/api/auth/error?error=CredentialsSignin` means bad credentials):

```powershell
$base = "https://cuet-free-mock-test.cuet-platform.workers.dev"
curl.exe -s -c jar.txt "$base/api/auth/csrf"
$line = (Get-Content jar.txt | Select-String "__Host-next-auth.csrf-token").ToString()
$val = ($line.Split("`t") | Select-Object -Last 1).Trim()
$token = ($val -split "%7C")[0]
curl.exe -s -b jar.txt -c jar.txt -X POST "$base/api/auth/callback/credentials" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  --data-urlencode "csrfToken=$token" --data-urlencode "email=…" `
  --data-urlencode "password=…" --data-urlencode "redirect=false" --data-urlencode "json=true"
```

## 6. Workers plan CPU budget — the free-plan reality

On the **Workers Free plan the runtime caps every request at ~10ms of CPU**
(tail shows `outcome: "exceededCpu", cpuTime: 10`). The whole OpenNext stack
(UIServer rendering, Prisma WASM, next-auth) cannot reliably run inside that
budget; requests either die with `1102`/503 the moment they truly need CPU, or
intermittently keep working on already-initialized isolates. Symptom triage via
`npx wrangler tail <script> --format json` (`outcome`, `cpuTime`, endpoint).

Re-engineered for the free cap so far:

- **Password hashing:** bcrypt → WebCrypto PBKDF2-SHA256
  (`src/lib/auth/password.ts`). A correct/incorrect verify now costs ~1-2ms
  instead of ~300ms. Legacy bcrypt rows are rejected — re-hash user rows with
  `scripts/create-admin.ts --hash-only` + `wrangler d1 execute --remote`.
- **Sign-in data path:** `authorize` reads the D1 binding directly
  (`getCloudflareContext().env.DB`, single prepared SELECT) instead of
  instantiating Prisma's WASM engine; Prisma remains the fallback for local
  Node runs (`src/lib/auth/config.ts`).

Still outside the free budget (accepted risk while staying on Free):

- next-auth JWT signing (AES-GCM via jose) **fits**, but `next build` SSR of
  dynamic pages each burn more than the cap on cold isolates: expect
  intermittent `503`/`1102` on dynamic routes and Prisma-backed APIs under
  bursty cold traffic. The stable path for full reliability remains Workers
  Paid ($5/mo) or moving the SSR/API workload off Workers.
