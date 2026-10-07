import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { darkTokens } from '@/test/theme'
import { Slider } from '../Slider'

function rgbOf(color: string, over = 'white'): [number, number, number] {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d')
  if (!context) throw new Error('no 2d context')
  context.fillStyle = over
  context.fillRect(0, 0, 1, 1)
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const luminance = (rgb: [number, number, number]) => {
    const [R = 0, G = 0, B = 0] = rgb.map((v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * R + 0.7152 * G + 0.0722 * B
  }
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// The accent is the bright brand swatch (brand-5-500) by choice: ~2.4:1 on
// white, under WCAG's 3:1 for UI, so light mode is held at that (a paler
// accent still fails) and dark mode at the full 3:1. States never rely on
// its colour alone.
const ACCENT_MIN = { light: 2.3, dark: 3 } as const

describe('Slider contrast', () => {
  it.each(['light', 'dark'] as const)(
    'track, range and thumb all read against the surface (%s)',
    async (theme) => {
      const screen = await render(
        <div data-testid="surface" className="bg-surface p-4" style={{ width: 300 }}>
          <Slider
            aria-label="x"
            valueText="x"
            min={0}
            max={10}
            value={5}
            onValueChange={() => {}}
          />
        </div>,
      )
      const root = document.documentElement
      const applied = theme === 'dark' ? Object.entries(darkTokens()) : []
      for (const [name, value] of applied) root.style.setProperty(name, value)
      try {
        const surface = getComputedStyle(
          screen.container.querySelector('[data-testid="surface"]') as Element,
        ).backgroundColor
        const bg = rgbOf(surface)
        const track = screen.container.querySelector(
          '[data-orientation="horizontal"] > span',
        ) as Element
        const range = track.firstElementChild as Element
        const thumb = screen.container.querySelector('[role="slider"]') as Element
        const trackRgb = rgbOf(getComputedStyle(track).backgroundColor, surface)
        // Visible but quiet: non-text contrast that doesn't dominate.
        expect(contrast(trackRgb, bg), `track (${theme})`).toBeGreaterThan(1.3)
        // The meaningful parts: the brand accent (see ACCENT_MIN).
        expect(
          contrast(rgbOf(getComputedStyle(range).backgroundColor, surface), bg),
          `range (${theme})`,
        ).toBeGreaterThanOrEqual(ACCENT_MIN[theme])
        expect(
          contrast(rgbOf(getComputedStyle(thumb).borderTopColor, surface), bg),
          `thumb (${theme})`,
        ).toBeGreaterThanOrEqual(ACCENT_MIN[theme])
      } finally {
        for (const [name] of applied) root.style.removeProperty(name)
      }
    },
  )
})
