import type { Instrument } from './settings'

export type TuningPreset = {
  id: string
  instrument: Instrument
  name: string
  /** Open-string notes, low → high. Its length is the string count. */
  notes: readonly string[]
}

/**
 * The tunings a player can choose. A tuning is stored as its notes (the same
 * representation as chord_voicings.tuning), so a preset is just a named,
 * known-good note list.
 */
export const TUNING_PRESETS = [
  {
    id: 'guitar-standard',
    instrument: 'guitar',
    name: 'Standard',
    notes: ['E', 'A', 'D', 'G', 'B', 'E'],
  },
  {
    id: 'guitar-drop-d',
    instrument: 'guitar',
    name: 'Drop D',
    notes: ['D', 'A', 'D', 'G', 'B', 'E'],
  },
  {
    id: 'guitar-half-step-down',
    instrument: 'guitar',
    name: 'Half-step down',
    notes: ['E♭', 'A♭', 'D♭', 'G♭', 'B♭', 'E♭'],
  },
  {
    id: 'guitar-dadgad',
    instrument: 'guitar',
    name: 'DADGAD',
    notes: ['D', 'A', 'D', 'G', 'A', 'D'],
  },
  {
    id: 'guitar-open-g',
    instrument: 'guitar',
    name: 'Open G',
    notes: ['D', 'G', 'D', 'G', 'B', 'D'],
  },
  { id: 'bass-4-standard', instrument: 'bass', name: 'Standard', notes: ['E', 'A', 'D', 'G'] },
  { id: 'bass-4-drop-d', instrument: 'bass', name: 'Drop D', notes: ['D', 'A', 'D', 'G'] },
  { id: 'bass-5-standard', instrument: 'bass', name: 'Standard', notes: ['B', 'E', 'A', 'D', 'G'] },
  {
    id: 'bass-6-standard',
    instrument: 'bass',
    name: 'Standard',
    notes: ['B', 'E', 'A', 'D', 'G', 'C'],
  },
] as const satisfies readonly TuningPreset[]

export const GUITAR_STRING_COUNT = 6

export function stringCountFor(instrument: Instrument, bassStringCount: number | null): number {
  return instrument === 'guitar' ? GUITAR_STRING_COUNT : (bassStringCount ?? 4)
}

/** Presets that fit an instrument and string count. */
export function tuningPresetsFor(instrument: Instrument, stringCount: number): TuningPreset[] {
  return TUNING_PRESETS.filter(
    (preset) => preset.instrument === instrument && preset.notes.length === stringCount,
  )
}

/** Standard tuning for an instrument and string count. */
export function standardTuning(instrument: Instrument, stringCount: number): string[] {
  const preset = tuningPresetsFor(instrument, stringCount)[0]
  if (!preset) throw new Error(`No standard tuning for a ${stringCount}-string ${instrument}`)
  return [...preset.notes]
}

/** The preset a note list matches, if any (so the UI can say "Drop D"). */
export function findTuningPreset(
  instrument: Instrument,
  notes: readonly string[],
): TuningPreset | undefined {
  return TUNING_PRESETS.find(
    (preset) => preset.instrument === instrument && preset.notes.join(' ') === notes.join(' '),
  )
}

export function sameTuning(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((note, index) => note === b[index])
}
