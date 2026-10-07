import { describe, expect, it } from 'vitest'
import { defaultReviewPolicy, reviewDueAt } from '../review-policy'

const DAY = 24 * 60 * 60 * 1000
const now = new Date('2026-10-06T12:00:00Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY)

describe('reviewDueAt', () => {
  it('ignores groups that were never completed', () => {
    expect(
      reviewDueAt({ completedAt: null, lastPlayedAt: daysAgo(30), playCount: 9 }, now),
    ).toBeNull()
  })

  it('brings a recently learned group back after a short interval', () => {
    const due = reviewDueAt(
      { completedAt: daysAgo(1), lastPlayedAt: daysAgo(1), playCount: 2 },
      now,
    )
    expect(due?.intervalDays).toBe(2)
    expect(due?.dueAt).toEqual(daysAgo(-1))
  })

  it('uses progressively longer intervals for older groups, capped', () => {
    const interval = (age: number) =>
      defaultReviewPolicy(
        { completedAt: daysAgo(age), lastPlayedAt: daysAgo(0), playCount: 5 },
        now,
      )
    expect(interval(1)).toBeLessThan(interval(30))
    expect(interval(30)).toBeLessThan(interval(90))
    expect(interval(1000)).toBe(60)
  })

  it('accepts a different policy without any other change', () => {
    const everyWeek = () => 7
    const due = reviewDueAt(
      { completedAt: daysAgo(100), lastPlayedAt: daysAgo(3), playCount: 1 },
      now,
      everyWeek,
    )
    expect(due).toEqual({ intervalDays: 7, dueAt: new Date(daysAgo(3).getTime() + 7 * DAY) })
  })
})
