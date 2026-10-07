import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { darkTokens } from '@/test/theme'
import { Button } from '../Button'
import { Checkbox } from '../Checkbox'
import { RadioGroup } from '../RadioGroup'
import { Slider } from '../Slider'
import { Switch } from '../Switch'
import { TwoSidedSwitch } from '../TwoSidedSwitch'

function rgb(color: string): [number, number, number] {
  const context = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}
function contrast(a: string, b: string) {
  const luminance = (color: string) => {
    const [r = 0, g = 0, bl = 0] = rgb(color).map((v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// The accent is the bright brand swatch (brand-5-500) by choice: ~2.4:1 on
// white, under WCAG's 3:1 for UI, so light mode is held at that (a paler
// accent still fails) and dark mode at the full 3:1. States never rely on
// its colour alone.
const ACCENT_MIN = { light: 2.3, dark: 3 } as const

describe('form controls and primary buttons use the blue brand accent', () => {
  it.each(['light', 'dark'] as const)(
    'and it holds its contrast on the surface (%s)',
    async (theme) => {
      const root = document.documentElement
      const applied = theme === 'dark' ? Object.entries(darkTokens()) : []
      for (const [name, value] of applied) root.style.setProperty(name, value)
      try {
        const screen = await render(
          <div
            data-testid="surface"
            className="flex flex-col gap-4 bg-surface p-4"
            style={{ width: 360 }}
          >
            <Switch label="On switch" checked onCheckedChange={() => {}} />
            <TwoSidedSwitch
              label="Side"
              left={{ value: 'a', label: 'A' }}
              right={{ value: 'b', label: 'B' }}
              value="a"
              onValueChange={() => {}}
            />
            <RadioGroup
              label="Pick"
              options={[{ value: 'x', label: 'X' }]}
              value="x"
              onValueChange={() => {}}
            />
            <Checkbox label="Tick" checked onCheckedChange={() => {}} />
            <Slider
              aria-label="Amount"
              valueText="5"
              min={0}
              max={10}
              value={5}
              onValueChange={() => {}}
            />
            <Button label="Got it" />
          </div>,
        )
        const surface = getComputedStyle(page.getByTestId('surface').element()).backgroundColor
        const brand = getComputedStyle(root).getPropertyValue('--color-brand-5-500')
        const accent = `rgb(${rgb(brand).join(', ')})`
        const container = screen.container
        const painted = {
          switch: getComputedStyle(page.getByRole('switch', { name: 'On switch' }).element())
            .backgroundColor,
          twoSided: getComputedStyle(page.getByRole('switch', { name: 'Side: B' }).element())
            .backgroundColor,
          radio: getComputedStyle(container.querySelector('[role="radio"] > span') as Element)
            .backgroundColor,
          checkbox: getComputedStyle(page.getByRole('checkbox').element()).backgroundColor,
          slider: getComputedStyle(
            container.querySelector('[data-orientation="horizontal"] > span > span') as Element,
          ).backgroundColor,
        }
        for (const [control, color] of Object.entries(painted)) {
          expect(`rgb(${rgb(color).join(', ')})`, control).toBe(accent)
          expect(contrast(color, surface), `${control} (${theme})`).toBeGreaterThanOrEqual(
            ACCENT_MIN[theme],
          )
        }
        // The primary button variant is the same accent, with readable text.
        const button = getComputedStyle(page.getByRole('button', { name: 'Got it' }).element())
        expect(`rgb(${rgb(button.backgroundColor).join(', ')})`, 'button').toBe(accent)
        // White text on the bright swatch, by choice (~2.4:1, under AA: see
        // globals.css --control). Held there, so a paler fill still fails.
        expect(`rgb(${rgb(button.color).join(', ')})`, 'button text').toBe('rgb(255, 255, 255)')
        expect(
          contrast(button.color, button.backgroundColor),
          `button text (${theme})`,
        ).toBeGreaterThanOrEqual(ACCENT_MIN.light)
        // The tick on a checked checkbox reads against the accent.
        const tick = getComputedStyle(page.getByRole('checkbox').element()).color
        expect(contrast(tick, painted.checkbox)).toBeGreaterThanOrEqual(ACCENT_MIN.light)
      } finally {
        for (const [name] of applied) root.style.removeProperty(name)
      }
    },
  )
})
