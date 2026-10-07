import { describe, expect, it } from 'vitest'
import { formatLastPlayed } from '../relative-time'

const now = new Date(2026, 9, 6, 12, 0) // 6 Oct 2026, noon local
const daysAgo = (days: number, hour = 12) => new Date(2026, 9, 6 - days, hour, 0)

describe('formatLastPlayed', () => {
  it.each([
    [null, 'Never played'],
    [daysAgo(0, 1), 'Today'],
    [daysAgo(1, 23), 'Yesterday'],
    [daysAgo(3), '3 days ago'],
    [daysAgo(13), '13 days ago'],
    [daysAgo(14), '2 weeks ago'],
    [daysAgo(45), '6 weeks ago'],
    [daysAgo(60), '2 months ago'],
    [daysAgo(130), '4 months ago'],
    [daysAgo(400), '1 year ago'],
  ] as const)('%s → %s', (date, label) => {
    expect(formatLastPlayed(date, now)).toBe(label)
  })

  it('counts calendar days, not 24-hour periods', () => {
    const lateLastNight = new Date(2026, 9, 5, 23, 50)
    const justAfterMidnight = new Date(2026, 9, 6, 0, 0)
    expect(formatLastPlayed(lateLastNight, justAfterMidnight)).toBe('Yesterday')
  })

  it('never says "in the future" for clock skew', () => {
    expect(formatLastPlayed(new Date(2026, 9, 7), now)).toBe('Today')
  })

  it('says "1 month ago" for about a month', () => {
    expect(formatLastPlayed(daysAgo(35), now)).toBe('5 weeks ago')
    expect(formatLastPlayed(daysAgo(61), now)).toBe('2 months ago')
  })
})
