'use client'

import type { ReactNode } from 'react'
import { Controller } from 'react-hook-form'
import { Text } from '@/components/ui/Text'
import { TwoSidedSwitch } from '@/components/ui/TwoSidedSwitch'
import { DisplayNameField } from './DisplayNameField'
import type { PlayerSettingsForm } from './use-player-settings-form'

/**
 * The player settings fields for onboarding: name, guitar or bass, and
 * handedness (the last two as the Settings menu's two-sided switches). It
 * renders fields only, never the <form>: in a modal, <Modal formId> owns the
 * form element so the footer button can submit it. After onboarding, the name
 * is edited in the Settings menu's Account tab and the rest in Preferences.
 */
export function PlayerSettingsFields({ form }: { form: PlayerSettingsForm }) {
  const { control, formState } = form
  const serverError = formState.errors.root?.server?.message

  return (
    <div className="flex flex-col gap-5">
      <DisplayNameField form={form} />
      {/* Controller, not register(): these aren't native inputs, and
          register() on them would silently never update the value. The same
          two-sided switches as the Settings menu, configured the same way. */}
      <Controller
        control={control}
        name="instrument"
        render={({ field, fieldState }) => (
          <FieldError error={fieldState.error?.message}>
            <TwoSidedSwitch
              label="Instrument"
              left={{ value: 'guitar', label: 'Guitar' }}
              // As in the Settings menu: bass lessons don't exist yet.
              right={{ value: 'bass', label: 'Bass', disabled: true, hint: '(coming soon)' }}
              value={field.value}
              onValueChange={field.onChange}
            />
          </FieldError>
        )}
      />
      <Controller
        control={control}
        name="handedness"
        render={({ field, fieldState }) => (
          <FieldError error={fieldState.error?.message}>
            <TwoSidedSwitch
              label="Handedness"
              left={{ value: 'left', label: 'Left' }}
              right={{ value: 'right', label: 'Right' }}
              value={field.value}
              onValueChange={field.onChange}
            />
          </FieldError>
        )}
      />
      {serverError && (
        <Text variant="paragraph-sm" role="alert" className="text-danger">
          {serverError}
        </Text>
      )}
    </div>
  )
}

/**
 * A field-level error under a control. The values are fixed enums, so this
 * shows only if the server rejects one.
 */
function FieldError({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {children}
      {error && (
        <Text variant="paragraph-sm" role="alert" className="text-danger">
          {error}
        </Text>
      )}
    </div>
  )
}
