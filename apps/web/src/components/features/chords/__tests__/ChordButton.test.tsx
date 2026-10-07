import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { CHORD_BUTTON_SIZES, ChordButton } from '../ChordButton'

describe('ChordButton', () => {
  it('is a button named by its chord, announcing its status in words', async () => {
    await render(
      <div>
        <ChordButton label="G" />
        <ChordButton label="Am" status="learning" />
        <ChordButton label="D7" status="completed" />
        <ChordButton label="Cmaj7" status="locked" />
      </div>,
    )
    await expect.element(page.getByRole('button', { name: 'G', exact: true })).toBeVisible()
    await expect.element(page.getByRole('button', { name: 'Am, new' })).toBeVisible()
    await expect.element(page.getByRole('button', { name: 'D7, learned' })).toBeVisible()
    await expect.element(page.getByRole('button', { name: 'Cmaj7, locked' })).toBeDisabled()
  })

  it('selected is aria-pressed, independent of status', async () => {
    await render(<ChordButton label="D7" status="completed" selected />)
    const button = page.getByRole('button', { name: 'D7, learned' })
    await expect.element(button).toHaveAttribute('aria-pressed', 'true')
    await expect.element(button).toHaveAttribute('data-status', 'completed')
  })

  it('is an orb floating inside a 4px ring with a 3px gap (60px overall at md)', async () => {
    await render(<ChordButton label="G" data-testid="g" />)
    const marker = page.getByTestId('g').element().querySelector('[data-chord-marker]')
    const orb = marker?.querySelector('[data-orb]')
    const outer = marker?.getBoundingClientRect()
    const inner = orb?.getBoundingClientRect()
    expect(outer?.width).toBe(60)
    expect(inner?.width).toBe(46)
    // Ring (4px) + gap (3px) on each side.
    expect((inner?.left ?? 0) - (outer?.left ?? 0)).toBe(7)
    // The ring is a masked 4px annulus, not a border.
    const ring = marker?.querySelector('[data-ring="neutral"]') as HTMLElement
    expect(getComputedStyle(ring).borderTopWidth).toBe('0px')
    expect(ring.style.mask).toContain('4px')
  })

  it('selected is the strongest persistent state: a full primary ring, not glow alone', async () => {
    await render(
      <div>
        <ChordButton label="G" data-testid="plain" />
        <ChordButton label="G" selected data-testid="selected" />
      </div>,
    )
    const opacity = (id: string, ring: string) =>
      Number(
        getComputedStyle(
          page.getByTestId(id).element().querySelector(`[data-ring="${ring}"]`) as Element,
        ).opacity,
      )
    await expect.poll(() => opacity('selected', 'primary')).toBe(1)
    expect(opacity('plain', 'primary')).toBe(0)
    // At rest the neutral ring is quiet (~18%).
    expect(opacity('plain', 'neutral')).toBeCloseTo(0.18, 2)
  })

  it('hover firms up the ring', async () => {
    await render(<ChordButton label="G" data-testid="g" />)
    const ring = page.getByTestId('g').element().querySelector('[data-ring="neutral"]') as Element
    await userEvent.hover(page.getByTestId('g'))
    await expect.poll(() => Number(getComputedStyle(ring).opacity)).toBeCloseTo(0.35, 2)
  })

  it('learning shows a partial primary ring, below selected', async () => {
    await render(<ChordButton label="Am" status="learning" data-testid="am" />)
    const ring = page.getByTestId('am').element().querySelector('[data-ring="primary"]') as Element
    await expect.poll(() => Number(getComputedStyle(ring).opacity)).toBeCloseTo(0.35, 2)
  })

  it('clicks through when available; a locked chord cannot be activated', async () => {
    const onClick = vi.fn()
    await render(
      <div>
        <ChordButton label="G" onClick={onClick} />
        <ChordButton label="F" status="locked" onClick={onClick} />
      </div>,
    )
    await userEvent.click(page.getByRole('button', { name: 'G', exact: true }))
    await userEvent.click(page.getByRole('button', { name: 'F, locked' }), { force: true })
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('status glyphs are decorative; the label is never hidden', async () => {
    const screen = await render(<ChordButton label="Cmaj7" status="completed" />)
    const badge = screen.container.querySelector('[data-badge="completed"]')
    expect(badge?.getAttribute('aria-hidden')).toBe('true')
    await expect.element(page.getByText('Cmaj7')).toBeVisible()
  })

  it.each(CHORD_BUTTON_SIZES)('%s keeps a touch target of at least 44px', async (size) => {
    await render(<ChordButton label="G" size={size} />)
    const { width, height } = page.getByRole('button').element().getBoundingClientRect()
    expect(Math.min(width, height)).toBeGreaterThanOrEqual(44)
  })

  it('fits longer chord names by stepping the type down', async () => {
    await render(
      <div>
        <ChordButton label="G" data-testid="short" />
        <ChordButton label="Cmaj7" data-testid="long" />
      </div>,
    )
    const size = (id: string) =>
      Number.parseFloat(getComputedStyle(page.getByTestId(id).getByText(/\w/).element()).fontSize)
    expect(size('long')).toBeLessThan(size('short'))
  })

  it('renders an optional caption under the button, as its description', async () => {
    await render(<ChordButton label="G" caption="Group 1" />)
    await expect
      .element(page.getByRole('button', { name: 'G' }))
      .toHaveAccessibleDescription('Group 1')
  })
})
