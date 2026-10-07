'use client'

import { useEffect } from 'react'
import { SignInModal } from '@/components/features/auth/SignInModal'
import { SignUpModal } from '@/components/features/auth/SignUpModal'
import { OnboardingModal } from '@/components/features/onboarding/OnboardingModal'
import { useAuth } from '@/hooks/use-auth'
import { MODAL_KEY, useModalRegistry } from '@/providers/ModalProvider'

/**
 * Every ModalProvider-registered modal, mounted once in the root layout so any
 * page (including the public home page's "Let's play") can open one. Feature
 * code opens them with `openModal(MODAL_KEY.X)` and never renders a competing
 * copy.
 */
export function RegisteredModals() {
  const { isModalOpen, closeModal } = useModalRegistry()
  const { isAuthenticated } = useAuth()
  const isAuthModalOpen = isModalOpen(MODAL_KEY.SIGN_IN) || isModalOpen(MODAL_KEY.SIGN_UP)

  // Signing in from elsewhere (another tab, a restored session) resolves the intent.
  useEffect(() => {
    if (isAuthModalOpen && isAuthenticated) closeModal()
  }, [isAuthModalOpen, isAuthenticated, closeModal])

  return (
    <>
      {/* Mounted only while open, so it re-reads any pending settings each time. */}
      {isModalOpen(MODAL_KEY.ONBOARDING) && <OnboardingModal isOpen onClose={closeModal} />}
      <SignUpModal isOpen={isModalOpen(MODAL_KEY.SIGN_UP)} onClose={closeModal} />
      <SignInModal isOpen={isModalOpen(MODAL_KEY.SIGN_IN)} onClose={closeModal} />
    </>
  )
}
