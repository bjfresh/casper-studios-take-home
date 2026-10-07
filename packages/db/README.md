# packages/db (`@repo/db`)

Schema, migrations and the database client (Drizzle + postgres.js). A
backend-only dependency: declared by `apps/api` and nothing else. The frontend
reaches data over HTTP and types it from `@repo/shared`, never from tables.

```
drizzle.config.ts   schema path, out dir, dialect, credentials from env
drizzle/            generated migrations (committed, reviewed)
src/
  schema.ts         tables, relations, enums   → also exported as @repo/db/schema
  env.ts            DATABASE_URL, validated with Zod
  index.ts          createDatabase / getDb / closeDb / pingDb + query helpers
  migrate.ts        applies pending migrations, then exits
  seed.ts           idempotent development data
```

| Export             | Use                                                                 |
| ------------------ | ------------------------------------------------------------------- |
| `createDatabase()` | A pool you own and `close()`: migrations, scripts, tests            |
| `getDb()`          | Process-wide singleton for request handlers                         |
| `closeDb()`        | Graceful shutdown, with a timeout                                   |
| `pingDb()`         | `select 1` liveness probe (the API's `/health/ready`)               |
| `eq`, `and`, …     | Query helpers. Services import these from here, not `drizzle-orm`. |

## Migrations

- `pnpm db:generate` writes a migration from the schema diff.
- `pnpm db:migrate` applies pending ones. It's safe to re-run.
- `pnpm db:push` syncs the schema without a migration file. Only use it for
  local iteration, never against a shared or deployed database.

Every generated migration needs review: read the SQL before committing.
A migration can be valid SQL and still fail on existing data. Renaming an enum
value or changing a column type typically emits a bare cast that breaks on rows
that already exist. In those cases, hand-write the data remapping and test it
against a clone of a real database, not an empty one.

Hand-edited migrations say so in a header comment: `0003_add_lesson_number`
adds a backfill, a validation step and DEFERRABLE constraints, none of which
drizzle-kit generates. `0005_structured_shape_qualifiers` parses the known
name formats into structured fields (expand only; the contract step is
pending, see `.agents/rules/curriculum.md`). `0006_player_preferences`
backfills each player's tuning and string count from their instrument.

`drizzle/meta/_journal.json` is committed even while empty: the migrator
refuses to run without it.

## Environment

`DATABASE_URL` comes from the root `.env` (scripts run through `dotenv`). Tests
replace it with `TEST_DATABASE_URL` and have no fallback; see `vitest.config.ts`.
