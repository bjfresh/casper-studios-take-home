import { describe, expect, it } from 'vitest'
import { formatInterval, intervalOf, pitchClass, soundedPitch } from '../intervals'

const STANDARD = ['E', 'A', 'D', 'G', 'B', 'E']

describe('intervals', () => {
  it.each([
    ['major', 4, '3'],
    ['minor', 3, 'b3'],
    ['dominant_7', 10, 'b7'],
    ['major_7', 11, '7'],
    ['half_diminished_7', 6, 'b5'],
    ['major_6', 9, '6'],
    ['dominant_9', 2, '9'],
  ] as const)('%s: %i semitones → %s', (quality, semitones, interval) => {
    expect(intervalOf(semitones, 0, quality)).toBe(interval)
  })

  it('is null for a note outside the chord', () => {
    expect(intervalOf(1, 0, 'major')).toBeNull()
  })

  it('reads pitches off a tuning (string 1 = highest)', () => {
    expect(soundedPitch(STANDARD, 5, 3)).toBe(pitchClass('C'))
    expect(soundedPitch(STANDARD, 1, 0)).toBe(pitchClass('E'))
  })

  it.each([
    ['b3', '♭3'],
    ['b7', '♭7'],
    ['#5', '♯5'],
    ['#11', '♯11'],
    ['13', '13'],
  ] as const)('displays %s as %s', (stored, shown) => {
    expect(formatInterval(stored)).toBe(shown)
  })
})
