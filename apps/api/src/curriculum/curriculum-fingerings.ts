import type { ChordDiagramData, FretPosition } from '@repo/shared'

/**
 * Fingerings for every chord and shape in the curriculum, kept apart from
 * curriculum-source.ts so the curriculum stays readable. Synced into
 * chord_voicings (chords) and chord_shapes.diagram (shapes).
 *
 * Standard tuning, strings numbered 1 = high E … 6 = low E. Every note label,
 * chord tone and root here is checked by curriculum-fingerings.test.ts, which
 * works out the actual pitch of each fret.
 *
 * Movable shapes are drawn at one sample root (`exampleName`); the shape is
 * the pattern, the example is just where it's shown.
 */

type F = 1 | 2 | 3 | 4
/** p(string, fret, note, finger?, isRoot?) keeps the tables below scannable. */
const p = (
  string: number,
  fret: number,
  note: string,
  finger?: F,
  isRoot = false,
): FretPosition => ({
  string,
  fret,
  note,
  ...(finger ? { finger } : {}),
  ...(isRoot ? { isRoot } : {}),
})
const r = (string: number, fret: number, note: string, finger?: F) =>
  p(string, fret, note, finger, true)

const diagram = (
  positions: FretPosition[],
  mutedStrings: number[] = [],
  exampleName?: string,
): ChordDiagramData => ({ positions, mutedStrings, ...(exampleName ? { exampleName } : {}) })

/** Default open/first-position voicings, by chord slug. */
export const CHORD_FINGERINGS: Record<string, ChordDiagramData> = {
  // 320003
  'g-major': diagram([
    r(6, 3, 'G', 2),
    p(5, 2, 'B', 1),
    p(4, 0, 'D'),
    r(3, 0, 'G'),
    p(2, 0, 'B'),
    r(1, 3, 'G', 3),
  ]),
  // x32010
  'c-major': diagram(
    [r(5, 3, 'C', 3), p(4, 2, 'E', 2), p(3, 0, 'G'), r(2, 1, 'C', 1), p(1, 0, 'E')],
    [6],
  ),
  // xx0232
  'd-major': diagram([r(4, 0, 'D'), p(3, 2, 'A', 1), r(2, 3, 'D', 3), p(1, 2, 'F♯', 2)], [6, 5]),
  // 022000
  'e-minor': diagram([
    r(6, 0, 'E'),
    p(5, 2, 'B', 2),
    r(4, 2, 'E', 3),
    p(3, 0, 'G'),
    p(2, 0, 'B'),
    r(1, 0, 'E'),
  ]),
  // x02210
  'a-minor': diagram(
    [r(5, 0, 'A'), p(4, 2, 'E', 2), r(3, 2, 'A', 3), p(2, 1, 'C', 1), p(1, 0, 'E')],
    [6],
  ),
  // xx0231
  'd-minor': diagram([r(4, 0, 'D'), p(3, 2, 'A', 2), r(2, 3, 'D', 3), p(1, 1, 'F', 1)], [6, 5]),
  // 022100
  'e-major': diagram([
    r(6, 0, 'E'),
    p(5, 2, 'B', 2),
    r(4, 2, 'E', 3),
    p(3, 1, 'G♯', 1),
    p(2, 0, 'B'),
    r(1, 0, 'E'),
  ]),
  // x02220
  'a-major': diagram(
    [r(5, 0, 'A'), p(4, 2, 'E', 1), r(3, 2, 'A', 2), p(2, 2, 'C♯', 3), p(1, 0, 'E')],
    [6],
  ),
  // 020100
  e7: diagram([
    r(6, 0, 'E'),
    p(5, 2, 'B', 2),
    p(4, 0, 'D'),
    p(3, 1, 'G♯', 1),
    p(2, 0, 'B'),
    r(1, 0, 'E'),
  ]),
  // x02020
  a7: diagram([r(5, 0, 'A'), p(4, 2, 'E', 2), p(3, 0, 'G'), p(2, 2, 'C♯', 3), p(1, 0, 'E')], [6]),
  // xx0212
  d7: diagram([r(4, 0, 'D'), p(3, 2, 'A', 2), p(2, 1, 'C', 1), p(1, 2, 'F♯', 3)], [6, 5]),
  // 320001
  g7: diagram([
    r(6, 3, 'G', 3),
    p(5, 2, 'B', 2),
    p(4, 0, 'D'),
    r(3, 0, 'G'),
    p(2, 0, 'B'),
    p(1, 1, 'F', 1),
  ]),
  // 022xxx
  e5: diagram([r(6, 0, 'E'), p(5, 2, 'B', 1), r(4, 2, 'E', 2)], [3, 2, 1]),
  // x022xx
  a5: diagram([r(5, 0, 'A'), p(4, 2, 'E', 1), r(3, 2, 'A', 2)], [6, 2, 1]),
  // xx023x
  d5: diagram([r(4, 0, 'D'), p(3, 2, 'A', 1), r(2, 3, 'D', 3)], [6, 5, 1]),
  // 133211: E-shape barre at the 1st fret
  'f-major': diagram([
    r(6, 1, 'F', 1),
    p(5, 3, 'C', 3),
    r(4, 3, 'F', 4),
    p(3, 2, 'A', 2),
    p(2, 1, 'C', 1),
    r(1, 1, 'F', 1),
  ]),
  // x24432: A-minor-shape barre at the 2nd fret
  'b-minor': diagram(
    [r(5, 2, 'B', 1), p(4, 4, 'F♯', 3), r(3, 4, 'B', 4), p(2, 3, 'D', 2), p(1, 2, 'F♯', 1)],
    [6],
  ),
  // x02010
  am7: diagram([r(5, 0, 'A'), p(4, 2, 'E', 2), p(3, 0, 'G'), p(2, 1, 'C', 1), p(1, 0, 'E')], [6]),
  // 020000
  em7: diagram([
    r(6, 0, 'E'),
    p(5, 2, 'B', 2),
    p(4, 0, 'D'),
    p(3, 0, 'G'),
    p(2, 0, 'B'),
    r(1, 0, 'E'),
  ]),
  // x32000
  cmaj7: diagram([r(5, 3, 'C', 3), p(4, 2, 'E', 2), p(3, 0, 'G'), p(2, 0, 'B'), p(1, 0, 'E')], [6]),
  // xx0211
  dm7: diagram([r(4, 0, 'D'), p(3, 2, 'A', 2), p(2, 1, 'C', 1), p(1, 1, 'F', 1)], [6, 5]),
}

