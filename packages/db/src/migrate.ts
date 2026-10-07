import { createDatabase, runMigrations } from './index'

// Applies pending migrations and exits. Safe to re-run.

// A single connection: migrations run sequentially, and one connection keeps
// any session-level state (search_path, locks) consistent across them.
const { db, close } = createDatabase(undefined, { max: 1 })

try {
  await runMigrations(db)
  console.log('Migrations applied.')
} catch (error) {
  console.error('Migration failed:', error)
  process.exitCode = 1
} finally {
  await close()
}
