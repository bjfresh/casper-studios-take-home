import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { BUTTON_VARIANTS } from '@/components/ui/Button'
import { TEXT_VARIANT_NAMES } from '@/components/ui/Text'
import { BRAND_TOKENS, RAMP_STEPS } from '@/constants/brand'
import { contrastRatio, rgbOf } from '@/utils/color'
import { BrandPalette } from '../BrandPalette'
import { ButtonGallery } from '../ButtonGallery'
import { TypeScale } from '../TypeScale'

describe('design gallery', () => {
  it('paints every brand step from its CSS variable, with a readable label', async () => {
    const screen = await render(<BrandPalette />)
    const swatches = screen.container.querySelectorAll('[title^="--color-brand-"]')
    expect(swatches).toHaveLength(BRAND_TOKENS.length * RAMP_STEPS.length)
    await expect
      .poll(() => getComputedStyle(swatches[0]?.firstElementChild as Element).color)
      .not.toBe('')
    for (const swatch of swatches) {
      const background = rgbOf(getComputedStyle(swatch).backgroundColor)
      const label = rgbOf(getComputedStyle(swatch.firstElementChild as Element).color)
      // Every one resolves (no transparent swatches) and its label reads on it.
      expect(getComputedStyle(swatch).backgroundColor, swatch.getAttribute('title') ?? '').not.toBe(
        'rgba(0, 0, 0, 0)',
      )
      expect(
        contrastRatio(background, label),
        swatch.getAttribute('title') ?? '',
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('shows every Text variant', async () => {
    await render(<TypeScale />)
    for (const variant of TEXT_VARIANT_NAMES) {
      await expect.element(page.getByText(variant, { exact: true })).toBeInTheDocument()
    }
  })

  it('shows every Button variant', async () => {
    await render(<ButtonGallery />)
    for (const variant of BUTTON_VARIANTS) {
      await expect.element(page.getByRole('button', { name: variant, exact: true })).toBeVisible()
    }
  })
})
