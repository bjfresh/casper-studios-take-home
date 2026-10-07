import { type Database, getDb, sql } from '@repo/db'
import { users } from '@repo/db/schema'
import type { AuthenticatedUser } from '@repo/shared'

/**
 * Maps a verified Privy identity to the local user row, creating it on first
 * sight. Runs in the auth middleware on EVERY authenticated request (see
 * middleware/auth.ts for why), so every signed-in user has a row from their
 * first request and `lastSeenAt` is accurate.
 *
 * An upsert, never select-then-insert: the unique index on privy_user_id makes
 * the conflict clause atomic, where a select-then-insert has a race window in
 * which two concurrent first requests both insert.
 */
export async function upsertUserFromIdentity(
  { privyUserId, email }: { privyUserId: string; email: string | null },
  db: Database = getDb(),
): Promise<AuthenticatedUser> {
  const now = new Date()
  const [user] = await db
    .insert(users)
    .values({ privyUserId, email, lastSeenAt: now })
    .onConflictDoUpdate({
      target: users.privyUserId,
      set: {
        lastSeenAt: now,
        // Only overwrite email with a real value: a degraded profile lookup
        // (email null) must never erase a known address. updatedAt moves only
        // when the stored profile actually changes, not on every visit.
        ...(email
          ? {
              email,
              updatedAt: sql`case when ${users.email} is distinct from ${email} then now() else ${users.updatedAt} end`,
            }
          : {}),
      },
    })
    .returning({ id: users.id, email: users.email, role: users.role })

  if (!user) throw new Error('User upsert returned no row')
  return user
}
