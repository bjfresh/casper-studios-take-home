import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { BUTTON_SIZES, BUTTON_VARIANTS, Button } from '../Button'

function Icon() {
  return <svg data-testid="icon" viewBox="0 0 16 16" />
}

describe('Button', () => {
  it.each(BUTTON_SIZES)('does not change width when loading flips (size %s)', async (size) => {
    const screen = await render(<Button size={size} label="Save changes" />)
    const button = screen.getByRole('button').element() as HTMLElement
    const idleWidth = button.getBoundingClientRect().width

    await screen.rerender(<Button size={size} loading label="Save changes" />)
    expect(button.getBoundingClientRect().width).toBe(idleWidth)
  })

  it('does not change width when loading with a left icon', async () => {
    const screen = await render(<Button leftIcon={<Icon />} label="Save changes" />)
    const button = screen.getByRole('button').element() as HTMLElement
    const idleWidth = button.getBoundingClientRect().width

    await screen.rerender(<Button leftIcon={<Icon />} loading label="Save changes" />)
    expect(button.getBoundingClientRect().width).toBe(idleWidth)
    // The spinner replaced the icon in the same box.
    expect(screen.container.querySelector('[data-testid="icon"]')).toBeNull()
  })

  it('stays focusable but blocks activation while loading', async () => {
    const onClick = vi.fn()
    const screen = await render(<Button loading onClick={onClick} label="Save" />)
    const button = screen.getByRole('button')

    await expect.element(button).toHaveAttribute('aria-busy', 'true')
    await expect.element(button).not.toBeDisabled()
    await userEvent.click(button)
    await userEvent.keyboard('{Enter}')
    expect(onClick).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(button.element())
  })

  it('announces the loading label to assistive tech', async () => {
    const screen = await render(<Button loading loadingLabel="Saving" label="Save" />)
    await expect.element(screen.getByRole('button', { name: 'Saving' })).toBeInTheDocument()
  })

  it('does not block submission of a form when idle, and blocks it while loading', async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault())
    const form = (loading: boolean) => (
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <Button type="submit" loading={loading} label="Submit" />
      </form>
    )
    const screen = await render(form(true))
    await userEvent.click(screen.getByRole('button'))
    expect(onSubmit).not.toHaveBeenCalled()

    await screen.rerender(form(false))
    await userEvent.click(screen.getByRole('button'))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('defaults to type="button" so it never submits a form by accident', async () => {
    const screen = await render(<Button label="Go" />)
    await expect.element(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('renders its label prop as the visible text and the accessible name', async () => {
    const screen = await render(<Button label="Got it" />)
    const button = screen.getByRole('button', { name: 'Got it' })
    await expect.element(button).toBeVisible()
    // In the button's label typography: accent, semibold.
    expect(button.element().querySelector('span.font-semibold')?.textContent).toBe('Got it')
  })

  it('an aria-label can say more than the visible label', async () => {
    await render(<Button label="Play" aria-label="Play First Chords" />)
    await expect
      .element(page.getByRole('button', { name: 'Play First Chords' }))
      .toHaveTextContent('Play')
  })

  it('hideLabel: the icon shows, the label becomes the accessible name', async () => {
    const screen = await render(<Button label="Settings" leftIcon={<Icon />} hideLabel />)
    const button = screen.getByRole('button', { name: 'Settings' })
    await expect.element(button).toBeVisible()
    expect(button.element().textContent).toBe('')
    expect(button.element().querySelector('[data-testid="icon"]')).not.toBeNull()
  })

  it('keeps every md/lg hit area at least 44px, and sm at least 32px', async () => {
    const screen = await render(
      <div>
        {BUTTON_SIZES.map((size) => (
          <Button key={size} size={size} data-size={size} label="A" />
        ))}
      </div>,
    )
    for (const element of screen.getByRole('button').elements()) {
      const { height, width } = element.getBoundingClientRect()
      const minimum = element.getAttribute('data-size') === 'sm' ? 32 : 44
      expect(Math.min(height, width)).toBeGreaterThanOrEqual(minimum)
    }
  })

  it('renders every exported variant', async () => {
    const screen = await render(
      <div>
        {BUTTON_VARIANTS.map((variant) => (
          <Button key={variant} variant={variant} label={variant} />
        ))}
      </div>,
    )
    expect(screen.getByRole('button').elements()).toHaveLength(BUTTON_VARIANTS.length)
  })

  it('hideLabel: a square exactly as tall as a labelled button of the same size', async () => {
    const screen = await render(
      <div className="flex items-start gap-2">
        {BUTTON_SIZES.map((size) => (
          <span key={size}>
            <Button size={size} data-kind="text" data-size={size} label="Label" />
            <Button size={size} label={`Icon ${size}`} leftIcon={<Icon />} hideLabel />
          </span>
        ))}
      </div>,
    )
    for (const size of BUTTON_SIZES) {
      const text = screen.container.querySelector(`[data-kind="text"][data-size="${size}"]`)
      const icon = page.getByRole('button', { name: `Icon ${size}` }).element()
      const box = icon.getBoundingClientRect()
      expect(box.width, size).toBe(box.height)
      expect(box.height, size).toBe(text?.getBoundingClientRect().height)
    }
  })
})
