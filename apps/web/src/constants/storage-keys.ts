/** Every localStorage key the app uses, so none is ever spelled twice. */
export const STORAGE_KEYS = {
  pendingPlayerSettings: 'casper:pending-player-settings',
  guestProgress: 'casper:guest-progress',
  guestPreferences: 'casper:guest-preferences',
  /** Plays recorded while signed in, waiting to reach the API. Versioned: bump on a shape change. */
  progressOutbox: 'casper:progress-outbox:v1',
} as const
