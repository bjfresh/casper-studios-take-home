---
paths: ["apps/api/src/**"]
---
# Hono API

- `rpc/`: the oRPC endpoint (`/rpc/*`), behind `requireAuth`. Procedures are
  thin like routes. See `data-fetching.md` and `auth.md`.
- `auth/`: token verification behind the `AuthClient` seam (Privy adapter + fake).
- `routes/`: HTTP only (method, path, auth, `validate(target, schema)`, shaping
  via `ok()`). No business logic.
- `services/`: all logic, 1:1 with routes (`items.ts` ↔ `item-service.ts`),
  transport-agnostic (no Hono `Context`, no status codes), and the only
  importer of `@repo/db`.
- Envelope everywhere: `{ ok: true, data } | { ok: false, error }` (`@repo/shared`).
- Expected failures throw `AppError(code, …)`; `STATUS_BY_CODE` maps to status.
  Unknown errors → 500. Dependency unavailable → 503 (`DEPENDENCY_UNAVAILABLE`), never 404.
- Validate every input at the boundary with a schema from `contracts/` (which
  re-exports `@repo/shared`).
- Test routes through `createApp().request()`; mock `@repo/db` for unit tests,
  and use `TEST_DATABASE_URL` for integration tests.
- In Vitest hooks, use a block body (`beforeEach(() => { … })`): a returned
  function is run as teardown.
