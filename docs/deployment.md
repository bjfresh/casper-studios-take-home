# Deployment

The web app runs on **Vercel**. The API and Postgres run on **Northflank**.

```
Browser ──► Vercel (Next.js, apps/web) ──► Northflank API (apps/api) ──► Northflank Postgres
   └──────────────── NEXT_PUBLIC_API_URL ─────────┘
```

## Northflank

### 1. Postgres

- Add a **managed Postgres addon**; don't run the `docker/postgres` image. The
  addon handles backups.
- The test database (`POSTGRES_TEST_DB`) is only for local runs and CI.
  Production doesn't need it.

### 2. API service

- **Build:** from the repo, using `apps/api/Dockerfile`.
- **Build context:** the repo root. The Dockerfile needs the whole pnpm
  workspace.
- **Port:** `3001`
- **Health check:** `GET /health/ready`

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | From the Postgres addon |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `WEB_ORIGIN` | `https://<your-vercel-domain>` |
| `PRIVY_APP_ID` | From the Privy dashboard |
| `PRIVY_APP_SECRET` | From the Privy dashboard. Store it as a **secret**. |
| `PRIVY_VERIFICATION_KEY` | Optional. Lets the API verify tokens without fetching Privy's JWKS. |

- **Domain:** give the service one, for example `api.yourdomain.com`.

### 3. Migrations and curriculum sync

Run these on every release, as a **job** or a **pre-deploy step**. They do
what the `migrate` service in `docker-compose.yml` does:

- **Image:** build `apps/api/Dockerfile` with target `build`. That stage still
  has drizzle-kit and tsx installed.
- **Command:**

  ```sh
  pnpm --filter @repo/db migrate && pnpm --filter @repo/api curriculum:sync
  ```

- **Environment:** `DATABASE_URL`

The curriculum sync is idempotent and never deletes anything user progress
points at, so it's safe on every deploy.

## Vercel

1. Import the repo and set the **root directory** to `apps/web`. Vercel detects
   the pnpm workspace and Turborepo, so `@repo/shared` builds with the app.
2. Set the environment variables:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | The Privy app ID. It isn't secret. |
| `API_INTERNAL_URL` | Optional. A separate address for server-side requests to the API; defaults to `NEXT_PUBLIC_API_URL`. |

> `NEXT_PUBLIC_*` values are inlined at **build time**. After changing one,
> redeploy.

## Privy

- Add the Vercel domain, and any custom domain, to the app's **allowed
  origins**.
- Enable each login method in the dashboard. `PRIVY_LOGIN_METHODS` in
  `apps/web/src/constants/auth.ts` currently lists email and Google.

## Before going live

- **Preview deployments:** the API allows exactly one web address
  (`WEB_ORIGIN`), so it refuses requests from Vercel preview URLs. Either make
  it accept a list or a pattern, such as this project's `*.vercel.app` URLs,
  or only use production.
- **Region:** put Vercel's functions and the Northflank services in the same
  region, for example US East. The lesson page fetches from the API on the
  server, so a cross-region hop slows every page load.
- **CI:** `.github/workflows/ci.yml` stays as the gate. Vercel deploys on push;
  point Northflank's build at the same branch.

## Release checklist

1. CI passes on the branch.
2. Migrations and the curriculum sync job succeed.
3. The API's `/health/ready` passes.
4. Vercel deploys the web app.
5. Smoke test the deployed site:
   - Homepage loads the lesson grid.
   - A lesson plays.
   - Sign in, then Settings → Account and change the name.
