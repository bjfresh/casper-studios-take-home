import { DISPLAY_NAME_MAX_LENGTH, type PlayerSettingsInput } from '@repo/shared'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { guestPreferences } from '@/data/guest-preferences'
import { pendingSettings } from '@/data/pending-settings'
import { useApi } from '@/hooks/use-api'
import { useAuth } from '@/hooks/use-auth'

/** Shared by every caller, so concurrent instances never send two saves. */
const SYNC_KEY = ['sync-pending-settings']

/**
 * A starting name for an account created without the set-up form (a new
 * player who chose Sign In): the email's local part, tidied ("bj.vicks" →
 * "bj vicks"), else "Player". Editable in Settings → Account.
 */
export function nameFromEmail(email: string | null): string {
  const local = (email?.split('@')[0] ?? '').replace(/[._+-]+/g, ' ').trim()
  return local.slice(0, DISPLAY_NAME_MAX_LENGTH).trim() || 'Player'
}

/**
 * Makes sure a new account gets settings, once, from this device:
 *
 * - Settings collected by the set-up form before sign-up (pending, in
 *   localStorage) are saved, then the local copy is removed.
 * - With none (a new player who used Sign In and skipped the form), this
 *   device's preferences are saved with a starting name (nameFromEmail), so
 *   nothing they set as a guest is lost.
 *
 * If the account already has settings, those win and the pending copy is
 * discarded: a signed-out form must not overwrite existing account data.
 *
 * Used by AccountSync (root, so it happens wherever sign-up finishes) and by
 * OnboardingGate (for its status and retry).
 */
export function usePendingSettingsSync({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi()
  const queryClient = useQueryClient()
  const { email } = useAuth()
  const me = useQuery({ ...api.query.account.me.queryOptions(), enabled })
  const save = useMutation({ ...api.query.settings.save.mutationOptions(), mutationKey: SYNC_KEY })
  const syncsInFlight = useIsMutating({ mutationKey: SYNC_KEY })
  const started = useRef(false)

  const account = me.data
  const hasSavedSettings = Boolean(account?.settings)
  const needsSettings = Boolean(enabled && account && !account.settings)
  // Read when the account turns out to need settings, not at mount: this
  // mounts at page load, and the set-up form may be filled in afterwards, in
  // the same visit as sign-up. Then fixed, so retries send the same thing.
  const toSave = useMemo<PlayerSettingsInput | null>(
    () =>
      needsSettings
        ? (pendingSettings.read() ?? {
            ...guestPreferences.read(),
            displayName: nameFromEmail(email),
          })
        : null,
    [needsSettings, email],
  )
  const shouldSync = toSave !== null

  useEffect(() => {
    if (hasSavedSettings) pendingSettings.remove()
  }, [hasSavedSettings])

  const { mutate } = save
  const syncPending = useCallback(() => {
    if (!toSave) return
    mutate(toSave, {
      onSuccess: (settings) => {
        queryClient.setQueryData(api.query.account.me.queryKey(), (current) =>
          current ? { ...current, settings } : current,
        )
        // Only after the database has them: on failure the local copy is what
        // lets the player retry without re-entering anything.
        pendingSettings.remove()
      },
    })
  }, [toSave, mutate, queryClient, api])

  useEffect(() => {
    // The ref guards against StrictMode's double effect; syncsInFlight lets
    // this instance stand back while another one's save is running, and step
    // in if that one fails (it re-renders when the count drops).
    if (!shouldSync || started.current || syncsInFlight > 0) return
    started.current = true
    syncPending()
  }, [shouldSync, syncsInFlight, syncPending])

  return { me, save, shouldSync, syncPending }
}
