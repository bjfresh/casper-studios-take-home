import { type Instrument, standardTuning, stringCountFor } from '@repo/shared'

/**
 * Standard tuning per instrument (low → high), from the shared presets. Shapes
 * are drawn in their instrument's standard tuning; chord voicings store their
 * own tuning.
 */
export const STANDARD_TUNINGS = {
  guitar: standardTuning('guitar', stringCountFor('guitar', null)),
  bass: standardTuning('bass', 4),
} as const satisfies Record<Instrument, readonly string[]>
