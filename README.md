# casper-studios-take-home

TypeScript monorepo: Next.js frontend, Hono API, shared packages. Built with
pnpm workspaces, Turborepo, Biome, Drizzle and Postgres in Docker.

```
apps/
  web/        Next.js (App Router)      → @repo/shared
  api/        Hono API                  → @repo/shared, @repo/db
packages/
  shared/     Types, Zod schemas, pure utils (storage-agnostic)
  db/         Drizzle schema, migrations, client (API only)
.agents/rules/  Path-scoped conventions (read the ones matching the file you edit)
docs/           Repo-wide guides, e.g. deployment
```

Each directory has a README describing what belongs there. To host it, see
[`docs/deployment.md`](docs/deployment.md) (Vercel for the web app, Northflank
for the API and Postgres).

## Getting started

1. Install Node 24, pnpm 9.15 and Docker.
2. `pnpm install`
3. `cp .env.example .env`
4. For sign-in, add the Privy values (sent separately) to `.env`.
5. `pnpm db:up && pnpm db:migrate && pnpm db:curriculum`
6. `pnpm dev`, then open http://localhost:3000

To run tests: `pnpm e2e:install` once, then `pnpm test`.

Sign-in is optional: without the Privy values the app runs and shows sign-in as unavailable. To use your own,
create a Privy app and set the `PRIVY_*` and `NEXT_PUBLIC_PRIVY_APP_ID` values
in `.env`. Login methods are email and Google; Google must also be enabled in
the Privy dashboard (see `apps/web/src/constants/auth.ts`).

`/design` (development only) is a living gallery of the design system.

## Scripts

| Script                             | Does                                                         |
| ---------------------------------- | ------------------------------------------------------------ |
| `dev` / `dev:no-env`               | All apps in watch mode, with or without loading `.env`       |
| `build` / `start`                  | Production build / serve                                     |
| `test` / `test:e2e`                | Vitest (unit + browser-mode components) / Playwright         |
| `typecheck`                        | `tsc` in every workspace (incl. type-level tests)            |
| `lint` / `lint:fix`                | `biome check`: lint + format + import order                  |
| `format` / `format:check`          | Formatter only                                               |
| `db:up` / `db:down`                | Postgres container (`docker-compose.db.yml`)                 |
| `db:generate` / `db:migrate`       | Write a migration from the schema / apply pending ones       |
| `db:curriculum`                    | Sync the chord curriculum from source (idempotent; prod-safe) |
| `db:push` / `db:seed` / `db:studio`| Local-only schema sync / idempotent seed / Drizzle Studio    |
| `docker:up` / `docker:down`        | Full stack in containers (`down` also deletes volumes)       |
| `clean`                            | Every workspace's own `clean`, then root `node_modules`      |

Anything touching the database or a running service is wrapped in
`dotenv --` so it reads the root `.env`. `build` is too: Next inlines
`NEXT_PUBLIC_*` at build time, and `env/public.ts` fails the build rather than
bake in an undefined API URL. `dev:no-env` exists for when env
loading itself is what's broken.