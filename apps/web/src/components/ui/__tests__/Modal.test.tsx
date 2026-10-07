import { useId, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Button } from '../Button'
import { Input } from '../Input'
import { Modal } from '../Modal'

// Real Chromium: <dialog>/showModal() are native here, so nothing is stubbed.

function getDialog() {
  const dialog = document.querySelector('dialog')
  if (!dialog) throw new Error('no dialog rendered')
  return dialog
}

function mouse(type: 'mousedown' | 'mouseup', target: Element, clientX: number, clientY: number) {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX, clientY }))
}

/** A point on the ::backdrop, which the browser reports as a hit on the dialog itself. */
function backdropPoint(dialog: HTMLDialogElement) {
  const rect = dialog.getBoundingClientRect()
  return { x: rect.left - 5, y: rect.top - 5 }
}

describe('Modal', () => {
  it('is named by its title and opens modally', async () => {
    await render(
      <Modal isOpen onClose={() => {}} title="Share">
        Body
      </Modal>,
    )
    const dialog = page.getByRole('dialog', { name: 'Share' })
    await expect.element(dialog).toBeVisible()
    expect(getDialog().matches(':modal')).toBe(true)
    await expect.element(page.getByRole('heading', { name: 'Share' })).toBeInTheDocument()
  })

  it('links a description only when one exists', async () => {
    const screen = await render(
      <Modal
        isOpen
        onClose={() => {}}
        title="Share"
        description="Anyone with the link can view it."
      >
        Body
      </Modal>,
    )
    await expect
      .element(page.getByRole('dialog'))
      .toHaveAccessibleDescription('Anyone with the link can view it.')

    await screen.rerender(
      <Modal isOpen onClose={() => {}} title="Share">
        Body
      </Modal>,
    )
    expect(getDialog().hasAttribute('aria-describedby')).toBe(false)
  })

  it('gives two mounted modals distinct title ids', async () => {
    await render(
      <>
        <Modal isOpen={false} onClose={() => {}} title="One" />
        <Modal isOpen={false} onClose={() => {}} title="Two" />
      </>,
    )
    const [first, second] = document.querySelectorAll('dialog')
    expect(first?.getAttribute('aria-labelledby')).not.toBe(second?.getAttribute('aria-labelledby'))
  })

  it('follows isOpen in both directions', async () => {
    const screen = await render(<Modal isOpen={false} onClose={() => {}} title="T" />)
    expect(getDialog().open).toBe(false)
    await screen.rerender(<Modal isOpen onClose={() => {}} title="T" />)
    expect(getDialog().open).toBe(true)
    await screen.rerender(<Modal isOpen={false} onClose={() => {}} title="T" />)
    expect(getDialog().open).toBe(false)
  })

  it('routes Escape through onClose and lets the caller decide', async () => {
    const onClose = vi.fn()
    await render(<Modal isOpen onClose={onClose} title="T" />)
    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
    // The caller didn't set isOpen=false, so the dialog stays open.
    expect(getDialog().open).toBe(true)
  })

  it('does not call onClose a second time when the caller closes it', async () => {
    function Harness({ onClose }: { onClose: () => void }) {
      const [isOpen, setIsOpen] = useState(true)
      return (
        <Modal
          isOpen={isOpen}
          title="T"
          onClose={() => {
            onClose()
            setIsOpen(false)
          }}
        />
      )
    }
    const onClose = vi.fn()
    await render(<Harness onClose={onClose} />)
    await userEvent.click(page.getByRole('button', { name: 'Close' }))
    await expect.poll(() => getDialog().open).toBe(false)
    // Let the dialog's queued `close` event fire.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on a press that starts and ends on the backdrop', async () => {
    const onClose = vi.fn()
    await render(<Modal isOpen onClose={onClose} title="T" />)
    const dialog = getDialog()
    const { x, y } = backdropPoint(dialog)

    mouse('mousedown', dialog, x, y)
    mouse('mouseup', dialog, x, y)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does NOT close when the dialog’s own padding is clicked (regression)', async () => {
    const onClose = vi.fn()
    await render(
      <Modal isOpen onClose={onClose} title="T">
        Body
      </Modal>,
    )
    const dialog = getDialog()
    // Precondition: 4px in from the corner is padding, and the browser
    // reports the dialog itself as the target — exactly what fooled the naive
    // `event.target === dialog` check.
    const rect = dialog.getBoundingClientRect()
    expect(document.elementFromPoint(rect.left + 4, rect.top + 4)).toBe(dialog)

    await userEvent.click(page.getByRole('dialog'), { position: { x: 4, y: 4 } })
    expect(onClose).not.toHaveBeenCalled()
    expect(dialog.open).toBe(true)
  })

  it('does NOT close on a drag that starts inside and ends on the backdrop', async () => {
    const onClose = vi.fn()
    await render(
      <Modal isOpen onClose={onClose} title="T">
        <Input label="Name" />
      </Modal>,
    )
    const dialog = getDialog()
    const input = dialog.querySelector('input')
    if (!input) throw new Error('no input')
    const inside = input.getBoundingClientRect()
    const { x, y } = backdropPoint(dialog)

    mouse('mousedown', input, inside.left + 2, inside.top + 2)
    mouse('mouseup', dialog, x, y)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('treats an unlaid-out (all-zero rect) dialog as inside', async () => {
    const onClose = vi.fn()
    await render(<Modal isOpen onClose={onClose} title="T" />)
    const dialog = getDialog()
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 0, 0))

    mouse('mousedown', dialog, 500, 500)
    mouse('mouseup', dialog, 500, 500)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders no form element without formId', async () => {
    await render(
      <Modal isOpen onClose={() => {}} title="Info">
        Body
      </Modal>,
    )
    expect(getDialog().querySelector('form')).toBeNull()
  })

  describe('with formId', () => {
    function FormModal({ onSubmit }: { onSubmit: () => void }) {
      const formId = `${useId()}-name-form`
      return (
        <Modal
          isOpen
          onClose={() => {}}
          title="Rename"
          formId={formId}
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
          footer={<Button type="submit" form={formId} size="sm" label="Save" />}
        >
          <Input label="Name" required />
        </Modal>
      )
    }

    it('wraps the body in a noValidate form that the footer button submits', async () => {
      const onSubmit = vi.fn()
      await render(<FormModal onSubmit={onSubmit} />)
      const form = getDialog().querySelector('form')

      expect(form?.noValidate).toBe(true)
      // The footer button is outside the form element and still submits it —
      // even with an empty required field, since noValidate defers to the app.
      expect(form?.contains(getDialog().querySelector('button[type="submit"]'))).toBe(false)
      await userEvent.click(page.getByRole('button', { name: 'Save' }))
      expect(onSubmit).toHaveBeenCalledOnce()
    })

    it('submits on Enter in a text field', async () => {
      const onSubmit = vi.fn()
      await render(<FormModal onSubmit={onSubmit} />)
      await userEvent.type(page.getByRole('textbox', { name: /Name/ }), 'New name{Enter}')
      expect(onSubmit).toHaveBeenCalledOnce()
    })
  })

  it('accepts width overrides via className', async () => {
    await render(<Modal isOpen onClose={() => {}} title="Wide" className="max-w-2xl" />)
    expect(getComputedStyle(getDialog()).maxWidth).toBe('672px') // max-w-2xl = 42rem
  })
})
