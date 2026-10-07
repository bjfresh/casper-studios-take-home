import { TUNINGS } from '@/constants/tunings'
import type { ChordFingering } from './chord-diagram-layout'

/**
 * Example fingerings: the design page's states and test fixtures. Strings are
 * numbered 1 = highest-pitched.
 */
export const EXAMPLE_FINGERINGS = {
  /** Open C major: nut shown, muted low E, two open strings, two roots. */
  cMajorOpen: {
    title: 'C major',
    tuning: TUNINGS.guitarStandard,
    fingering: {
      mutedStrings: [6],
      positions: [
        { string: 5, fret: 3, isRoot: true, finger: 3, note: 'C' },
        { string: 4, fret: 2, finger: 2, note: 'E' },
        { string: 3, fret: 0, note: 'G' },
        { string: 2, fret: 1, isRoot: true, finger: 1, note: 'C' },
        { string: 1, fret: 0, note: 'E' },
      ],
    },
  },
  /** Open G major: used for the left-handed example. */
  gMajorOpen: {
    title: 'G major',
    tuning: TUNINGS.guitarStandard,
    fingering: {
      positions: [
        { string: 6, fret: 3, isRoot: true, finger: 2, note: 'G' },
        { string: 5, fret: 2, finger: 1, note: 'B' },
        { string: 4, fret: 0, note: 'D' },
        { string: 3, fret: 0, isRoot: true, note: 'G' },
        { string: 2, fret: 0, note: 'B' },
        { string: 1, fret: 3, isRoot: true, finger: 3, note: 'G' },
      ],
    },
  },
  /** B major, E-shape barre at the 7th fret: no nut, "7" label. */
  bMajorBarre7: {
    title: 'B major (barre, 7th fret)',
    tuning: TUNINGS.guitarStandard,
    fingering: {
      positions: [
        { string: 6, fret: 7, isRoot: true, finger: 1, note: 'B' },
        { string: 5, fret: 9, finger: 3, note: 'F♯' },
        { string: 4, fret: 9, isRoot: true, finger: 4, note: 'B' },
        { string: 3, fret: 8, finger: 2, note: 'D♯' },
        { string: 2, fret: 7, finger: 1, note: 'F♯' },
        { string: 1, fret: 7, isRoot: true, finger: 1, note: 'B' },
      ],
    },
  },
  /** 4-string bass, C root–fifth–octave: unplayed strings show nothing. */
  bassCRootFifthOctave: {
    title: 'C root–fifth–octave (bass)',
    tuning: TUNINGS.bassStandard4,
    fingering: {
      positions: [
        { string: 3, fret: 3, isRoot: true, finger: 1, note: 'C' },
        { string: 2, fret: 5, finger: 3, note: 'G' },
        { string: 1, fret: 5, isRoot: true, finger: 4, note: 'C' },
      ],
    },
  },
  /** 5-string bass, F root–fifth–octave from the low B string, 6th fret. */
  bass5FRootFifthOctave: {
    title: 'F root–fifth–octave (5-string bass)',
    tuning: TUNINGS.bassStandard5,
    fingering: {
      positions: [
        { string: 5, fret: 6, isRoot: true, finger: 1, note: 'F' },
        { string: 4, fret: 8, finger: 3, note: 'C' },
        { string: 3, fret: 8, isRoot: true, finger: 4, note: 'F' },
      ],
    },
  },
} satisfies Record<string, { title: string; tuning: readonly string[]; fingering: ChordFingering }>
