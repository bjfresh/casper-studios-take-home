import { describe, expect, it } from 'vitest'
import { CHORD_FINGERINGS } from '../../curriculum/curriculum-fingerings'
import { voicingQualifiers } from '../curriculum-sync-service'

describe('voicingQualifiers', () => {
  it.each([
    ['c-major', 5],
    ['g-major', 6],
    ['d-major', 4],
    ['b-minor', 5],
    ['e-minor', 6],
  ])('%s: root string %i, root position', (slug, rootString) => {
    const diagram = CHORD_FINGERINGS[slug]
    if (!diagram) throw new Error(`no fingering for ${slug}`)
    expect(voicingQualifiers(diagram)).toEqual({
      rootString,
      inversion: 0,
      stringSetStart: null,
      stringSetEnd: null,
    })
  })

  it('leaves the inversion unknown when the lowest note is not a root', () => {
    expect(
      voicingQualifiers({
        positions: [
          { string: 6, fret: 0 },
          { string: 5, fret: 3, isRoot: true },
        ],
        mutedStrings: [],
      }),
    ).toEqual({ rootString: 5, inversion: null, stringSetStart: null, stringSetEnd: null })
  })

  it('every curriculum voicing is in root position', () => {
    for (const [slug, diagram] of Object.entries(CHORD_FINGERINGS)) {
      expect(voicingQualifiers(diagram).inversion, slug).toBe(0)
    }
  })
})
