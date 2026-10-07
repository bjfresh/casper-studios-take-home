import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { getDatabaseUrl } from './env'
import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>

export type DatabaseHandle = {
  db: Database
  /** Closes the pool, waiting up to `timeoutSeconds` for in-flight queries. */
  close: (timeoutSeconds?: number) => Promise<void>
}

/**
 * A pooled client whose lifecycle the caller owns. For migrations, scripts and
 * tests, which want a small pool they explicitly close. Request handlers use
 * `getDb()` instead.
 */
export function createDatabase(
  url: string = getDatabaseUrl(),
  { max = 10 }: { max?: number } = {},
): DatabaseHandle {
  const client = postgres(url, {
    max,
    // Postgres NOTICEs (e.g. "relation already exists, skipping" during
    // migrations) are informational and otherwise flood the console.
    onnotice: () => {},
  })
  const db = drizzle(client, { schema })
  return { db, close: (timeoutSeconds = 5) => client.end({ timeout: timeoutSeconds }) }
}

let singleton: DatabaseHandle | undefined

/** Process-wide memoized client, safe to call from request handlers. */
export function getDb(): Database {
  singleton ??= createDatabase()
  return singleton.db
}

/** For graceful shutdown. Safe to call when no client was ever created. */
export async function closeDb(timeoutSeconds = 5): Promise<void> {
  const handle = singleton
  singleton = undefined
  await handle?.close(timeoutSeconds)
}

/** Cheap liveness probe for readiness checks. Throws if the database is unreachable. */
export async function pingDb(db: Database = getDb()): Promise<void> {
  await db.execute(sql`select 1`)
}

// Re-exported so services import query helpers from one place rather than
// reaching into the ORM. Add helpers here as they're actually used.
export { and, asc, desc, eq, inArray, isNotNull, isNull, lt, or, type SQL, sql } from 'drizzle-orm'
/**
 * Applies pending migrations from packages/db/drizzle. Safe to re-run: applied
 * migrations are tracked in drizzle.__drizzle_migrations and skipped. Exported
 * so test setup can migrate the test database through the same code path.
 */
export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) })
}

export { getDatabaseUrl } from './env'
