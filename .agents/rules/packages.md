---
paths: ["packages/**"]
---
# Packages

- `shared/`: imported by both apps. Storage-agnostic: never import the ORM or
  `@repo/db`. API-boundary schemas and `Prettify` live here. Ships TS source.
- `db/`: schema, migrations, client. Depended on by `apps/api` only.
  - `pnpm db:generate` after a schema change; read every generated SQL file
    before committing it.
  - A migration can be valid SQL and still wrong for existing data (enum value
    rename, column type change → bare cast). Hand-write the data remap and test
    it against a clone of real data, not an empty database.
  - `db:push` is for local iteration only, never against a shared database.
  - Seeds are idempotent (`onConflictDoNothing/Update`).
  - Services import query helpers (`eq`, `and`…) from `@repo/db`, not `drizzle-orm`.
- No `ui/` package until a second app renders UI.
