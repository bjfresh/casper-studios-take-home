import { type Database, eq, getDb, sql } from '@repo/db'
import { userSettings } from '@repo/db/schema'
import {
  applyPreferencesUpdate,
  DEFAULT_PREFERENCES,
  normalizePlayerPreferences,
  type PlayerSettings,
  type PlayerSettingsInput,
  type PlayerSettingsUpdate,
} from '@repo/shared'
import { AppError } from '../utils/app-error'

export const settingsColumns = {
  displayName: userSettings.displayName,
  instrument: userSettings.instrument,
  handedness: userSettings.handedness,
  guitarType: userSettings.guitarType,
  bassStringCount: userSettings.bassStringCount,
  tuning: userSettings.tuning,
  showNoteNames: userSettings.showNoteNames,
  showFingerNumbers: userSettings.showFingerNumbers,
  showIntervals: userSettings.showIntervals,
  autoProgressSeconds: userSettings.autoProgressSeconds,
}

/** The DB's smallint is a plain number; the domain type is 4 | 5 | 6. */
export function toPlayerSettings(
  row: {
    [K in keyof typeof settingsColumns]: (typeof settingsColumns)[K]['_']['data'] | null
  },
): PlayerSettings {
  const {
    displayName,
    instrument,
    handedness,
    tuning,
    showNoteNames,
    showFingerNumbers,
    showIntervals,
  } = row
  if (!displayName || !instrument || !handedness || !tuning)
    throw new Error('Incomplete settings row')
  return normalizePlayerPreferences({
    displayName,
    instrument,
    handedness,
    guitarType: row.guitarType,
    bassStringCount: row.bassStringCount as PlayerSettings['bassStringCount'],
    tuning,
    showNoteNames: Boolean(showNoteNames),
    showFingerNumbers: Boolean(showFingerNumbers),
    showIntervals: Boolean(showIntervals),
    autoProgressSeconds: row.autoProgressSeconds ?? 0,
  })
}

/**
 * Creates (or replaces) the caller's settings: their profile plus whatever
 * preferences they already had as a guest, defaults for the rest, normalized
 * by the same rule the browser uses. An upsert, so the post-sign-up sync is
 * idempotent. Every function here touches only the caller's own row.
 */
export async function saveSettings(
  userId: string,
  input: PlayerSettingsInput,
  db: Database = getDb(),
): Promise<PlayerSettings> {
  const settings = normalizePlayerPreferences({
    ...DEFAULT_PREFERENCES,
    ...input,
  } as PlayerSettings)
  const [row] = await db
    .insert(userSettings)
    .values({ userId, ...settings })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...settings, updatedAt: sql`now()` },
    })
    .returning(settingsColumns)
  if (!row) throw new Error('Settings upsert returned no row')
  return toPlayerSettings(row)
}

/**
 * Changes some of EXISTING settings. Read-modify-write under a row lock:
 * normalization needs the whole picture (turning finger numbers on must turn
 * note names off; a new bass string count needs a matching tuning), and two
 * concurrent changes must not interleave.
 */
export async function updateSettings(
  userId: string,
  update: PlayerSettingsUpdate,
  db: Database = getDb(),
): Promise<PlayerSettings> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select(settingsColumns)
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .for('update')
    if (!current) throw new AppError('CONFLICT', 'Finish setting up your account first')

    const next = applyPreferencesUpdate(toPlayerSettings(current), update)
    const [row] = await tx
      .update(userSettings)
      .set({ ...next, updatedAt: sql`now()` })
      .where(eq(userSettings.userId, userId))
      .returning(settingsColumns)
    if (!row) throw new Error('Settings update returned no row')
    return toPlayerSettings(row)
  })
}
