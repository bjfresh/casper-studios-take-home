import {
  DEFAULT_PREFERENCES,
  normalizePlayerPreferences,
  type PlayerPreferences,
  playerPreferencesSchema,
} from '@repo/shared'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { createLiveStorage } from './live-storage'
import { createStorageItem } from './storage'

/**
 * Instrument and fretboard preferences for players without saved account
 * settings (guests, and signed-in players before onboarding). Same shape as
 * the account's. Partial on read so a value written by an older version
 * fills its gaps with defaults instead of being thrown away, and always
 * normalized, so an invalid label combination can't come back out.
 */
const stored = createStorageItem({
  key: STORAGE_KEYS.guestPreferences,
  schema: playerPreferencesSchema.partial(),
  fallback: {},
})

const normalizedItem = {
  read: (): PlayerPreferences =>
    normalizePlayerPreferences({ ...DEFAULT_PREFERENCES, ...stored.read() }),
  write: (value: PlayerPreferences) => stored.write(normalizePlayerPreferences(value)),
  remove: () => stored.remove(),
}

export const guestPreferences = createLiveStorage(
  normalizedItem,
  STORAGE_KEYS.guestPreferences,
  DEFAULT_PREFERENCES,
)
