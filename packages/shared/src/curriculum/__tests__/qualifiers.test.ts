import { describe, expect, it } from 'vitest'
import {
  formatOrdinal,
  formatShapeQualifier,
  NO_QUALIFIERS,
  validateShapeGeometry,
} from '../qualifiers'

describe('formatShapeQualifier', () => {
  it.each([
    [{ rootString: 6 }, '6th-string root'],
    [{ rootString: 5 }, '5th-string root'],
    [{ rootString: 4 }, '4th-string root'],
    [{ rootString: 1 }, '1st-string root'],
    [{ inversion: 0 }, 'Root position'],
    [{ inversion: 1, stringSetStart: 1, stringSetEnd: 3 }, '1st inversion · Strings 1–3'],
    [{ inversion: 2, stringSetStart: 2, stringSetEnd: 4 }, '2nd inversion · Strings 2–4'],
    [{ rootString: 5, inversion: 3 }, '5th-string root · 3rd inversion'],
    [{ stringSetStart: 3, stringSetEnd: 3 }, 'String 3'],
    [{}, ''],
    [NO_QUALIFIERS, ''],
  ])('%j → %j', (qualifiers, text) => {
    expect(formatShapeQualifier(qualifiers)).toBe(text)
  })

  it('ignores a half-specified string set rather than printing "Strings 1–null"', () => {
    expect(formatShapeQualifier({ stringSetStart: 1 })).toBe('')
  })
})

describe('formatOrdinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
  ])('%i → %s', (n, text) => {
    expect(formatOrdinal(n)).toBe(text)
  })
})

describe('validateShapeGeometry', () => {
  const triad = {
    rootString: null,
    inversion: 1,
    stringSetStart: 1,
    stringSetEnd: 3,
    strings: [3, 2, 1],
  }

  it('accepts consistent geometry', () => {
    expect(validateShapeGeometry(triad, { stringCount: 6, noteCount: 3 })).toEqual([])
  })

  it('checks the root string against the INSTRUMENT, not a global 6', () => {
    const shape = { ...NO_QUALIFIERS, rootString: 6 }
    expect(validateShapeGeometry(shape, { stringCount: 6 })).toEqual([])
    expect(validateShapeGeometry(shape, { stringCount: 4 })).toEqual([
      "root string 6 doesn't exist on a 4-string instrument",
    ])
    expect(validateShapeGeometry({ ...NO_QUALIFIERS, rootString: 7 }, { stringCount: 7 })).toEqual(
      [],
    )
  })

  it('requires a string set to match the strings actually used', () => {
    expect(validateShapeGeometry({ ...triad, strings: [4, 3, 2] }, { stringCount: 6 })).toEqual([
      "string set 1–3 doesn't match the strings used (2, 3, 4)",
    ])
  })

  it('rejects half string sets, reversed sets, and impossible inversions', () => {
    expect(validateShapeGeometry({ ...triad, stringSetEnd: null }, { stringCount: 6 })).toContain(
      'a string set needs both a start and an end',
    )
    expect(
      validateShapeGeometry(
        { ...triad, stringSetStart: 3, stringSetEnd: 1, strings: undefined },
        { stringCount: 6 },
      ),
    ).toContain('string set ends before it starts')
    expect(
      validateShapeGeometry({ ...triad, inversion: 3 }, { stringCount: 6, noteCount: 3 }),
    ).toEqual(['a 3-note chord has no inversion 3'])
  })
})
