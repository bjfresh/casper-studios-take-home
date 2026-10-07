'use client'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Text } from '@/components/ui/Text'
import { LOGIN_METHOD_LABELS, PRIVY_LOGIN_METHODS } from '@/constants/auth'
import { useAuth } from '@/hooks/use-auth'

export type SignUpModalProps = {
  isOpen: boolean
  onClose: () => void
}

/**
 * The last step of signing up, after onboarding has stored the settings on
 * this device: hands off to Privy to create the account. Privy treats sign-up
 * and sign-in as one step (an unknown email becomes a new account).
 * Credentials, OTP codes and OAuth all happen in Privy's own UI; this modal
 * never handles any of them.
 */
export function SignUpModal({ isOpen, onClose }: SignUpModalProps) {
  const { login, isConfigured } = useAuth()
  const methods = PRIVY_LOGIN_METHODS.map((method) => LOGIN_METHOD_LABELS[method]).join(', ')

  const handleContinue = () => {
    // Close first: our <dialog> is modal and makes everything outside it
    // inert, which would include Privy's sign-in UI.
    onClose()
    login()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create your account"
      description={
        isConfigured
          ? `Create your account with ${methods}.`
          : 'Sign-in isn’t configured in this environment.'
      }
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} label="Cancel" />
          <Button size="sm" onClick={handleContinue} disabled={!isConfigured} label="Continue" />
        </>
      }
    >
      <Text variant="paragraph-sm" className="text-muted-foreground">
        {isConfigured
          ? 'Your settings are saved on this device until your account is created.'
          : 'Set NEXT_PUBLIC_PRIVY_APP_ID (and the API’s PRIVY_APP_ID / PRIVY_APP_SECRET) to enable it.'}
      </Text>
    </Modal>
  )
}
