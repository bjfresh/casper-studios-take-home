import {
  applyItemResult,
  EMPTY_GUEST_PROGRESS,
  finishGroup,
  type GuestProgress,
  ITEM_RESULTS,
  type ItemResult,
  itemKey,
  type LessonContent,
  type LessonItem,
} from '@repo/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { updateLocalStorage, useLocalStorage } from '@/data/local-storage'
import { enqueueOutboxEvent } from '@/data/progress-outbox'
import { useApi } from './use-api'
import { useAuth } from './use-auth'

export type LessonPlayRecord = {
  completedAt: Date | null
  lastPlayedAt: Date | null
  playCount: number
}

const toDate = (ms: number | null) => (ms === null ? null : new Date(ms))
const later = (a: Date | null, b: Date) => (a && a > b ? a : b)

/** The guest's local progress, live across components and tabs. */
export function useGuestProgress(): GuestProgress {
  const [progress] = useLocalStorage(STORAGE_KEYS.guestProgress)
  return progress ?? EMPTY_GUEST_PROGRESS
}

/**
 * Last-played/completion per lesson slug, from the account when signed in and
 * from this browser otherwise. `isReady` is false until auth has settled, so
 * nothing ever flashes a guest's numbers for a signed-in player.
 *
 * Signed in, plays still waiting to sync (the outbox) are applied on top, so
 * the grid shows "Today" the moment a lesson ends, online or not. Only what
 * the client can know is applied: completion is decided by the server.
 */
export function useLessonPlayRecords(instrument: 'guitar' | 'bass' = 'guitar') {
  const { isReady, isAuthenticated, userId } = useAuth()
  const api = useApi()
  const guest = useGuestProgress()
  const [outbox] = useLocalStorage(STORAGE_KEYS.progressOutbox)
  const account = useQuery({
    ...api.query.lessons.progress.queryOptions({ input: { instrument } }),
    enabled: isReady && isAuthenticated,
  })

  const records = new Map<string, LessonPlayRecord>()
  if (isAuthenticated) {
    for (const { slug, ...record } of account.data ?? []) records.set(slug, record)
    for (const event of outbox ?? []) {
      if (event.userId !== userId) continue
      // A skip isn't a play (see progress-rules.ts).
      if (event.type === 'item' && event.input.result === ITEM_RESULTS.SKIPPED) continue
      const record = records.get(event.groupSlug) ?? {
        completedAt: null,
        lastPlayedAt: null,
        playCount: 0,
      }
      records.set(event.groupSlug, {
        ...record,
        lastPlayedAt: later(record.lastPlayedAt, new Date(event.at)),
        playCount: record.playCount + (event.type === 'finish' ? 1 : 0),
      })
    }
  } else {
    for (const [slug, record] of Object.entries(guest.groups)) {
      records.set(slug, {
        completedAt: toDate(record.completedAt),
        lastPlayedAt: toDate(record.lastPlayedAt),
        playCount: record.playCount,
      })
    }
  }

  return {
    records,
    isReady: isReady && (!isAuthenticated || account.isSuccess),
    error: account.error,
  }
}

/**
 * Records Got it / Skip and the end of a lesson, always on this device first,
 * so it never waits on (or fails with) the network:
 *
 * - Signed in: the play joins the outbox (data/progress-outbox), and
 *   useProgressSync sends it to the API in the background.
 * - Guest: the shared rules update local progress, which sign-up imports.
 *
 * Same rules both ways (progress-rules.ts in @repo/shared; the API applies
 * them in SQL). Throws only if this device can't store anything.
 */
export function useLessonRecorder(lesson: LessonContent) {
  const { isReady, isAuthenticated, userId } = useAuth()
  const queryClient = useQueryClient()

  const recordItem = useCallback(
    async (item: LessonItem, result: ItemResult) => {
      const at = Date.now()
      if (isAuthenticated && userId) {
        enqueueOutboxEvent(queryClient, {
          type: 'item',
          userId,
          at,
          groupSlug: lesson.slug,
          input: { groupId: lesson.id, item: { type: item.type, id: item.id }, result },
        })
        return
      }
      updateLocalStorage(queryClient, STORAGE_KEYS.guestProgress, (current) =>
        applyItemResult(
          current ?? EMPTY_GUEST_PROGRESS,
          { groupSlug: lesson.slug, key: itemKey(item.type, item.slug), result },
          at,
        ),
      )
    },
    [isAuthenticated, userId, lesson.id, lesson.slug, queryClient],
  )

  const finish = useCallback(async () => {
    const at = Date.now()
    if (isAuthenticated && userId) {
      enqueueOutboxEvent(queryClient, {
        type: 'finish',
        userId,
        at,
        groupSlug: lesson.slug,
        input: { groupId: lesson.id },
      })
      return
    }
    updateLocalStorage(queryClient, STORAGE_KEYS.guestProgress, (current) =>
      finishGroup(
        current ?? EMPTY_GUEST_PROGRESS,
        {
          groupSlug: lesson.slug,
          itemKeys: lesson.items.map((item) => itemKey(item.type, item.slug)),
        },
        at,
      ),
    )
  }, [isAuthenticated, userId, lesson, queryClient])

  return { recordItem, finish, isReady }
}
