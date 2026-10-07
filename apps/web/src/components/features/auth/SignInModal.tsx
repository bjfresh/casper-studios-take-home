'use client'

import { useId } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/hooks/use-auth'
import { MODAL_KEY, useModalRegistry } from '@/providers/ModalProvider'

export type SignInModalProps = {
  isOpen: boolean
  onClose: () => void
}

/**
 * The one entry point for signed-out players, in two stacked sections:
 *
 * - "Have an account?" → Sign In hands straight off to Privy.
 * - "Create an Account" → Sign Up starts onboarding (settings first, stored
 *   on this device), which ends by handing off to Privy to create the account.
 *
 * Privy owns credentials, OTP codes and OAuth; this modal never sees them.
 */
export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const id = useId()
  const { login, isConfigured } = useAuth()
  const { openModal } = useModalRegistry()

  const handleSignIn = () => {
    // Close first: our <dialog> is modal and makes everything outside it
    // inert, which would include Privy's sign-in UI.
    onClose()
    login()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sign in">
      <div className="flex flex-col gap-6">
        <section aria-labelledby={`${id}-existing`} className="flex flex-col gap-3">
          <Text as="h3" id={`${id}-existing`} variant="heading-4">
            Have an account?
          </Text>
          <Button
            onClick={handleSignIn}
            disabled={!isConfigured}
            label="Sign In"
            className="w-full"
          />
          {!isConfigured && (
            <Text variant="paragraph-sm" className="text-muted-foreground">
              Sign-in isn’t configured in this environment. Set NEXT_PUBLIC_PRIVY_APP_ID (and the
              API’s PRIVY_APP_ID / PRIVY_APP_SECRET) to enable it.
            </Text>
          )}
        </section>
        <section
          aria-labelledby={`${id}-new`}
          className="flex flex-col gap-3 border-t border-border pt-6"
        >
          <Text as="h3" id={`${id}-new`} variant="heading-4">
            Create an Account
          </Text>
          <Text variant="paragraph-md" className="text-muted-foreground">
            Track your progress, practice what you’ve learned, and level up!
          </Text>
          <Button
            variant="secondary"
            // Opening another registry modal replaces this one.
            onClick={() => openModal(MODAL_KEY.ONBOARDING)}
            label="Sign Up"
            className="w-full"
          />
        </section>
      </div>
    </Modal>
  )
}
