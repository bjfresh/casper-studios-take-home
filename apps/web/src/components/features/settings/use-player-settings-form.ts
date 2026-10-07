import { zodResolver } from '@hookform/resolvers/zod'
import { type PlayerProfile, playerProfileSchema } from '@repo/shared'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

export const DEFAULT_PLAYER_SETTINGS: PlayerProfile = {
  displayName: '',
  instrument: 'guitar',
  handedness: 'right',
}

/**
 * The one form model for the player profile (name, instrument, handedness),
 * wherever it's edited. Validation is the shared schema, so the form can't
 * accept what the API would reject. The other preferences live in the
 * Preferences menu.
 */
export function usePlayerSettingsForm(defaults: PlayerProfile = DEFAULT_PLAYER_SETTINGS) {
  // Only the profile fields: a full settings object passed in must not drag
  // its other preferences into this form's values.
  const { displayName, instrument, handedness } = defaults
  return useForm<z.input<typeof playerProfileSchema>, unknown, PlayerProfile>({
    resolver: zodResolver(playerProfileSchema),
    defaultValues: { displayName, instrument, handedness },
  })
}

export type PlayerSettingsForm = ReturnType<typeof usePlayerSettingsForm>
