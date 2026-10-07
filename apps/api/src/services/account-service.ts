import { type Database, eq, getDb } from '@repo/db'
import { userSettings, users } from '@repo/db/schema'
import type { Account } from '@repo/shared'
import { AppError } from '../utils/app-error'
import { settingsColumns, toPlayerSettings } from './settings-service'

/**
 * The caller's account: their user row plus saved settings, or null settings
 * when none have been saved. Takes the LOCAL user id from the auth context;
 * there's no input naming another user.
 */
export async function getAccount(userId: string, db: Database = getDb()): Promise<Account> {
  const [row] = await db
    .select({ id: users.id, email: users.email, role: users.role, ...settingsColumns })
    .from(users)
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(eq(users.id, userId))

  // The auth middleware upserted this user moments ago, so a missing row
  // means it was deleted mid-request.
  if (!row) throw new AppError('NOT_FOUND', 'Account not found')

  const { id, email, role, ...settingsRow } = row
  // A left join yields all-null settings columns when there's no row; the NOT
  // NULL display_name means "present" is the same as "a row exists".
  const settings = settingsRow.displayName ? toPlayerSettings(settingsRow) : null
  return { id, email, role, settings }
}
