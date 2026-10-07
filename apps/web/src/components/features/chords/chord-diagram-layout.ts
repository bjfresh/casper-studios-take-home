import { type ChordInterval, formatOrdinal, type Handedness } from '@repo/shared'

/**
 * One played (or open) note. Strings are numbered 1 = highest-pitched string,
 * matching chord_shapes in the curriculum, so data reads the same everywhere:
 * on a 6-string guitar, string 6 is low E; on a 5-string bass, string 5 is low B.
 */
export type FretPosition = {
  string: number
  /** 0 = open string. */
  fret: number
  isRoot?: boolean
  /** 1–4 for index–pinky, 'T' for thumb. */
  finger?: 1 | 2 | 3 | 4 | 'T'
  /** Display name for the note-names overlay (e.g. 'C', 'F♯'). */
  note?: string
  /** Interval from the chord's root ('1', 'b3'…), for the interval labels. */
  interval?: ChordInterval
}

export type ChordFingering = {
  positions: FretPosition[]
  /**
   * Strings explicitly not played (shown as ×). Strings that are neither
   * played nor muted show nothing, which is right for bass patterns and
   * partial shapes.
   */
  mutedStrings?: number[]
}

export type FretWindow = {
  /** The fret number of the first visible row. */
  startFret: number
  /** Visible fret rows. */
  rows: number
  /** True when the window starts at the nut (draw the nut, no fret number). */
  showNut: boolean
}

/**
 * Every diagram shows this many fret rows, whatever the chord. The grid is a
 * stable stage: moving between chords never changes its height, spacing or
 * position, only the window of frets it represents and the notes on it.
 */
export const FRET_ROWS = 5

/**
 * Which `rows` frets to show.
 *
 * - Everything within `rows` of the nut (open chords, and a shape at frets
 *   2–4, which reads better anchored to the nut than labelled "2"): start at
 *   the nut.
 * - Otherwise: shift the window to start at the lowest fretted note and label
 *   it ("Frets 5–9" rather than a taller grid).
 * - The one exception: a span longer than `rows` (no real chord shape) is
 *   shown in full rather than cropped. Hiding a played note would be worse.
 */
export function computeFretWindow(
  positions: readonly FretPosition[],
  { rows = FRET_ROWS } = {},
): FretWindow {
  const fretted = positions.map((position) => position.fret).filter((fret) => fret > 0)
  if (fretted.length === 0) return { startFret: 1, rows, showNut: true }

  const lowest = Math.min(...fretted)
  const highest = Math.max(...fretted)

  if (highest <= rows) return { startFret: 1, rows, showNut: true }
  return { startFret: lowest, rows: Math.max(rows, highest - lowest + 1), showNut: false }
}

/**
 * Left-to-right column for a string. Right-handed diagrams put the lowest
 * string on the left, as a player sees their own neck; left-handed diagrams
 * mirror that, so the lowest string is on the right.
 */
export function stringColumn(string: number, stringCount: number, handedness: Handedness): number {
  return handedness === 'left' ? string - 1 : stringCount - string
}

/** Strings in left-to-right display order. */
export function displayOrder(stringCount: number, handedness: Handedness): number[] {
  const strings = Array.from({ length: stringCount }, (_, index) => index + 1)
  return strings.sort(
    (a, b) => stringColumn(a, stringCount, handedness) - stringColumn(b, stringCount, handedness),
  )
}

/**
 * Stroke width per string: lower strings slightly heavier, so it reads as a
 * stringed instrument. Kept to a narrow range so it's a cue, not a caricature.
 */
export function stringStrokeWidth(string: number, stringCount: number): number {
  const THINNEST = 1
  const THICKEST = 2.2
  if (stringCount <= 1) return THINNEST
  return THINNEST + ((string - 1) / (stringCount - 1)) * (THICKEST - THINNEST)
}

/** Tuning (low → high) note for a string number (1 = highest). */
export function tuningNote(tuning: readonly string[], string: number): string | undefined {
  return tuning[tuning.length - string]
}

/**
 * Plain-language description of the diagram for assistive tech, low string to
 * high: "E string: 3rd fret, root. A string: muted. D string: open." It's
 * what makes the root understandable without seeing the ring.
 */
export function describeFingering(
  { positions, mutedStrings = [] }: ChordFingering,
  tuning: readonly string[],
): string {
  const parts: string[] = []
  for (let string = tuning.length; string >= 1; string -= 1) {
    const name = `${tuningNote(tuning, string) ?? `String ${string}`} string`
    const notes = positions.filter((position) => position.string === string)
    if (mutedStrings.includes(string)) {
      parts.push(`${name}: muted`)
      continue
    }
    for (const { fret, isRoot, finger } of notes.sort((a, b) => a.fret - b.fret)) {
      const where = fret === 0 ? 'open' : `${formatOrdinal(fret)} fret`
      const details = [where, finger ? `finger ${finger}` : null, isRoot ? 'root' : null]
      parts.push(`${name}: ${details.filter(Boolean).join(', ')}`)
    }
  }
  return parts.length ? `${parts.join('. ')}.` : 'No notes.'
}
