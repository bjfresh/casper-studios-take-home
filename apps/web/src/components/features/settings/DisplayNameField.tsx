'use client'

import { DISPLAY_NAME_MAX_LENGTH } from '@repo/shared'
import { Input } from '@/components/ui/Input'
import type { PlayerSettingsForm } from './use-player-settings-form'

/**
 * The player's name. In a submit-mode form it's just a field; with `onCommit`
 * it auto-saves, called when it loses focus with a changed, valid value.
 */
export function DisplayNameField({
  form,
  onCommit,
}: {
  form: PlayerSettingsForm
  onCommit?: (displayName: string) => void
}) {
  const { register, formState, trigger, getValues } = form
  const nameField = register('displayName')
  // Read during render on purpose: React Hook Form only tracks dirty fields
  // once something has subscribed by reading formState.dirtyFields while
  // rendering. Read only inside the blur handler, the first edit would never
  // register as a change.
  const isNameDirty = Boolean(formState.dirtyFields.displayName)

  const commitIfChanged = async () => {
    if (!onCommit) return
    // Only a changed, valid name is worth a request; an invalid one shows its
    // error inline and waits for the user.
    if (isNameDirty && (await trigger('displayName'))) onCommit(getValues('displayName'))
  }

  return (
    <Input
      label="Your name"
      autoComplete="nickname"
      maxLength={DISPLAY_NAME_MAX_LENGTH}
      error={formState.errors.displayName?.message}
      {...nameField}
      onBlur={async (event) => {
        await nameField.onBlur(event)
        await commitIfChanged()
      }}
    />
  )
}
