import { CHORD_QUALITY_NOTE_COUNT, chordSlug, validateShapeGeometry } from '@repo/shared'
import { describe, expect, it } from 'vitest'
import { CURRICULUM } from '../curriculum-source'

// Validates the curriculum source itself — no database. These are the
// invariants the schema deliberately doesn't enforce (see chord_groups).

/** Groups per instrument (Map.groupBy is newer than this repo's ES2023 target). */
function byInstrument(groups: typeof CURRICULUM.groups) {
  const result = new Map<string, typeof CURRICULUM.groups>()
  for (const group of groups) {
    const key = group.instrument ?? 'guitar'
    result.set(key, [...(result.get(key) ?? []), group])
  }
  return result
}

const chordSlugs = CURRICULUM.chords.map(({ root, quality }) => chordSlug(root, quality))
const shapeSlugs = CURRICULUM.shapes.map((shape) => shape.slug)

describe('curriculum source', () => {
  it('has the thirteen groups, in order', () => {
    expect(CURRICULUM.groups.map((group) => group.name)).toEqual([
      'First Chords',
      'First Minors',
      'The C Family',
      'The A Family',
      'Seventh Chords',
      'Power Chords',
      'The Missing Chords',
      'Movable Major & Minor',
      'Small Chords',
      'Major & Minor Sevenths',
      'Shell Chords',
      'ii–V–I',
      'Jazz Colors',
    ])
  })

  it('numbers the main path Lesson 1–13 with sortOrder spaced in tens', () => {
    expect(CURRICULUM.groups.map((group) => [group.lessonNumber, group.sortOrder])).toEqual(
      Array.from({ length: 13 }, (_, index) => [index + 1, (index + 1) * 10]),
    )
  })

  it('keeps sortOrder unique and ascending in file order, per instrument', () => {
    for (const groups of byInstrument(CURRICULUM.groups).values()) {
      const orders = groups.map((group) => group.sortOrder)
      expect(orders).toEqual([...orders].sort((a, b) => a - b))
      expect(new Set(orders).size).toBe(orders.length)
    }
  })

  it('numbers lessons 1…N without gaps or repeats, in sortOrder order (unnumbered groups allowed)', () => {
    for (const groups of byInstrument(CURRICULUM.groups).values()) {
      const numbers = [...groups]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .flatMap((group) => (group.lessonNumber === null ? [] : [group.lessonNumber]))
      expect(numbers).toEqual(numbers.map((_, index) => index + 1))
    }
  })

  it('has unique slugs for chords, shapes and groups', () => {
    for (const slugs of [chordSlugs, shapeSlugs, CURRICULUM.groups.map((group) => group.slug)]) {
      expect(new Set(slugs).size).toBe(slugs.length)
    }
  })

  it('only references chords and shapes that exist', () => {
    for (const group of CURRICULUM.groups) {
      for (const { chord } of group.chords ?? []) expect(chordSlugs).toContain(chord)
      for (const { shape } of group.shapes ?? []) expect(shapeSlugs).toContain(shape)
    }
  })

  it('introduces every chord exactly once, and only practices chords introduced earlier', () => {
    const introducedBy = new Map<string, number>()
    CURRICULUM.groups.forEach((group, index) => {
      for (const { chord, role = 'introduces' } of group.chords ?? []) {
        if (role === 'introduces') {
          expect(introducedBy.has(chord), `${chord} introduced twice`).toBe(false)
          introducedBy.set(chord, index)
        } else {
          const at = introducedBy.get(chord)
          expect(at, `${group.slug} practices ${chord} before it's introduced`).toBeDefined()
          expect(at ?? Number.POSITIVE_INFINITY).toBeLessThan(index)
        }
      }
    })
    expect([...introducedBy.keys()].sort()).toEqual([...chordSlugs].sort())
  })

  it('keeps groups small: a few new things at a time', () => {
    for (const group of CURRICULUM.groups) {
      const items = (group.chords?.length ?? 0) + (group.shapes?.length ?? 0)
      expect(items, group.slug).toBeGreaterThan(0)
      expect(items, group.slug).toBeLessThanOrEqual(6)
    }
  })

  it('lets a group be pure practice (ii–V–I reuses earlier chords)', () => {
    const iiVI = CURRICULUM.groups.find((group) => group.slug === 'ii-v-i')
    expect(iiVI?.focus).toBe('progression')
    expect(iiVI?.chords?.map((member) => [member.chord, member.role])).toEqual([
      ['dm7', 'practices'],
      ['g7', 'practices'],
      ['cmaj7', 'practices'],
    ])
  })

  it('keeps qualifiers out of titles: they live in structured fields', () => {
    for (const shape of CURRICULUM.shapes) {
      expect(shape.title, shape.slug).not.toMatch(/\(|root on|inversion|root position|strings? \d/i)
    }
  })

  it('gives every shape geometry that is valid for its instrument', () => {
    for (const shape of CURRICULUM.shapes) {
      const problems = validateShapeGeometry(
        {
          rootString: shape.rootString,
          inversion: shape.inversion ?? null,
          stringSetStart: shape.stringSetStart ?? null,
          stringSetEnd: shape.stringSetEnd ?? null,
          strings: shape.strings,
        },
        { stringCount: 6, noteCount: CHORD_QUALITY_NOTE_COUNT[shape.quality] },
      )
      expect(problems, shape.slug).toEqual([])
    }
  })

  it('describes triads by inversion and string set, shells by root string', () => {
    const triads = CURRICULUM.shapes.filter((shape) => shape.kind === 'triad')
    const shells = CURRICULUM.shapes.filter((shape) => shape.kind === 'shell')
    for (const triad of triads) {
      expect([triad.inversion, triad.stringSetStart, triad.stringSetEnd, triad.rootString]).toEqual(
        [expect.any(Number), 1, 3, null],
      )
    }
    for (const shell of shells) expect(shell.rootString).toBe(6)
  })

  it('places each shape’s root on one of its own strings', () => {
    for (const shape of CURRICULUM.shapes) {
      if (shape.rootString !== null) expect(shape.strings, shape.slug).toContain(shape.rootString)
    }
  })
})
