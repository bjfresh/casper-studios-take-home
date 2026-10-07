import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ConfirmModal } from '../ConfirmModal'

describe('ConfirmModal', () => {
  it('does not close itself on confirm', async () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    await render(
      <ConfirmModal isOpen onClose={onClose} onConfirm={onConfirm} title="Delete item?" />,
    )
    await userEvent.click(page.getByRole('button', { name: 'Delete' }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
    await expect.element(page.getByRole('dialog', { name: 'Delete item?' })).toBeVisible()
  })

  it('while pending: disables cancel, shows loading on confirm, blocks dismissal', async () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    await render(
      <ConfirmModal
        isOpen
        isPending
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete item?"
      />,
    )
    await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    const confirm = page.getByRole('button', { name: 'Loading' })
    await expect.element(confirm).toHaveAttribute('aria-busy', 'true')

    await userEvent.click(confirm)
    await userEvent.keyboard('{Escape}')
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('focuses Cancel first, not the destructive action', async () => {
    await render(<ConfirmModal isOpen onClose={() => {}} onConfirm={() => {}} title="Delete?" />)
    await expect.element(page.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('uses the primary style when not destructive', async () => {
    await render(
      <ConfirmModal
        isOpen
        isDestructive={false}
        confirmLabel="Publish"
        onClose={() => {}}
        onConfirm={() => {}}
        title="Publish?"
      />,
    )
    const publish = page.getByRole('button', { name: 'Publish' }).element()
    // The primary variant: the brand accent.
    expect(publish.classList.contains('bg-control')).toBe(true)
  })
})
