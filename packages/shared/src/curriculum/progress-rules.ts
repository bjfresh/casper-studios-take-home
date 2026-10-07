import { z } from 'zod'
import type { ItemResult } from './lessons'

/*
 * The lesson progress rules, in one place. Guests apply them to localStorage
 * with these functions; the API applies the same rules in SQL
 * (apps/api/src/services/lesson-service.ts). Keep the two in step.
 *
 *   Got it   item:  learnedAt ??= now, lastPlayedAt = now, playCount + 1
 *            group: lastPlayedAt = now (so a half-finished session still
 *                   counts as "played today")
 *   Skip     item:  lastSkippedAt = now. Nothing else: a skip isn't practice,
 *                   and the item stays unlearned, so it remains eligible for
 *                   review.
 *   Finish   group: playCount + 1, lastPlayedAt = now, and completedAt ??= now
 *                   once EVERY item in the group has been learned. A lesson
 *                   played with skips counts as played but not completed.
 *
 * "??=" means "first time only": completion and learned dates never move.
 */

/** Epoch milliseconds: survives JSON (localStorage) without a date-parsing step. */
const timestamp = z.number().int().nonnegative()

export const guestGroupProgressSchema = z.object({
  completedAt: timestamp.nullable(),
  lastPlayedAt: timestamp.nullable(),
  playCount: z.number().int().nonnegative(),
})

export const guestItemProgressSchema = z.object({
  learnedAt: timestamp.nullable(),
  lastPlayedAt: timestamp.nullable(),
  lastSkippedAt: timestamp.nullable(),
  playCount: z.number().int().nonnegative(),
})

/** `chord:<slug>` or `shape:<slug>`: stable across environments, unlike ids. */
export const itemKeySchema = z.string().regex(/^(chord|shape):[a-z0-9-]+$/)

/**
 * A guest's progress, keyed by SLUG (never database ids, which differ between
 * environments and mean nothing before an account exists). The same shape is
 * stored in localStorage and sent to `lessons.importGuestProgress` after
 * sign-up, so nothing needs converting.
 */
export const guestProgressSchema = z.object({
  version: z.literal(1),
  groups: z.record(z.string().regex(/^[a-z0-9-]+$/), guestGroupProgressSchema),
  items: z.record(itemKeySchema, guestItemProgressSchema),
})

export type GuestProgress = z.infer<typeof guestProgressSchema>
export type GuestGroupProgress = z.infer<typeof guestGroupProgressSchema>
export type GuestItemProgress = z.infer<typeof guestItemProgressSchema>

export const EMPTY_GUEST_PROGRESS: GuestProgress = { version: 1, groups: {}, items: {} }

export function isGuestProgressEmpty(progress: GuestProgress): boolean {
  return Object.keys(progress.groups).length === 0 && Object.keys(progress.items).length === 0
}

export const itemKey = (type: 'chord' | 'shape', slug: string) => `${type}:${slug}`

const NO_GROUP: GuestGroupProgress = { completedAt: null, lastPlayedAt: null, playCount: 0 }
const NO_ITEM: GuestItemProgress = {
  learnedAt: null,
  lastPlayedAt: null,
  lastSkippedAt: null,
  playCount: 0,
}

export function applyItemResult(
  progress: GuestProgress,
  { groupSlug, key, result }: { groupSlug: string; key: string; result: ItemResult },
  now: number,
): GuestProgress {
  const item = progress.items[key] ?? NO_ITEM
  if (result === 'skipped') {
    return { ...progress, items: { ...progress.items, [key]: { ...item, lastSkippedAt: now } } }
  }
  const group = progress.groups[groupSlug] ?? NO_GROUP
  return {
    ...progress,
    items: {
      ...progress.items,
      [key]: {
        ...item,
        learnedAt: item.learnedAt ?? now,
        lastPlayedAt: now,
        playCount: item.playCount + 1,
      },
    },
    groups: { ...progress.groups, [groupSlug]: { ...group, lastPlayedAt: now } },
  }
}

export function finishGroup(
  progress: GuestProgress,
  { groupSlug, itemKeys }: { groupSlug: string; itemKeys: readonly string[] },
  now: number,
): GuestProgress {
  const group = progress.groups[groupSlug] ?? NO_GROUP
  const allLearned =
    itemKeys.length > 0 && itemKeys.every((key) => progress.items[key]?.learnedAt != null)
  return {
    ...progress,
    groups: {
      ...progress.groups,
      [groupSlug]: {
        completedAt: group.completedAt ?? (allLearned ? now : null),
        lastPlayedAt: now,
        playCount: group.playCount + 1,
      },
    },
  }
}

export const importGuestProgressResultSchema = z.object({
  groups: z.number().int().nonnegative(),
  items: z.number().int().nonnegative(),
})
