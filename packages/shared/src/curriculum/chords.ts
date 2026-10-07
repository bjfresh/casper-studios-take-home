/**
 * Note names as spelled, not pitch classes: A# and Bb sound the same but are
 * different spellings, and chord names depend on the spelling.
 */
export const NOTE_NAMES = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
] as const

export type NoteName = (typeof NOTE_NAMES)[number]

/**
 * What kind of chord, independent of root. Adding one later is an
 * `ALTER TYPE … ADD VALUE` migration plus an entry in QUALITY_NOTATION.
 */
export const CHORD_QUALITIES = {
  MAJOR: 'major',
  MINOR: 'minor',
  POWER: 'power',
  DOMINANT_7: 'dominant_7',
  MAJOR_7: 'major_7',
  MINOR_7: 'minor_7',
  HALF_DIMINISHED_7: 'half_diminished_7',
  MAJOR_6: 'major_6',
  MINOR_6: 'minor_6',
  DOMINANT_9: 'dominant_9',
} as const

export type ChordQuality = (typeof CHORD_QUALITIES)[keyof typeof CHORD_QUALITIES]

/**
 * How each quality is written: `symbol` for display (Em, Cmaj7, Bm7♭5) and
 * `slug` for URLs and stable keys. Plain major and minor are spelled out in
 * slugs (`g-major`, `e-minor`); everything else appends its symbol (`e7`,
 * `cmaj7`), matching how the chords are commonly named.
 */
export const QUALITY_NOTATION = {
  major: { symbol: '', slug: '-major' },
  minor: { symbol: 'm', slug: '-minor' },
  power: { symbol: '5', slug: '5' },
  dominant_7: { symbol: '7', slug: '7' },
  major_7: { symbol: 'maj7', slug: 'maj7' },
  minor_7: { symbol: 'm7', slug: 'm7' },
  half_diminished_7: { symbol: 'm7♭5', slug: 'm7b5' },
  major_6: { symbol: '6', slug: '6' },
  minor_6: { symbol: 'm6', slug: 'm6' },
  dominant_9: { symbol: '9', slug: '9' },
} as const satisfies Record<ChordQuality, { symbol: string; slug: string }>

const ROOT_SYMBOL = (root: NoteName) => root.replace('#', '♯').replace(/^([A-G])b$/, '$1♭')
const ROOT_SLUG = (root: NoteName) =>
  root
    .toLowerCase()
    .replace('#', '-sharp')
    .replace(/^([a-g])b$/, '$1-flat')

/** Display name: `G`, `Em`, `F♯m`, `Cmaj7`, `Bm7♭5`. */
export function chordSymbol(root: NoteName, quality: ChordQuality): string {
  return `${ROOT_SYMBOL(root)}${QUALITY_NOTATION[quality].symbol}`
}

/** Stable key: `g-major`, `e-minor`, `e7`, `cmaj7`, `f-sharp-minor`. */
export function chordSlug(root: NoteName, quality: ChordQuality): string {
  return `${ROOT_SLUG(root)}${QUALITY_NOTATION[quality].slug}`
}

/** How many distinct notes each quality has (bounds its possible inversions). */
export const CHORD_QUALITY_NOTE_COUNT = {
  major: 3,
  minor: 3,
  power: 2,
  dominant_7: 4,
  major_7: 4,
  minor_7: 4,
  half_diminished_7: 4,
  major_6: 4,
  minor_6: 4,
  dominant_9: 5,
} as const satisfies Record<ChordQuality, number>
