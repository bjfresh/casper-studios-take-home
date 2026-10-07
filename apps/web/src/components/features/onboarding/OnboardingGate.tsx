'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Text } from '@/components/ui/Text'
import { toApiError } from '@/services/api-errors'
import { usePendingSettingsSync } from './use-pending-settings-sync'

/**
 * Inside AuthGate: makes sure a signed-in player has saved settings before
 * the app renders. usePendingSettingsSync (shared with the root AccountSync)
 * does the saving:
 *
 * - Settings from the set-up form (localStorage) are saved once, and the
 *   local copy is removed.
 * - With none (a new player who used Sign In), this device's preferences are
 *   saved with a starting name, editable in Settings → Account.
 * - If the account already has settings, those win and the pending copy is
 *   discarded: a signed-out form mustn't overwrite existing account data.
 *
 * This shows only the loading, saving and retry states around that.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { me, save, syncPending } = usePendingSettingsSync()

  if (me.isPending) return <GateMessage busy>Loading your account…</GateMessage>
  if (me.isError) {
    return (
      <GateMessage>
        <Text variant="paragraph-md" role="alert" className="text-danger">
          {toApiError(me.error).message}
        </Text>
        <Button variant="secondary" onClick={() => void me.refetch()} label="Try again" />
      </GateMessage>
    )
  }
  if (me.data.settings) return children
  if (save.isError) {
    return (
      <GateMessage>
        <Text variant="paragraph-md" role="alert" className="text-danger">
          We couldn’t save your settings. They’re still on this device.
        </Text>
        <Button variant="secondary" onClick={syncPending} label="Try again" />
      </GateMessage>
    )
  }
  return <GateMessage busy>Saving your settings…</GateMessage>
}

function GateMessage({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  return (
    <main
      aria-busy={busy || undefined}
      className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
    >
      {busy && <Spinner className="size-6 text-muted-foreground" />}
      {typeof children === 'string' ? (
        <Text variant="paragraph-md" className="text-muted-foreground">
          {children}
        </Text>
      ) : (
        children
      )}
    </main>
  )
}
