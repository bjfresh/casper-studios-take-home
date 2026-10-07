import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { readStorage, useLocalStorage } from '@/data/local-storage'
import { removeOutboxEvent } from '@/data/progress-outbox'
import type { ProgressOutboxEvent } from '@/data/progress-outbox-schema'
import { isRetryable, toApiError } from '@/services/api-errors'
import { useApi } from './use-api'
import { useAuth } from './use-auth'

/** One sync at a time across tabs, where the browser supports it. */
const LOCK_NAME = 'casper:progress-outbox'

/**
 * Sends a signed-in player's queued plays (data/progress-outbox) to the API,
 * oldest first, removing each only once the server has it. Mounted once, in
 * AccountSync.
 *
 * Runs when the queue gains a play, when the player signs in, when the browser
 * comes back online and when the tab becomes visible again. It stops at the
 * first failure that might succeed later (offline, server down, signed out),
 * keeping order; a play the server can never accept (validation, a lesson that
 * no longer exists) is dropped instead, so one bad entry can't block the rest.
 */
export function useProgressSync() {
  const { isAuthenticated, userId } = useAuth()
  const api = useApi()
  const queryClient = useQueryClient()
  const [outbox] = useLocalStorage(STORAGE_KEYS.progressOutbox)
  const running = useRef(false)
  // Asked to run while already running: run once more after, so a play added
  // at the very end of a pass isn't left waiting for the next trigger.
  const runAgain = useRef(false)

  const send = useCallback(
    (event: ProgressOutboxEvent) =>
      event.type === 'item'
        ? api.client.lessons.recordItem(event.input)
        : api.client.lessons.finish(event.input),
    [api],
  )

  const flush = useCallback(async () => {
    if (!isAuthenticated || !userId) return
    if (running.current) {
      runAgain.current = true
      return
    }
    running.current = true
    try {
      await withLock(async () => {
        let synced = 0
        // Re-read each time: plays can be added (or synced by another tab) meanwhile.
        for (;;) {
          const queue = readStorage(STORAGE_KEYS.progressOutbox) ?? []
          const next = queue.find((event) => event.userId === userId)
          if (!next) break
          try {
            await send(next)
            synced += 1
          } catch (error) {
            if (isRetryable(error) || toApiError(error).code === 'UNAUTHENTICATED') break
            console.warn('[progress-sync] dropping a play the server rejected', toApiError(error))
          }
          removeOutboxEvent(queryClient, next.id)
        }
        if (synced > 0) {
          await queryClient.invalidateQueries({ queryKey: api.query.lessons.progress.key() })
        }
      })
    } finally {
      running.current = false
    }
    if (runAgain.current) {
      runAgain.current = false
      await flush()
    }
  }, [isAuthenticated, userId, queryClient, send, api])

  const pending = (outbox ?? []).filter((event) => event.userId === userId).length
  useEffect(() => {
    if (pending > 0) void flush()
  }, [pending, flush])

  useEffect(() => {
    const retry = () => {
      if (document.visibilityState === 'visible') void flush()
    }
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', retry)
    return () => {
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', retry)
    }
  }, [flush])
}

/**
 * Web Locks keep two tabs from sending the same play twice. Without them
 * (very old browsers) the in-tab guard still applies.
 */
async function withLock(run: () => Promise<void>) {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    await navigator.locks.request(LOCK_NAME, run)
  } else {
    await run()
  }
}
