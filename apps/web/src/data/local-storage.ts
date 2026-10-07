import { guestProgressSchema } from '@repo/shared'
import {
  type QueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import type { z } from 'zod'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { progressOutboxSchema } from './progress-outbox-schema'

/**
 * Type-safe localStorage, read and written through React Query.
 *
 * Going through the query cache rather than reading storage directly buys
 * three things: every component observing a key re-renders when it changes,
 * reads are deduped, and SSR gets a defined value instead of a crash.
 *
 * Every key declares a Zod schema. Storage is user-writable, so nothing is
 * trusted on the way in: a malformed or stale value parses to `null`, which
 * callers handle as "not set" rather than as an error.
 *
 * Adding a key: add it to STORAGE_KEYS and an entry here with its schema. The
 * key's type is inferred from that schema, so nothing else needs updating.
 *
 * (Older keys, such as preferences and pending settings, still use
 * createStorageItem in storage.ts.)
 */

/** The single registry: key → schema. */
const storageKeys = {
  [STORAGE_KEYS.guestProgress]: guestProgressSchema,
  [STORAGE_KEYS.progressOutbox]: progressOutboxSchema,
} as const satisfies Record<string, z.ZodType>

export type LocalStorageKey = keyof typeof storageKeys
export type LocalStorageValue<K extends LocalStorageKey> = z.infer<(typeof storageKeys)[K]>

/**
 * Guarded on every access: this module is imported by client components that
 * still render on the server, where `localStorage` is undefined. Access can
 * also throw outright in Safari's private mode, so presence alone isn't enough.
 */
function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

/** Reads and validates a key. Returns null when unset, unreadable or invalid. */
export function readStorage<K extends LocalStorageKey>(key: K): LocalStorageValue<K> | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const result = storageKeys[key].safeParse(JSON.parse(raw))
    if (!result.success) console.warn(`[storage] "${key}" failed validation; treating as unset`)
    return result.success ? (result.data as LocalStorageValue<K>) : null
  } catch {
    // Malformed JSON is the same situation as a failed parse: nothing usable.
    return null
  }
}

/**
 * Writes a key, or removes it when passed null.
 *
 * Returns false rather than throwing when the write fails: a full quota or a
 * privacy-mode block shouldn't take down the flow the user is in the middle of.
 */
export function writeStorage<K extends LocalStorageKey>(
  key: K,
  value: LocalStorageValue<K> | null,
): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Query keys are namespaced so a storage key can't collide with an API one. */
export function localStorageQueryKey<K extends LocalStorageKey>(key: K) {
  return ['localStorage', key] as const
}

/**
 * Query options for a key.
 *
 *   const { data } = useQuery(localStorageQuery(STORAGE_KEYS.guestProgress))
 *
 * `staleTime: Infinity` because the cache is the source of truth once loaded:
 * this tab's writes go through `updateLocalStorage`, other tabs' arrive via
 * the `storage` event (useLocalStorage), and refetching would only re-read
 * what was just written.
 */
export function localStorageQuery<K extends LocalStorageKey>(
  key: K,
): UseQueryOptions<
  LocalStorageValue<K> | null,
  Error,
  LocalStorageValue<K> | null,
  ReturnType<typeof localStorageQueryKey<K>>
> {
  return {
    queryKey: localStorageQueryKey(key),
    queryFn: () => readStorage(key),
    staleTime: Number.POSITIVE_INFINITY,
    // localStorage is synchronous and local; retrying a read cannot help.
    retry: false,
  }
}

/** The next value, or a function of the current one (read fresh from storage). */
export type LocalStorageUpdate<K extends LocalStorageKey> =
  | LocalStorageValue<K>
  | null
  | ((current: LocalStorageValue<K> | null) => LocalStorageValue<K> | null)

/**
 * Writes a key and updates every observer, outside React (a sync loop) or in
 * it. An updater function reads the CURRENT stored value, not the cached one,
 * and the read-modify-write is synchronous, so two quick writes (or another
 * tab's) can't overwrite each other.
 */
export function updateLocalStorage<K extends LocalStorageKey>(
  queryClient: QueryClient,
  key: K,
  update: LocalStorageUpdate<K>,
): LocalStorageValue<K> | null {
  const next = typeof update === 'function' ? update(readStorage(key)) : update
  if (!writeStorage(key, next)) {
    throw new Error('Could not save to this device. Storage may be full or blocked.')
  }
  queryClient.setQueryData(localStorageQueryKey(key), next)
  return next
}

/**
 * Mutation options for a key. Pass a value, an updater, or null to clear it.
 *
 *   const mutation = useMutation(localStorageMutation(queryClient, STORAGE_KEYS.guestProgress))
 *   mutation.mutate((current) => next(current))
 */
export function localStorageMutation<K extends LocalStorageKey>(
  queryClient: QueryClient,
  key: K,
): UseMutationOptions<LocalStorageValue<K> | null, Error, LocalStorageUpdate<K>> {
  return {
    mutationKey: localStorageQueryKey(key),
    mutationFn: async (update) => updateLocalStorage(queryClient, key, update),
  }
}

/**
 * A key's value, live across components AND tabs, plus a writer.
 *
 *   const [progress, setProgress] = useLocalStorage(STORAGE_KEYS.guestProgress)
 *
 * The value is null on the server and until the first read, and when unset or
 * invalid.
 */
export function useLocalStorage<K extends LocalStorageKey>(key: K) {
  const queryClient = useQueryClient()
  const { data = null } = useQuery(localStorageQuery(key))
  const { mutateAsync } = useMutation(localStorageMutation(queryClient, key))

  useEffect(() => {
    // The `storage` event fires only in OTHER tabs: re-read so this one follows.
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        queryClient.setQueryData(localStorageQueryKey(key), readStorage(key))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, queryClient])

  const set = useCallback((update: LocalStorageUpdate<K>) => mutateAsync(update), [mutateAsync])
  return [data, set] as const
}
