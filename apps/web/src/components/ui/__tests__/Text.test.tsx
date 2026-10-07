import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { Text } from '../Text'

describe('Text', () => {
  it('ignores call-site size and weight overrides but keeps color and spacing', async () => {
    const screen = await render(
      <>
        <Text variant="paragraph-sm">Reference</Text>
        <Text variant="paragraph-sm" className="text-4xl font-bold text-danger mt-4">
          Overridden
        </Text>
      </>,
    )
    const [reference, overridden] = screen.container.querySelectorAll('p')
    if (!reference || !overridden) throw new Error('expected two paragraphs')
    const ref = getComputedStyle(reference)
    const over = getComputedStyle(overridden)

    expect(over.fontSize).toBe(ref.fontSize)
    expect(over.fontWeight).toBe(ref.fontWeight)
    expect(over.color).not.toBe(ref.color)
    expect(over.marginTop).toBe('16px')
  })

  it('keeps weight orthogonal to variant', async () => {
    const screen = await render(
      <>
        <Text variant="heading-3">Default</Text>
        <Text variant="heading-3" weight="regular">
          Lighter
        </Text>
      </>,
    )
    const [base, lighter] = screen.container.querySelectorAll('h2')
    if (!base || !lighter) throw new Error('expected two headings')

    expect(getComputedStyle(lighter).fontSize).toBe(getComputedStyle(base).fontSize)
    expect(getComputedStyle(lighter).fontWeight).toBe('400')
    // Headings default to black (Quicksand renders it with its real 700).
    expect(getComputedStyle(base).fontWeight).toBe('900')
  })

  it('merges typography onto its child with asChild', async () => {
    const screen = await render(
      <Text asChild variant="accent-sm">
        <a href="/pricing">Pricing</a>
      </Text>,
    )
    expect(screen.getByRole('link').element().classList.contains('text-xs/4')).toBe(true)
  })
})
