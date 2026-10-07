import type { Instrument } from '@repo/shared'

/** Tunings are written low → high, the way players say them. */
export const TUNINGS = {
  guitarStandard: ['E', 'A', 'D', 'G', 'B', 'E'],
  bassStandard4: ['E', 'A', 'D', 'G'],
  bassStandard5: ['B', 'E', 'A', 'D', 'G'],
  bassStandard6: ['B', 'E', 'A', 'D', 'G', 'C'],
} as const satisfies Record<string, readonly string[]>

/**
 * Tuning per instrument until tuning and string count become user settings.
 * Components take `tuning` as a prop, so that change touches only this lookup.
 */
export const DEFAULT_TUNING = {
  guitar: TUNINGS.guitarStandard,
  bass: TUNINGS.bassStandard4,
} as const satisfies Record<Instrument, readonly string[]>
