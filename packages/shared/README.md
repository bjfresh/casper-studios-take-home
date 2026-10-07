# packages/shared (`@repo/shared`)

Domain types, schemas, constants and pure utilities imported by **both** apps.
API-boundary shapes live here so client and server can't drift.

Storage-agnostic: it must **not** import the ORM or `@repo/db`, or the frontend
would transitively depend on the persistence layer. Ships TypeScript source:
Next transpiles it (`transpilePackages`), and the API bundles it.

```
src/auth/auth.ts       AuthenticatedUser, USER_ROLES, AUTH_FAILURE_REASONS
src/settings/settings.ts  PlayerSettings, Account, INSTRUMENTS, HANDEDNESS
src/rpc/contract.ts    the oRPC contract: every procedure's input/output
src/platform/
  type-utilities.ts   Prettify<T>, with type-level tests (.test-d.ts, checked by tsc)
  api-envelope.ts     { ok, data } | { ok, error } schemas, API_ERROR_CODES
  validation.ts       toValidationIssues(): ZodError → the app's issue shape
  health.ts           health-check response schema
```

Conventions for schemas and validation: `.agents/rules/validation.md`.
