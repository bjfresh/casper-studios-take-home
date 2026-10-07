'use client'

import { useState } from 'react'
import { ConfirmModal } from '@/components/modals/ConfirmModal'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Text } from '@/components/ui/Text'

type Open = 'modal' | 'destructive' | 'confirm' | null

/** Opens each kind of modal, so its layout and focus handling can be checked. */
export function ModalGallery() {
  const [open, setOpen] = useState<Open>(null)
  const close = () => setOpen(null)
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => setOpen('modal')} label="Modal" />
      <Button
        variant="secondary"
        onClick={() => setOpen('destructive')}
        label="Confirm (destructive)"
      />
      <Button variant="secondary" onClick={() => setOpen('confirm')} label="Confirm" />

      <Modal
        isOpen={open === 'modal'}
        onClose={close}
        title="A modal"
        description="Title, description, body and a footer."
        footer={<Button onClick={close} label="Done" />}
      >
        <Text variant="paragraph-md">Escape, the close button or the backdrop dismiss it.</Text>
      </Modal>
      <ConfirmModal
        isOpen={open === 'destructive'}
        onClose={close}
        onConfirm={close}
        title="Delete this lesson?"
        description="This can’t be undone."
        confirmLabel="Delete"
      />
      <ConfirmModal
        isOpen={open === 'confirm'}
        onClose={close}
        onConfirm={close}
        isDestructive={false}
        title="Publish?"
        confirmLabel="Publish"
      />
    </div>
  )
}
