import { useCallback, useState } from 'react'

export type Disclosure = {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

/**
 * Local open/closed state for a modal (or popover, drawer…) owned by the
 * component that renders it. The default choice — reach for ModalProvider only
 * when something far away must open the modal.
 */
export function useDisclosure(initialOpen = false): Disclosure {
  const [isOpen, setIsOpen] = useState(initialOpen)
  // Stable identities, so `close` can be passed as onClose without re-running
  // effects that depend on it.
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((current) => !current), [])
  return { isOpen, open, close, toggle }
}
