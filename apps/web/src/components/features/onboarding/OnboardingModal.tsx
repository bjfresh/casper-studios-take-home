'use client'

import { applyPreferencesUpdate, type PlayerProfile } from '@repo/shared'
import { useId, useState } from 'react'
import { PlayerSettingsFields } from '@/components/features/settings/PlayerSettingsFields'
import {
  DEFAULT_PLAYER_SETTINGS,
  usePlayerSettingsForm,
} from '@/components/features/settings/use-player-settings-form'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { guestPreferences } from '@/data/guest-preferences'
import { pendingSettings } from '@/data/pending-settings'
import { useAuth } from '@/hooks/use-auth'
import { MODAL_KEY, useModalRegistry } from '@/providers/ModalProvider'

export type OnboardingModalProps = {
  isOpen: boolean
  onClose: () => void
}

/**
 * Front-loaded onboarding: the player sets up before creating an account. The
 * values go to localStorage (no account exists to save them to), then the
 * sign-up modal opens. OnboardingGate moves them to the database after sign-up.
 *
 * Submit mode, not auto-save: these switches stage values for the "Continue"
 * that follows. It's the sanctioned exception to "a switch takes effect
 * immediately": a setup step whose values become live settings, which are
 * then edited with true auto-saving switches in Settings.
 */
export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const formId = `${useId()}-onboarding-form`
  const { openModal } = useModalRegistry()
  const { login, isConfigured } = useAuth()
  // Pre-filled from a previous visit that stopped before sign-up. Read once:
  // the form owns the values from here.
  // From an unfinished earlier visit, else the guest's current preferences.
  const [initialValues] = useState<PlayerProfile>(() => {
    const pending = pendingSettings.read()
    if (pending) return pending
    const { instrument, handedness } = guestPreferences.read()
    return { ...DEFAULT_PLAYER_SETTINGS, instrument, handedness }
  })
  const form = usePlayerSettingsForm(initialValues)

  const handleSubmit = form.handleSubmit((settings) => {
    // The profile AND every preference the guest has set (labels, tuning…),
    // so signing up keeps the fretboard exactly as they had it.
    const preferences = applyPreferencesUpdate(guestPreferences.read(), {
      instrument: settings.instrument,
      handedness: settings.handedness,
    })
    guestPreferences.write(preferences)
    pendingSettings.write({ ...preferences, displayName: settings.displayName })
    // Opening another registry modal replaces this one (one at a time).
    openModal(MODAL_KEY.SIGN_UP)
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Let’s play"
      description="Tell us a little about how you play. You’ll create your account next."
      formId={formId}
      onSubmit={handleSubmit}
      footer={
        <>
          {/* Straight to Privy: they've already chosen not to sign up. */}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              onClose()
              login()
            }}
            disabled={!isConfigured}
            label="I already have an account"
          />
          <Button type="submit" form={formId} size="sm" label="Continue" />
        </>
      }
    >
      <PlayerSettingsFields form={form} />
    </Modal>
  )
}