/** Example fingerings for movable shapes, by shape slug. */
export const SHAPE_FINGERINGS: Record<string, ChordDiagramData> = {
  // 577655: E-shape at the 5th fret = A major
  'e-shape-major': diagram(
    [
      r(6, 5, 'A', 1),
      p(5, 7, 'E', 3),
      r(4, 7, 'A', 4),
      p(3, 6, 'C♯', 2),
      p(2, 5, 'E', 1),
      r(1, 5, 'A', 1),
    ],
    [],
    'A',
  ),
  // 577555 = A minor
  'e-shape-minor': diagram(
    [
      r(6, 5, 'A', 1),
      p(5, 7, 'E', 3),
      r(4, 7, 'A', 4),
      p(3, 5, 'C', 1),
      p(2, 5, 'E', 1),
      r(1, 5, 'A', 1),
    ],
    [],
    'Am',
  ),
  // x57775: A-shape at the 5th fret = D major
  'a-shape-major': diagram(
    [r(5, 5, 'D', 1), p(4, 7, 'A', 3), r(3, 7, 'D', 3), p(2, 7, 'F♯', 3), p(1, 5, 'A', 1)],
    [6],
    'D',
  ),
  // x57765 = D minor
  'a-shape-minor': diagram(
    [r(5, 5, 'D', 1), p(4, 7, 'A', 3), r(3, 7, 'D', 4), p(2, 6, 'F', 2), p(1, 5, 'A', 1)],
    [6],
    'Dm',
  ),

  // Triads on strings 3–1. C major: C–E–G / E–G–C / G–C–E.
  'triad-major-top-root': diagram(
    [r(3, 5, 'C', 2), p(2, 5, 'E', 3), p(1, 3, 'G', 1)],
    [6, 5, 4],
    'C',
  ),
  'triad-major-top-first': diagram(
    [p(3, 9, 'E', 2), p(2, 8, 'G', 1), r(1, 8, 'C', 1)],
    [6, 5, 4],
    'C',
  ),
  'triad-major-top-second': diagram(
    [p(3, 12, 'G', 1), r(2, 13, 'C', 2), p(1, 12, 'E', 1)],
    [6, 5, 4],
    'C',
  ),
  // E minor: E–G–B / G–B–E / B–E–G.
  'triad-minor-top-root': diagram(
    [r(3, 9, 'E', 3), p(2, 8, 'G', 2), p(1, 7, 'B', 1)],
    [6, 5, 4],
    'Em',
  ),
  'triad-minor-top-first': diagram(
    [p(3, 12, 'G', 1), p(2, 12, 'B', 1), r(1, 12, 'E', 1)],
    [6, 5, 4],
    'Em',
  ),
  'triad-minor-top-second': diagram(
    [p(3, 4, 'B', 2), r(2, 5, 'E', 3), p(1, 3, 'G', 1)],
    [6, 5, 4],
    'Em',
  ),

  // Shells, root on the 6th string, shown as G: root, 7th (string 4), 3rd (string 3).
  'shell-maj7-root-6': diagram(
    [r(6, 3, 'G', 2), p(4, 4, 'F♯', 3), p(3, 4, 'B', 4)],
    [5, 2, 1],
    'Gmaj7',
  ),
  'shell-m7-root-6': diagram(
    [r(6, 3, 'G', 2), p(4, 3, 'F', 3), p(3, 3, 'B♭', 4)],
    [5, 2, 1],
    'Gm7',
  ),
  'shell-7-root-6': diagram([r(6, 3, 'G', 2), p(4, 3, 'F', 3), p(3, 4, 'B', 4)], [5, 2, 1], 'G7'),

  // Jazz colours, root on the 5th string, shown in C.
  // x3434x
  'm7b5-root-5': diagram(
    [r(5, 3, 'C', 2), p(4, 4, 'G♭', 3), p(3, 3, 'B♭', 1), p(2, 4, 'E♭', 4)],
    [6, 1],
    'Cm7♭5',
  ),
  // x35555
  'maj6-root-5': diagram(
    [r(5, 3, 'C', 1), p(4, 5, 'G', 3), r(3, 5, 'C', 3), p(2, 5, 'E', 3), p(1, 5, 'A', 3)],
    [6],
    'C6',
  ),
  // x35545
  'm6-root-5': diagram(
    [r(5, 3, 'C', 1), p(4, 5, 'G', 3), r(3, 5, 'C', 3), p(2, 4, 'E♭', 2), p(1, 5, 'A', 4)],
    [6],
    'Cm6',
  ),
  // x3233x
  'dom9-root-5': diagram(
    [r(5, 3, 'C', 2), p(4, 2, 'E', 1), p(3, 3, 'B♭', 3), p(2, 3, 'D', 4)],
    [6, 1],
    'C9',
  ),
}
