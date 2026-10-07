import { describe, expect, it } from 'vitest'
import {
  computeFretWindow,
  describeFingering,
  displayOrder,
  FRET_ROWS,
  stringStrokeWidth,
} from '../chord-diagram-layout'
import { EXAMPLE_FINGERINGS } from '../examples'

const at = (...frets: number[]) => frets.map((fret, index) => ({ string: index + 1, fret }))

describe('computeFretWindow', () => {
  it('always the same number of rows, whatever the chord', () => {
    const shapes = [at(0, 1, 0, 2, 3), at(1), at(5, 3), at(9, 9), at(7, 8, 9)]
    for (const shape of shapes) expect(computeFretWindow(shape).rows).toBe(FRET_ROWS)
    expect(computeFretWindow(EXAMPLE_FINGERINGS.cMajorOpen.fingering.positions).rows).toBe(
      FRET_ROWS,
    )
    expect(computeFretWindow(EXAMPLE_FINGERINGS.bMajorBarre7.fingering.positions).rows).toBe(
      FRET_ROWS,
    )
  })

  it('open chords start at the nut', () => {
    expect(computeFretWindow(EXAMPLE_FINGERINGS.cMajorOpen.fingering.positions)).toEqual({
      startFret: 1,
      rows: 5,
      showNut: true,
    })
  })

  it('all-open (or empty) shapes still show the nut', () => {
    expect(computeFretWindow(at(0, 0, 0))).toEqual({ startFret: 1, rows: 5, showNut: true })
    expect(computeFretWindow([])).toEqual({ startFret: 1, rows: 5, showNut: true })
  })

  it('a shape within the rows of the nut stays anchored to it', () => {
    expect(computeFretWindow(at(5, 3))).toEqual({ startFret: 1, rows: 5, showNut: true })
  })

  it('higher shapes shift the window (frets 7–11), not the grid size', () => {
    expect(computeFretWindow(EXAMPLE_FINGERINGS.bMajorBarre7.fingering.positions)).toEqual({
      startFret: 7,
      rows: 5,
      showNut: false,
    })
    expect(computeFretWindow(at(9, 9))).toEqual({ startFret: 9, rows: 5, showNut: false })
  })

  it('never crops a played note: an impossible span is shown in full', () => {
    expect(computeFretWindow(at(7, 13))).toEqual({ startFret: 7, rows: 7, showNut: false })
  })

  it('takes a custom row count', () => {
    expect(computeFretWindow(at(6), { rows: 6 })).toEqual({ startFret: 1, rows: 6, showNut: true })
    expect(computeFretWindow(at(2), { rows: 3 })).toEqual({ startFret: 1, rows: 3, showNut: true })
  })
})

describe('displayOrder', () => {
  it('right-handed: lowest string on the left', () => {
    expect(displayOrder(6, 'right')).toEqual([6, 5, 4, 3, 2, 1])
  })
  it('left-handed: mirrored', () => {
    expect(displayOrder(6, 'left')).toEqual([1, 2, 3, 4, 5, 6])
  })
  it('works for any string count', () => {
    expect(displayOrder(4, 'right')).toEqual([4, 3, 2, 1])
    expect(displayOrder(5, 'left')).toEqual([1, 2, 3, 4, 5])
  })
})

describe('stringStrokeWidth', () => {
  it('is heavier for lower strings, within a subtle range', () => {
    const widths = [1, 2, 3, 4, 5, 6].map((string) => stringStrokeWidth(string, 6))
    expect(widths).toEqual([...widths].sort((a, b) => a - b))
    expect(widths[0]).toBe(1)
    expect(widths[5]).toBeCloseTo(2.2)
  })
})

describe('describeFingering', () => {
  it('reads low to high, naming muted strings, open strings and roots', () => {
    const { fingering, tuning } = EXAMPLE_FINGERINGS.cMajorOpen
    expect(describeFingering(fingering, tuning)).toBe(
      'E string: muted. A string: 3rd fret, finger 3, root. D string: 2nd fret, finger 2. ' +
        'G string: open. B string: 1st fret, finger 1, root. E string: open.',
    )
  })

  it('uses the tuning for string names (5-string bass)', () => {
    const { fingering, tuning } = EXAMPLE_FINGERINGS.bass5FRootFifthOctave
    expect(describeFingering(fingering, tuning)).toMatch(/^B string: 6th fret, finger 1, root\./)
  })
})
