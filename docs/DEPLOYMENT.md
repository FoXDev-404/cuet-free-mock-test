# Publishing to GitHub & deploying to Cloudflare

## 1. Local git setup (already committed)

The repository has been initialized locally (branch `master`) with the latest
redesign committed.

Create an empty repository on GitHub named `cuet-free-mock-test` and then run:

```powershell
cd "path/to/cuet-platform"
git remote add origin https://github.com/FoXDev-404/cuet-free-mock-test.git
git branch -M main
git push -u origin main
```

(Requires a GitHub PAT with `repo` scope configured in `git credential` Manager
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
npm run build
npx opennextjs-cloudflare
npx wrangler deploy
```

Set secrets:

```powershell
npx wrangler secret put NEXTAUTH_SECRET
npx wrangler secret put DATABASE_URL   # optional placeholder when using D1
```

## 4. Known follow-ups for a real Cloudflare deployment

- `lib/prisma.ts` still uses the local SQLite `PrismaClient`. For Workers you must
  instantiate `new PrismaClient({ adapter: new PrismaD1(env.DB) })` inside each
  request handler using the `DB` binding from `@opennextjs/cloudflare`'s
  `getCloudflareContext()`.
- Enable Prisma's `driverAdapters` preview feature and use `@prisma/adapter-d1`
  version aligned with your Prisma version (e.g. 5.22.x -> `@prisma/adapter-d1@5.22.0`).
- NextAuth.js JWT session + edge runtime configuration requires updating
  `next-auth` to be Workers-compatible; consider migrating the auth routes to
  `@auth/nextjs` (v5) for the Edge runtime.
- This app currently uses SQLite locally; switch the runtime `prisma` factory to
  the D1 binding before relying on `wrangler deploy` in production.
