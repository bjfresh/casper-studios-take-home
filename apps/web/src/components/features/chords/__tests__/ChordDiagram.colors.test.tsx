import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { darkTokens } from '@/test/theme'
import { contrastRatio, rgbOf } from '@/utils/color'
import { ChordDiagram } from '../ChordDiagram'
import { EXAMPLE_FINGERINGS } from '../examples'

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

describe('ChordDiagram note colours', () => {
  it.each(['light', 'dark'] as const)(
    'notes are the brand green, and the label inside reads at 4.5:1 or better (%s)',
    async (theme) => {
      const root = document.documentElement
      const applied = theme === 'dark' ? Object.entries(darkTokens()) : []
      for (const [name, value] of applied) root.style.setProperty(name, value)
      try {
        const screen = await render(
          <ChordDiagram
            title="C"
            labels="notes"
            fingering={EXAMPLE_FINGERINGS.cMajorOpen.fingering}
            tuning={['E', 'A', 'D', 'G', 'B', 'E']}
          />,
        )
        const label = screen.container.querySelector('[data-label="inside"]') as SVGTextElement
        const note = css('--note')
        // On the brand-2 (green) ramp, not the old black/foreground.
        const ramp = Array.from({ length: 10 }, (_, i) =>
          css(`--color-brand-2-${[50, 100, 200, 300, 400, 500, 600, 700, 800, 900][i]}`),
        )
        expect(ramp).toContain(note)
        expect(ramp).toContain(css('--note-ring'))
        const ratio = contrastRatio(rgbOf(getComputedStyle(label).fill), rgbOf(note))
        expect(ratio, theme).toBeGreaterThanOrEqual(4.5)
      } finally {
        for (const [name] of applied) root.style.removeProperty(name)
      }
    },
  )
})
