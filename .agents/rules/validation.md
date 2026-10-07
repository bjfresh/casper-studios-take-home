---
paths: ["**/*.ts", "**/*.tsx"]
---
# Types and validation (Zod 4)

**Validate at every runtime boundary, once.** Anything the compiler can't vouch
for: HTTP bodies/query/params, HTTP responses (including our own API, since
client and server deploy separately), env vars, local/sessionStorage, cookies,
IndexedDB, form input, analytics payloads, webhooks, third-party responses, URL
state, file uploads. Inside the boundary, trust the inferred type and don't re-parse.

**Schema first, type inferred.** Never hand-write a type beside a schema that
describes the same thing.

```ts
export const profileSchema = z.object({ email: z.email(), name: z.string().min(1) })
export type Profile = z.infer<typeof profileSchema>
```

- `type`, not `interface`, for inferred and composed data shapes.
- Zod 4 top-level formats only: `z.email()`, `z.url()`, `z.uuid()`, `z.iso.date()`.
  Never the deprecated `z.string().email()` chain. Don't mix the two styles.
- Where schemas live: shared domain and API-boundary schemas in `@repo/shared`
  with their inferred types; API `contracts/` re-export them rather than
  redefine; the web app imports those types and never restates a response
  shape. A schema for one module's internal detail stays in that module.
- `safeParse` where failure is expected and handled (user input, third-party,
  storage). `parse` only where failure is a programming error to crash on
  (startup env).
- Never swallow a failure: log the issue path and message at least. A storage
  read that fails falls back to a default (see `apps/web/src/data/storage.ts`).
- Convert Zod issues to the app's shape with `toValidationIssues()` at the
  boundary. `ZodError` never reaches UI code or an API response.
- Derive related schemas with `.pick/.omit/.partial/.extend`; create and update
  schemas visibly descend from one definition.
- Variant payloads (analytics events, webhooks) use `z.discriminatedUnion`.
- A constraint used in two places (a max length in a form and the API) is one
  exported constant.
- Wrap composed exported types in `Prettify<T>` (`@repo/shared`) so hovers show
  the resolved shape. A plain object literal type gains nothing from it.
- Env: separate public and server-only schemas, validated at startup. Next
  inlines `NEXT_PUBLIC_*` by literal substitution, so reference each variable
  by its full name. `process.env[name]` doesn't work.
