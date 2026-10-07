'use client'

import type { Prettify } from '@repo/shared'
import type { ComponentPropsWithoutRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export type ConfirmModalProps = Prettify<
  // Omitting footer/formId/onSubmit is how "this is not a form" is expressed:
  // this component supplies its own footer, and a caller can't pass a form.
  Omit<ComponentPropsWithoutRef<typeof Modal>, 'footer' | 'formId' | 'onSubmit'> & {
    onConfirm: () => void
    confirmLabel?: string
    cancelLabel?: string
    /** Disables cancel and dismissal, and shows loading on confirm. */
    isPending?: boolean
    /** Default true: this component exists for deletions; opting out is the rarer case. */
    isDestructive?: boolean
  }
>

/**
 * Use everywhere `window.confirm` would otherwise appear.
 *
 * It does NOT close itself on confirm. The caller closes it once the action
 * succeeds and keeps it open (with an error in the body) if it fails — a
 * self-closing confirm makes failure invisible: the modal vanishes and the
 * thing is still there.
 */
export function ConfirmModal({
  onConfirm,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isPending = false,
  isDestructive = true,
  onClose,
  ...modalProps
}: ConfirmModalProps) {
  // Escape and backdrop clicks are blocked too while pending, matching the
  // disabled Cancel button — dismissing mid-request would hide its outcome.
  const handleClose = () => {
    if (!isPending) onClose()
  }

  return (
    <Modal
      {...modalProps}
      onClose={handleClose}
      footer={
        <>
          {/* First focusable, so showModal() lands on Cancel, not on the destructive action. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
            label={cancelLabel}
          />
          <Button
            variant={isDestructive ? 'destructive' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={isPending}
            label={confirmLabel}
          />
        </>
      }
    />
  )
}
