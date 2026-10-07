import { formatValidationIssues, toValidationIssues } from '@repo/shared'
import type { z } from 'zod'

export type StorageItem<T> = {
  /** Never throws and never returns undefined: falls back on missing or invalid data. */
  read: () => T
  write: (value: T) => void
  remove: () => void
}

/**
 * A typed, validated localStorage/sessionStorage entry. Storage is untrusted:
 * an older app version, a user, or an extension may have written anything, so
 * every read is validated and a bad value falls back to `fallback` rather than
 * propagating undefined through the app.
 *
 * `storage` is a getter because `window` doesn't exist during SSR, and access
 * can throw (Safari private mode, blocked cookies).
 */
export function createStorageItem<Schema extends z.ZodType>({
  key,
  schema,
  fallback,
  storage = () => window.localStorage,
}: {
  key: string
  schema: Schema
  fallback: z.output<Schema>
  storage?: () => Storage
}): StorageItem<z.output<Schema>> {
  return {
    read() {
      let raw: string | null
      try {
        raw = storage().getItem(key)
      } catch {
        return fallback
      }
      if (raw === null) return fallback

      let json: unknown
      try {
        json = JSON.parse(raw)
      } catch {
        console.warn(`[storage] "${key}" is not valid JSON; using fallback`)
        return fallback
      }

      const result = schema.safeParse(json)
      if (!result.success) {
        console.warn(
          `[storage] "${key}" failed validation; using fallback.`,
          formatValidationIssues(toValidationIssues(result.error)),
        )
        return fallback
      }
      return result.data
    },
    // No validation on write: the value is already typed by the caller.
    write(value) {
      try {
        storage().setItem(key, JSON.stringify(value))
      } catch (error) {
        console.warn(`[storage] could not write "${key}"`, error)
      }
    },
    remove() {
      try {
        storage().removeItem(key)
      } catch {
        // Nothing to clean up if storage is unavailable.
      }
    },
  }
}
