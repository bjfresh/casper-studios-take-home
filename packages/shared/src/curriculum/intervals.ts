import type { ChordQuality } from './chords'

/** Normalized interval names, ASCII accidentals (stored form). */
export const CHORD_INTERVALS = [
  '1',
  'b2',
  '2',
  'b3',
  '3',
  '4',
  'b5',
  '5',
  '#5',
  '6',
  'b7',
  '7',
  'b9',
  '9',
  '#9',
  '11',
  '#11',
  'b13',
  '13',
] as const

export type ChordInterval = (typeof CHORD_INTERVALS)[number]

const LETTER_PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** Pitch class (0–11) of a note name in any spelling: C, F♯, F#, B♭, Bb. */
export function pitchClass(name: string): number {
  const letter = LETTER_PITCH[name[0] ?? '']
  if (letter === undefined) throw new Error(`Not a note name: ${name}`)
  const accidental = name.slice(1)
  const shift = /^[♯#]$/.test(accidental) ? 1 : /^[♭b]$/.test(accidental) ? -1 : 0
  return (letter + shift + 12) % 12
}

/** The pitch class sounded at a fret, for a tuning written low → high (string 1 = highest). */
export function soundedPitch(tuning: readonly string[], string: number, fret: number): number {
  const open = tuning[tuning.length - string]
  if (!open) throw new Error(`No string ${string} in a ${tuning.length}-string tuning`)
  return (pitchClass(open) + fret) % 12
}

/** Semitones above the root for each chord tone. */
export const QUALITY_SEMITONES = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  power: [0, 7],
  dominant_7: [0, 4, 7, 10],
  major_7: [0, 4, 7, 11],
  minor_7: [0, 3, 7, 10],
  half_diminished_7: [0, 3, 6, 10],
  major_6: [0, 4, 7, 9],
  minor_6: [0, 3, 7, 9],
  dominant_9: [0, 4, 7, 10, 2],
} as const satisfies Record<ChordQuality, readonly number[]>

const SIMPLE_INTERVAL: Record<number, ChordInterval> = {
  0: '1',
  1: 'b2',
  2: '2',
  3: 'b3',
  4: '3',
  5: '4',
  6: 'b5',
  7: '5',
  8: '#5',
  9: '6',
  10: 'b7',
  11: '7',
}

/**
 * Where a quality names a tone as an extension, not a simple interval: the
 * 2 in a dominant 9 is the 9th. (A 6 chord's sixth stays '6'.)
 */
const EXTENSION_NAMES: Partial<Record<ChordQuality, Partial<Record<number, ChordInterval>>>> = {
  dominant_9: { 2: '9' },
}

/** The interval name of a pitch within a chord, or null if it isn't a chord tone. */
export function intervalOf(
  pitch: number,
  root: number,
  quality: ChordQuality,
): ChordInterval | null {
  const semitones = (pitch - root + 12) % 12
  if (!(QUALITY_SEMITONES[quality] as readonly number[]).includes(semitones)) return null
  return EXTENSION_NAMES[quality]?.[semitones] ?? SIMPLE_INTERVAL[semitones] ?? null
}

/** Display form: b3 → ♭3, #11 → ♯11. Stored values stay ASCII. */
export function formatInterval(interval: ChordInterval): string {
  return interval.replace('b', '♭').replace('#', '♯')
}
