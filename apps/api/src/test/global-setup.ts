import { createDatabase, runMigrations } from '@repo/db'
import { syncCurriculum } from '../services/curriculum-sync-service'

/**
 * Migrates the TEST database and syncs the curriculum before the suite, so integration tests run
 * against the current schema without a separate manual step. Requires
 * TEST_DATABASE_URL and a running Postgres (`pnpm db:up`); there is
 * deliberately no fallback URL and no silent skip.
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Copy .env.example to .env and run tests from the repo root.',
    )
  }
  const { db, close } = createDatabase(url, { max: 1 })
  try {
    await runMigrations(db)
    // The curriculum is reference data the app can't run without, so tests
    // get the real one, synced through the same code path as production.
    await syncCurriculum(undefined, db)
  } catch (error) {
    throw new Error(`Could not migrate the test database (is Postgres up? \`pnpm db:up\`)`, {
      cause: error,
    })
  } finally {
    await close()
  }
}
