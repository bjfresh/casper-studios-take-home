import type { QueryClient } from '@tanstack/react-query'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { updateLocalStorage } from './local-storage'
import type { ProgressOutboxEvent } from './progress-outbox-schema'

/*
 * A signed-in player's plays, stored on this device until the API has them
 * (an outbox). Recording a play never waits on the network: it lands here
 * first, the lesson moves on, and useProgressSync sends it in the background,
 * removing each play only once the server confirms it. Offline, a failed
 * request or a closed tab loses nothing; it syncs on the next chance.
 *
 * Guests don't use this: their progress stays local (STORAGE_KEYS.guestProgress)
 * until sign-up imports it.
 */

/** Adds a play to the end of the queue. */
export function enqueueOutboxEvent(
  queryClient: QueryClient,
  event: Omit<ProgressOutboxEvent, 'id'>,
): void {
  const withId = { ...event, id: crypto.randomUUID() } as ProgressOutboxEvent
  updateLocalStorage(queryClient, STORAGE_KEYS.progressOutbox, (queue) => [
    ...(queue ?? []),
    withId,
  ])
}

/** Removes one play (synced, or rejected for good). Clears the key when empty. */
export function removeOutboxEvent(queryClient: QueryClient, id: string): void {
  updateLocalStorage(queryClient, STORAGE_KEYS.progressOutbox, (queue) => {
    const rest = (queue ?? []).filter((event) => event.id !== id)
    return rest.length > 0 ? rest : null
  })
}
