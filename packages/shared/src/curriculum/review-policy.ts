import type { ChordGroupProgress } from './curriculum'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * A review policy turns one group's progress into "review again after N days".
 * It's an injectable function, not SQL, so a real spaced-repetition algorithm
 * can replace it later without touching the schema or the queries: everything
 * it might need (first completion, last practice, practice count) is stored.
 */
export type ReviewPolicy = (progress: CompletedProgress, now: Date) => number

export type CompletedProgress = ChordGroupProgress & { completedAt: Date; lastPlayedAt: Date }

/**
 * Deliberately simple placeholder: the interval grows with how long ago the
 * group was learned. Half that age, clamped to [2, 60] days — a group learned
 * this week comes back after 2 days, one learned months ago after ~2 months.
 */
export const defaultReviewPolicy: ReviewPolicy = ({ completedAt }, now) => {
  const ageDays = (now.getTime() - completedAt.getTime()) / DAY_MS
  return Math.min(60, Math.max(2, Math.round(ageDays / 2)))
}

/** When this group is next due, or null if it isn't eligible for review (not completed). */
export function reviewDueAt(
  progress: ChordGroupProgress,
  now: Date,
  policy: ReviewPolicy = defaultReviewPolicy,
): { dueAt: Date; intervalDays: number } | null {
  const { completedAt, lastPlayedAt } = progress
  // Only completed groups are reviewed; an incomplete one is still being learned.
  if (!completedAt || !lastPlayedAt) return null
  const intervalDays = policy({ ...progress, completedAt, lastPlayedAt }, now)
  return { dueAt: new Date(lastPlayedAt.getTime() + intervalDays * DAY_MS), intervalDays }
}
