import { describe, expect, it } from 'vitest'
import { chordSlug, chordSymbol } from '../chords'

describe('chord naming', () => {
  it.each([
    ['G', 'major', 'g-major', 'G'],
    ['C', 'major', 'c-major', 'C'],
    ['E', 'minor', 'e-minor', 'Em'],
    ['A', 'minor', 'a-minor', 'Am'],
    ['E', 'dominant_7', 'e7', 'E7'],
    ['E', 'power', 'e5', 'E5'],
    ['C', 'major_7', 'cmaj7', 'Cmaj7'],
    ['D', 'minor_7', 'dm7', 'Dm7'],
    ['B', 'half_diminished_7', 'bm7b5', 'Bm7♭5'],
    ['F#', 'minor', 'f-sharp-minor', 'F♯m'],
    ['Bb', 'major', 'b-flat-major', 'B♭'],
  ] as const)('%s %s → slug %s, symbol %s', (root, quality, slug, symbol) => {
    expect(chordSlug(root, quality)).toBe(slug)
    expect(chordSymbol(root, quality)).toBe(symbol)
  })

  it('spells B natural minor without mistaking it for a flat', () => {
    expect(chordSymbol('B', 'minor')).toBe('Bm')
    expect(chordSlug('B', 'minor')).toBe('b-minor')
  })
})
