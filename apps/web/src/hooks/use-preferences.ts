import { applyPreferencesUpdate, type PlayerPreferences, type PlayerSettings } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { guestPreferences } from '@/data/guest-preferences'
import { useApi } from './use-api'
import { useAuth } from './use-auth'

export type Preferences = {
  preferences: PlayerPreferences
  /**
   * Changes some preferences. Takes effect immediately everywhere (optimistic
   * for accounts), then persists: to the account when it has settings,
   * otherwise to this browser. Always normalized by the shared rules, so no
   * caller can create an invalid combination.
   */
  update: (patch: Partial<PlayerPreferences>) => void
  /** Where changes go. */
  source: 'account' | 'guest'
}

/**
 * The player's instrument and fretboard preferences, signed in or not. The
 * one way components read and change them; they never branch on auth.
 */
export function usePreferences(): Preferences {
  const { isAuthenticated } = useAuth()
  const api = useApi()
  const queryClient = useQueryClient()
  const account = useQuery({ ...api.query.account.me.queryOptions(), enabled: isAuthenticated })
  const guest = guestPreferences.useValue()
  const saveUpdate = useMutation(api.query.settings.update.mutationOptions())

  const accountSettings = isAuthenticated ? account.data?.settings : null
  const source = accountSettings ? 'account' : 'guest'

  const { mutate } = saveUpdate
  const update = useCallback(
    (patch: Partial<PlayerPreferences>) => {
      if (!accountSettings) {
        guestPreferences.write(applyPreferencesUpdate(guestPreferences.read(), patch))
        return
      }
      const key = api.query.account.me.queryKey()
      const previous = queryClient.getQueryData(key)
      // Optimistic: the fretboard reacts on this frame, not after a round trip.
      queryClient.setQueryData(key, (current) =>
        current?.settings
          ? {
              ...current,
              settings: applyPreferencesUpdate<PlayerSettings>(current.settings, patch),
            }
          : current,
      )
      mutate(patch, {
        onSuccess: (saved) => {
          queryClient.setQueryData(key, (current) =>
            current ? { ...current, settings: saved } : current,
          )
        },
        // Put back what's actually saved rather than show a setting that didn't stick.
        onError: () => queryClient.setQueryData(key, previous),
      })
    },
    [accountSettings, api, queryClient, mutate],
  )

  return { preferences: accountSettings ?? guest, update, source }
}
