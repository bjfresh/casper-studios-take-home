import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Button } from '../Button'
import { LinkButton } from '../LinkButton'

describe('LinkButton', () => {
  it('removes a disabled link from the tab order', async () => {
    const screen = await render(
      <>
        <button type="button">Before</button>
        <LinkButton href="/next" disabled label="Continue" />
        <button type="button">After</button>
      </>,
    )
    ;(screen.getByRole('button', { name: 'Before' }).element() as HTMLElement).focus()
    await userEvent.tab()

    expect(document.activeElement?.textContent).toBe('After')
  })

  it('renders a disabled link without href, flagged aria-disabled', async () => {
    const screen = await render(<LinkButton href="/next" disabled label="Continue" />)
    const link = screen.getByRole('link', { name: 'Continue' })
    await expect.element(link).toHaveAttribute('aria-disabled', 'true')
    await expect.element(link).not.toHaveAttribute('href')
  })

  it('has the same shape as a Button of the same variant and size', async () => {
    const screen = await render(
      <div className="flex items-start gap-2">
        <Button variant="secondary" size="lg" label="Continue" />
        <LinkButton href="/next" variant="secondary" size="lg" label="Continue" />
      </div>,
    )
    const button = screen.getByRole('button').element().getBoundingClientRect()
    const link = screen.getByRole('link').element().getBoundingClientRect()
    expect({ width: link.width, height: link.height }).toEqual({
      width: button.width,
      height: button.height,
    })
  })

  it('hideLabel: shows only its icon, named by its label', async () => {
    const screen = await render(
      <LinkButton href="/" label="Back" leftIcon={<svg data-testid="icon" />} hideLabel />,
    )
    const link = screen.getByRole('link', { name: 'Back' })
    await expect.element(link).toBeVisible()
    expect(link.element().textContent).toBe('')
  })
})
