import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { darkTokens } from '@/test/theme'
import { contrastRatio, rgbOf } from '@/utils/color'
import { Button } from '../Button'
import { Input } from '../Input'

/** Status colours come from the brand ramps; they still have to read. */
describe('status colours (brand ramps) stay readable', () => {
  it.each(['light', 'dark'] as const)(
    'destructive button text and error text (%s)',
    async (theme) => {
      const root = document.documentElement
      const applied = theme === 'dark' ? Object.entries(darkTokens()) : []
      for (const [name, value] of applied) root.style.setProperty(name, value)
      try {
        await render(
          <div className="bg-background p-4">
            <Button variant="destructive" label="Delete" />
            <Input label="Name" error="This name is taken." />
          </div>,
        )
        const button = getComputedStyle(page.getByRole('button', { name: 'Delete' }).element())
        expect(
          contrastRatio(rgbOf(button.color), rgbOf(button.backgroundColor)),
          `destructive (${theme})`,
        ).toBeGreaterThanOrEqual(4.5)
        const error = getComputedStyle(page.getByText('This name is taken.').element())
        const pageBackground = getComputedStyle(document.body).backgroundColor
        expect(
          contrastRatio(rgbOf(error.color), rgbOf(pageBackground)),
          `error text (${theme})`,
        ).toBeGreaterThanOrEqual(4.5)
      } finally {
        for (const [name] of applied) root.style.removeProperty(name)
      }
    },
  )
})
