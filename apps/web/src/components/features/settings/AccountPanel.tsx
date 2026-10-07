'use client'

import type { PlayerSettings } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/components/ui/Spinner'
import { Text } from '@/components/ui/Text'
import { guestPreferences } from '@/data/guest-preferences'
import { useApi } from '@/hooks/use-api'
import { useAuth } from '@/hooks/use-auth'
import { toApiError } from '@/services/api-errors'
import { applyApiError } from './apply-api-error'
import { DisplayNameField } from './DisplayNameField'
import { usePlayerSettingsForm } from './use-player-settings-form'

/**
 * The signed-in player's own details, in the Settings menu's Account tab: the
 * name (auto-saves) and the email they signed in with (read-only; it's
 * Privy's). Instrument and handedness live in Preferences.
 */
export function AccountPanel({ onChange }: { onChange?: () => void } = {}) {
  const api = useApi()
  const me = useQuery(api.query.account.me.queryOptions())

  if (me.isPending) {
    return (
      <div aria-busy="true" className="flex justify-center py-6">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    )
  }
  if (me.isError) {
    return (
      <Text variant="paragraph-sm" role="alert" className="text-danger">
        {toApiError(me.error).message}
      </Text>
    )
  }
  return <AccountForm settings={me.data.settings} onChange={onChange} />
}

function AccountForm({
  settings,
  onChange,
}: {
  settings: PlayerSettings | null
  onChange?: () => void
}) {
  const api = useApi()
  const queryClient = useQueryClient()
  const { email } = useAuth()
  const form = usePlayerSettingsForm(settings ?? undefined)
  const update = useMutation(api.query.settings.update.mutationOptions())
  const create = useMutation(api.query.settings.save.mutationOptions())
  // The status follows whichever save ran last: after a first save creates
  // the settings, later ones are updates.
  const saving = update.submittedAt >= create.submittedAt ? update : create

  const onSaved = (saved: PlayerSettings) => {
    queryClient.setQueryData(api.query.account.me.queryKey(), (account) =>
      account ? { ...account, settings: saved } : account,
    )
    // The saved name becomes the new baseline, so isDirty resets.
    form.reset({ ...form.getValues(), displayName: saved.displayName })
  }
  const onError = (error: unknown) => {
    // Put back what's actually saved rather than show a name that didn't stick.
    form.resetField('displayName')
    applyApiError(error, form.setError)
  }

  const commit = (displayName: string) => {
    onChange?.()
    form.clearErrors('root.server')
    if (settings) {
      update.mutate({ displayName }, { onSuccess: onSaved, onError })
    } else {
      // Signed in but never onboarded (e.g. used Sign in, not Create
      // account): the first name saved creates their settings, carrying this
      // device's preferences so nothing they chose resets.
      create.mutate({ ...guestPreferences.read(), displayName }, { onSuccess: onSaved, onError })
    }
  }

  const status = saving.isPending ? 'Saving…' : saving.isSuccess ? 'Saved' : ''
  const serverError = form.formState.errors.root?.server?.message

  return (
    <div className="flex max-w-sm flex-col gap-5">
      {/* A real form, so Enter in the name field saves it like a blur does. */}
      <form
        noValidate
        className="flex flex-col gap-1"
        onSubmit={form.handleSubmit((values) => {
          if (form.getFieldState('displayName').isDirty) commit(values.displayName)
        })}
      >
        <DisplayNameField form={form} onCommit={commit} />
        <Text
          variant="accent-sm"
          weight="regular"
          role="status"
          className="min-h-4 text-muted-foreground"
        >
          {status}
        </Text>
        {serverError && (
          <Text variant="paragraph-sm" role="alert" className="text-danger">
            {serverError}
          </Text>
        )}
      </form>
      <dl className="flex flex-col gap-1">
        <Text as="dt" variant="accent-sm" className="text-muted-foreground">
          Email
        </Text>
        <Text as="dd" variant="paragraph-md">
          {email ?? 'Not shared'}
        </Text>
      </dl>
    </div>
  )
}
