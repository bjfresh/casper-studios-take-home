'use client'

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'

/**
 * Registry for modals that something FAR AWAY must open (e.g. an auth modal
 * triggered from anywhere). A modal with one nearby trigger uses
 * `useDisclosure()` instead — don't register it here.
 *
 * To add one (all three, so the registry doesn't accumulate orphans):
 *   1. Build the modal on <Modal> (components/ui/Modal.tsx).
 *   2. Add its key to MODAL_KEY below.
 *   3. Render it in components/layout/RegisteredModals.tsx, gated on
 *      `isModalOpen(MODAL_KEY.X)`, with `onClose={closeModal}`.
 *
 */
export const MODAL_KEY = {
  /** Front-loaded onboarding: settings first, kept in localStorage until sign-up. */
  ONBOARDING: 'onboarding',
  /** SignUpModal: the Privy hand-off that ends onboarding. */
  SIGN_UP: 'sign-up',
  /** SignInModal: the one signed-out entry point (Sign In, or Sign Up → onboarding). */
  SIGN_IN: 'sign-in',
} as const satisfies Record<string, string>

export type ModalKey = (typeof MODAL_KEY)[keyof typeof MODAL_KEY]

type ModalRegistry = {
  openModal: (key: ModalKey) => void
  closeModal: () => void
  isModalOpen: (key: ModalKey) => boolean
}

const ModalRegistryContext = createContext<ModalRegistry | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  // One active key, not a set: only one registry modal is open at a time.
  const [activeKey, setActiveKey] = useState<ModalKey | null>(null)

  const openModal = useCallback((key: ModalKey) => setActiveKey(key), [])
  const closeModal = useCallback(() => setActiveKey(null), [])
  const isModalOpen = useCallback((key: ModalKey) => activeKey === key, [activeKey])

  const value = useMemo(
    () => ({ openModal, closeModal, isModalOpen }),
    [openModal, closeModal, isModalOpen],
  )

  return <ModalRegistryContext value={value}>{children}</ModalRegistryContext>
}

export function useModalRegistry(): ModalRegistry {
  const registry = useContext(ModalRegistryContext)
  // Fail here, with a fix, rather than returning null and breaking later
  // somewhere confusing.
  if (!registry) {
    throw new Error(
      'useModalRegistry must be used inside <ModalProvider> (see providers/AppProviders.tsx).',
    )
  }
  return registry
}
