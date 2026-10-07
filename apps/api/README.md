# apps/api

Hono API. Source lives in `src/`; see each directory's README.

Depends on `@repo/shared` and `@repo/db`, and is the only consumer of `@repo/db`.

- `src/app.ts` builds the app (testable via `app.request()`); `src/index.ts` serves it.
- `GET /health` is liveness (no dependencies). `GET /health/ready` is readiness
  (503 while the database is down).
- `POST /rpc/*` is the oRPC endpoint (contract in `@repo/shared`). The whole
  group is behind `requireAuth`, which verifies the Privy token and upserts the
  local user row.
- `pnpm build` bundles everything into `dist/index.js` (see `tsup.config.ts`).

## Rules

- Routes stay thin; logic lives in services.
- One response envelope everywhere: `{ ok: true, data } | { ok: false, error }`.
- Expected failures throw a typed `AppError`; middleware maps it to a status.
  Anything else becomes a 500.
- A dependency being unavailable is a **503**, not a 404.
- Every input is validated at the boundary with a schema.
