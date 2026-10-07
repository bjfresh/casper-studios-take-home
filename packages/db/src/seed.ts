import { createDatabase } from './index'

// Idempotent development data: every insert must be safe to re-run — use
// `.onConflictDoNothing()` / `.onConflictDoUpdate()` keyed on a natural key,
// never blind inserts. Refuses to run in production.
if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed with NODE_ENV=production.')
  process.exit(1)
}

const { db, close } = createDatabase(undefined, { max: 1 })

try {
  // No tables yet. Add seed inserts here as the schema grows.
  void db
  console.log('Nothing to seed yet.')
} finally {
  await close()
}
