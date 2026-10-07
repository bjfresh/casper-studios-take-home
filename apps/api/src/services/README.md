# services/

All business logic, one service per route module (`items.ts` ↔ `item-service.ts`).

- Transport-agnostic: no Hono `Context`, no HTTP status codes. Throw `AppError`
  for expected failures.
- Independently testable; tests in `__tests__/`.
- The **only** layer that imports `packages/db`.
