const DAY_MS = 24 * 60 * 60 * 1000

/** Midnight (local time) at the start of `date`'s day, as a day count. */
function dayNumber(date: Date): number {
  return Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / DAY_MS,
  )
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`

/**
 * "Today", "Yesterday", "3 days ago", "2 weeks ago", "1 month ago",
 * "4 months ago", "2 years ago", or "Never played". Counts CALENDAR days in
 * the viewer's time zone, so something played at 23:50 is "Yesterday" ten
 * minutes later, which is how people talk about it. The one formatter for
 * last-played dates; don't reimplement it in components.
 */
export function formatLastPlayed(date: Date | null | undefined, now: Date = new Date()): string {
  if (!date) return 'Never played'
  const days = Math.max(0, dayNumber(now) - dayNumber(date))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 14) return plural(days, 'day')
  if (days < 60) return plural(Math.floor(days / 7), 'week')
  if (days < 365) return plural(Math.floor(days / 30), 'month')
  return plural(Math.floor(days / 365), 'year')
}
