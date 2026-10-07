'use client'

import { isGuestProgressEmpty } from '@repo/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { usePendingSettingsSync } from '@/components/features/onboarding/use-pending-settings-sync'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { readStorage, updateLocalStorage } from '@/data/local-storage'
import { useApi } from '@/hooks/use-api'
import { useAuth } from '@/hooks/use-auth'
import { useGuestProgress } from '@/hooks/use-lesson-progress'
import { useProgressSync } from '@/hooks/use-progress-sync'

/**
 * Keeps this browser and the account in step, wherever the player is:
 *
 * - On sign-up (either path): saves their settings, from the set-up form or
 *   else this device's preferences (usePendingSettingsSync).
 * - On sign-in: imports what they played as a guest (merged on the server).
 * - While signed in: sends queued plays from the outbox (useProgressSync).
 *
 * Each local copy is removed only after the server has it, so a failure loses
 * nothing and simply retries. Renders nothing; mounted once in the root layout.
 */
export function AccountSync() {
  const { isAuthenticated } = useAuth()
  usePendingSettingsSync({ enabled: isAuthenticated })
  useGuestProgressImport(isAuthenticated)
  useProgressSync()
  return null
}

function useGuestProgressImport(enabled: boolean) {
  const api = useApi()
  const queryClient = useQueryClient()
  const guest = useGuestProgress()
  const importProgress = useMutation(api.query.lessons.importGuestProgress.mutationOptions())
  const started = useRef(false)
  const hasGuestProgress = !isGuestProgressEmpty(guest)

  const { mutate } = importProgress
  useEffect(() => {
    if (!enabled || !hasGuestProgress || started.current) return
    started.current = true
    const progress = readStorage(STORAGE_KEYS.guestProgress)
    if (!progress) return
    mutate(progress, {
      onSuccess: async () => {
        // Cleared only now. Clearing first and failing would lose the
        // progress; importing twice would double-count plays. Safe to clear
        // whole: signed in, new plays go to the outbox, not here.
        updateLocalStorage(queryClient, STORAGE_KEYS.guestProgress, null)
        await queryClient.invalidateQueries({ queryKey: api.query.lessons.progress.key() })
      },
      onError: (error) => {
        started.current = false
        console.warn('[account-sync] guest progress import failed; will retry on next load', error)
      },
    })
  }, [enabled, hasGuestProgress, mutate, queryClient, api])
}
