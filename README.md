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

## Setup

Requires Node ≥ 22.12 (`.nvmrc` pins 24), pnpm 9.15 and Docker.

```sh
pnpm install
cp .env.example .env
pnpm db:up          # Postgres on localhost:5433, waits until healthy
pnpm db:migrate
pnpm db:curriculum   # sync the chord curriculum (safe to re-run)
pnpm e2e:install    # Chromium, for component and e2e tests
pnpm dev            # web on :3000, api on :3001
```

Auth works without credentials (sign-in shows as unavailable). To enable it,
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

## Decisions worth knowing

- **Biome only.** No ESLint or Prettier. The config is `biome.jsonc` rather than
  `biome.json` because Biome only accepts comments in `.jsonc`, and the rule
  choices carry their reasons inline. Editor setup is committed in `.vscode/`.
  A pre-commit hook (`simple-git-hooks`) checks only staged files.
- **Exact toolchain pins** via the pnpm `catalog:` in `pnpm-workspace.yaml`.
  Libraries float; TypeScript, Vitest, Playwright, Biome, tsx and Turbo don't.
- **Node ≥ 22.12, not ≥ 20.** Vitest 5 requires `^22.12 || ^24 || >=26`, so a
  lower floor would advertise support the test runner doesn't have.
- **`db:up` passes `--wait`**, so it returns only once the healthcheck passes
  and `pnpm db:up && pnpm db:migrate` can't race the container.
- **Port 5433** on the host avoids a locally installed Postgres. It is set
  once in `.env.example`; compose, scripts, tests and CI read it from there
  (CI mirrors the values in its `env:` block).
- **Separate test database.** `app_test` is created by
  `docker/postgres/init/` on first volume init. Vitest replaces
  `DATABASE_URL` with `TEST_DATABASE_URL` with no fallback, so tests never
  touch dev data.
- **Component tests run in real Chromium** (Vitest browser mode), not jsdom.
  The behaviour under test (a button not resizing while loading, a textarea
  growing, `<dialog>` focus and backdrop handling) needs real layout.
- **Workspace packages ship TypeScript source.** Next transpiles
  `@repo/shared`; the API is bundled by tsup into one self-contained file, so
  its Docker image needs no `node_modules`.
- **Auth is Privy**, behind one hook on the web (`useAuth`) and one adapter on
  the API (`auth/privy-auth-client.ts`); Biome blocks SDK imports anywhere else.
  The web client sends a fresh bearer token per request, and the API verifies
  it locally. Without credentials the app still boots: the web app explains
  that sign-in is unavailable, and the API **fails closed** (503 on every
  authenticated route).
- **Local user rows are upserted in the auth middleware on every authenticated
  request**, not lazily. Every signed-in user has a row from their first
  request, and nothing past the auth layer sees a Privy DID. The cost is one
  indexed upsert per request.
- **oRPC, contract-first.** Procedures are defined with Zod in `@repo/shared`,
  implemented by the API at `/rpc/*` (authenticated as a route group) and
  consumed through TanStack Query with generated keys and response
  validation. Plain REST (`/health`) keeps the `{ ok, data }` envelope; RPC
  errors use oRPC's wire format but the same codes and reasons.
- **`pnpm.neverBuiltDependencies`** skips `bufferutil` / `utf-8-validate`.
  They're optional native speed-ups for the `ws` WebSocket library, pulled in
  through Privy's dependencies, and they have no prebuilt binary for Alpine,
  so the Docker build would need a full compiler toolchain. `ws` falls back to
  plain JavaScript.
- **One Sign In button; onboarding is front-loaded.** Its modal offers Sign In
  (straight to Privy) or Sign Up, which collects the player's settings before
  the account exists and keeps them in localStorage, validated by the shared
  schema. After sign-up they're saved to `user_settings` and the local copy is
  removed; a new player who used Sign In instead gets this device's
  preferences saved with a starting name. An account that already has
  settings keeps them. Settings auto-save, so every control takes effect
  immediately.
- **The chord curriculum is reference data in code**
  (`apps/api/src/curriculum/curriculum-source.ts`), synced by slug with
  `pnpm db:curriculum`. The sync never deletes a group or chord, because user
  progress points at them; anything left in the database but removed from
  the source is reported. Curriculum, voicings and user progress are separate
  tables.
- **Lessons work without an account.** Lesson content is reference data,
  served by a deliberately public endpoint (`/public-rpc`, separate from the
  authenticated `/rpc`). Guests keep progress in localStorage, keyed by slug,
  and it's imported into the account after sign-up. Got it, Skip and finish
  follow one set of rules (`progress-rules.ts` in `@repo/shared`), applied in
  the browser for guests and in SQL for accounts.
- **Plays are stored on the device first.** A signed-in player's plays go to
  an outbox in localStorage (read and written through React Query) and sync
  to the API in the background, removed only once the server confirms. A
  lesson never waits on, or fails because of, the network.
- **Preferences** (instrument, tuning, fretboard labels) have one shape for
  guests and accounts, are changed only through `usePreferences()`, and are
  kept valid by one shared normalization rule (note names and finger numbers
  are never both on, enforced in the browser, the API and a DB check).
- **No Redis** yet. `docker-compose.db.yml` shows the cache config to use
  when something needs one.
