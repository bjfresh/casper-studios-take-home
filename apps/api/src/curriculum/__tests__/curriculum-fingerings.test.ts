import {
  type ChordDiagramData,
  type ChordQuality,
  chordDiagramSchema,
  chordSlug,
  chordSymbol,
} from '@repo/shared'
import { describe, expect, it } from 'vitest'
import { CHORD_FINGERINGS, SHAPE_FINGERINGS } from '../curriculum-fingerings'
import { CURRICULUM } from '../curriculum-source'

// Checks the MUSIC, not just the data shape: every fret is turned into a pitch
// and compared with its label and with the chord's tones.

const STANDARD_TUNING = ['E', 'A', 'D', 'G', 'B', 'E'] // low → high

const PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** Pitch class of a note name: C, F♯, B♭, C#, Eb. */
function pitchClass(name: string): number {
  const letter = PITCH[name[0] ?? '']
  if (letter === undefined) throw new Error(`Not a note: ${name}`)
  const accidental = name.slice(1)
  const shift = /^[♯#]$/.test(accidental) ? 1 : /^[♭b]$/.test(accidental) ? -1 : 0
  return (letter + shift + 12) % 12
}

/** The pitch class actually sounded at (string, fret) in standard tuning. */
function soundedPitch(string: number, fret: number): number {
  const open = STANDARD_TUNING[STANDARD_TUNING.length - string]
  if (!open) throw new Error(`No string ${string}`)
  return (pitchClass(open) + fret) % 12
}

const INTERVALS: Record<ChordQuality, number[]> = {
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
}

/** The chord a diagram must spell, checked note by note. */
function checkSpells(
  diagram: ChordDiagramData,
  rootName: string,
  quality: ChordQuality,
  label: string,
) {
  const root = pitchClass(rootName)
  const tones = new Set(INTERVALS[quality].map((interval) => (root + interval) % 12))
  const played = new Set<number>()

  for (const { string, fret, note, isRoot } of diagram.positions) {
    const pitch = soundedPitch(string, fret)
    played.add(pitch)
    expect(
      note && pitchClass(note),
      `${label}: string ${string} fret ${fret} is labelled ${note}`,
    ).toBe(pitch)
    expect(
      tones.has(pitch),
      `${label}: string ${string} fret ${fret} (${note}) isn't a chord tone`,
    ).toBe(true)
    expect(Boolean(isRoot), `${label}: string ${string} root flag`).toBe(pitch === root)
    expect(
      diagram.mutedStrings,
      `${label}: string ${string} is both played and muted`,
    ).not.toContain(string)
  }
  // Root and third (or fifth, for a power chord) must sound; extensions may omit the 5th.
  const essential = [0, quality === 'power' ? 7 : (INTERVALS[quality][1] ?? 0)]
  for (const interval of essential) {
    expect(played.has((root + interval) % 12), `${label}: missing interval ${interval}`).toBe(true)
  }
}

describe('chord fingerings', () => {
  it('exist for every chord in the curriculum, and nothing else', () => {
    const slugs = CURRICULUM.chords.map(({ root, quality }) => chordSlug(root, quality))
    expect(Object.keys(CHORD_FINGERINGS).sort()).toEqual([...slugs].sort())
  })

  it.each(
    CURRICULUM.chords.map((chord) => [chordSymbol(chord.root, chord.quality), chord] as const),
  )('%s is spelled correctly', (name, { root, quality }) => {
    const diagram = chordDiagramSchema.parse(CHORD_FINGERINGS[chordSlug(root, quality)])
    checkSpells(diagram, root, quality, name)
  })
})

describe('shape fingerings', () => {
  it('exist for every shape in the curriculum, and nothing else', () => {
    expect(Object.keys(SHAPE_FINGERINGS).sort()).toEqual(
      CURRICULUM.shapes.map((shape) => shape.slug).sort(),
    )
  })

  it.each(CURRICULUM.shapes.map((shape) => [shape.slug, shape] as const))(
    '%s is spelled correctly',
    (slug, shape) => {
      const diagram = chordDiagramSchema.parse(SHAPE_FINGERINGS[slug])
      const rootName = diagram.exampleName?.match(/^[A-G][♯♭#b]?/)?.[0]
      expect(rootName, `${slug} needs an exampleName`).toBeDefined()
      checkSpells(diagram, rootName ?? 'C', shape.quality, slug)
    },
  )

  it.each(CURRICULUM.shapes.map((shape) => [shape.slug, shape] as const))(
    '%s plays exactly its own strings, with the root where the shape says',
    (slug, shape) => {
      const diagram = chordDiagramSchema.parse(SHAPE_FINGERINGS[slug])
      expect(diagram.positions.map((position) => position.string).sort()).toEqual(
        [...shape.strings].sort(),
      )
      if (shape.rootString !== null) {
        const lowestRoot = Math.max(
          ...diagram.positions
            .filter((position) => position.isRoot)
            .map((position) => position.string),
        )
        expect(lowestRoot, `${slug}: lowest root string`).toBe(shape.rootString)
      }
    },
  )
})
