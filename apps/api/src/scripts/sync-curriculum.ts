import { createDatabase } from '@repo/db'
import { syncCurriculum } from '../services/curriculum-sync-service'

// `pnpm db:curriculum`: makes the database curriculum match the source.
// Production-safe and idempotent (it's reference data, not a dev seed); run it
// after migrations on every deploy.
const { db, close } = createDatabase(undefined, { max: 1 })

try {
  const summary = await syncCurriculum(undefined, db)
  console.log(
    `Curriculum synced: ${summary.groups} groups, ${summary.chords} chords, ${summary.shapes} shapes.`,
  )
  if (summary.orphanedGroupSlugs.length) {
    console.warn(
      `Groups in the database but not in the source (left in place; users may have progress): ${summary.orphanedGroupSlugs.join(', ')}`,
    )
  }
} catch (error) {
  console.error('Curriculum sync failed:', error)
  process.exitCode = 1
} finally {
  await close()
}
