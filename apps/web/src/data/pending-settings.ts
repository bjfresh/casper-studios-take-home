import { playerSettingsInputSchema } from '@repo/shared'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { createStorageItem } from './storage'

/**
 * Settings collected BEFORE the player has an account. They live here until
 * sign-up, then OnboardingGate saves them to the database and removes this
 * copy: the database is the source of truth from then on, and a stale copy
 * left behind on a shared device would pre-fill the next person's onboarding.
 *
 * Validated on every read like all storage: an old or tampered value falls
 * back to null, which simply means "nothing pending".
 */
export const pendingSettings = createStorageItem({
  key: STORAGE_KEYS.pendingPlayerSettings,
  // The profile plus the guest's preferences at sign-up time. Preferences are
  // optional so values saved by older versions (profile only) still parse.
  schema: playerSettingsInputSchema.nullable(),
  fallback: null,
})
